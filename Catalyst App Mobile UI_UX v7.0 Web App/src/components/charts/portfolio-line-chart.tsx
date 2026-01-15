import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Button } from '../ui/button';
import { formatCurrency, eventTypeConfig, getEventTypeLabel, getEventTypeHexColor } from '../../utils/formatting';
import { MarketEvent } from '../../utils/supabase/events-api';
import { getCurrentTime } from '../../utils/current-time';
import DataService from '../../utils/data-service';
import { motion } from 'motion/react';
import { useMarketStatus } from '../../utils/market-status';
import { AnimatedPrice } from '../animated-price';
import realtimePriceService from '../../utils/realtime-price-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import StockAPI from '../../utils/supabase/stock-api';

// Time range options
export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y';

interface ChartDataPoint {
  date: string;
  value: number;
  timestamp: number;
  catalyst?: MarketEvent;
  dayIndex: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: MarketEvent;
  dayIndex: number;
  position: number;
}

interface RobinhoodStyleChartProps {
  data: ChartDataPoint[];
  futureCatalysts: FutureCatalyst[];
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  previousClose?: number; // Previous day's closing price for reference line
  title?: string;
  subtitle?: string;
  dataSource?: 'api' | 'cached' | 'mock';
  onTimeRangeChange?: (range: TimeRange) => void;
  defaultTimeRange?: TimeRange;
  showEvents?: boolean;
  height?: string;
  miniMode?: boolean;
  useCompanyLogos?: boolean;
  highlightedEventId?: string | null;
  ticker?: string; // Added for realtime price updates
}

// Time range configurations - SYMMETRIC BY DEFAULT (Now line centered when fully zoomed out)
const TIME_RANGE_CONFIG_MAIN: Record<TimeRange, { 
  label: string; 
  pastDays: number; 
  futureDays: number;
  tickInterval?: number;
}> = {
  '1W': { label: '1W', pastDays: 3.5, futureDays: 3.5 }, // 3.5 days each way
  '1M': { label: '1M', pastDays: 15, futureDays: 15 }, // 15 days each way  
  '3M': { label: '3M', pastDays: 45, futureDays: 45 }, // 1.5 months each way
  '6M': { label: '6M', pastDays: 91.25, futureDays: 91.25 }, // 3 months each way
  '1Y': { label: '1Y', pastDays: 182.5, futureDays: 182.5 }, // 6 months each way
  '5Y': { label: '5Y', pastDays: 912.5, futureDays: 912.5 } // 2.5 years each way
};

// Time range configurations for mini charts - IDENTICAL TO MAIN (both start centered)
const TIME_RANGE_CONFIG_MINI: Record<TimeRange, { 
  label: string; 
  pastDays: number; 
  futureDays: number;
  tickInterval?: number;
}> = {
  '1W': { label: '1W', pastDays: 3.5, futureDays: 3.5 }, // 3.5 days each way
  '1M': { label: '1M', pastDays: 15, futureDays: 15 }, // 15 days each way
  '3M': { label: '3M', pastDays: 45, futureDays: 45 }, // 1.5 months each way
  '6M': { label: '6M', pastDays: 91.25, futureDays: 91.25 }, // 3 months each way
  '1Y': { label: '1Y', pastDays: 182.5, futureDays: 182.5 }, // 6 months each way
  '5Y': { label: '5Y', pastDays: 912.5, futureDays: 912.5 } // 2.5 years each way
};

