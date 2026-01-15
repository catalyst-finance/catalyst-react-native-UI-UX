import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatting';
import DataService from '../utils/data-service';
import HistoricalPriceService from '../utils/historical-price-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { LargeSVGChart, TimeRange } from './charts';
import { getCurrentTime } from '../utils/current-time';
import { eventTypeConfig } from '../utils/formatting';

interface PortfolioDataPoint {
  timestamp: number;
  value: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: MarketEvent;
  dayIndex: number;
  position: number;
}

interface PortfolioChartProps {
  portfolioIntegration: any;
  selectedTickers: string[];
  isFilterEnabled?: boolean;
}

// Portfolio holdings (test data for now)
const PORTFOLIO_HOLDINGS: Record<string, { shares: number; avgCost: number }> = {
  'TSLA': { shares: 10, avgCost: 453.14 },
  'MNMD': { shares: 200, avgCost: 13.45 },
  'TMC': { shares: 500, avgCost: 6.42 }
};

// Purchase date - stocks were purchased on Jan 2, 2026
const PURCHASE_DATE = new Date('2026-01-02T00:00:00').getTime();

// Generate future catalyst timeline for portfolio
const generateFutureCatalysts = (events: MarketEvent[], futureDays: number = 180): FutureCatalyst[] => {
  const now = getCurrentTime();
  const currentTime = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const futureEvents: FutureCatalyst[] = [];
  
  // Filter to upcoming events within our future range
  const upcomingEvents = events.filter(event => {
    if (!event.actualDateTime) return false;
    const eventTime = new Date(event.actualDateTime).getTime();
    return eventTime > currentTime && eventTime <= currentTime + (futureDays * dayMs);
  });

  // Convert to future catalyst format
  upcomingEvents.forEach(event => {
    const eventTime = new Date(event.actualDateTime!).getTime();
    const dayIndex = Math.ceil((eventTime - currentTime) / dayMs);
    
    futureEvents.push({
      date: new Date(eventTime).toISOString().split('T')[0],
      timestamp: eventTime,
      catalyst: event,
      dayIndex,
      position: 0.5
    });
  });
  
  return futureEvents.sort((a, b) => a.timestamp - b.timestamp);
};

