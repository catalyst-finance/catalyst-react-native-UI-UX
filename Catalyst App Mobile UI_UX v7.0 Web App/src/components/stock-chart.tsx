import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatting';
import DataService, { StockData } from '../utils/data-service';
import HistoricalPriceService, { HistoricalPrice, ChartData } from '../utils/historical-price-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { RobinhoodStyleChart, SimpleMiniChart, LargeSVGChart, AdvancedFinancialChart, TimeRange } from './charts';
import { getCurrentTime } from '../utils/current-time';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getCurrentMarketPeriod, getShortenedTradingHours, isTodayHoliday } from '../utils/market-status';
import { isCurrentlyWeekend, isCurrentlyPreMarket } from '../utils/chart-time-utils';
import { aggregateIntradayTo5MinCandles } from '../utils/chart-math-utils';
import StockAPI from '../utils/supabase/stock-api';
import { eventTypeConfig } from '../utils/formatting';
import { Settings, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { CandlestickIcon } from './icons/candlestick-icon';
import priceTargetsService, { PriceTarget } from '../utils/price-targets-service';

interface StockDataPoint {
  date: string;
  value: number;
  timestamp: number;
  catalyst?: MarketEvent;
  dayIndex: number;
  hourIndex?: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  session?: string; // Session type: pre-market, regular, after-hours
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: MarketEvent;
  dayIndex: number;
  position: number;
}

interface StockChartProps {
  ticker: string;
  stockData: StockData;
  height?: string;
  defaultTimeRange?: TimeRange;
  miniMode?: boolean;
  preloadedEventsData?: any[];
  highlightedEventId?: string | null;
  onEventClick?: (event: MarketEvent) => void;
  centeredEventId?: string | null;
  disableAnimation?: boolean;
  globalMinValue?: number; // For standardized y-scale in mini mode
  globalMaxValue?: number; // For standardized y-scale in mini mode
}

// Generate stock price history for a single stock
const generateStockPriceData = (currentPrice: number, symbol: string, currentTime?: number, miniMode?: boolean): StockDataPoint[] => {
  const data: StockDataPoint[] = [];
  const now = currentTime || Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const maxPastDays = miniMode ? 90 : 180; // Fewer days for mini charts for performance
  
  let currentValue = currentPrice * 0.85; // Start lower for growth story
  
  // Seeded random function for consistent results per stock
  const seedRandom = (seed: number, symbol: string) => {
    const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const x = Math.sin(seed + symbolHash) * 10000;
    return x - Math.floor(x);
  };
  
  // Generate past data with stock-specific movement
  for (let i = -maxPastDays; i <= 0; i++) {
    const timestamp = now + (i * dayMs);
    const date = new Date(timestamp);
    
    // Use seeded random for consistent chart line per stock
    const randomSeed = seedRandom(i + 12345, symbol);
    
    // Create stock-specific volatility patterns
    const baseVolatility = (randomSeed - 0.5) * 0.06; // ±3% base movement
    const cyclicalFactor = Math.sin((i / 20) * Math.PI) * 0.015; // Market cycles
    const trendFactor = 0.001; // Slight upward trend
    
    // Add occasional larger moves (earnings, news events)
    const eventSeed = seedRandom(i * 2.5 + 67890, symbol);
    const hasLargeMove = eventSeed > 0.92; // 8% chance
    const largeMove = hasLargeMove ? (randomSeed - 0.5) * 0.12 : 0; // ±6% spike
    
    // Combine all factors
    const totalChange = baseVolatility + cyclicalFactor + trendFactor + largeMove;
    
    // If we're at today, set to exact current price
    if (i === 0) {
      currentValue = currentPrice;
    } else {
      currentValue *= (1 + totalChange);
      // Add bounds to keep it reasonable
      currentValue = Math.max(currentPrice * 0.4, Math.min(currentPrice * 1.6, currentValue));
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(currentValue * 100) / 100, // Round to cents
      timestamp,
      dayIndex: i
    });
  }
  
  return data;
};

// Generate future catalyst timeline for a single stock
const generateStockFutureCatalysts = (events: MarketEvent[], ticker: string, futureDays: number = 90, linePosition: number = 0.5): FutureCatalyst[] => {
  const now = getCurrentTime();
  const currentTime = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const futureEvents: FutureCatalyst[] = [];
  
  // Filter to upcoming events for this ticker within our range
  const upcomingEvents = events.filter(event => {
    if (!event.actualDateTime) return false;
    const eventTime = new Date(event.actualDateTime).getTime();
    return eventTime > currentTime && eventTime <= currentTime + (futureDays * dayMs);
  });

  upcomingEvents.forEach(event => {
    const eventDate = new Date(event.actualDateTime!);
    const dayIndex = Math.ceil((eventDate.getTime() - currentTime) / dayMs);
    
    futureEvents.push({
      date: eventDate.toISOString().split('T')[0],
      timestamp: eventDate.getTime(),
      catalyst: event,
      dayIndex,
      position: linePosition
    });
  });
  
  return futureEvents.sort((a, b) => a.timestamp - b.timestamp);
};