export function RobinhoodStyleChart({
  data,
  futureCatalysts,
  currentPrice,
  priceChange,
  priceChangePercent,
  previousClose,
  title,
  subtitle,
  dataSource = 'mock',
  onTimeRangeChange,
  defaultTimeRange = '6M',
  showEvents = true,
  height = 'h-80',
  miniMode = false,
  useCompanyLogos = false,
  highlightedEventId = null,
  ticker
}: RobinhoodStyleChartProps) {

  // Market status (needed early for useEffect dependencies)
  const marketStatus = useMarketStatus();
  const isMarketOpen = marketStatus.status === 'open' || marketStatus.status === 'pre-market' || marketStatus.status === 'after-hours';
  const isMarketClosed = marketStatus.status === 'closed'; // Weekend or holiday

  // Fetch real intraday price data from database
  const [intradayData, setIntradayData] = useState<ChartDataPoint[]>([]);
  const [intradayLoading, setIntradayLoading] = useState(false);
  const [showPreviousDayFull, setShowPreviousDayFull] = useState(false);
  
  // Helper function to check if we're in the post-close period (8pm-8am)
  const isPostClosePeriod = useCallback(() => {
    const now = new Date();
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false
    });
    const etHour = parseInt(etFormatter.format(now).split(' ')[0]);
    
    // Between 8pm (20) and midnight (23), or between midnight (0) and 8am (7)
    const isPostClose = etHour >= 20 || etHour < 8;
    
    return isPostClose;
  }, [miniMode, ticker]);
  
  useEffect(() => {
    if (!miniMode || !ticker) {
      setIntradayData([]);
      setShowPreviousDayFull(false);
      return;
    }
    
    const isPostClose = isPostClosePeriod();
    // Show previous day's full data if it's post-close period OR if market is completely closed (weekend/holiday)
    const shouldShowPreviousDay = isPostClose || isMarketClosed;
    setShowPreviousDayFull(shouldShowPreviousDay);
    
    // Fetch intraday data during market hours OR when we should show previous day
    if (!isMarketOpen && !shouldShowPreviousDay) {
      setIntradayData([]);
      return;
    }
    
    const fetchIntradayData = async () => {
      setIntradayLoading(true);
      try {
        // Calculate the date range for the trading day we want to fetch
        const now = new Date();
        const etFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        
        const etDateString = etFormatter.format(now);
        const [month, day, year] = etDateString.split('/');
        const etToday = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Determine which day's data to fetch
        let targetDate = new Date(etToday);
        
        if (shouldShowPreviousDay) {
          // Go back to find the most recent trading day
          targetDate.setDate(targetDate.getDate() - 1);
          
          // Skip weekends
          while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
            targetDate.setDate(targetDate.getDate() - 1);
          }
        }
        
        // Set extended hours for the target date (8:00 AM to 8:00 PM ET)
        // IMPORTANT: Convert ET times to UTC for database query
        const yearStr = targetDate.getFullYear();
        const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(targetDate.getDate()).padStart(2, '0');
        
        // Parse with explicit ET timezone offset (EST is -05:00, EDT is -04:00)
        // Using -05:00 for December (EST)
        const fromDateISO = `${yearStr}-${monthStr}-${dayStr}T08:00:00-05:00`;
        const toDateISO = `${yearStr}-${monthStr}-${dayStr}T20:00:00-05:00`;
        
        // Fetch from one_minute_prices table
        const prices = await StockAPI.getOneMinutePrices(
          ticker,
          fromDateISO,
          toDateISO
        );
        
        if (prices.length === 0) {
          setIntradayData([]);
          return;
        }
        
        // Convert to ChartDataPoint format
        const chartData: ChartDataPoint[] = prices.map((price: any) => ({
          date: new Date(price.timestamp).toISOString().split('T')[0],
          value: price.price,
          timestamp: new Date(price.timestamp).getTime(),
          dayIndex: 0
        }));
        
        setIntradayData(chartData);
      } catch (error) {
        console.error(`[Chart ${ticker}] Error fetching intraday data:`, error);
        setIntradayData([]);
      } finally {
        setIntradayLoading(false);
      }
    };
    
    fetchIntradayData();
    
    // Refresh every 1 minute
    const interval = setInterval(fetchIntradayData, 60000);
    return () => clearInterval(interval);
  }, [miniMode, isMarketOpen, isMarketClosed, ticker, isPostClosePeriod]);
  
  // Generate fallback intraday price data for mini mode when database is empty
  // This creates natural price fluctuations from market open (9:30 AM) to current time
  const generateIntradayData = useCallback((currentPrice: number, previousClose: number, ticker: string): ChartDataPoint[] => {
    const now = getCurrentTime().getTime();
    const todayDate = new Date(now);
    const marketOpenTime = new Date(todayDate.toDateString() + ' 09:30:00 EST').getTime();
    
    // Only generate intraday data during market hours
    if (now < marketOpenTime) {
      return [];
    }
    
    const data: ChartDataPoint[] = [];
    const minuteMs = 60 * 1000;
    const totalMinutes = Math.floor((now - marketOpenTime) / minuteMs);
    
    // Sample every 5 minutes for performance (6.5 hours = 390 minutes / 5 = 78 points)
    const sampleInterval = 5;
    const numPoints = Math.floor(totalMinutes / sampleInterval);
    
    // Seeded random for consistent intraday movements per ticker
    const seedRandom = (seed: number, symbol: string) => {
      const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const x = Math.sin(seed + symbolHash) * 10000;
      return x - Math.floor(x);
    };
    
    // Calculate total price change range (6-10 points of fluctuation)
    const totalPriceChange = currentPrice - previousClose;
    const fluctuationRange = Math.max(6, Math.min(10, Math.abs(previousClose * 0.015))); // 1.5% fluctuation
    
    let currentValue = previousClose;
    
    for (let i = 0; i <= numPoints; i++) {
      const timestamp = marketOpenTime + (i * sampleInterval * minuteMs);
      const progress = i / numPoints; // 0 to 1
      
      // At the last point, use exact current price
      if (i === numPoints || timestamp >= now) {
        currentValue = currentPrice;
      } else {
        // Create natural fluctuations with trend toward final price
        const randomSeed = seedRandom(i * 12.345, ticker);
        const trendComponent = previousClose + (totalPriceChange * progress); // Gradual trend
        const noiseComponent = (randomSeed - 0.5) * (fluctuationRange * 2); // Random fluctuation
        const smoothing = Math.sin(progress * Math.PI) * 0.3; // Smooth transitions
        
        currentValue = trendComponent + (noiseComponent * (1 - progress * smoothing));
      }
      
      const date = new Date(timestamp);
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(currentValue * 100) / 100,
        timestamp,
        dayIndex: 0
      });
      
      // Stop if we've reached current time
      if (timestamp >= now) break;
    }
    
    return data;
  }, []);
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [isInteracting, setIsInteracting] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragStartValue, setDragStartValue] = useState(0);
  const [customPastDays, setCustomPastDays] = useState<number | null>(null);
  const [customFutureDays, setCustomFutureDays] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [companyLogos, setCompanyLogos] = useState<Record<string, string>>({});
  
  // Realtime price state
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [livePriceChange, setLivePriceChange] = useState(priceChange);
  const [livePriceChangePercent, setLivePriceChangePercent] = useState(priceChangePercent);
  
  // Time-based zoom state
  const [timeWindow, setTimeWindow] = useState<{
    startTime: number | null; // null = use default range
    endTime: number | null;   // null = use default range
    zoomLevel: number;
  }>({
    startTime: null,
    endTime: null,
    zoomLevel: 1
  });

  // Zoom slider state
  const [zoomRange, setZoomRange] = useState<{
    start: number; // 0-100 percentage of full range
    end: number;   // 0-100 percentage of full range
  }>({
    start: 0,
    end: 100
  });
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialTimeWindow, setInitialTimeWindow] = useState<typeof timeWindow | null>(null);
  const [initialPinchCenter, setInitialPinchCenter] = useState<{ x: number; y: number } | null>(null);

  // Sync selectedTimeRange with defaultTimeRange prop when it changes
  useEffect(() => {
    setSelectedTimeRange(defaultTimeRange);
  }, [defaultTimeRange]);

  // Subscribe to realtime price updates
  useEffect(() => {
    if (!ticker) return;

    const unsubscribe = realtimePriceService.subscribe((update) => {
      if (update.symbol === ticker.toUpperCase()) {
        setLivePrice(update.price);
        setLivePriceChange(update.change);
        setLivePriceChangePercent(update.changePercent);
      }
    });

    return unsubscribe;
  }, [ticker]);

  // Update live price when props change
  useEffect(() => {
    setLivePrice(currentPrice);
    setLivePriceChange(priceChange);
    setLivePriceChangePercent(priceChangePercent);
  }, [currentPrice, priceChange, priceChangePercent]);

  // Reset all zoom and custom range state when time range changes
  useEffect(() => {
    setZoomRange({ start: 0, end: 100 });
    setTimeWindow({ startTime: null, endTime: null, zoomLevel: 1 });
    setCustomPastDays(null);
    setCustomFutureDays(null);
  }, [selectedTimeRange]);

  // Initialize zoom range - both main and mini charts start fully zoomed out
  useEffect(() => {
    // Both main and mini charts: start fully zoomed out with Now line centered
    setZoomRange({ start: 0, end: 100 });
  }, [miniMode]); // Only run when miniMode changes
  
  // Fetch company logos when useCompanyLogos is enabled
  useEffect(() => {
    if (!useCompanyLogos) return;
    
    const fetchLogos = async () => {
      const logos: Record<string, string> = {};
      
      // Get unique tickers from data and future catalysts
      const tickers = new Set<string>();
      data.forEach(point => {
        if (point.catalyst?.ticker) {
          tickers.add(point.catalyst.ticker);
        }
      });
      futureCatalysts.forEach(fc => {
        if (fc.catalyst?.ticker) {
          tickers.add(fc.catalyst.ticker);
        }
      });
      
      // Fetch stock data for each ticker to get logo
      const tickerArray = Array.from(tickers);
      const logoPromises = tickerArray.map(async (ticker) => {
        try {
          const stockData = await DataService.getStock(ticker);
          if (stockData?.logo) {
            logos[ticker] = stockData.logo;
          }
        } catch (error) {
          console.error(`Error fetching logo for ${ticker}:`, error);
        }
      });
      
      await Promise.all(logoPromises);
      setCompanyLogos(logos);
    };
    
    fetchLogos();
  }, [useCompanyLogos, data, futureCatalysts]);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    event: MarketEvent | null;
    isPastEvent: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    event: null,
    isPastEvent: false
  });

  // Track the actual rendered Y position of the last data point from Recharts
  const lastPointRenderedYRef = useRef<number | null>(null);
  
  // Track the actual rendered Y position of the first data point from Recharts
  const firstPointRenderedYRef = useRef<number | null>(null);
  
  // Force re-render counter to ensure catalyst dots render after tab switches
  const [renderKey, setRenderKey] = useState(0);
  
  // Track whether last point has been captured to trigger future elements render
  const [hasLastPoint, setHasLastPoint] = useState(false);
  
  // Helper function to detect if a dot overlaps with other dots
  const isOverlapping = (cx: number, cy: number, allDots: Array<{cx: number, cy: number}>, threshold: number = 20): boolean => {
    return allDots.some(dot => {
      const distance = Math.sqrt(Math.pow(cx - dot.cx, 2) + Math.pow(cy - dot.cy, 2));
      return distance > 0 && distance < threshold;
    });
  };
  
  // Track whether first point has been captured
  const [hasFirstPoint, setHasFirstPoint] = useState(false);
  
  // Track if we've already triggered the state update to prevent loops
  const hasTriggeredUpdateRef = useRef(false);
  const hasTriggeredFirstUpdateRef = useRef(false);

  // Reset the ref and force re-render when data changes
  useEffect(() => {
    lastPointRenderedYRef.current = null;
    firstPointRenderedYRef.current = null;
    setHasLastPoint(false); // Reset the flag
    setHasFirstPoint(false); // Reset the flag
    hasTriggeredUpdateRef.current = false; // Reset the trigger flag
    hasTriggeredFirstUpdateRef.current = false; // Reset the trigger flag
    setRenderKey(prev => prev + 1);
  }, [data, futureCatalysts]);

  // Crosshair state for price inspection
  const [crosshair, setCrosshair] = useState<{
    visible: boolean;
    x: number;
    dataPoint: ChartDataPoint | null;
  }>({
    visible: false,
    x: 0,
    dataPoint: null
  });
  
  // Calculate time range for chart display
  const getDisplayTimeRange = useCallback(() => {
    // CRITICAL FIX: Use ACTUAL current time, not last data point timestamp
    // This ensures the chart shows the correct time window even if data is outdated
    const now = getCurrentTime().getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Special handling for mini mode when showing previous day's full data (weekends/holidays/post-close)
    if (miniMode && showPreviousDayFull) {
      // Calculate the last trading day
      const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const etDateString = etFormatter.format(now);
      const [month, day, year] = etDateString.split('/');
      const etToday = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      let lastTradingDay = new Date(etToday);
      lastTradingDay.setDate(lastTradingDay.getDate() - 1);
      
      // Skip weekends
      while (lastTradingDay.getDay() === 0 || lastTradingDay.getDay() === 6) {
        lastTradingDay.setDate(lastTradingDay.getDate() - 1);
      }
      
      // Create ET times properly - format as ISO string with ET offset
      const yearStr = lastTradingDay.getFullYear();
      const monthStr = String(lastTradingDay.getMonth() + 1).padStart(2, '0');
      const dayStr = String(lastTradingDay.getDate()).padStart(2, '0');
      
      // Parse with explicit ET timezone offset (EST is -05:00, EDT is -04:00)
      // Using -05:00 for EST (November is EST)
      const extendedStartTime = new Date(`${yearStr}-${monthStr}-${dayStr}T08:00:00-05:00`).getTime();
      const extendedEndTime = new Date(`${yearStr}-${monthStr}-${dayStr}T20:00:00-05:00`).getTime();
      
      // Extend 3 months into the future for showing upcoming events
      const futureDays = 90;
      const futureEndTime = extendedEndTime + (futureDays * dayMs); // Extend from Friday 8 PM, not "now"
      
      return {
        startTime: extendedStartTime, // 8 AM last trading day (converted to UTC)
        endTime: futureEndTime, // Friday 8 PM + 3 months for future events
        pastDays: (extendedEndTime - extendedStartTime) / dayMs, // 12 hours of price data (0.5 days)
        futureDays: futureDays, // 3 months for future events
        marketCloseTime: extendedEndTime // Use 8 PM as the "now" line position
      };
    }
    
    // Special handling for mini mode during market hours
    // Show intraday price from 9:30 AM to now, with future events extending 3 months
    // Midpoint is at current time ("now"), not fixed at 4 PM
    if (miniMode && isMarketOpen) {
      const todayDate = new Date(now);
      const marketOpenTime = new Date(todayDate.toDateString() + ' 09:30:00 EST').getTime();
      
      // Time from market open to now (intraday period)
      const intradaySpan = now - marketOpenTime;
      
      // Future: 3 months from now
      const futureDays = 90;
      const futureMs = futureDays * dayMs;
      
      return {
        startTime: marketOpenTime, // Start at 9:30 AM
        endTime: now + futureMs, // End at now + 3 months
        pastDays: intradaySpan / dayMs, // Time from 9:30 AM to now
        futureDays: futureDays, // 3 months ahead
        marketCloseTime: null // Not using fixed midpoint
      };
    }
    
    // Get the full range for the selected time period - use appropriate config based on mode
    const timeRangeConfig = miniMode ? TIME_RANGE_CONFIG_MINI : TIME_RANGE_CONFIG_MAIN;
    const config = timeRangeConfig[selectedTimeRange];
    const fullPastDays = customPastDays ?? config.pastDays;
    const fullFutureDays = customFutureDays ?? config.futureDays;
    
    // Calculate full time range
    const fullStartTime = now - (fullPastDays * dayMs);
    const fullEndTime = now + (fullFutureDays * dayMs);
    const totalTimeSpan = fullEndTime - fullStartTime;
    
    // Apply zoom slider range - different behavior for main vs mini charts
    let zoomedStartTime: number;
    let zoomedEndTime: number;
    
    if (miniMode) {
      // Mini charts: maintain proportional scaling (original behavior)
      zoomedStartTime = fullStartTime + (zoomRange.start / 100) * totalTimeSpan;
      zoomedEndTime = fullStartTime + (zoomRange.end / 100) * totalTimeSpan;
    } else {
      // Main charts: allow sliding window that can move "now" line freely
      const zoomWidth = zoomRange.end - zoomRange.start; // Width of zoom window (as percentage)
      const scaleFactor = 100 / zoomWidth; // How much we're zoomed in
      
      // Calculate the actual time span we want to show (zoomed)
      const zoomedTimeSpan = totalTimeSpan / scaleFactor;
      
      // Calculate where in the full timeline our zoom window starts
      const windowStartPercent = zoomRange.start / 100;
      const windowStartTime = fullStartTime + (windowStartPercent * totalTimeSpan);
      
      zoomedStartTime = windowStartTime;
      zoomedEndTime = windowStartTime + zoomedTimeSpan;
    }
    
    // If pinch zoom is also applied, further modify the range
    if (timeWindow.startTime !== null && timeWindow.endTime !== null) {
      return {
        startTime: timeWindow.startTime,
        endTime: timeWindow.endTime,
        pastDays: Math.max(0, (now - timeWindow.startTime) / dayMs),
        futureDays: Math.max(0, (timeWindow.endTime - now) / dayMs)
      };
    }
    
    return {
      startTime: zoomedStartTime,
      endTime: zoomedEndTime,
      pastDays: Math.max(0, (now - zoomedStartTime) / dayMs),
      futureDays: Math.max(0, (zoomedEndTime - now) / dayMs)
    };
  }, [timeWindow, selectedTimeRange, customPastDays, customFutureDays, zoomRange, miniMode, data, isMarketOpen, showPreviousDayFull]);

  // Get display time range (could be zoomed or default)
  const displayRange = getDisplayTimeRange();
  const { startTime, endTime, pastDays: actualPastDays, futureDays: actualFutureDays, marketCloseTime } = displayRange;
  
  // CRITICAL FIX: Use ACTUAL current time for all time-based calculations
  // When showing previous day's full data, treat market close time as "now"
  const now = marketCloseTime ?? getCurrentTime().getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  

  
  // Filter data based on display time range
  // Only include historical data (before or at "now")
  // For mini mode during market hours, use intraday price data instead
  let filteredData: ChartDataPoint[];
  
  if (miniMode && ticker) {
    // Post-close period (8pm-8am): Show previous trading day's FULL data
    if (showPreviousDayFull && intradayData.length > 0) {
      // Show ALL data from previous day (not filtered by current time)
      filteredData = intradayData;
    } else if (isMarketOpen && previousClose) {
      // Market hours or pre-market: Use real intraday price data from database if available
      if (intradayData.length > 0) {
        filteredData = intradayData.filter(point => point.timestamp <= now);
      } else {
        // Fallback to generated data if database is empty
        filteredData = generateIntradayData(livePrice, previousClose, ticker);
      }
    } else {
      // Market closed (non post-close period): Use historical data
      filteredData = data.filter(point => {
        return point.timestamp >= startTime && point.timestamp <= Math.min(now, endTime);
      });
    }
  } else {
    // Use historical data for non-mini charts
    filteredData = data.filter(point => {
      return point.timestamp >= startTime && point.timestamp <= Math.min(now, endTime);
    });
  }
  

  
  // Calculate previous day's price change for post-close period
  let previousDayChange = 0;
  let previousDayChangePercent = 0;
  if (showPreviousDayFull && filteredData.length > 1) {
    const firstPrice = filteredData[0].value;
    const lastPrice = filteredData[filteredData.length - 1].value;
    previousDayChange = lastPrice - firstPrice;
    previousDayChangePercent = (previousDayChange / firstPrice) * 100;
  }
  
  // Debug time filtering effects on catalyst data
  const catalystDataBeforeFilter = data.filter(d => d.catalyst);
  const catalystDataAfterFilter = filteredData.filter(d => d.catalyst);
  
  const filteredFutureCatalysts = futureCatalysts.filter(catalyst => {
    return catalyst.timestamp >= now && catalyst.timestamp <= endTime;
  });

  // Calculate chart layout based on time ranges
  const totalViewportDays = actualPastDays + actualFutureDays;
  
  // Fixed layout: 60% for past, 40% for future
  // - Left 60%: Past data - fixed visual space
  // - Right 40%: Future events - fixed visual space
  // - "Now" dot: Positioned based on current time within the past section
  let nowPosition: number;
  let pastWidthPercent: number;
  let futureWidthPercent: number;
  let currentTimePositionInChart: number;
  
  if (miniMode && showPreviousDayFull) {
    // Weekend/post-close: Fixed 60/40 split
    pastWidthPercent = 60;
    futureWidthPercent = 40;
    
    // "Now" line is at the end of the past section (60%)
    nowPosition = 60;
    currentTimePositionInChart = nowPosition;
  } else if (miniMode && isMarketOpen) {
    // Chart layout: Fixed 60% for trading day, 40% for future
    pastWidthPercent = 60;
    futureWidthPercent = 40;
    
    // Calculate where "now" is within the trading day (9:30 AM to 4 PM)
    const todayDate = new Date(now);
    const marketOpenTime = new Date(todayDate.toDateString() + ' 09:30:00 EST').getTime();
    const marketCloseTime = new Date(todayDate.toDateString() + ' 16:00:00 EST').getTime();
    const tradingDayDuration = marketCloseTime - marketOpenTime; // 6.5 hours
    const timeSinceOpen = now - marketOpenTime;
    const progressThroughTradingDay = Math.min(timeSinceOpen / tradingDayDuration, 1);
    
    // Position "now" dot within the left 60% of the chart
    currentTimePositionInChart = progressThroughTradingDay * 60;
    nowPosition = currentTimePositionInChart;
  } else {
    // Standard layout: Fixed 60/40 split
    pastWidthPercent = 60;
    futureWidthPercent = 40;
    
    // Position "now" at the boundary between past and future
    nowPosition = 60;
    currentTimePositionInChart = nowPosition;
  }

  // Calculate Y-axis range with more padding for Robinhood-style impact
  const dataValues = filteredData.length > 0 ? filteredData.map(d => d.value) : [currentPrice];
  const minValue = Math.min(...dataValues);
  const maxValue = Math.max(...dataValues);
  const valueRange = maxValue - minValue;
  const padding = miniMode 
    ? Math.max(valueRange * 0.15, maxValue * 0.05) // Increased padding for mini charts to show more Y-axis scale
    : Math.max(valueRange * 0.05, maxValue * 0.02); // Reduced padding to show more price movement for main charts
  
  const yAxisMin = Math.max(0, minValue - padding);
  const yAxisMax = maxValue + padding;
  
  // Get the last price that will actually be rendered on the chart
  // This is the last historical data point before "now"
  const lastHistoricalDataPoint = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const lastPrice = lastHistoricalDataPoint ? lastHistoricalDataPoint.value : currentPrice;
  
  // Debug last data point
  if (miniMode && lastHistoricalDataPoint) {
    // Data point info available for debugging if needed
  }
  
  // Previous close reference line for mini mode
  let previousCloseYPosition: number | null = null;
  
  if (miniMode && previousClose) {
    // Calculate Y position as percentage (0 = bottom, 100 = top)
    const normalizedPrevCloseValue = (previousClose - yAxisMin) / (yAxisMax - yAxisMin);
    previousCloseYPosition = (1 - normalizedPrevCloseValue) * 100; // Invert for top-down coordinates
  }

  
  // Normalize using the same domain as the chart (yAxisMin to yAxisMax)
  // This ensures perfect alignment where Recharts draws the line
  const normalizedLastValue = (lastPrice - yAxisMin) / (yAxisMax - yAxisMin);
  
  // Clamp to prevent positioning outside chart bounds
  const clampedNormalizedLastValue = Math.max(0, Math.min(1, normalizedLastValue));
  


  // Zoom utility functions
  const getTouchDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const getElementCenter = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };



  const constrainTimeWindow = (newStartTime: number, newEndTime: number, newZoomLevel: number) => {
    const dayMs = 24 * 60 * 60 * 1000;
    const latestDataPoint = data.length > 0 ? Math.max(...data.map(d => d.timestamp)) : Date.now();
    const now = latestDataPoint;
    
    // Get original time range - use appropriate config based on mode
    const timeRangeConfig = miniMode ? TIME_RANGE_CONFIG_MINI : TIME_RANGE_CONFIG_MAIN;
    const config = timeRangeConfig[selectedTimeRange];
    const originalPastDays = customPastDays ?? config.pastDays;
    const originalFutureDays = customFutureDays ?? config.futureDays;
    const originalStartTime = now - (originalPastDays * dayMs);
    const originalEndTime = now + (originalFutureDays * dayMs);
    
    // Constrain zoom level between 1x and 5x (increased to allow more zoom)
    const constrainedZoomLevel = Math.min(Math.max(newZoomLevel, 1), 5);
    
    // If zoom level is 1, reset to original range
    if (constrainedZoomLevel <= 1.1) {
      return {
        startTime: null,
        endTime: null,
        zoomLevel: 1
      };
    }
    
    // Constrain time range to be within original bounds
    const constrainedStartTime = Math.max(newStartTime, originalStartTime);
    const constrainedEndTime = Math.min(newEndTime, originalEndTime);
    
    // Ensure minimum time range (at least 3 days to allow more zoom and catalyst separation)
    const minTimeRange = 3 * dayMs; // 3 days minimum (reduced from 14 to allow more zoom)
    if (constrainedEndTime - constrainedStartTime < minTimeRange) {
      const center = (constrainedStartTime + constrainedEndTime) / 2;
      return {
        startTime: Math.max(center - minTimeRange / 2, originalStartTime),
        endTime: Math.min(center + minTimeRange / 2, originalEndTime),
        zoomLevel: constrainedZoomLevel
      };
    }
    
    return {
      startTime: constrainedStartTime,
      endTime: constrainedEndTime,
      zoomLevel: constrainedZoomLevel
    };
  };

  // Handle time range selection
  const handleTimeRangeSelect = (range: TimeRange) => {
    setSelectedTimeRange(range);
    setCustomPastDays(null);
    setCustomFutureDays(null);
    
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    }
    
    // Reset both zoom slider and pinch zoom when changing time range
    setZoomRange({ start: 0, end: 100 });
    setTimeWindow({ startTime: null, endTime: null, zoomLevel: 1 });
  };

  // Enhanced touch/drag handlers for continuous expansion
  const handleEdgeInteractionStart = useCallback((e: React.TouchEvent | React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsInteracting(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
    
    if (side === 'left') {
      setDragStartValue(actualPastDays);
    } else {
      setDragStartValue(actualFutureDays);
    }
  }, [actualPastDays, actualFutureDays]);

  const handleEdgeInteractionMove = useCallback((e: TouchEvent | MouseEvent, side: 'left' | 'right') => {
    if (!isInteracting || touchStartX === null) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - touchStartX;
    const sensitivity = 1.2; // Increased sensitivity for smoother interaction
    const deltaDays = Math.round(deltaX * sensitivity);
    
    if (side === 'left') {
      const newPastDays = Math.max(1, dragStartValue + deltaDays);
      setCustomPastDays(newPastDays);
    } else {
      const newFutureDays = Math.max(1, dragStartValue + deltaDays);
      setCustomFutureDays(newFutureDays);
    }
  }, [isInteracting, touchStartX, dragStartValue]);

  const handleEdgeInteractionEnd = useCallback(() => {
    setIsInteracting(false);
    setTouchStartX(null);
    setDragStartValue(0);
  }, []);

  // Crosshair helper - update crosshair based on x position
  const updateCrosshair = useCallback((x: number, chartWidth: number) => {
    if (filteredData.length === 0) return;
    
    // Calculate x position as percentage
    const xPercent = Math.max(0, Math.min(1, x / chartWidth));
    
    // Get the current display time range
    const displayRange = getDisplayTimeRange();
    const { startTime, endTime } = displayRange;
    
    // Calculate what TIME this X position represents on the chart
    const timeAtPosition = startTime + (xPercent * (endTime - startTime));
    
    // Find the closest data point to this time
    // Only search in historical data (past data)
    let closestDataPoint = filteredData[0];
    let minTimeDiff = Math.abs(filteredData[0].timestamp - timeAtPosition);
    
    for (let i = 1; i < filteredData.length; i++) {
      const timeDiff = Math.abs(filteredData[i].timestamp - timeAtPosition);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestDataPoint = filteredData[i];
      }
    }
    
    // Only show crosshair if we're hovering over a position that has historical data
    // (i.e., the time is before now and within the data range)
    const now = getCurrentTime().getTime();
    if (timeAtPosition <= now && closestDataPoint) {
      setCrosshair({
        visible: true,
        x: xPercent * 100, // Store as percentage
        dataPoint: closestDataPoint
      });
    }
  }, [filteredData, getDisplayTimeRange]);

  // Crosshair interaction handlers
  const handleCrosshairStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (miniMode) return; // Disable crosshair in mini mode
    if (e.type === 'touchstart' && (e as React.TouchEvent).touches.length > 1) return; // Ignore multi-touch
    
    const chart = chartRef.current;
    if (!chart) return;

    // Close tooltip when starting crosshair
    setTooltip(prev => ({ ...prev, visible: false }));

    const rect = chart.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    
    updateCrosshair(x, rect.width);
  }, [miniMode, updateCrosshair]);

  const handleCrosshairMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!crosshair.visible) return;
    
    const chart = chartRef.current;
    if (!chart) return;

    const rect = chart.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const x = clientX - rect.left;
    
    updateCrosshair(x, rect.width);
  }, [crosshair.visible, updateCrosshair]);

  const handleCrosshairEnd = useCallback(() => {
    setCrosshair({
      visible: false,
      x: 0,
      dataPoint: null
    });
  }, []);

  // Pinch zoom handlers (time window) - only intercept 2-finger touches
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && chartRef.current) {
      // Only prevent default for 2-finger pinch gestures
      e.preventDefault();
      e.stopPropagation();
      setIsPinching(true);
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      
      setInitialPinchDistance(distance);
      setInitialTimeWindow(timeWindow);
      setInitialPinchCenter(center);
    } else if (e.touches.length === 1 && !miniMode) {
      // Single touch - enable crosshair
      handleCrosshairStart(e);
    }
    // Allow single-finger touches to pass through for normal scrolling
  }, [timeWindow, miniMode, handleCrosshairStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2 && initialPinchDistance && initialPinchCenter && initialTimeWindow && chartRef.current) {
      // Only prevent default during active pinch zoom
      e.preventDefault();
      e.stopPropagation();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentCenter = getTouchCenter(touch1, touch2);
      
      // Calculate zoom scale change with dampening for less aggressive zoom
      const rawScaleChange = currentDistance / initialPinchDistance;
      const dampingFactor = 0.15; // Further reduced zoom sensitivity (was 0.3)
      const scaleChange = 1 + (rawScaleChange - 1) * dampingFactor;
      const newZoomLevel = initialTimeWindow.zoomLevel * scaleChange;
      
      // Calculate which time range the user is pinching into
      const rect = chartRef.current.getBoundingClientRect();
      const pinchXPercent = (initialPinchCenter.x - rect.left) / rect.width;
      
      // Get current display range
      const currentRange = getDisplayTimeRange();
      const totalTimeSpan = currentRange.endTime - currentRange.startTime;
      
      // Calculate the time point at the pinch center
      const pinchTime = currentRange.startTime + (pinchXPercent * totalTimeSpan);
      
      // Calculate new time range centered around pinch point
      const newTimeSpan = totalTimeSpan / scaleChange;
      const newStartTime = pinchTime - (newTimeSpan * pinchXPercent);
      const newEndTime = pinchTime + (newTimeSpan * (1 - pinchXPercent));
      
      const constrainedTimeWindow = constrainTimeWindow(newStartTime, newEndTime, newZoomLevel);
      setTimeWindow(constrainedTimeWindow);
    }
  }, [isPinching, initialPinchDistance, initialPinchCenter, initialTimeWindow, getDisplayTimeRange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
      setInitialPinchDistance(null);
      setInitialTimeWindow(null);
      setInitialPinchCenter(null);
    }
    // Don't prevent default on touch end to allow normal touch interactions
  }, []);

  // Mouse wheel zoom handler (time window)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const delta = -e.deltaY;
      const baseScaleChange = delta > 0 ? 1.02 : 0.98; // Further reduced from 1.05/0.95 to 1.02/0.98
      const newZoomLevel = timeWindow.zoomLevel * baseScaleChange;
      
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        const mouseXPercent = (e.clientX - rect.left) / rect.width;
        
        // Get current display range
        const currentRange = getDisplayTimeRange();
        const totalTimeSpan = currentRange.endTime - currentRange.startTime;
        
        // Calculate the time point under the mouse
        const mouseTime = currentRange.startTime + (mouseXPercent * totalTimeSpan);
        
        // Calculate new time range centered around mouse point
        const newTimeSpan = totalTimeSpan / baseScaleChange;
        const newStartTime = mouseTime - (newTimeSpan * mouseXPercent);
        const newEndTime = mouseTime + (newTimeSpan * (1 - mouseXPercent));
        
        const constrainedTimeWindow = constrainTimeWindow(newStartTime, newEndTime, newZoomLevel);
        setTimeWindow(constrainedTimeWindow);
      }
    }
  }, [timeWindow, getDisplayTimeRange]);

  // Double tap to reset zoom
  const handleDoubleClick = useCallback(() => {
    setTimeWindow({ startTime: null, endTime: null, zoomLevel: 1 });
  }, []);

  // Catalyst dot click handler
  const handleCatalystClick = useCallback((e: React.MouseEvent | React.TouchEvent, event: MarketEvent, isPastEvent: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY : e.clientY;
    
    // Calculate position relative to chart container
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setTooltip({
      visible: true,
      x,
      y,
      event,
      isPastEvent
    });
  }, []);

  // Close tooltip
  const handleCloseTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Event listeners for continuous drag
  useEffect(() => {
    if (!isInteracting) return;

    const handleTouchMove = (e: TouchEvent) => handleEdgeInteractionMove(e, 'left');
    const handleTouchEnd = handleEdgeInteractionEnd;
    const handleMouseMove = (e: MouseEvent) => handleEdgeInteractionMove(e, 'left');
    const handleMouseUp = handleEdgeInteractionEnd;

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isInteracting, handleEdgeInteractionMove, handleEdgeInteractionEnd]);



  // Close tooltip when chart interactions occur
  useEffect(() => {
    if (isPinching || timeWindow.zoomLevel !== 1 || isInteracting) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [isPinching, timeWindow.zoomLevel, isInteracting]);

  // Event listeners for crosshair drag
  useEffect(() => {
    if (!crosshair.visible) return;

    const handleMove = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      handleCrosshairMove(e);
    };
    const handleEnd = () => handleCrosshairEnd();

    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    return () => {
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    };
  }, [crosshair.visible, handleCrosshairMove, handleCrosshairEnd]);

  // Handle time range selection and reset zoom
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setSelectedTimeRange(range);
    // Reset both zoom slider and pinch zoom when changing time range
    setZoomRange({ start: 0, end: 100 });
    setTimeWindow({ startTime: null, endTime: null, zoomLevel: 1 });
    onTimeRangeChange?.(range);
  }, [onTimeRangeChange]);

  // Calculate price change for the selected time range
  const calculateRangeChange = useCallback(() => {
    if (filteredData.length === 0) {
      return { change: priceChange, changePercent: priceChangePercent };
    }

    // Get the first and last prices in the filtered data
    const firstPrice = filteredData[0].value;
    const lastPrice = filteredData[filteredData.length - 1].value;
    
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;

    return { change, changePercent };
  }, [filteredData, priceChange, priceChangePercent]);

  const rangeChange = calculateRangeChange();

  // Chart color determination available for debugging if needed

  return (
    <div className={`w-full ${miniMode ? '' : 'bg-card rounded-lg'} overflow-hidden`}>
      {/* Header - hidden in mini mode */}
      {!miniMode && (
        <div className="px-6 py-4 mt-[0px] mr-[0px] mb-[0px] ml-[-20px] pt-[0px] pr-[24px] pb-[16px] pl-[24px]">
          <div className="mb-2">

            <div className="flex items-baseline gap-3">
              <div className="text-2xl text-foreground font-medium">
                {crosshair.visible && crosshair.dataPoint 
                  ? formatCurrency(crosshair.dataPoint.value)
                  : <AnimatedPrice price={livePrice} className="inline-block" />
                }
              </div>
              {!crosshair.visible && (
                <div className={`text-sm font-medium ${rangeChange.change >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {rangeChange.change >= 0 ? '+' : ''}{formatCurrency(rangeChange.change)} ({rangeChange.change >= 0 ? '+' : ''}{rangeChange.changePercent.toFixed(2)}%)
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          
          {/* Zoom indicator - moved to not interfere with chart layout */}
          {timeWindow.zoomLevel > 1.1 && (
            <div className="absolute top-4 right-4 z-20">
              <div className="text-xs text-ai-accent bg-ai-accent/10 rounded px-2 py-1 inline-block">
                Zoomed {timeWindow.zoomLevel.toFixed(1)}x • Double-tap to reset
              </div>
            </div>
          )}

        </div>
      )}

      {/* Chart Container */}
      <div 
        className={`relative ${height} bg-card overflow-hidden ${miniMode ? 'pt-3' : '-mx-[20px] lg:-mx-[44px]'}`} 
        ref={chartRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={!miniMode ? handleCrosshairStart : undefined}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          // Close tooltip if clicking on chart background (not on catalyst dots)
          if (e.target === e.currentTarget) {
            handleCloseTooltip();
          }
        }}
        style={{ 
          cursor: crosshair.visible ? 'crosshair' : (timeWindow.zoomLevel > 1 ? 'grab' : 'default'),
          // Allow single-finger scrolling while enabling multi-touch for pinch zoom
          touchAction: 'pan-y pinch-zoom',
          // Prevent container edges/outlines from appearing during crosshair interaction
          outline: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {/* Chart content - no transform needed */}
        <div 
          className="absolute inset-0"
          style={{
            outline: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
        {/* Left edge interaction zone - COMMENTED OUT FOR NOW */}
        {/* <div 
          className="absolute left-0 top-0 bottom-0 w-8 z-10 flex items-center cursor-col-resize group"
          onTouchStart={(e) => handleEdgeInteractionStart(e, 'left')}
          onMouseDown={(e) => handleEdgeInteractionStart(e, 'left')}
        >
          <div className="w-4 h-12 bg-ai-accent/20 rounded-r group-hover:bg-ai-accent/40 transition-all duration-200 flex items-center justify-center group-hover:scale-110">
            <div className="w-1 h-6 bg-ai-accent rounded opacity-60 group-hover:opacity-100"></div>
          </div>
        </div> */}

        {/* Past data chart (left side) */}
        <div 
          className="absolute inset-0" 
          style={{ 
            width: `${pastWidthPercent}%`,
            outline: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {showPreviousDayFull ? (
              // Post-close period (8pm-8am): Show filled area chart for previous trading day
              <AreaChart key={`chart-${renderKey}`} data={filteredData} margin={{ top: miniMode ? 5 : 10, right: 0, left: 0, bottom: miniMode ? 5 : 10 }}>
                <defs>
                  <linearGradient id="previousDayGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={previousDayChange >= 0 ? 'rgb(0,200,5)' : 'rgb(255,80,0)'} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={previousDayChange >= 0 ? 'rgb(0,200,5)' : 'rgb(255,80,0)'} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  hide 
                  type="number"
                  dataKey="timestamp"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis hide domain={[yAxisMax, yAxisMin]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={previousDayChange >= 0 ? 'rgb(0,200,5)' : 'rgb(255,80,0)'}
                  strokeWidth={2}
                  fill="url(#previousDayGradient)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            ) : (
              // Normal line chart for current trading data
              <LineChart key={`chart-${renderKey}`} data={filteredData} margin={{ top: miniMode ? 5 : 10, right: 0, left: 0, bottom: miniMode ? 5 : 10 }}>
                <defs>
                  {/* Subtle drop shadow filter for overlapping dots */}
                  <filter id="dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0.5" stdDeviation="1" floodOpacity="0.12"/>
                  </filter>
                </defs>
                <XAxis 
                  hide 
                  type="number"
                  dataKey="timestamp"
                  domain={
                    miniMode && (isMarketOpen || showPreviousDayFull)
                      ? [startTime, endTime]
                      : ['dataMin', 'dataMax']
                  }
                />
                <YAxis hide domain={[yAxisMax, yAxisMin]} />
                {!miniMode && (
                  <Tooltip 
                    cursor={{ stroke: priceChange >= 0 ? 'rgb(0,200,5)' : 'rgb(255,80,0)', strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const data = payload[0].payload;
                      const value = data.value;
                      const timestamp = data.timestamp;
                      const date = new Date(timestamp);
                      
                      return (
                        <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg">
                          <div className="text-sm font-semibold" style={{ color: priceChange >= 0 ? 'rgb(0,200,5)' : 'rgb(255,80,0)' }}>
                            ${value?.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
                <Line
                type="monotone"
                dataKey="value"
                stroke={
                  miniMode && previousClose 
                    ? (livePrice >= previousClose ? 'var(--positive)' : 'var(--negative)')
                    : (rangeChange.change >= 0 ? 'var(--positive)' : 'var(--negative)')
                }
                strokeWidth={miniMode ? 2 : 2.5}
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  
                  // Capture the first data point's actual rendered Y position
                  if (index === 0 && chartRef.current) {
                    // Store the actual rendered position
                    firstPointRenderedYRef.current = cy;
                    
                    // Trigger re-render to show first point line
                    // Use ref to prevent infinite loops
                    if (!hasFirstPoint && !hasTriggeredFirstUpdateRef.current) {
                      hasTriggeredFirstUpdateRef.current = true;
                      // Use setTimeout to avoid state update during render
                      setTimeout(() => setHasFirstPoint(true), 0);
                    }
                  }
                  
                  // Capture the last data point's actual rendered Y position
                  if (index === filteredData.length - 1 && chartRef.current) {
                    // Store the actual rendered position
                    lastPointRenderedYRef.current = cy;
                    
                    // Trigger re-render to show future elements now that we have the Y position
                    // Use ref to prevent infinite loops
                    if (!hasLastPoint && !hasTriggeredUpdateRef.current) {
                      hasTriggeredUpdateRef.current = true;
                      // Use setTimeout to avoid state update during render
                      setTimeout(() => setHasLastPoint(true), 0);
                    }
                  }
                  
                  if (!showEvents) {
                    return null;
                  }
                  
                  if (!payload?.catalyst) {
                    return null;
                  }
                  
                  // Calculate zoom factor for scaling catalyst dots
                  const zoomRange_ = zoomRange.end - zoomRange.start;
                  const zoomFactor = Math.min(3.0, Math.max(1.0, 100 / zoomRange_));
                  // Size for portfolio chart (when using company logos)
                  const baseRadius = useCompanyLogos ? 15 : 7.5;
                  const dotRadius = Math.round(baseRadius * zoomFactor);
                  
                  // Get logo URL if using company logos
                  const ticker = payload.catalyst.ticker;
                  const logoUrl = useCompanyLogos && ticker ? companyLogos[ticker] : null;
                  const patternId = `logo-pattern-past-${ticker}-${payload.timestamp}`;
                  
                  // Check if there are other catalyst events nearby in time (likely to overlap visually)
                  const currentTime = payload.timestamp;
                  const timeThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
                  const hasNearbyEvents = filteredData.some((d, i) => 
                    i !== index && d.catalyst && 
                    Math.abs(d.timestamp - currentTime) < timeThreshold
                  );
                  
                  return (
                    <g key={`catalyst-dot-${payload.timestamp}`} style={{ cursor: 'pointer' }}>
                      {/* Define pattern for logo if available */}
                      {logoUrl && (
                        <defs>
                          <pattern id={patternId} x="0" y="0" width="1" height="1" patternUnits="objectBoundingBox">
                            <image
                              href={logoUrl}
                              x="0"
                              y="0"
                              width={dotRadius * 2}
                              height={dotRadius * 2}
                              preserveAspectRatio="xMidYMid slice"
                            />
                          </pattern>
                          <clipPath id={`${patternId}-clip`}>
                            <circle cx={dotRadius} cy={dotRadius} r={dotRadius} />
                          </clipPath>
                        </defs>
                      )}
                      
                      {/* Main circle with logo pattern or color fill */}
                      <circle
                        className="catalyst-dot"
                        cx={cx}
                        cy={cy}
                        r={dotRadius}
                        fill={logoUrl ? `url(#${patternId})` : getEventTypeHexColor(payload.catalyst.type)}
                        filter={hasNearbyEvents ? "url(#dot-shadow)" : undefined}
                        onClick={miniMode ? undefined : (e: any) => handleCatalystClick(e, payload.catalyst, true)}
                        onTouchEnd={miniMode ? undefined : (e: any) => handleCatalystClick(e, payload.catalyst, true)}
                      />
                    </g>
                  );
                }}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{ r: 4, fill: 'var(--ai-accent)', stroke: 'var(--background)', strokeWidth: 2 }}
              />
              </LineChart>
            )}
          </ResponsiveContainer>

        </div>

        {/* Horizontal dashed line from start to "now" at first price point height - ONLY for 1D view */}
        {!miniMode && selectedTimeRange === '1D' && hasFirstPoint && firstPointRenderedYRef.current !== null && (
          <div 
            className="absolute border-t border-dashed border-border"
            style={{ 
              top: `${firstPointRenderedYRef.current}px`,
              left: '0%',
              width: `${nowPosition}%`,
              borderWidth: '1px'
            }}
          />
        )}

        {/* Previous close reference line for mini mode - ends at current time */}
        {miniMode && previousCloseYPosition !== null && (
          <svg 
            className="absolute pointer-events-none"
            style={{ 
              top: `${previousCloseYPosition}%`,
              left: '0%',
              width: `${miniMode && isMarketOpen ? 50 : nowPosition}%`, // End at current time, not full width
              height: '1px',
              overflow: 'visible',
              zIndex: 5
            }}
          >
            <line 
              x1="0%" 
              y1="0" 
              x2="100%" 
              y2="0" 
              stroke="currentColor" 
              strokeWidth="1"
              strokeDasharray="1 4"
              strokeLinecap="round"
              className="text-muted-foreground"
            />
          </svg>
        )}

        {/* Future hourglass gradient overlay for mini mode - expanding uncertainty effect with soft edges */}
        {miniMode && (
          <>
            {/* Light mode gradient */}
            <div 
              className="absolute top-0 bottom-0 pointer-events-none dark:hidden"
              style={{ 
                left: '50%',
                width: '50%',
                background: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.04) 20%, rgba(0, 0, 0, 0.06) 50%, rgba(0, 0, 0, 0.06) 78%, rgba(0, 0, 0, 0.03) 93%, transparent 100%)',
                zIndex: 1
              }}
            />
            {/* Dark mode gradient - inverse colors */}
            <div 
              className="absolute top-0 bottom-0 pointer-events-none hidden dark:block"
              style={{ 
                left: '50%',
                width: '50%',
                background: 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.04) 20%, rgba(255, 255, 255, 0.06) 50%, rgba(255, 255, 255, 0.06) 78%, rgba(255, 255, 255, 0.03) 93%, transparent 100%)',
                zIndex: 1
              }}
            />
          </>
        )}

        {/* Connection line from last price to future section - ensures seamless connection */}
        {/* Using actual Recharts rendered position for perfect alignment */}
        {lastPointRenderedYRef.current !== null && (
          <svg 
            className="absolute" 
            style={{ 
              left: `${(miniMode && isMarketOpen ? currentTimePositionInChart : nowPosition) - 0.3}%`,
              width: '0.6%',
              height: '100%',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            <line
              x1="0%"
              y1={`${lastPointRenderedYRef.current}px`}
              x2="100%"
              y2={`${lastPointRenderedYRef.current}px`}
              stroke={
                miniMode && previousClose 
                  ? (livePrice >= previousClose ? 'var(--positive)' : 'var(--negative)')
                  : (priceChange >= 0 ? 'var(--positive)' : 'var(--negative)')
              }
              strokeWidth={miniMode ? 2 : 2.5}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Current price dot with echo effect (mini mode only, during market hours) */}
        {/* Don't show animated dot when displaying previous day data (holidays/weekends) */}
        {miniMode && isMarketOpen && !showPreviousDayFull && lastPointRenderedYRef.current !== null && (
          <div
            className="absolute"
            style={{
              left: `calc(${currentTimePositionInChart}% - 8px)`,
              top: `${lastPointRenderedYRef.current - 8}px`,
              width: '16px',
              height: '16px',
              zIndex: 10,
            }}
          >
            {/* Pulsing echo layer underneath */}
            <motion.svg
              className="absolute"
              width="16"
              height="16"
              style={{
                left: '0',
                top: '0',
              }}
              animate={{
                opacity: [0.6, 0],
                scale: [1, 2],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 4.5,
                ease: "easeOut"
              }}
            >
              <circle
                cx="8"
                cy="8"
                r="4"
                fill={
                  miniMode && previousClose 
                    ? (livePrice >= previousClose ? 'var(--positive)' : 'var(--negative)')
                    : (priceChange >= 0 ? 'var(--positive)' : 'var(--negative)')
                }
              />
            </motion.svg>
            
            {/* Fixed main dot on top */}
            <svg
              className="absolute"
              width="16"
              height="16"
              style={{
                left: '0',
                top: '0',
              }}
            >
              <circle
                cx="8"
                cy="8"
                r="3"
                fill={
                  miniMode && previousClose 
                    ? (livePrice >= previousClose ? 'var(--positive)' : 'var(--negative)')
                    : (priceChange >= 0 ? 'var(--positive)' : 'var(--negative)')
                }
              />
            </svg>
          </div>
        )}

        {/* Static price dot for weekends/after-hours (mini mode only, when market is closed) */}
        {miniMode && !isMarketOpen && showPreviousDayFull && lastPointRenderedYRef.current !== null && (
          <div
            className="absolute"
            style={{
              left: `calc(${nowPosition}% - 8px)`,
              top: `${lastPointRenderedYRef.current - 8}px`,
              width: '16px',
              height: '16px',
              zIndex: 10,
            }}
          >
            {/* Static dot - no pulsing animation */}
            <svg
              className="absolute"
              width="16"
              height="16"
              style={{
                left: '0',
                top: '0',
              }}
            >
              <circle
                cx="8"
                cy="8"
                r="3"
                fill={
                  miniMode && previousClose 
                    ? (livePrice >= previousClose ? 'var(--positive)' : 'var(--negative)')
                    : (priceChange >= 0 ? 'var(--positive)' : 'var(--negative)')
                }
              />
            </svg>
          </div>
        )}

        {/* Future events timeline (right side) */}
        <div 
          className="absolute inset-0" 
          style={{ 
            left: `${miniMode && isMarketOpen ? 50 : nowPosition}%`, 
            width: `${futureWidthPercent}%`,
            outline: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {showEvents && filteredFutureCatalysts.length > 0 ? (
            <div className="relative w-full h-full p-[0px]">
              {/* Horizontal dashed line aligned with last price - starts from edge to connect seamlessly */}
              {hasLastPoint && lastPointRenderedYRef.current !== null && (
                <>
                  <svg 
                    className="absolute pointer-events-none"
                    style={{ 
                      top: `${lastPointRenderedYRef.current}px`,
                      left: '0%', // Start from the absolute edge to connect with connector line
                      width: '100%',
                      height: '1px',
                      overflow: 'visible'
                    }}
                  >
                    <line 
                      x1="0%" 
                      y1="0" 
                      x2="100%" 
                      y2="0" 
                      stroke="currentColor" 
                      strokeWidth="1"
                      strokeDasharray="1 4"
                      strokeLinecap="round"
                      className="text-muted-foreground"
                    />
                  </svg>
                  
                  {/* Upcoming events counter - Only show in full mode, not mini mode */}
                  {!miniMode && (() => {
                    // Calculate if label should appear above the line (when line is near bottom)
                    const chartHeight = chartRef.current?.clientHeight || 320;
                    const threshold = 0.65;
                    const isNearBottom = lastPointRenderedYRef.current !== null && lastPointRenderedYRef.current > (chartHeight * threshold);
                    
                    // Moderate margin when label is above, keep original when below
                    const labelTransform = isNearBottom ? 'translateY(-48px)' : 'translateY(7px)';
                    
                    return (
                      <div 
                        className="absolute right-2"
                        style={{ 
                          top: `${lastPointRenderedYRef.current}px`,
                          transform: labelTransform,
                          opacity: timeWindow.zoomLevel > 1 ? 0 : 1,
                          transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
                          paddingTop: '2px'
                        }}
                      >
                        <span className="text-xs text-ai-accent bg-background/80 rounded px-[8px] py-[4px] mr-[0px] mb-[0px] ml-[0px] mt-[-6px]">
                          {filteredFutureCatalysts.length} upcoming events
                        </span>
                      </div>
                    );
                  })()}
                </>
              )}
              
              {/* Future catalyst dots */}
              <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                <defs>
                  {/* Subtle drop shadow filter for overlapping dots */}
                  <filter id="dot-shadow-future" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0.5" stdDeviation="1" floodOpacity="0.12"/>
                  </filter>
                </defs>
                {hasLastPoint && filteredFutureCatalysts.slice().reverse().map((catalyst, index) => {
                  // Note: reversed so earliest events render last (appear on top)
                  // Get current display range for zoom-aware calculations
                  const currentDisplayRange = getDisplayTimeRange();
                  const currentNow = Date.now();
                  
                  // Apply zoom filtering to future catalysts - only show events within zoom range
                  if (catalyst.timestamp < currentDisplayRange.startTime || catalyst.timestamp > currentDisplayRange.endTime) {
                    return null;
                  }
                  
                  // Calculate time progress within the ZOOMED future range
                  const zoomedFutureStart = Math.max(currentNow, currentDisplayRange.startTime);
                  const zoomedFutureEnd = currentDisplayRange.endTime;
                  const timeInZoomedFutureRange = catalyst.timestamp - zoomedFutureStart;
                  const totalZoomedFutureTimeRange = Math.max(1, zoomedFutureEnd - zoomedFutureStart);
                  const futureTimeProgress = Math.max(0, Math.min(1, timeInZoomedFutureRange / totalZoomedFutureTimeRange));
                  
                  // Position within the future section (relative to the future area width)
                  const xPercent = futureTimeProgress * 100;
                  
                  // Calculate zoom factor for scaling future catalyst dots
                  const zoomRange_ = zoomRange.end - zoomRange.start;
                  const zoomFactor = Math.min(3.0, Math.max(1.0, 100 / zoomRange_));
                  // Size for portfolio chart (when using company logos) - 10% smaller
                  const baseRadius = useCompanyLogos ? 13.5 : 6.75;
                  const dotRadius = Math.round(baseRadius * zoomFactor);
                  
                  // Safety check - should always be true at this point due to hasLastPoint check
                  if (lastPointRenderedYRef.current === null) {
                    return null;
                  }
                  
                  // Get logo URL if using company logos
                  const ticker = catalyst.catalyst.ticker;
                  const logoUrl = useCompanyLogos && ticker ? companyLogos[ticker] : null;
                  const patternId = `logo-pattern-future-${ticker}-${catalyst.timestamp}-${index}`;
                  
                  // Check if there are other future catalyst events nearby in time (likely to overlap visually)
                  const currentTime = catalyst.timestamp;
                  const timeThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
                  const hasNearbyEvents = filteredFutureCatalysts.some((c, i) => 
                    i !== index && Math.abs(c.timestamp - currentTime) < timeThreshold
                  );
                  
                  return (
                    <g key={`future-catalyst-${catalyst.timestamp}-${timeWindow.zoomLevel}-${zoomRange.start}-${zoomRange.end}-${index}`} style={{ cursor: miniMode ? 'default' : 'pointer' }}>
                      {/* Define pattern for logo if available */}
                      {logoUrl && (
                        <defs>
                          <pattern id={patternId} x="0" y="0" width="1" height="1" patternUnits="objectBoundingBox">
                            <image
                              href={logoUrl}
                              x="0"
                              y="0"
                              width={dotRadius * 2}
                              height={dotRadius * 2}
                              preserveAspectRatio="xMidYMid slice"
                            />
                          </pattern>
                          <clipPath id={`${patternId}-clip`}>
                            <circle cx={dotRadius} cy={dotRadius} r={dotRadius} />
                          </clipPath>
                        </defs>
                      )}
                      
                      {/* Main circle with logo pattern or color fill */}
                      {highlightedEventId === catalyst.catalyst.id ? (
                        <motion.circle
                          className="catalyst-dot"
                          cx={`${xPercent}%`}
                          cy={`${lastPointRenderedYRef.current}px`}
                          r={dotRadius}
                          fill={logoUrl ? `url(#${patternId})` : getEventTypeHexColor(catalyst.catalyst.type)}
                          filter={hasNearbyEvents ? "url(#dot-shadow-future)" : undefined}
                          onClick={miniMode ? undefined : (e) => handleCatalystClick(e, catalyst.catalyst, false)}
                          onTouchEnd={miniMode ? undefined : (e) => handleCatalystClick(e, catalyst.catalyst, false)}
                          animate={{
                            r: [dotRadius, dotRadius * 1.5, dotRadius],
                            opacity: [1, 0.7, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      ) : (
                        <circle
                          className="catalyst-dot"
                          cx={`${xPercent}%`}
                          cy={`${lastPointRenderedYRef.current}px`}
                          r={dotRadius}
                          fill={logoUrl ? `url(#${patternId})` : getEventTypeHexColor(catalyst.catalyst.type)}
                          filter={hasNearbyEvents ? "url(#dot-shadow-future)" : undefined}
                          onClick={miniMode ? undefined : (e) => handleCatalystClick(e, catalyst.catalyst, false)}
                          onTouchEnd={miniMode ? undefined : (e) => handleCatalystClick(e, catalyst.catalyst, false)}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No upcoming events
            </div>
          )}
        </div>

        {/* Right edge interaction zone - COMMENTED OUT FOR NOW */}
        {/* <div 
          className="absolute right-0 top-0 bottom-0 w-8 z-10 flex items-center justify-end cursor-col-resize group"
          onTouchStart={(e) => handleEdgeInteractionStart(e, 'right')}
          onMouseDown={(e) => handleEdgeInteractionStart(e, 'right')}
        >
          <div className="w-4 h-12 bg-ai-accent/20 rounded-l group-hover:bg-ai-accent/40 transition-all duration-200 flex items-center justify-center group-hover:scale-110">
            <div className="w-1 h-6 bg-ai-accent rounded opacity-60 group-hover:opacity-100"></div>
          </div>
        </div> */}
        </div>

        {/* Crosshair overlay */}
        {!miniMode && crosshair.visible && crosshair.dataPoint && (
          <div 
            className="absolute inset-0 pointer-events-none z-50"
            style={{ touchAction: 'none' }}
          >
            {/* Vertical line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-muted-foreground"
              style={{ 
                left: `${crosshair.x}%`,
                opacity: 0.5
              }}
            />
            
            {/* Date label at top */}
            <div
              className="absolute top-2 bg-background border border-border rounded px-2 py-1"
              style={{ 
                left: crosshair.x < 15 
                  ? '8px' // Near left edge - align to left with margin
                  : crosshair.x > 85 
                    ? 'auto' // Near right edge - align to right
                    : `${crosshair.x}%`, // Center - normal positioning
                right: crosshair.x > 85 ? '8px' : 'auto', // Set right position when near right edge
                transform: crosshair.x < 15 || crosshair.x > 85 
                  ? 'none' // No transform at edges
                  : 'translateX(-50%)', // Center transform in middle
              }}
            >
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {new Date(crosshair.dataPoint.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Price point indicator */}
            <div
              className="absolute w-2 h-2 bg-ai-accent rounded-full border-2 border-background transform -translate-x-1/2"
              style={{ 
                left: `${crosshair.x}%`,
                top: `calc(10px + ${(1 - ((crosshair.dataPoint.value - yAxisMin) / (yAxisMax - yAxisMin)))} * (100% - 20px))`,
              }}
            />
          </div>
        )}

        {/* Catalyst Event Tooltip - disabled in mini mode */}
        {!miniMode && tooltip.visible && tooltip.event && (
          <>
            {/* Backdrop to close tooltip */}
            <div 
              className="absolute inset-0 z-30"
              onClick={handleCloseTooltip}
              onTouchEnd={handleCloseTooltip}
            />
            
            {/* Tooltip Card */}
            <div
              className="absolute z-40 bg-card border border-border rounded-lg shadow-lg max-w-xs w-72 p-4"
              style={{
                left: `${Math.min(Math.max(tooltip.x - 144, 16), chartRef.current ? chartRef.current.offsetWidth - 304 : tooltip.x - 144)}px`,
                top: `${tooltip.y < 200 ? tooltip.y + 20 : tooltip.y - 180}px`,
                pointerEvents: 'auto'
              }}
            >
              {/* Close button */}
              <button
                onClick={handleCloseTooltip}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>

              {/* Event Type Badge */}
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getEventTypeHexColor(tooltip.event.type) }}
                />
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  {getEventTypeLabel(tooltip.event.type)}
                </span>
              </div>

              {/* Event Title & Company */}
              <div className="mb-3">
                <h4 className="font-medium text-foreground mb-1 text-sm leading-tight">
                  {tooltip.event.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{tooltip.event.ticker}</span>
                  <span>•</span>
                  <span>{tooltip.event.company}</span>
                </div>
              </div>

              {/* Impact Rating */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">Impact:</span>
                <div className="flex items-center gap-1">
                  <span 
                    className={`text-xs font-medium ${
                      tooltip.event.impactRating > 0 ? 'text-positive' : 
                      tooltip.event.impactRating < 0 ? 'text-negative' : 'text-muted-foreground'
                    }`}
                  >
                    {tooltip.event.impactRating > 0 ? 'Bullish' : tooltip.event.impactRating < 0 ? 'Bearish' : 'Neutral'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({tooltip.event.impactRating > 0 ? '+' : ''}{tooltip.event.impactRating})
                  </span>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {tooltip.event.confidence}% confidence
                </div>
              </div>

              {/* Time */}
              <div className="mb-3 text-xs text-muted-foreground">
                {tooltip.isPastEvent ? 'Occurred' : 'Scheduled'}: {tooltip.event.time}
              </div>

              {/* AI Insight */}
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-ai-accent font-medium">AI Insight:</span> {tooltip.event.aiInsight}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mini mode time labels - shown only in mini mode */}
      {miniMode && (
        <div className="px-1 pt-3">
          <div className="relative w-full h-3 flex items-center text-[9px] text-muted-foreground">
            {(() => {
              const timeLabels: { label: string; position: number; key: string }[] = [];
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              
              if (showPreviousDayFull) {
                // Weekend/Post-close: Show previous day's extended hours (left) + future months (right)
                // Calculate chart layout: 12-hour trading day vs 3-month future
                const tradingDayHours = 12; // 8 AM to 8 PM
                const futureMonthsDays = 90; // 3 months
                const tradingDayDays = tradingDayHours / 24;
                const totalDays = tradingDayDays + futureMonthsDays;
                const tradingDayPercent = (tradingDayDays / totalDays) * 100;
                
                // Labels for the trading day portion
                timeLabels.push({
                  label: '8 AM',
                  position: 0,
                  key: 'extended-open'
                });
                
                timeLabels.push({
                  label: '4 PM',
                  position: tradingDayPercent * 0.67, // Roughly 2/3 through the trading day
                  key: 'market-close'
                });
                
                timeLabels.push({
                  label: '8 PM',
                  position: tradingDayPercent,
                  key: 'extended-close'
                });
                
                // Future months in the right portion
                const now = new Date();
                for (let i = 1; i <= 3; i++) {
                  const futureMonth = new Date(now);
                  futureMonth.setMonth(now.getMonth() + i);
                  const monthLabel = monthNames[futureMonth.getMonth()];
                  
                  // Space evenly across the future portion
                  const futurePortionPercent = 100 - tradingDayPercent;
                  const position = tradingDayPercent + (i / 4) * futurePortionPercent;
                  
                  timeLabels.push({
                    label: monthLabel,
                    position,
                    key: `month-${i}`
                  });
                }
              } else {
                // Market hours: Show intraday + future months
                // Left half (0-50%): Intraday trading session
                // Market open (9:30 AM ET) at start
                timeLabels.push({
                  label: '9:30 AM',
                  position: 0,
                  key: 'market-open'
                });
                
                // Market close (4 PM ET) at midpoint (now line)
                timeLabels.push({
                  label: '4 PM',
                  position: 50,
                  key: 'market-close'
                });
                
                // Right half (50-100%): Next 3 months
                const now = new Date();
                for (let i = 1; i <= 3; i++) {
                  const futureMonth = new Date(now);
                  futureMonth.setMonth(now.getMonth() + i);
                  const monthLabel = monthNames[futureMonth.getMonth()];
                  
                  // Space the 3 months evenly across the right half (50-100%)
                  // Position them at ~62.5%, 75%, 87.5%
                  const position = 50 + (i / 4) * 50;
                  
                  timeLabels.push({
                    label: monthLabel,
                    position,
                    key: `month-${i}`
                  });
                }
              }
              
              return timeLabels.map(({ label, position, key }) => (
                <div
                  key={key}
                  className="absolute whitespace-nowrap"
                  style={{ 
                    left: `${position}%`, 
                    transform: position === 0 ? 'translateX(0%)' : position === 100 ? 'translateX(-100%)' : 'translateX(-50%)'
                  }}
                >
                  <span className="opacity-60">{label}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Upcoming Events Counter - replaces volume chart area, hidden in mini mode */}
      {!miniMode && (() => {
        // Calculate number of upcoming events in next 3 months
        const now = Date.now();
        const threeMonthsFromNow = now + (90 * 24 * 60 * 60 * 1000); // 90 days in milliseconds
        
        const upcomingEventsCount = futureCatalysts.filter(catalyst => {
          return catalyst.timestamp > now && catalyst.timestamp <= threeMonthsFromNow;
        }).length;
        
        return (
          <div className="flex w-full pb-3 pt-1" style={{ height: '40px' }}>
            <div className="relative w-full flex items-center justify-start px-6">
              <span className="text-sm text-muted-foreground">
                {upcomingEventsCount} Upcoming Event{upcomingEventsCount !== 1 ? 's' : ''} in Next 3 Months
              </span>
            </div>
          </div>
        );
      })()}

      {/* Robinhood-style time range selector - hidden in mini mode */}
      {!miniMode && (
        <div className="px-6 py-4 relative">
        {/* Zoom Slider replacing X-axis line - with proper handle clearance */}
        <div className="absolute left-6 right-6 top-0">
          <ZoomSliderComponent 
            zoomRange={zoomRange}
            onZoomChange={setZoomRange}
            subtle={true}
          />
        </div>
        
        {/* Month and Year Labels - REMOVED for cleaner look */}
        {false && <div className="mb-4 mt-3">
          {(() => {
            // Calculate actual displayed time range (including zoom) - used by both month and year labels
            const displayedTimeSpan = endTime - startTime;
            const dayMs = 24 * 60 * 60 * 1000;
            const displayedDays = displayedTimeSpan / dayMs;
            
            return (
              <>
                {/* Month labels row */}
                <div className="relative w-full h-4 flex items-center text-xs text-muted-foreground mb-1" style={{
                  opacity: 1, // Always show labels during zoom
                  transition: 'opacity 0.2s ease-out'
                }}>
                  {(() => {
                    const monthLabels: { month: string; position: number; key: string }[] = [];
                    const currentDate = new Date();
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    
                    // Debug: Always show labels regardless of filteredData
                     // console.log('Label Debug:', {
                     //   filteredDataLength: filteredData.length,
                     //   displayedDays,
                     //   displayedTimeSpan,
                     //   startTime,
                     //   endTime
                     // });
                     
                     // Show labels even if no filtered data  
                     if (true) {
                
                // Determine label type and count based on displayed time span
                if (displayedDays <= 1) {
                  // Show hours for very short ranges
                  const startDate = new Date(startTime);
                  const endDate = new Date(endTime);
                  
                  // For mini mode, show market hours (9:30 AM - 4:00 PM ET)
                  if (miniMode) {
                    // Left label: Market open (9:30 AM)
                    monthLabels.push({
                      month: '9:30 AM',
                      position: 0,
                      key: 'market-open'
                    });
                    
                    // Right label: Market close (4:00 PM)
                    monthLabels.push({
                      month: '4:00 PM',
                      position: 100,
                      key: 'market-close'
                    });
                  } else {
                    // Regular mode: show hourly intervals
                    for (let i = 0; i <= 4; i++) {
                      const timePoint = startTime + (i / 4) * displayedTimeSpan;
                      const timeDate = new Date(timePoint);
                      const hour = timeDate.getHours();
                      const label = `${hour.toString().padStart(2, '0')}:00`;
                      const position = (i / 4) * 100;
                      
                      monthLabels.push({
                        month: label,
                        position,
                        key: `hour-${i}`
                      });
                    }
                  }
                } else if (displayedDays <= 7) {
                  // Show days for short ranges
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  
                  for (let i = 0; i <= 4; i++) {
                    const timePoint = startTime + (i / 4) * displayedTimeSpan;
                    const timeDate = new Date(timePoint);
                    const dayName = dayNames[timeDate.getDay()];
                    const position = (i / 4) * 100;
                    
                    monthLabels.push({
                      month: dayName,
                      position,
                      key: `day-${i}`
                    });
                  }
                } else if (displayedDays <= 60) {
                  // Show dates for close zoom (up to 2 months) - format as MM/DD
                  let labelsToShow: number;
                  
                  if (displayedDays <= 14) {
                    labelsToShow = 4; // 2 week range - show 4 dates
                  } else if (displayedDays <= 30) {
                    labelsToShow = 5; // 1 month range - show 5 dates
                  } else {
                    labelsToShow = 6; // 2 month range - show 6 dates
                  }
                  
                  for (let i = 0; i < labelsToShow; i++) {
                    const timePoint = startTime + (i / (labelsToShow - 1)) * displayedTimeSpan;
                    const timeDate = new Date(timePoint);
                    const month = (timeDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = timeDate.getDate().toString().padStart(2, '0');
                    const dateLabel = `${month}/${day}`;
                    const position = (i / (labelsToShow - 1)) * 100;
                    
                    monthLabels.push({
                      month: dateLabel,
                      position,
                      key: `date-${i}`
                    });
                  }
                } else if (displayedDays <= 365 * 1.5) {
                  // Show months for medium ranges (up to 1.5 years)
                  const startDate = new Date(startTime);
                  const endDate = new Date(endTime);
                  
                  // Calculate how many months to show based on the time span
                  const monthsInRange = Math.ceil(displayedDays / 30);
                  let labelsToShow: number;
                  
                  if (displayedDays <= 90) {
                    labelsToShow = 4; // 3 month range
                  } else if (displayedDays <= 180) {
                    labelsToShow = 6; // 6 month range - show all 6 months
                  } else if (displayedDays <= 365) {
                    labelsToShow = 6; // 1 year range - show every other month
                  } else {
                    labelsToShow = 8; // 2 year range
                  }
                  
                  for (let i = 0; i < labelsToShow; i++) {
                    const timePoint = startTime + (i / (labelsToShow - 1)) * displayedTimeSpan;
                    const timeDate = new Date(timePoint);
                    const monthName = monthNames[timeDate.getMonth()];
                    const position = (i / (labelsToShow - 1)) * 100;
                    
                    monthLabels.push({
                      month: monthName,
                      position,
                      key: `month-${i}`
                    });
                  }
                } else {
                  // Show years for very long ranges
                  const startDate = new Date(startTime);
                  const endDate = new Date(endTime);
                  const yearsInRange = (endDate.getFullYear() - startDate.getFullYear()) + 1;
                  const labelsToShow = Math.min(5, Math.max(2, yearsInRange));
                  
                  for (let i = 0; i < labelsToShow; i++) {
                    const timePoint = startTime + (i / (labelsToShow - 1)) * displayedTimeSpan;
                    const timeDate = new Date(timePoint);
                    const yearLabel = timeDate.getFullYear().toString();
                    const position = (i / (labelsToShow - 1)) * 100;
                    
                    monthLabels.push({
                      month: yearLabel,
                      position,
                      key: `year-${i}`
                    });
                  }
                }
              }

                      return monthLabels.map(({ month, position, key }) => (
                        <div
                          key={key}
                          className="absolute whitespace-nowrap"
                          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                        >
                          <span className="font-medium">{month}</span>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Year label if needed */}
                  <div className="relative w-full h-3 flex items-center text-xs text-muted-foreground">
                    {(() => {
                      // Only show year labels for month-based displays and when spanning multiple years
                      const startDate = new Date(startTime);
                      const endDate = new Date(endTime);
                      const startYear = startDate.getFullYear();
                      const endYear = endDate.getFullYear();
                      
                      // Only show year labels when displaying months and spanning multiple years
                      if (displayedDays > 7 && displayedDays <= 365 * 1.5 && startYear !== endYear) {
                const yearsSpanned = endYear - startYear + 1;
                
                if (yearsSpanned === 2) {
                  // Two years - show both
                  return (
                    <>
                      <div
                        className="absolute whitespace-nowrap"
                        style={{ left: '25%', transform: 'translateX(-50%)' }}
                      >
                        <span className="text-xs">{startYear}</span>
                      </div>
                      <div
                        className="absolute whitespace-nowrap"
                        style={{ left: '75%', transform: 'translateX(-50%)' }}
                      >
                        <span className="text-xs">{endYear}</span>
                      </div>
                    </>
                  );
                } else {
                  // More than two years - show start, middle, and end
                  const yearLabels = [];
                  for (let i = 0; i < Math.min(yearsSpanned, 3); i++) {
                    const year = startYear + Math.floor((i / (Math.min(yearsSpanned, 3) - 1)) * (endYear - startYear));
                    const position = (i / (Math.min(yearsSpanned, 3) - 1)) * 100;
                    
                    yearLabels.push(
                      <div
                        key={year}
                        className="absolute whitespace-nowrap"
                        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                      >
                        <span className="text-xs">{year}</span>
                      </div>
                    );
                  }
                  return yearLabels;
                }
              }
              
                      return null;
                    })()}
                  </div>
                </>
              );
            })()}
          </div>}

        {/* Time range buttons and zoom controls */}
        <div className="flex justify-between items-center">
          <div className="flex justify-center space-x-1 flex-1 my-[-20px] mx-[0px] mt-[8px] mr-[0px] mb-[-20px] ml-[0px]">
            {Object.entries(miniMode ? TIME_RANGE_CONFIG_MINI : TIME_RANGE_CONFIG_MAIN).map(([range, config]) => (
              <Button
                key={range}
                variant="ghost"
                size="sm"
                onClick={() => handleTimeRangeSelect(range as TimeRange)}
                className={`h-8 px-3 text-xs font-medium transition-all duration-200 hover:bg-transparent ${
                  selectedTimeRange === range
                    ? 'text-ai-accent bg-transparent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {config.label}
              </Button>
            ))}
          </div>
          
          {/* Reset button when zoomed */}
          {(zoomRange.start > 0 || zoomRange.end < 100 || timeWindow.zoomLevel > 1) && (
            <div className="flex items-center space-x-2 ml-4">
              {timeWindow.zoomLevel > 1 && (
                <span className="text-xs text-muted-foreground">
                  {timeWindow.zoomLevel.toFixed(1)}x
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setZoomRange({ start: 0, end: 100 });
                  setTimeWindow({ startTime: null, endTime: null, zoomLevel: 1 });
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            </div>
          )}
        </div>


      </div>
      )}
    </div>
  );
}

// Zoom Slider Component
function ZoomSliderComponent({ 
  zoomRange, 
  onZoomChange,
  subtle = false
}: { 
  zoomRange: { start: number; end: number };
  onZoomChange: (range: { start: number; end: number }) => void;
  subtle?: boolean;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; startVal: number; endVal: number }>({ x: 0, startVal: 0, endVal: 100 });

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    setIsDragging(type);
    setDragStart({
      x: e.clientX,
      startVal: zoomRange.start,
      endVal: zoomRange.end
    });
  }, [zoomRange]);

  const handleTouchStart = useCallback((e: React.TouchEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    setIsDragging(type);
    setDragStart({
      x: e.touches[0].clientX,
      startVal: zoomRange.start,
      endVal: zoomRange.end
    });
  }, [zoomRange]);

  const updateZoom = useCallback((clientX: number) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const deltaX = clientX - dragStart.x;
    const deltaPercent = (deltaX / rect.width) * 100;

    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(dragStart.startVal + deltaPercent, zoomRange.end - 5));
      onZoomChange({ start: newStart, end: zoomRange.end });
    } else if (isDragging === 'end') {
      const newEnd = Math.min(100, Math.max(dragStart.endVal + deltaPercent, zoomRange.start + 5));
      onZoomChange({ start: zoomRange.start, end: newEnd });
    } else if (isDragging === 'range') {
      const rangeWidth = dragStart.endVal - dragStart.startVal;
      let newStart = dragStart.startVal + deltaPercent;
      let newEnd = dragStart.endVal + deltaPercent;

      if (newStart < 0) {
        newStart = 0;
        newEnd = rangeWidth;
      } else if (newEnd > 100) {
        newEnd = 100;
        newStart = 100 - rangeWidth;
      }

      onZoomChange({ start: newStart, end: newEnd });
    }
  }, [isDragging, dragStart, zoomRange, onZoomChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    updateZoom(e.clientX);
  }, [updateZoom]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      updateZoom(e.touches[0].clientX);
    }
  }, [updateZoom]);

  const handleEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  return (
    <div 
      ref={sliderRef}
      className={`relative cursor-pointer ${subtle ? 'h-5' : 'h-8'} ${subtle ? 'bg-transparent' : 'bg-muted rounded'}`}
      style={subtle ? {} : { background: 'var(--muted)' }}
    >
      {/* Full timeline background */}
      <div className={`absolute rounded ${subtle ? 'inset-0 bg-gray-100 dark:bg-gray-800' : 'inset-1 bg-muted-foreground/20'}`}></div>
      
      {/* Start handle */}
      <div 
        className={`absolute cursor-ew-resize flex items-center justify-center touch-manipulation ${subtle ? 'top-0 w-5 h-5 bg-gray-300 dark:bg-gray-400 rounded-full' : 'top-0 w-4 h-8 bg-ai-accent rounded-l'}`}
        style={{ left: `calc(${zoomRange.start}% - ${subtle ? '10px' : '8px'})` }}
        onMouseDown={(e) => handleMouseDown(e, 'start')}
        onTouchStart={(e) => handleTouchStart(e, 'start')}
      >
        {!subtle && <div className="w-1 h-4 bg-white rounded"></div>}
      </div>
      
      {/* End handle */}
      <div 
        className={`absolute cursor-ew-resize flex items-center justify-center touch-manipulation ${subtle ? 'top-0 w-5 h-5 bg-gray-300 dark:bg-gray-400 rounded-full' : 'top-0 w-4 h-8 bg-ai-accent rounded-r'}`}
        style={{ left: `calc(${zoomRange.end}% - ${subtle ? '10px' : '8px'})` }}
        onMouseDown={(e) => handleMouseDown(e, 'end')}
        onTouchStart={(e) => handleTouchStart(e, 'end')}
      >
        {!subtle && <div className="w-1 h-4 bg-white rounded"></div>}
      </div>
    </div>
  );
}