export function PortfolioChart({ portfolioIntegration, selectedTickers, isFilterEnabled = false }: PortfolioChartProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioDataPoint[]>([]);
  const [futureCatalysts, setFutureCatalysts] = useState<FutureCatalyst[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('3M');
  const [showUpcomingRange, setShowUpcomingRange] = useState<boolean>(true);
  const [showPastEvents, setShowPastEvents] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const allEventTypes = Object.keys(eventTypeConfig);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(allEventTypes);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [dayChange, setDayChange] = useState<number>(0);
  const [dayChangePercent, setDayChangePercent] = useState<number>(0);
  const [previousClose, setPreviousClose] = useState<number>(0);

  // Calculate real portfolio values based on actual holdings
  useEffect(() => {
    const calculatePortfolioValue = async () => {
      // Get all tickers that have holdings
      const holdingTickers = Object.keys(PORTFOLIO_HOLDINGS);
      
      if (holdingTickers.length === 0) {
        setCurrentValue(0);
        setDayChange(0);
        setDayChangePercent(0);
        setPreviousClose(0);
        return;
      }

      try {
        // Fetch current stock data for all holdings tickers
        const stocksData = await DataService.getStocks(holdingTickers);
        
        // Check if we got any data back
        const receivedStocks = Object.keys(stocksData).length;
        if (receivedStocks === 0) {
          // Don't update state if we have no data - keep previous values
          return;
        }
        
        let totalValue = 0;
        let totalDayChange = 0;
        let hasAnyData = false;

        holdingTickers.forEach((ticker: string) => {
          const stockData = stocksData[ticker];
          const holding = PORTFOLIO_HOLDINGS[ticker];
          
          if (stockData && holding) {
            const currentPrice = stockData.currentPrice || 0;
            const priceChange = stockData.priceChange || 0;
            
            // Validate data quality
            if (currentPrice > 0) {
              hasAnyData = true;
              const positionValue = holding.shares * currentPrice;
              const positionDayChange = holding.shares * priceChange;
              
              totalValue += positionValue;
              totalDayChange += positionDayChange;
            }
          }
        });

        // Only update if we have valid data
        if (!hasAnyData) {
          console.error('[Portfolio Chart] No valid price data received - not updating display');
          return;
        }

        const totalPrevValue = totalValue - totalDayChange;
        
        // Defensive math to prevent infinity/NaN
        let changePercent = 0;
        if (totalPrevValue > 0 && isFinite(totalPrevValue)) {
          changePercent = (totalDayChange / totalPrevValue) * 100;
          // Clamp to reasonable range
          if (!isFinite(changePercent)) {
            changePercent = 0;
          }
        }

        setCurrentValue(totalValue);
        setDayChange(totalDayChange);
        setDayChangePercent(changePercent);
        setPreviousClose(totalPrevValue);
      } catch (error) {
        console.error('[Portfolio Chart] Error calculating portfolio value:', error);
        // Don't set to zero on error - keep previous values to avoid jarring UI changes
      }
    };

    if (portfolioIntegration?.enabled) {
      calculatePortfolioValue();
      
      // Also retry after a delay if initial attempt might have failed
      const retryTimer = setTimeout(() => {
        calculatePortfolioValue();
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [portfolioIntegration]);

  // Load cached chart settings from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem('portfolioChartSettings');
      if (cached) {
        const settings = JSON.parse(cached);
        if (settings.selectedTimeRange) setSelectedTimeRange(settings.selectedTimeRange);
        if (settings.showUpcomingRange !== undefined) setShowUpcomingRange(settings.showUpcomingRange);
        if (settings.showPastEvents !== undefined) setShowPastEvents(settings.showPastEvents);
        if (settings.selectedEventTypes) setSelectedEventTypes(settings.selectedEventTypes);
      }
    } catch (e) {
      console.warn('Failed to load portfolio chart settings:', e);
    }
  }, []);

  // Save chart settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      selectedTimeRange,
      showUpcomingRange,
      showPastEvents,
      selectedEventTypes
    };
    try {
      localStorage.setItem('portfolioChartSettings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save portfolio chart settings:', e);
    }
  }, [selectedTimeRange, showUpcomingRange, showPastEvents, selectedEventTypes]);

  // Handle time range changes
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
  };

  // Load portfolio historical data
  const loadData = async () => {
    try {
      // ALWAYS use the actual holdings instead of relying on portfolioTickers
      // This ensures we fetch data for all stocks that have positions
      const tickersWithHoldings = Object.keys(PORTFOLIO_HOLDINGS);

      if (tickersWithHoldings.length === 0) {
        setPortfolioData([]);
        setFutureCatalysts([]);
        setEvents([]);
        setIsLoading(false);
        return;
      }

      // Determine timeframe and days based on selected range
      let timeframe: 'daily' | 'hourly' | 'intraday' | '10min' | '5min' = 'daily';
      let days = 365;

      switch (selectedTimeRange) {
        case '1D':
          timeframe = 'intraday';
          days = 1;
          break;
        case '1W':
          timeframe = '10min';
          days = 7;
          break;
        case '1M':
          timeframe = '10min';
          days = 30;
          break;
        case '3M':
          timeframe = 'daily';
          days = 90;
          break;
        case 'YTD':
          timeframe = 'daily';
          const yearStart = new Date(new Date().getFullYear(), 0, 1);
          days = Math.ceil((Date.now() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
          break;
        case '1Y':
          timeframe = 'daily';
          days = 365;
          break;
        case '5Y':
          timeframe = 'daily';
          days = 365 * 5;
          break;
        default:
          timeframe = 'daily';
          days = 90;
      }

      console.log('[Portfolio Chart] Fetching data for:', tickersWithHoldings, 'timeframe:', timeframe, 'days:', days);

      // Fetch historical data for all portfolio holdings using individual fetches
      // (getMultipleHistoricalPrices doesn't support 'intraday' or '10min' timeframes)
      const historicalDataMap: Record<string, any> = {};
      
      await Promise.all(
        tickersWithHoldings.map(async (ticker: string) => {
          try {
            const chartData = await HistoricalPriceService.getHistoricalPrices(
              ticker,
              timeframe,
              days
            );
            historicalDataMap[ticker.toUpperCase()] = chartData;
          } catch (error) {
            console.error(`[Portfolio Chart] Error fetching data for ${ticker}:`, error);
          }
        })
      );

      console.log('[Portfolio Chart] Received historical data:', Object.keys(historicalDataMap));

      // Build a comprehensive map: for each timestamp across all stocks, calculate total portfolio value
      // We need to handle cases where stocks have different timestamps (e.g., different trading hours)
      
      // First, collect ALL unique timestamps and organize price data by ticker
      const allTimestamps = new Set<number>();
      const pricesByTicker: Record<string, Map<number, number>> = {};
      
      // Process each ticker's historical data
      tickersWithHoldings.forEach((ticker: string) => {
        const tickerData = historicalDataMap[ticker.toUpperCase()];
        const holding = PORTFOLIO_HOLDINGS[ticker];
        
        if (!tickerData || !tickerData.prices || !holding) {
          console.warn(`[Portfolio Chart] Missing data for ${ticker}`);
          return;
        }

        console.log(`[Portfolio Chart] Processing ${ticker}: ${tickerData.prices.length} data points`);
        
        const priceMap = new Map<number, number>();
        
        tickerData.prices.forEach((dataPoint: any) => {
          const timestamp = new Date(dataPoint.date).getTime();
          
          // Include ALL data points (don't filter by purchase date yet)
          const price = dataPoint.close || 0;
          priceMap.set(timestamp, price);
          allTimestamps.add(timestamp);
        });
        
        pricesByTicker[ticker] = priceMap;
      });

      // Now for each timestamp, calculate portfolio value using forward-fill for missing prices
      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
      const portfolioHistory: PortfolioDataPoint[] = [];
      
      // Fetch current stock data to get previous close for forward-filling
      const stocksData = await DataService.getStocks(tickersWithHoldings);
      
      // Track the last known price for each ticker (for forward-fill)
      // Initialize with previous close so we can forward-fill from market open
      const lastKnownPrices: Record<string, number> = {};
      tickersWithHoldings.forEach((ticker: string) => {
        const stockData = stocksData[ticker];
        if (stockData && stockData.previousClose) {
          lastKnownPrices[ticker] = stockData.previousClose;
          console.log(`[Portfolio Chart] Initialized ${ticker} with previous close: $${stockData.previousClose}`);
        }
      });
      
      sortedTimestamps.forEach(timestamp => {
        let portfolioValue = 0;
        let hasAllPrices = true;
        
        // Before purchase date, portfolio value is 0
        if (timestamp < PURCHASE_DATE) {
          portfolioHistory.push({
            timestamp,
            value: 0,
            close: 0,
            open: 0,
            high: 0,
            low: 0
          });
          return;
        }
        
        // For each ticker, get the price at this timestamp (or use last known price)
        tickersWithHoldings.forEach((ticker: string) => {
          const holding = PORTFOLIO_HOLDINGS[ticker];
          if (!holding) return;
          
          const priceMap = pricesByTicker[ticker];
          if (!priceMap) {
            hasAllPrices = false;
            return;
          }
          
          // Check if we have a price at this exact timestamp
          let price = priceMap.get(timestamp);
          
          // If not, use the last known price (forward-fill)
          if (price === undefined) {
            price = lastKnownPrices[ticker];
          }
          
          // If we still don't have a price, we can't calculate portfolio value yet
          if (price === undefined) {
            hasAllPrices = false;
            return;
          }
          
          // Update last known price
          lastKnownPrices[ticker] = price;
          
          // Add this position's value to total
          portfolioValue += holding.shares * price;
        });
        
        // Only add a data point if we have prices for all holdings
        if (hasAllPrices && portfolioValue > 0) {
          portfolioHistory.push({
            timestamp,
            value: portfolioValue,
            close: portfolioValue,
            open: portfolioValue,
            high: portfolioValue,
            low: portfolioValue
          });
        }
      });

      console.log('[Portfolio Chart] Portfolio data points:', portfolioHistory.length);
      if (portfolioHistory.length > 0) {
        console.log('[Portfolio Chart] First:', new Date(portfolioHistory[0].timestamp).toISOString(), portfolioHistory[0].value);
        console.log('[Portfolio Chart] Last:', new Date(portfolioHistory[portfolioHistory.length - 1].timestamp).toISOString(), portfolioHistory[portfolioHistory.length - 1].value);
      }

      // Load catalyst events for ALL selected tickers (holdings + watchlist)
      let allEvents: MarketEvent[] = [];
      if (selectedTickers.length > 0) {
        allEvents = await DataService.getEventsByTickers(selectedTickers);
      }

      // Generate future catalysts
      const futureCatalystData = generateFutureCatalysts(allEvents, 180);

      setPortfolioData(portfolioHistory);
      setFutureCatalysts(futureCatalystData);
      setEvents(allEvents);
    } catch (error) {
      console.error('[Portfolio Chart] Error loading portfolio data:', error);
      setPortfolioData([]);
      setFutureCatalysts([]);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (portfolioIntegration?.enabled) {
      setIsLoading(true);
      loadData();
    }
  }, [selectedTickers, portfolioIntegration, selectedTimeRange]);

  if (!portfolioIntegration?.enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full mb-4">
        <div className="h-[312px] flex items-center justify-center bg-background rounded-lg border border-border/50">
          <div className="text-sm text-muted-foreground">Loading portfolio chart...</div>
        </div>
      </div>
    );
  }

  return (
    <LargeSVGChart
      data={portfolioData}
      previousClose={previousClose}
      currentPrice={currentValue}
      priceChange={dayChange}
      priceChangePercent={dayChangePercent}
      futureCatalysts={futureCatalysts}
      pastEvents={events}
      width={400}
      height={312}
      strokeWidth={2}
      onTimeRangeChange={handleTimeRangeChange}
      defaultTimeRange={selectedTimeRange}
      showAdvancedChart={false}
      onToggleChart={() => {}}
      ticker="PORTFOLIO"
      showUpcomingRange={showUpcomingRange}
      onShowUpcomingRangeChange={setShowUpcomingRange}
      showPastEvents={showPastEvents}
      onShowPastEventsChange={setShowPastEvents}
      settingsOpen={settingsOpen}
      onSettingsOpenChange={setSettingsOpen}
      hideChartTypeSelector={true}
      selectedEventTypes={selectedEventTypes}
      onSelectedEventTypesChange={setSelectedEventTypes}
    />
  );
}