export function StockChart({ ticker, stockData, height = "h-96", defaultTimeRange = "1D", miniMode = false, preloadedEventsData = [], highlightedEventId = null, onEventClick, centeredEventId, disableAnimation, globalMinValue, globalMaxValue }: StockChartProps) {
  const [stockPriceData, setStockPriceData] = useState<StockDataPoint[]>([]);
  const [candlestickData, setCandlestickData] = useState<StockDataPoint[]>([]); // Separate data for candlestick chart (10-minute intervals)
  const [futureCatalysts, setFutureCatalysts] = useState<FutureCatalyst[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [historicalData, setHistoricalData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'api' | 'cached' | 'mock'>('cached'); // Start with cached, will update when data loads
  const [priceTargets, setPriceTargets] = useState<PriceTarget[]>([]); // Analyst price targets
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [previousClose, setPreviousClose] = useState<number | null>(null);
  const [previousDayData, setPreviousDayData] = useState<{ close: number; previousClose: number } | null>(null);
  const [showAdvancedChart, setShowAdvancedChart] = useState(false);
  const [showUpcomingRange, setShowUpcomingRange] = useState(true); // Shared state for showing/hiding upcoming section
  const [showPastEvents, setShowPastEvents] = useState(true); // Shared state for showing/hiding past events
  const [settingsOpen, setSettingsOpen] = useState(false); // Shared state for settings popover
  const [marketClosePrice, setMarketClosePrice] = useState<number | null>(null); // Shared market close price for both charts
  const [shortenedTradingHours, setShortenedTradingHours] = useState<{ open: string; close: string } | null>(null);
  const allEventTypes = Object.keys(eventTypeConfig);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(allEventTypes); // Shared state for event type filters

  // Reset chart view to default (Line) when ticker changes
  useEffect(() => {
    setShowAdvancedChart(false);
  }, [ticker]);

  // Fetch shortened trading hours if applicable
  useEffect(() => {
    const fetchShortenedHours = async () => {
      const hours = await getShortenedTradingHours();
      setShortenedTradingHours(hours);
    };
    fetchShortenedHours();
  }, []);

  // Fetch analyst price targets
  useEffect(() => {
    const fetchPriceTargets = async () => {
      if (!ticker || miniMode) return; // Skip for mini mode charts
      
      try {
        console.log(`[DEBUG StockChart ${ticker}] 📊 Fetching analyst price targets...`);
        const rawTargets = await priceTargetsService.fetchPriceTargets(ticker, 50); // Fetch more to ensure we have enough per analyst
        
        // Transform raw database records to expected format
        const targets = rawTargets
          .map((raw: any) => {
            // Parse price target from various possible fields
            let price_target: number | null = null;
            
            // Try standard field first
            if (typeof raw.price_target === 'number') {
              price_target = raw.price_target;
            } 
            // Parse price_target_change field - handles both formats:
            // 1. "$490 → $482" (change with arrow - use new value after arrow)
            // 2. "$349" (single value)
            else if (raw.price_target_change && typeof raw.price_target_change === 'string') {
              const ptChange = raw.price_target_change.trim();
              
              // Filter out date-like formats (e.g., "02-26", "12-31")
              // These should not be treated as price targets
              if (/^\d{1,2}-\d{1,2}$/.test(ptChange)) {
                console.log(`[DEBUG StockChart ${ticker}] ⚠️ Skipping date-like value: ${ptChange}`);
                price_target = null;
              } else {
                // First try to match arrow format (old → new)
                const arrowMatch = ptChange.match(/→\s*\$?([\d,]+(?:\.\d+)?)/);
                if (arrowMatch && arrowMatch[1]) {
                  price_target = parseFloat(arrowMatch[1].replace(/,/g, ''));
                } else {
                  // Try to match single price format "$349" or "349"
                  const singleMatch = ptChange.match(/\$?([\d,]+(?:\.\d+)?)/);
                  if (singleMatch && singleMatch[1]) {
                    price_target = parseFloat(singleMatch[1].replace(/,/g, ''));
                  }
                }
              }
            }
            
            // Skip if we couldn't parse a valid price target
            if (price_target === null || price_target <= 0 || isNaN(price_target)) {
              console.log(`[DEBUG StockChart ${ticker}] ⚠️ Skipping invalid price target:`, raw);
              return null;
            }
            
            // Normalize analyst firm name
            const analyst_firm = raw.analyst_firm || raw.analyst || 'Unknown';
            
            // Normalize date field
            const published_date = raw.published_date || raw.date || raw.inserted_at || new Date().toISOString();
            
            return {
              _id: raw._id,
              symbol: raw.symbol || raw.ticker,
              analyst_firm,
              analyst_name: raw.analyst_name,
              price_target,
              rating: raw.rating || raw.rating_change,
              published_date,
              action: raw.action,
              previous_target: raw.previous_target
            } as PriceTarget;
          })
          .filter((t): t is PriceTarget => t !== null); // Remove nulls
        
        console.log(`[DEBUG StockChart ${ticker}] 📊 Normalized ${targets.length} price targets from ${rawTargets.length} raw records`);
        
        // Deduplicate: Keep only the latest price target per analyst firm
        const uniqueTargets = Array.from(
          targets.reduce((map, target) => {
            const existing = map.get(target.analyst_firm);
            // Keep this target if no existing one, or if this one is newer
            if (!existing || new Date(target.published_date) > new Date(existing.published_date)) {
              map.set(target.analyst_firm, target);
            }
            return map;
          }, new Map<string, PriceTarget>()).values()
        );
        
        setPriceTargets(uniqueTargets);
        console.log(`[DEBUG StockChart ${ticker}] ✅ Loaded ${uniqueTargets.length} unique price targets (from ${targets.length} total)`);
      } catch (error) {
        console.error(`[ERROR StockChart ${ticker}] Failed to fetch price targets:`, error);
        setPriceTargets([]); // Set empty array on error
      }
    };
    
    fetchPriceTargets();
  }, [ticker, miniMode]);

  // Override height for mini mode to ensure compact display
  const effectiveHeight = miniMode ? "h-40" : height;

  // Check if stockData is valid
  const hasValidStockData = stockData && stockData.currentPrice;

  // Fetch previous day's close from finnhub_quote_snapshots table
  useEffect(() => {
    const fetchPreviousClose = async () => {
      try {
        console.log(`[DEBUG StockChart ${ticker}] 🔍 Fetching previous close...`);
        // PRIORITY 1: Use previous_close from finnhub_quote_snapshots table (ONLY official source)
        console.log(`[DEBUG StockChart ${ticker}] Querying finnhub_quote_snapshots table for official previous_close...`);
        
        if (stockData.previousClose !== undefined && stockData.previousClose !== null) {
          // StockData already has previous_close from finnhub_quote_snapshots
          setPreviousClose(stockData.previousClose);
          console.log(`[DEBUG StockChart ${ticker}] ✅ Using official previous_close from stockData: $${stockData.previousClose}`);
          return; // Early return - this is the official previous close
        }
        
        console.log(`[DEBUG StockChart ${ticker}] ⚠️ No previous_close in stockData, querying directly...`);
        
        // PRIORITY 2: Query finnhub_quote_snapshots directly as fallback
        console.log(`[DEBUG StockChart ${ticker}] No previous_close in StockData, querying finnhub_quote_snapshots directly...`);
        
        // Query the finnhub_quote_snapshots table directly (use timestamp order, not date)
        const url = `https://${projectId}.supabase.co/rest/v1/finnhub_quote_snapshots?symbol=eq.${ticker}&order=timestamp.desc&limit=1`;
        console.log(`[DEBUG StockChart ${ticker}] Fetching official previous_close from finnhub_quote_snapshots:`, url);
        
        const response = await fetch(url, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`[DEBUG StockChart ${ticker}] Response status:`, response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log(`[DEBUG StockChart ${ticker}] Response data:`, data);
          
          console.log(`[DEBUG StockChart ${ticker}] 🔍 Total rows returned: ${data.length}`);
          
          // Filter out hourly_aggregated source data - we only want proper daily closes
          const validDailyData = data.filter((row: any) => 
            row.source !== 'hourly_aggregated' && 
            row.close !== null && 
            row.close !== undefined
          );
          
          console.log(`[DEBUG StockChart ${ticker}] ✅ Valid daily data rows (after filtering): ${validDailyData.length}`);
          if (validDailyData.length > 0) {
            // CRITICAL: On weekends/after-hours, use previous_close (the day before the last trading day's close)
            // This ensures the chart color reflects the day's change (e.g., Friday's performance vs Thursday's close)
            // The 'close' field is the last trading day's close, 'previous_close' is the day before that
            // Use centralized utilities for weekend/premarket detection
            const isWeekend = isCurrentlyWeekend();
            const isPreMarket = isCurrentlyPreMarket(); // This already excludes weekends
            const isHoliday = await isTodayHoliday();
            
            // Use previous_close for chart baseline (except during pre-market which needs yesterday's close)
            // CRITICAL: On holidays, we treat it as closed/after-hours, so we use the standard previous_close
            // This ensures we compare the last trading day's close (e.g. Dec 31) to its previous close (Dec 30)
            const previousCloseValue = (isPreMarket && !isHoliday)
              ? validDailyData[0].close  // Pre-market: compare to yesterday's close
              : validDailyData[0].previous_close || validDailyData[0].close;  // After-hours/weekend/holiday: compare to day before
            
            setPreviousClose(previousCloseValue);
            console.log(`[DEBUG StockChart ${ticker}] ✅ Previous close from finnhub_quote_snapshots: $${previousCloseValue} (isPreMarket: ${isPreMarket}, isWeekend: ${isWeekend}, isHoliday: ${isHoliday}, close: $${validDailyData[0].close}, prev_close: $${validDailyData[0].previous_close})`);
            return; // Early return - found accurate data in database
          }
        }
        
        // PRIORITY 3: Calculate from current price and change as last resort
        console.log(`[DEBUG StockChart ${ticker}] ⚠️ No previous close found in database, calculating from current price...`);
        const calculatedPrevClose = stockData.currentPrice - (stockData.priceChange || 0);
        setPreviousClose(calculatedPrevClose);
        console.log(`[DEBUG StockChart ${ticker}] ⚠️ Using calculated previous close (last resort): $${calculatedPrevClose.toFixed(2)} (current: $${stockData.currentPrice}, change: $${stockData.priceChange})`);
      } catch (error) {
        console.error(`[${ticker}] Error fetching previous close:`, error);
        // Fallback to calculating
        const calculatedPrevClose = stockData.currentPrice - (stockData.priceChange || 0);
        setPreviousClose(calculatedPrevClose);
      }
    };

    if (ticker && stockData?.currentPrice) {
      fetchPreviousClose();
    }
  }, [ticker, stockData?.currentPrice, stockData?.priceChange, stockData?.previousClose]);

  // Fetch previous day's performance data (yesterday's close vs its previous close)
  useEffect(() => {
    const fetchPreviousDayData = async () => {
      try {
        // console.log(`[${ticker}] Fetching previous day data for pre-market display...`);
        
        // Query the last 2 rows from finnhub_quote_snapshots to calculate yesterday's performance
        const url = `https://${projectId}.supabase.co/rest/v1/finnhub_quote_snapshots?symbol=eq.${ticker}&order=timestamp.desc&limit=2`;
        
        const response = await fetch(url, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Filter out hourly_aggregated source data
          const validDailyData = data.filter((row: any) => 
            row.source !== 'hourly_aggregated' && 
            row.close !== null && 
            row.close !== undefined
          );
          
          if (validDailyData.length >= 1) {
            // Most recent row might have both close and previous_close
            const mostRecent = validDailyData[0];
            
            if (mostRecent.previous_close) {
              // We have previous_close in the most recent row
              setPreviousDayData({
                close: mostRecent.close,
                previousClose: mostRecent.previous_close
              });
              // console.log(`[${ticker}] ✅ Previous day data: close=$${mostRecent.close}, previous_close=$${mostRecent.previous_close}`);
            } else if (validDailyData.length >= 2) {
              // Use the second row's close as the previous_close for the first row
              const secondMostRecent = validDailyData[1];
              setPreviousDayData({
                close: mostRecent.close,
                previousClose: secondMostRecent.close
              });
              // console.log(`[${ticker}] ✅ Previous day data: close=$${mostRecent.close}, previous_close=$${secondMostRecent.close} (from 2 rows)`);
            }
          }
        }
      } catch (error) {
        console.error(`[${ticker}] Error fetching previous day data:`, error);
      }
    };

    if (ticker) {
      fetchPreviousDayData();
    }
  }, [ticker]);
  
  // Fetch market close price during after-hours and closed periods - shared by both charts
  useEffect(() => {
    const fetchMarketClosePrice = async () => {
      const marketPeriod = await getCurrentMarketPeriod();
      if ((marketPeriod === 'afterhours' || marketPeriod === 'closed' || marketPeriod === 'holiday') && ticker) {
        const closePrice = await StockAPI.getMarketClosePrice(ticker);
        if (closePrice !== null) {
          setMarketClosePrice(closePrice);
        }
      }
    };
    
    fetchMarketClosePrice();
    
    // Refresh every minute in case market period changes
    const interval = setInterval(fetchMarketClosePrice, 60000);
    return () => clearInterval(interval);
  }, [ticker]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // NO MORE MOCK DATA - Load real data immediately for all charts
        setIsLoading(true);
        // Clear existing data immediately to prevent glitchy transitions
        setStockPriceData([]);
        setHistoricalData(null); // Also clear historical data to prevent stale data
        setFutureCatalysts([]);
        
        await loadDetailedData();
      } catch (error) {
        setIsLoading(false);
      }
    };

    const loadDetailedData = async () => {
      try {
        
        // FOR MINI MODE: Use intraday prices for 24-hour view
        if (miniMode) {
          await loadIntradayData()
          return;
        }
        
        // Determine data granularity and duration based on time range
        let granularity: 'intraday' | 'hourly' | 'daily' | 'hourly-daily' | '10min';
        let daysToLoad: number;
        
        switch (selectedTimeRange) {
          case '1D':
            granularity = 'intraday';
            daysToLoad = 1;
            break;
          case '1W':
            granularity = '10min'; // Use 10-minute data from ten_minute_prices table
            daysToLoad = 7;
            break;
          case '1M':
            granularity = '10min'; // Use 10-minute data from ten_minute_prices table
            daysToLoad = 30;
            break;
          case '3M':
            granularity = 'daily'; // Use daily data from daily_prices table
            daysToLoad = 90;
            break;
          case 'YTD':
            // Calculate days from Jan 1 to today
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            daysToLoad = Math.ceil((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
            
            // Use 10-minute data if less than 3 months have elapsed in the current year
            const threeMonthsInDays = 90;
            if (daysToLoad < threeMonthsInDays) {
              granularity = '10min'; // Use 10-minute data from ten_minute_prices table
            } else {
              granularity = 'daily'; // Use daily data from daily_prices table
            }
            break;
          case '1Y':
            granularity = 'daily'; // Use daily data from daily_prices table
            daysToLoad = 365;
            break;
          case '5Y':
            granularity = 'daily'; // Use daily data from daily_prices table
            daysToLoad = 365 * 5;
            break;
          default:
            granularity = 'daily'; // Use daily data from daily_prices table
            daysToLoad = 90;
        }
        
        // Load data based on granularity
        let chartData: ChartData;
        
        if (granularity === 'intraday') {
          // Use the existing intraday loading logic with daysToLoad parameter
          await loadIntradayData(daysToLoad);
          
          // For 1D mode, always load candlestick data (needed for both line and candlestick charts)
          if (selectedTimeRange === '1D') {
            await load10MinuteCandlestickData();
          }
          
          return;
        } else if (granularity === '10min') {
          // Load from ten_minute_prices table (1W and 1M views)
          chartData = await HistoricalPriceService.getHistoricalPrices(
            ticker,
            '10min',
            daysToLoad
          );
        } else if (granularity === 'hourly') {
          // Load from hourly_prices table (unused currently)
          chartData = await loadHourlyData(daysToLoad);
        } else {
          // Load from daily_prices table (3M+ views)
          chartData = await HistoricalPriceService.getHistoricalPrices(
            ticker,
            'daily',
            daysToLoad
          );
          
          // For daily views, also load hourly volume data and aggregate to daily
          // This ensures we have volume bars even if daily_prices table has incomplete volume
          try {
            const hourlyChartData = await HistoricalPriceService.getHistoricalPrices(
              ticker,
              'hourly',
              Math.min(daysToLoad, 90) // Hourly data may only be available for last 90 days
            );
            
            if (hourlyChartData.prices.length > 0) {
              // Aggregate hourly volume to daily
              const dailyVolumeMap = new Map<string, number>();
              
              hourlyChartData.prices.forEach(price => {
                const date = new Date(price.date);
                const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const dayKey = dayStart.toISOString().split('T')[0];
                
                const existingVolume = dailyVolumeMap.get(dayKey) || 0;
                dailyVolumeMap.set(dayKey, existingVolume + (price.volume || 0));
              });
              
              // Merge volume data into chartData
              // ONLY use hourly volume for days where daily_prices has zero or null volume
              let mergedCount = 0;
              let preservedCount = 0;
              chartData.prices = chartData.prices.map(price => {
                const existingVolume = price.volume || 0;
                const volumeFromHourly = dailyVolumeMap.get(price.date);
                
                // Only use hourly volume if daily_prices has no volume
                if (existingVolume === 0 && volumeFromHourly !== undefined) {
                  mergedCount++;
                  return {
                    ...price,
                    volume: volumeFromHourly
                  };
                } else if (existingVolume > 0) {
                  preservedCount++;
                }
                return price;
              });
            }
          } catch (error) {
            console.error(`[${ticker}] Failed to load hourly volume data for aggregation:`, error);
            // Continue with volume from daily_prices table
          }
        }
        
        setHistoricalData(chartData);
        // Set data source based on where data came from
        if (chartData.source === 'database') {
          setDataSource('cached'); // Database is treated as cached for UI purposes
        } else if (chartData.source === 'api') {
          setDataSource('api');
        } else {
          setDataSource('mock');
        }
        
        // Convert historical data to chart format
        const now = getCurrentTime().getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        
        let priceData: StockDataPoint[] = chartData.prices.map((price, index) => {
          const date = new Date(price.date);
          const dayIndex = Math.floor((date.getTime() - now) / dayMs);
          
          return {
            date: price.date,
            value: price.close,
            timestamp: date.getTime(),
            dayIndex,
            volume: price.volume,
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close
          };
        });
        
        // Replace the most recent data point with current price from stock_quote_now
        // This ensures the chart shows real-time price, not yesterday's close
        if (priceData.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];
          const currentTimestamp = getCurrentTime().getTime();
          
          // Check if today is a weekend using centralized utility
          const isWeekend = isCurrentlyWeekend();
          const isHoliday = await isTodayHoliday();
          
          // Check if the last data point is today or in the past
          const lastPoint = priceData[priceData.length - 1];
          const lastDate = new Date(lastPoint.date);
          lastDate.setHours(0, 0, 0, 0);
          
          if (lastDate.toISOString().split('T')[0] === todayStr) {
            // Update today's price with current price from stock_quote_now
            // Update timestamp to current time (not midnight) to ensure it connects to "now" line
            priceData[priceData.length - 1] = {
              ...lastPoint,
              value: stockData.currentPrice,
              close: stockData.currentPrice,
              timestamp: currentTimestamp
            };
          } else if (lastDate < today && !isWeekend && !isHoliday) {
            // Last data point is from a previous day, add today's point
            // ONLY do this on weekdays/non-holidays - on weekends/holidays, keep showing Friday's last trade position
            // Use current time (not midnight) for timestamp to ensure it connects to "now" line
            priceData.push({
              date: todayStr,
              value: stockData.currentPrice,
              timestamp: currentTimestamp,
              dayIndex: 0,
              volume: 0,
              open: stockData.currentPrice,
              high: stockData.currentPrice,
              low: stockData.currentPrice
            });
          }
          // On weekends: Don't add synthetic point - chart will show Friday's last trade position
        }
        
        // Load events for this ticker - use preloaded data if available
        const stockEvents = preloadedEventsData.length > 0 
          ? preloadedEventsData
          : await DataService.getEventsByTicker(ticker);

        
        // Detect if we're using synthetic/mock data (dates close to current time)
        const firstPriceDate = new Date(priceData[0]?.date);
        const lastPriceDate = new Date(priceData[priceData.length - 1]?.date);
        const daysSinceLastPrice = Math.abs((now - lastPriceDate.getTime()) / dayMs);
        const isUsingSyntheticData = daysSinceLastPrice < 7; // If last price is within 7 days, assume synthetic data
        
        // Get price data time range for filtering
        const priceDataStartTime = firstPriceDate.getTime();
        const priceDataEndTime = lastPriceDate.getTime();
        


        // Filter events to only those that should be matched to historical price data
        const validHistoricalEvents = stockEvents.filter(event => {
          if (!event.actualDateTime) {
            return false;
          }
          
          const eventTime = new Date(event.actualDateTime).getTime();
          const isPastEvent = eventTime <= now;
          const isWithinPriceDataRange = eventTime >= priceDataStartTime && eventTime <= priceDataEndTime;
          
          return isPastEvent && isWithinPriceDataRange;
        });

        // Map valid events to price data points using ACTUAL DATE MATCHING ONLY
        // Track which events have already been matched to prevent duplicates
        const matchedEventIds = new Set<string>();
        
        const enhancedData = priceData.map((point, index) => {
          let matchingEvent = null;

          // ALWAYS use exact date matching - never artificially distribute events
          matchingEvent = validHistoricalEvents.find(event => {
            if (!event.actualDateTime) return false;
            
            // Skip if this event has already been matched to avoid duplicates
            if (matchedEventIds.has(event.id)) return false;
            
            const eventTime = new Date(event.actualDateTime).getTime();
            const pointDate = new Date(point.date);
            
            // Normalize both times to the same day (ignore time of day)
            const eventDate = new Date(eventTime);
            eventDate.setHours(0, 0, 0, 0);
            pointDate.setHours(0, 0, 0, 0);
            
            const timeDiff = Math.abs(eventDate.getTime() - pointDate.getTime());
            const isWithinTimeWindow = timeDiff <= dayMs; // Within 1 day
            
            if (isWithinTimeWindow) {
              // Mark this event as matched to prevent duplicates
              matchedEventIds.add(event.id);
            }
            
            return isWithinTimeWindow;
          });

          return {
            ...point,
            catalyst: matchingEvent
          };
        });
        
        const eventsWithCatalysts = enhancedData.filter(point => point.catalyst);

        // Calculate alignment position for catalyst line
        const lastPrice = enhancedData[enhancedData.length - 1]?.value || stockData.currentPrice;
        const minValue = Math.min(...enhancedData.map(d => d.value));
        const maxValue = Math.max(...enhancedData.map(d => d.value));
        const padding = (maxValue - minValue) * 0.1;
        const yAxisMin = minValue - padding;
        const yAxisMax = maxValue + padding;
        const normalizedLinePosition = (lastPrice - yAxisMin) / (yAxisMax - yAxisMin);

        // Determine future days viewport based on selected time range
        // 1D to 3M: Always show 3 months (90 days) of upcoming events
        // YTD and beyond: Show equal amount of upcoming time as historical time
        const getFutureDaysViewport = (range: TimeRange): number => {
          switch (range) {
            case '1D':
            case '1W':
            case '1M':
            case '3M':
              return 90; // Always 3 months of upcoming events for short time ranges
            default:
              return 90;
          }
        };
        
        const futureDaysViewport = getFutureDaysViewport(selectedTimeRange);

        // Generate future catalyst timeline
        const futureCatalystData = generateStockFutureCatalysts(stockEvents, ticker, futureDaysViewport, normalizedLinePosition);

        setStockPriceData(enhancedData);
        setFutureCatalysts(futureCatalystData);
        setEvents(stockEvents);
        setIsLoading(false); // Mark as loaded successfully
        
      } catch (error) {
        // NO MORE MOCK DATA FALLBACK - Show error state
        // Set empty data to show error state
        setStockPriceData([]);
        setEvents([]);
        setFutureCatalysts([]);
        setDataSource('api'); // Mark as attempted to load from API
      } finally {
        setIsLoading(false);
      }
    };

    const loadIntradayData = async (daysToLoad: number = 1) => {
      try {
        console.log(`[DEBUG StockChart ${ticker}] 📊 Loading intraday data for ${daysToLoad} days...`);
        
        // Load intraday price data using the new service
        // For multi-day intraday (1W view), pass the days parameter
        const chartData = await HistoricalPriceService.getHistoricalPrices(
          ticker, 
          'intraday', 
          daysToLoad
        );
        
        console.log(`[DEBUG StockChart ${ticker}] 📦 Received chart data:`, {
          symbol: chartData.symbol,
          priceCount: chartData.prices.length,
          timeframe: chartData.timeframe,
          fromDate: chartData.fromDate,
          toDate: chartData.toDate,
          source: chartData.source
        });
        
        setHistoricalData(chartData);
        // Set data source based on where data came from
        if (chartData.source === 'database') {
          setDataSource('cached'); // Database is treated as cached for UI purposes
        } else if (chartData.source === 'api') {
          setDataSource('api');
        } else {
          setDataSource('mock');
        }
        
        // Convert historical data to chart format
        const now = getCurrentTime().getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        const hourMs = 60 * 60 * 1000;

        
        let priceData: StockDataPoint[] = chartData.prices.map((price, index) => {
          const date = new Date(price.date);
          const dayIndex = Math.floor((date.getTime() - now) / dayMs);
          const hourIndex = Math.floor((date.getTime() - now) / hourMs);
          
          return {
            date: price.date,
            value: price.close,
            timestamp: date.getTime(),
            dayIndex,
            hourIndex,
            volume: price.volume,
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            session: price.session // Pass through session field
          };
        });
        
        // Log the actual time range of the data
        if (priceData.length > 0) {
          const firstTime = new Date(priceData[0].timestamp);
          const lastTime = new Date(priceData[priceData.length - 1].timestamp);
          console.log(`[DEBUG StockChart ${ticker}] 📈 Price data time range: ${firstTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET to ${lastTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET (${priceData.length} points)`);
          
          // CRITICAL FIX: If the last data point is more than 5 minutes old and we're in trading hours,
          // add the current live price to extend the chart to "now"
          // BUT only if the gap is less than 2 hours to avoid sparse data artifacts
          const lastTimestamp = priceData[priceData.length - 1].timestamp;
          const timeSinceLastData = Date.now() - lastTimestamp;
          const fiveMinutes = 5 * 60 * 1000;
          const twoHours = 2 * 60 * 60 * 1000;
          
          if (timeSinceLastData > fiveMinutes && timeSinceLastData < twoHours) {
            console.log(`[DEBUG StockChart ${ticker}] ⚠️ Last data is ${Math.round(timeSinceLastData / 60000)} minutes old. Adding current live price at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
            
            // Add current live price point
            priceData.push({
              date: new Date().toISOString(),
              value: stockData.currentPrice,
              timestamp: Date.now(),
              dayIndex: 0,
              hourIndex: 0,
              volume: 0,
              open: stockData.currentPrice,
              high: stockData.currentPrice,
              low: stockData.currentPrice,
              close: stockData.currentPrice
            });
          } else if (timeSinceLastData >= twoHours) {
            console.log(`[DEBUG StockChart ${ticker}] ⚠️ Last data is ${Math.round(timeSinceLastData / 60000)} minutes old (>${Math.round(twoHours / 60000)} min). NOT adding current live price to avoid sparse data artifacts.`);
          }
        }
        
        // NO DOWNSAMPLING NEEDED: 
        // 1D view uses 5-minute data from five_minute_prices table (~144 bars for 12 hours: 8 AM - 8 PM ET)
        // 1W view uses 5-minute data from five_minute_prices table (~390 bars for 5 trading days)
        // Both granularities are optimal for smooth rendering without client-side downsampling
        
        // Replace the most recent data point with current price from stock_quote_now
        // This ensures the chart shows real-time price, not yesterday's close
        if (priceData.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];
          const currentTimestamp = getCurrentTime().getTime();
          
          // Check if today is a weekend using centralized utility
          const isWeekend = isCurrentlyWeekend();
          const isHoliday = await isTodayHoliday();
          
          // Check if the last data point is today or in the past
          const lastPoint = priceData[priceData.length - 1];
          const lastDate = new Date(lastPoint.date);
          lastDate.setHours(0, 0, 0, 0);
          
          if (lastDate.toISOString().split('T')[0] === todayStr) {
            // Update today's price with current price from stock_quote_now
            // IMPORTANT: For 1D view, keep the original timestamp (don't update to current time)
            // This ensures volume bars align properly with the price line
            priceData[priceData.length - 1] = {
              ...lastPoint,
              value: stockData.currentPrice,
              close: stockData.currentPrice,
              // Keep original timestamp for proper volume/price alignment
              // timestamp: currentTimestamp  // DON'T DO THIS for intraday
            };
          } else if (lastDate < today && !isWeekend && !isHoliday) {
            // Last data point is from a previous day
            // CRITICAL: Only add today's point if market has opened and we have new data
            // Otherwise, keep showing the last traded position from the previous trading day
            // This prevents the chart from showing a "current price position" before market opens
            const isPreMarket = isCurrentlyPreMarket();
            
            if (!isPreMarket) {
              // Market is open or after-hours (8 AM - midnight ET on weekdays)
              // Add today's point using current time
              priceData.push({
                date: todayStr,
                value: stockData.currentPrice,
                timestamp: currentTimestamp,
                dayIndex: 0,
                volume: 0,
                open: stockData.currentPrice,
                high: stockData.currentPrice,
                low: stockData.currentPrice
              });
            }
            // Before 8 AM on weekdays: Don't add synthetic point - show last traded position
          }
          // On weekends: Don't add synthetic point - chart will show Friday's last trade position
        }
        
        // Load events for this ticker - use preloaded data if available
        const stockEvents = preloadedEventsData.length > 0 
          ? preloadedEventsData
          : await DataService.getEventsByTicker(ticker);

        
        // Detect if we're using synthetic/mock data (dates close to current time)
        const firstPriceDate = new Date(priceData[0]?.date);
        const lastPriceDate = new Date(priceData[priceData.length - 1]?.date);
        const daysSinceLastPrice = Math.abs((now - lastPriceDate.getTime()) / dayMs);
        const isUsingSyntheticData = daysSinceLastPrice < 7; // If last price is within 7 days, assume synthetic data
        
        // Get price data time range for filtering
        const priceDataStartTime = firstPriceDate.getTime();
        const priceDataEndTime = lastPriceDate.getTime();
        


        // Filter events to only those that should be matched to historical price data
        const validHistoricalEvents = stockEvents.filter(event => {
          if (!event.actualDateTime) {
            return false;
          }
          
          const eventTime = new Date(event.actualDateTime).getTime();
          const isPastEvent = eventTime <= now;
          const isWithinPriceDataRange = eventTime >= priceDataStartTime && eventTime <= priceDataEndTime;
          
          return isPastEvent && isWithinPriceDataRange;
        });

        // Map valid events to price data points using ACTUAL DATE MATCHING ONLY
        // Track which events have already been matched to prevent duplicates
        const matchedEventIds = new Set<string>();
        
        const enhancedData = priceData.map((point, index) => {
          let matchingEvent = null;

          // ALWAYS use exact date matching - never artificially distribute events
          matchingEvent = validHistoricalEvents.find(event => {
            if (!event.actualDateTime) return false;
            
            // Skip if this event has already been matched to avoid duplicates
            if (matchedEventIds.has(event.id)) return false;
            
            const eventTime = new Date(event.actualDateTime).getTime();
            const pointDate = new Date(point.date);
            
            // Normalize both times to the same day (ignore time of day)
            const eventDate = new Date(eventTime);
            eventDate.setHours(0, 0, 0, 0);
            pointDate.setHours(0, 0, 0, 0);
            
            const timeDiff = Math.abs(eventDate.getTime() - pointDate.getTime());
            const isWithinTimeWindow = timeDiff <= dayMs; // Within 1 day
            
            if (isWithinTimeWindow) {
              // Mark this event as matched to prevent duplicates
              matchedEventIds.add(event.id);
            }
            
            return isWithinTimeWindow;
          });

          return {
            ...point,
            catalyst: matchingEvent
          };
        });
        
        const eventsWithCatalysts = enhancedData.filter(point => point.catalyst);

        // Calculate alignment position for catalyst line
        const lastPrice = enhancedData[enhancedData.length - 1]?.value || stockData.currentPrice;
        const minValue = Math.min(...enhancedData.map(d => d.value));
        const maxValue = Math.max(...enhancedData.map(d => d.value));
        const padding = (maxValue - minValue) * 0.1;
        const yAxisMin = minValue - padding;
        const yAxisMax = maxValue + padding;
        const normalizedLinePosition = (lastPrice - yAxisMin) / (yAxisMax - yAxisMin);

        // Determine future days viewport based on selected time range
        // 1D to 3M: Always show 3 months (90 days) of upcoming events
        // YTD and beyond: Show equal amount of upcoming time as historical time
        const getFutureDaysViewport = (range: TimeRange): number => {
          switch (range) {
            case '1D':
            case '1W':
            case '1M':
            case '3M':
              return 90; // Always 3 months of upcoming events for short time ranges
            default:
              return 90;
          }
        };
        
        const futureDaysViewport = getFutureDaysViewport(selectedTimeRange);

        // Generate future catalyst timeline
        const futureCatalystData = generateStockFutureCatalysts(stockEvents, ticker, futureDaysViewport, normalizedLinePosition);

        setStockPriceData(enhancedData);
        setFutureCatalysts(futureCatalystData);
        setEvents(stockEvents);
        setIsLoading(false); // Mark as loaded successfully
        
      } catch (error) {
        // NO MORE MOCK DATA FALLBACK - Show error state
        // Set empty data to show error state
        setStockPriceData([]);
        setEvents([]);
        setFutureCatalysts([]);
        setDataSource('api'); // Mark as attempted to load from API
      } finally {
        setIsLoading(false);
      }
    };

    const load10MinuteCandlestickData = async () => {
      try {
        console.log(`🔷 [${ticker}] ===== CANDLESTICK DATA LOADING DEBUG =====`);
        
        // OPTIMIZATION: Use pre-aggregated 5-minute candles from database for completed candles
        // Only aggregate the current forming candle from live intraday data
        
        // Get current time and determine the current 5-minute bucket
        const now = Date.now();
        const fiveMinMs = 5 * 60 * 1000;
        const currentBucketStart = Math.floor(now / fiveMinMs) * fiveMinMs;
        
        console.log(`🔷 [${ticker}] Current time: ${new Date(now).toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
        console.log(`🔷 [${ticker}] Current 5-min bucket starts at: ${new Date(currentBucketStart).toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
        
        // Fetch pre-aggregated 5-minute candles from database
        const fiveMinData = await HistoricalPriceService.getHistoricalPrices(
          ticker,
          '5min', // Use pre-aggregated 5-minute candles
          1 // Today only
        );
        
        console.log(`🔷 [${ticker}] Received ${fiveMinData.prices.length} 5-min candles from database`);
        if (fiveMinData.prices.length > 0) {
          console.log(`🔷 [${ticker}] First candle: ${new Date(fiveMinData.prices[0].date).toLocaleString('en-US', { timeZone: 'America/New_York' })} - OHLC: ${fiveMinData.prices[0].open}/${fiveMinData.prices[0].high}/${fiveMinData.prices[0].low}/${fiveMinData.prices[0].close}`);
          console.log(`🔷 [${ticker}] Last candle: ${new Date(fiveMinData.prices[fiveMinData.prices.length - 1].date).toLocaleString('en-US', { timeZone: 'America/New_York' })} - OHLC: ${fiveMinData.prices[fiveMinData.prices.length - 1].open}/${fiveMinData.prices[fiveMinData.prices.length - 1].high}/${fiveMinData.prices[fiveMinData.prices.length - 1].low}/${fiveMinData.prices[fiveMinData.prices.length - 1].close}`);
        }
        
        // Use completed candles from database (before current bucket)
        const completedCandles = fiveMinData.prices
          .filter(price => {
            const candleTime = new Date(price.date).getTime();
            return candleTime < currentBucketStart;
          })
          .map(price => ({
            timestamp: new Date(price.date).getTime(),
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume
          }));
        
        console.log(`🔷 [${ticker}] Completed candles (before current bucket): ${completedCandles.length}`);
        console.log(`✅ [StockAPI] Using ${completedCandles.length} pre-aggregated 5-min candles for ${ticker}`);
        
        // Fetch live intraday data to create the current forming candle
        const intradayData = await HistoricalPriceService.getHistoricalPrices(
          ticker,
          'intraday',
          1
        );
        
        console.log(`🔷 [${ticker}] Received ${intradayData.prices.length} intraday prices for forming candle`);
        
        // Filter to only prices in the current 5-minute bucket
        const currentBucketPrices = intradayData.prices.filter(price => {
          const priceTime = new Date(price.date).getTime();
          return priceTime >= currentBucketStart && priceTime < currentBucketStart + fiveMinMs;
        });
        
        console.log(`🔷 [${ticker}] Prices in current bucket: ${currentBucketPrices.length}`);
        
        // Aggregate current bucket into forming candle
        let formingCandle = null;
        if (currentBucketPrices.length > 0) {
          const opens = currentBucketPrices.map(p => p.open);
          const highs = currentBucketPrices.map(p => p.high);
          const lows = currentBucketPrices.map(p => p.low);
          const volumes = currentBucketPrices.map(p => p.volume);
          
          formingCandle = {
            timestamp: currentBucketStart,
            open: opens[0],
            high: Math.max(...highs),
            low: Math.min(...lows),
            close: currentBucketPrices[currentBucketPrices.length - 1].close,
            volume: volumes.reduce((sum, v) => sum + v, 0)
          };
          
          console.log(`🔷 [${ticker}] Forming candle: ${new Date(formingCandle.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })} - OHLC: ${formingCandle.open}/${formingCandle.high}/${formingCandle.low}/${formingCandle.close}`);
        } else {
          console.log(`🔷 [${ticker}] No forming candle (no prices in current bucket)`);
        }
        
        // Combine completed candles with forming candle
        const allCandles = formingCandle 
          ? [...completedCandles, formingCandle]
          : completedCandles;
        
        console.log(`🔷 [${ticker}] Total candles after combining: ${allCandles.length}`);
        
        // Convert to StockDataPoint format
        const convertedData: StockDataPoint[] = allCandles.map((candle, index) => ({
          date: new Date(candle.timestamp).toISOString().split('T')[0],
          timestamp: candle.timestamp,
          value: candle.close,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          volume: candle.volume,
          dayIndex: index
        }));
        
        console.log(`🔷 [${ticker}] Final candlestick data points: ${convertedData.length}`);
        
        // Debug: Check first few candles after conversion
        if (convertedData.length > 0) {
          console.log(`🔷 [${ticker}] First converted candle:`, {
            timestamp: new Date(convertedData[0].timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }),
            open: convertedData[0].open,
            high: convertedData[0].high,
            low: convertedData[0].low,
            close: convertedData[0].value,
            volume: convertedData[0].volume
          });
          console.log(`🔷 [${ticker}] Last converted candle:`, {
            timestamp: new Date(convertedData[convertedData.length - 1].timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }),
            open: convertedData[convertedData.length - 1].open,
            high: convertedData[convertedData.length - 1].high,
            low: convertedData[convertedData.length - 1].low,
            close: convertedData[convertedData.length - 1].value,
            volume: convertedData[convertedData.length - 1].volume
          });
          
          const prices = convertedData.map(d => d.value); // Use 'value' not 'close'
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          console.log(`🔷 [${ticker}] Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
          console.log(`🔷 [${ticker}] Sample prices:`, prices.slice(0, 5));
        }
        console.log(`🔷 [${ticker}] ===== END CANDLESTICK DEBUG =====`);
        
        setCandlestickData(convertedData);
      } catch (error) {
        console.error(`[${ticker}] 🔷 Error loading candlestick data:`, error);
      }
    };

    const loadHourlyData = async (days: number): Promise<ChartData> => {
      try {
        // Use the HistoricalPriceService to fetch hourly data
        // This will use the hourly_prices table with proper market hours filtering
        const chartData = await HistoricalPriceService.getHistoricalPrices(
          ticker,
          'hourly',
          days
        );
        
        return chartData;
      } catch (error) {
        console.error(`[${ticker}] Error fetching hourly data:`, error);
        // Return an empty chart data object
        return {
          source: 'database',
          prices: []
        };
      }
    };

    // Only load data if stockData is valid
    if (hasValidStockData) {
      loadData();
    }
  }, [ticker, stockData?.currentPrice, selectedTimeRange, miniMode, hasValidStockData]);

  // Load candlestick data when switching to candlestick chart in 1D mode
  useEffect(() => {
    const loadCandlestickDataIfNeeded = async () => {
      // Only load if we're in 1D mode, showing advanced chart, and don't have candlestick data yet
      if (selectedTimeRange === '1D' && showAdvancedChart && candlestickData.length === 0 && hasValidStockData) {
        console.log(`[${ticker}] 🔄 Switching to candlestick chart - loading candlestick data...`);
        try {
          // Use the same approach as load10MinuteCandlestickData
          const now = Date.now();
          const fiveMinMs = 5 * 60 * 1000;
          const currentBucketStart = Math.floor(now / fiveMinMs) * fiveMinMs;
          
          // Fetch pre-aggregated 5-minute candles from database
          const fiveMinData = await HistoricalPriceService.getHistoricalPrices(
            ticker,
            '5min',
            1
          );
          
          // Use completed candles from database
          const completedCandles = fiveMinData.prices
            .filter(price => {
              const candleTime = new Date(price.date).getTime();
              return candleTime < currentBucketStart;
            })
            .map(price => ({
              timestamp: new Date(price.date).getTime(),
              open: price.open,
              high: price.high,
              low: price.low,
              close: price.close,
              volume: price.volume
            }));
          
          // Fetch live intraday data for forming candle
          const intradayData = await HistoricalPriceService.getHistoricalPrices(
            ticker,
            'intraday',
            1
          );
          
          // Filter current bucket
          const currentBucketPrices = intradayData.prices.filter(price => {
            const priceTime = new Date(price.date).getTime();
            return priceTime >= currentBucketStart && priceTime < currentBucketStart + fiveMinMs;
          });
          
          // Create forming candle
          let formingCandle = null;
          if (currentBucketPrices.length > 0) {
            const opens = currentBucketPrices.map(p => p.open);
            const highs = currentBucketPrices.map(p => p.high);
            const lows = currentBucketPrices.map(p => p.low);
            const volumes = currentBucketPrices.map(p => p.volume);
            
            formingCandle = {
              timestamp: currentBucketStart,
              open: opens[0],
              high: Math.max(...highs),
              low: Math.min(...lows),
              close: currentBucketPrices[currentBucketPrices.length - 1].close,
              volume: volumes.reduce((sum, v) => sum + v, 0)
            };
          }
          
          // Combine candles
          const allCandles = formingCandle 
            ? [...completedCandles, formingCandle]
            : completedCandles;
          
          // Convert to StockDataPoint format
          const convertedData = allCandles.map((candle) => ({
            date: new Date(candle.timestamp).toISOString(),
            value: candle.close,
            timestamp: candle.timestamp,
            dayIndex: 0,
            volume: candle.volume,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
          }));
          
          setCandlestickData(convertedData);
          console.log(`[${ticker}] ✅ Loaded ${convertedData.length} candlestick data points`);
        } catch (error) {
          console.error(`[${ticker}] Error loading candlestick data:`, error);
        }
      }
    };
    
    loadCandlestickDataIfNeeded();
  }, [showAdvancedChart, selectedTimeRange, ticker, candlestickData.length, hasValidStockData]);

  // Handle time range changes
  const handleTimeRangeChange = (range: TimeRange) => {
    // Immediately set loading state to prevent rendering old data with new time range
    setIsLoading(true);
    setStockPriceData([]); // Clear old data immediately
    setSelectedTimeRange(range);
  };

  // Show loading if data is not ready
  if (!hasValidStockData || isLoading) {
    return (
      <div className={`w-full ${effectiveHeight}`}>
        <div className={`w-full ${effectiveHeight} flex items-center justify-center ${miniMode ? 'bg-muted/20 rounded border-0' : 'bg-background rounded-lg border border-border/50'}`}>
          {!miniMode && (
            <div className="text-sm text-muted-foreground">
              {!hasValidStockData ? 'Loading chart data...' : 'Loading price chart...'}
            </div>
          )}
          {miniMode && (
            // Simple animated line for mini chart loading
            <div className="w-full h-full flex items-center px-2">
              <div className="w-full h-[2px] bg-muted rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-ai-accent/50 animate-pulse rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {miniMode ? (
        <SimpleMiniChart
          data={stockPriceData.map(point => ({
            timestamp: point.timestamp,
            value: point.value,
            session: point.session // Pass through session field
          }))}
          previousClose={previousClose}
          currentPrice={stockData.currentPrice}
          ticker={ticker}
          futureCatalysts={futureCatalysts}
          width={300}
          height={120}
          strokeWidth={1.5}
          centeredEventId={centeredEventId}
          disableAnimation={disableAnimation}
          previousDayData={previousDayData}
          shortenedTradingHours={shortenedTradingHours}
          globalMinValue={globalMinValue}
          globalMaxValue={globalMaxValue}
        />
      ) : (
        <div className="relative">
          {/* Conditional chart rendering */}
          {showAdvancedChart ? (
            <AdvancedFinancialChart
              ticker={ticker}
              data={(() => {
                // For 1D: Use candlestickData if available (5-minute aggregated candles)
                // For other ranges: Use stockPriceData directly
                if (selectedTimeRange === '1D' && candlestickData.length > 0) {
                  // Use the pre-aggregated 5-minute candle data
                  return candlestickData.map(point => ({
                    date: new Date(point.timestamp),
                    open: point.open || point.value,
                    high: point.high || point.value,
                    low: point.low || point.value,
                    close: point.close || point.value,
                    volume: point.volume || 0,
                    session: point.session // Pass through session field
                  }));
                } else if (selectedTimeRange === '1D') {
                  // Fallback: aggregate stockPriceData on the fly (shouldn't normally happen)
                  const aggregated: Array<{
                    date: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                  }> = [];
                  
                  // Group by 10-minute intervals
                  for (let i = 0; i < stockPriceData.length; i += 2) {
                    const chunk = stockPriceData.slice(i, i + 2);
                    if (chunk.length === 0) continue;
                    
                    const open = chunk[0].open || chunk[0].value;
                    const close = chunk[chunk.length - 1].value;
                    const high = Math.max(...chunk.map(p => p.high || p.value));
                    const low = Math.min(...chunk.map(p => p.low || p.value));
                    const volume = chunk.reduce((sum, p) => sum + (p.volume || 0), 0);
                    
                    aggregated.push({
                      date: new Date(chunk[0].timestamp),
                      open,
                      high,
                      low,
                      close,
                      volume
                    });
                  }
                  
                  return aggregated;
                } else {
                  // Use stockPriceData directly for non-1D ranges
                  return stockPriceData.map(point => ({
                    date: new Date(point.timestamp),
                    open: point.open || point.value,
                    high: point.high || point.value,
                    low: point.low || point.value,
                    close: point.value,
                    volume: point.volume || 0
                  }));
                }
              })()}
              width={400}
              height={312}
              ratio={1}
              onTimeRangeChange={handleTimeRangeChange}
              defaultTimeRange={selectedTimeRange}
              currentPrice={stockData.currentPrice}
              priceChange={stockData.priceChange}
              priceChangePercent={stockData.priceChangePercent}
              showAdvancedChart={showAdvancedChart}
              onToggleChart={() => {
                setShowAdvancedChart(!showAdvancedChart);
              }}
              futureCatalysts={futureCatalysts}
              pastEvents={events}
              selectedTimeRange={selectedTimeRange}
              previousClose={previousClose}
              previousDayData={previousDayData}
              marketClosePrice={marketClosePrice}
              shortenedTradingHours={shortenedTradingHours}
              showUpcomingRange={showUpcomingRange}
              onShowUpcomingRangeChange={setShowUpcomingRange}
              showPastEvents={showPastEvents}
              onShowPastEventsChange={setShowPastEvents}
              settingsOpen={settingsOpen}
              onSettingsOpenChange={setSettingsOpen}
              selectedEventTypes={selectedEventTypes}
              onSelectedEventTypesChange={setSelectedEventTypes}
              priceTargets={selectedTimeRange === '1D' ? [] : priceTargets}
            />
          ) : (
            <LargeSVGChart
              data={stockPriceData.map(point => ({
                timestamp: point.timestamp,
                value: point.value,
                volume: point.volume,
                open: point.open,
                high: point.high,
                low: point.low,
                close: point.close,
                session: point.session // Pass through session field
              }))}
              previousClose={previousClose}
              currentPrice={stockData.currentPrice}
              priceChange={stockData.priceChange}
              priceChangePercent={stockData.priceChangePercent}
              futureCatalysts={futureCatalysts}
              pastEvents={events}
              width={400}
              height={312}
              strokeWidth={2}
              onTimeRangeChange={handleTimeRangeChange}
              defaultTimeRange={selectedTimeRange}
              onEventClick={onEventClick}
              centeredEventId={centeredEventId}
              disableAnimation={disableAnimation}
              previousDayData={previousDayData}
              showAdvancedChart={showAdvancedChart}
              onToggleChart={() => setShowAdvancedChart(!showAdvancedChart)}
              ticker={ticker}
              marketClosePrice={marketClosePrice}
              shortenedTradingHours={shortenedTradingHours}
              showUpcomingRange={showUpcomingRange}
              onShowUpcomingRangeChange={setShowUpcomingRange}
              showPastEvents={showPastEvents}
              onShowPastEventsChange={setShowPastEvents}
              settingsOpen={settingsOpen}
              onSettingsOpenChange={setSettingsOpen}
              selectedEventTypes={selectedEventTypes}
              onSelectedEventTypesChange={setSelectedEventTypes}
              priceTargets={selectedTimeRange === '1D' ? [] : priceTargets}
            />
          )}
        </div>
      )}
    </>
  );
}