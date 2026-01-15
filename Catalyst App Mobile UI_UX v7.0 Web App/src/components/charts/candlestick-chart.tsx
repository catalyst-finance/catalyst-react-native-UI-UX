import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from 'react-dom';
import { formatCurrency, getEventTypeHexColor, eventTypeConfig } from "../../utils/formatting";
import { Button } from "../ui/button";
import { AnimatedPrice } from '../animated-price';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import realtimePriceService from '../../utils/realtime-price-service';
import { getCurrentMarketPeriod, isTodayHoliday } from '../../utils/market-status';
import StockAPI from '../../utils/supabase/stock-api';
import {
  getMarketHoursBounds,
  getTradingDayFromData,
  calculateIntradayXPosition,
  calculateIndexBasedXPosition,
  EXTENDED_HOURS_TOTAL,
  MS,
  isCurrentlyWeekend
} from '../../utils/chart-time-utils';
import { calculatePriceRange } from '../../utils/chart-math-utils';
import { 
  TrendingUp, 
  BarChart3, 
  AlertCircle, 
  Target, 
  DollarSign, 
  Sparkles, 
  Package, 
  ShoppingCart, 
  Shield, 
  Handshake, 
  Building, 
  Tag, 
  Presentation, 
  Scale, 
  Landmark,
  Users,
  Calendar,
  Settings
} from "lucide-react";
import { CandlestickIcon } from "../icons/candlestick-icon";
import { MarketEvent } from "../../utils/supabase/events-api";

interface CandlestickData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session?: string; // Session type: pre-market, regular, after-hours
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y';

// Event Type Icon Components mapping
const eventTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  earnings: BarChart3,
  fda: AlertCircle,
  merger: Target,
  split: TrendingUp,
  dividend: DollarSign,
  launch: Sparkles,
  product: Package,
  capital_markets: DollarSign,
  legal: Scale,
  commerce_event: ShoppingCart,
  investor_day: Presentation,
  conference: Users,
  regulatory: Landmark,
  guidance_update: TrendingUp,
  partnership: Handshake,
  corporate: Building,
  pricing: Tag,
  defense_contract: Shield,
  guidance: TrendingUp
};

interface PriceTarget {
  _id: string;
  symbol: string;
  analyst_firm: string;
  analyst_name?: string;
  price_target: number;
  rating?: string;
  published_date: string;
  action?: string;
  previous_target?: number;
  updated_at?: string;
}

interface AdvancedFinancialChartProps {
  ticker: string;
  data: CandlestickData[];
  width: number;
  height: number;
  ratio: number;
  onTimeRangeChange?: (range: TimeRange) => void;
  defaultTimeRange?: TimeRange;
  currentPrice: number;
  priceChange?: number;
  priceChangePercent?: number;
  showAdvancedChart?: boolean;
  onToggleChart?: () => void;
  futureCatalysts?: any[];
  pastEvents?: any[]; // Past events to show on chart
  selectedTimeRange?: TimeRange; // Add this to know if we're in 1D intraday mode
  previousClose?: number | null; // Add previousClose for y-scale calculation
  previousDayData?: { close: number; previousClose: number } | null; // Add for pre-market display
  customViewportSplit?: number; // Percentage of screen for past (50 = 50/50 split)
  onViewportSplitChange?: (split: number) => void;
  marketClosePrice?: number | null; // Shared market close price from parent
  shortenedTradingHours?: { open: string; close: string } | null; // For shortened trading days like day after Thanksgiving
  showUpcomingRange?: boolean; // Whether to show the upcoming catalysts section
  onShowUpcomingRangeChange?: (show: boolean) => void;
  showPastEvents?: boolean; // Whether to show past event dots
  onShowPastEventsChange?: (show: boolean) => void;
  settingsOpen?: boolean; // Whether settings popover is open
  onSettingsOpenChange?: (open: boolean) => void;
  selectedEventTypes?: string[]; // Which event types to show on chart
  onSelectedEventTypesChange?: (types: string[]) => void;
  priceTargets?: PriceTarget[]; // Analyst price targets to display as horizontal lines
}

export const AdvancedFinancialChart = ({ 
  ticker, 
  data, 
  width, 
  height, 
  ratio,
  onTimeRangeChange,
  defaultTimeRange = '1D',
  currentPrice,
  priceChange,
  priceChangePercent,
  showAdvancedChart = true,
  onToggleChart,
  futureCatalysts,
  pastEvents = [],
  selectedTimeRange,
  previousClose,
  previousDayData,
  customViewportSplit: externalViewportSplit,
  onViewportSplitChange,
  marketClosePrice: externalMarketClosePrice,
  shortenedTradingHours,
  showUpcomingRange: externalShowUpcomingRange,
  onShowUpcomingRangeChange,
  showPastEvents: externalShowPastEvents,
  onShowPastEventsChange,
  settingsOpen: externalSettingsOpen,
  onSettingsOpenChange,
  selectedEventTypes: externalSelectedEventTypes,
  onSelectedEventTypesChange,
  priceTargets = []
}: AdvancedFinancialChartProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverCatalyst, setHoverCatalyst] = useState<MarketEvent | null>(null); // Track catalyst when hovering on past event
  const [hoverEvent, setHoverEvent] = useState<any | null>(null);
  const [hoverPastEvent, setHoverPastEvent] = useState<{ event: any; x: number; y: number } | null>(null);
  const [futureHoverXPercent, setFutureHoverXPercent] = useState<number | null>(null); // Track mouse position in future section
  const [isPressed, setIsPressed] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fullChartRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsDropdownPosition, setSettingsDropdownPosition] = useState({ top: 0, right: 0 });
  
  // Settings popover state - use external if provided
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);
  const settingsOpen = externalSettingsOpen ?? internalSettingsOpen;
  const setSettingsOpen = onSettingsOpenChange ?? setInternalSettingsOpen;
  
  // Upcoming range visibility - internal state with external override
  const [internalShowUpcomingRange, setInternalShowUpcomingRange] = useState(true);
  const showUpcomingRange = externalShowUpcomingRange ?? internalShowUpcomingRange;
  const setShowUpcomingRange = onShowUpcomingRangeChange ?? setInternalShowUpcomingRange;
  
  // Past events visibility - internal state with external override
  const [internalShowPastEvents, setInternalShowPastEvents] = useState(true);
  const showPastEvents = externalShowPastEvents ?? internalShowPastEvents;
  const setShowPastEvents = onShowPastEventsChange ?? setInternalShowPastEvents;
  
  // Selected event types - internal state with external override (all types enabled by default)
  const allEventTypes = Object.keys(eventTypeConfig);
  const [internalSelectedEventTypes, setInternalSelectedEventTypes] = useState<string[]>(allEventTypes);
  const selectedEventTypes = externalSelectedEventTypes ?? internalSelectedEventTypes;
  const setSelectedEventTypes = onSelectedEventTypesChange ?? setInternalSelectedEventTypes;
  
  // Realtime price state
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [livePriceChange, setLivePriceChange] = useState(priceChange || 0);
  const [livePriceChangePercent, setLivePriceChangePercent] = useState(priceChangePercent || 0);
  
  // Market status state
  const [marketPeriod, setMarketPeriod] = useState<'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'>('regular');
  const [isHoliday, setIsHoliday] = useState(false);
  
  // Fixed viewport split at 60% past, 40% future
  const customViewportSplit = 60;
  
  // Filter events based on selected event types
  const filteredFutureCatalysts = useMemo(() => {
    return (futureCatalysts || []).filter(catalyst => selectedEventTypes.includes(catalyst.catalyst.type));
  }, [futureCatalysts, selectedEventTypes]);

  const filteredPastEvents = useMemo(() => {
    return pastEvents.filter(event => selectedEventTypes.includes(event.type));
  }, [pastEvents, selectedEventTypes]);
  
  // Fetch market status on component mount
  useEffect(() => {
    const fetchMarketStatus = async () => {
      const [period, holiday] = await Promise.all([
        getCurrentMarketPeriod(),
        isTodayHoliday()
      ]);
      setMarketPeriod(period);
      setIsHoliday(holiday);
    };
    
    fetchMarketStatus();
    
    // Refresh market status every minute
    const interval = setInterval(fetchMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);
  
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
    setLivePriceChange(priceChange || 0);
    setLivePriceChangePercent(priceChangePercent || 0);
  }, [currentPrice, priceChange, priceChangePercent]);

  // Refs for debugging
  const priceDisplayRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Interaction handlers for click/tap crosshair
  const handleInteraction = (clientX: number, clientY: number) => {
    if (!fullChartRef.current || validData.length === 0) return;

    const chartRect = fullChartRef.current.getBoundingClientRect();
    const x = clientX - chartRect.left;
    // Use width directly instead of chartRect.width for consistent calculations
    const chartWidth = width;
    
    // Calculate the actual split position based on customViewportSplit
    const splitPosition = (customViewportSplit / 100) * chartWidth;

    // Check if we're in the past or future section based on customViewportSplit
    if (x < splitPosition) {
      // Past section - snap to candlesticks
      setHoverEvent(null);
      setFutureHoverXPercent(null);
      
      const xPercent = x / splitPosition; // 0 to 1 within the past section
      
      let minDistance = Infinity;
      let closestIndex: number | null = null;

      validData.forEach((candle, i) => {
        // Calculate x position using the same logic as rendering
        let candleXPercent;
        if (selectedTimeRange === '1D' || defaultTimeRange === '1D') {
          const pointTime = candle.date.getTime();
          // Use shared util for X position calculation
          candleXPercent = calculateIntradayXPosition(pointTime, marketHours, 1); // normalized to 0-1
        } else if (selectedTimeRange === '5Y') {
          // 5Y mode: Use timestamp-based positioning to match rendering
          const now = Date.now();
          const fiveYearsPast = 5 * MS.YEAR;
          const startTime = now - fiveYearsPast;
          const pointTime = candle.date.getTime();
          const timeFromStart = pointTime - startTime;
          candleXPercent = timeFromStart / fiveYearsPast;
        } else {
          candleXPercent = i / Math.max(1, validData.length - 1);
        }

        const distance = Math.abs(xPercent - candleXPercent);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      });

      // Set hover if we found a close candle
      if (minDistance < 0.05 && closestIndex !== null) {
        setHoverIndex(closestIndex);
        
        // Check proximity to past events - snap if close enough (pixel-based)
        if (showPastEvents && filteredPastEvents && filteredPastEvents.length > 0) {
          const now = Date.now();
          const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
          
          // Filter to only show events within the visible data range
          const minDataTime = validData.length > 0 ? Math.min(...validData.map(d => d.date.getTime())) : 0;
          const maxDataTime = validData.length > 0 ? Math.max(...validData.map(d => d.date.getTime())) : 0;
          const extendedMaxDataTime = maxDataTime + (24 * 60 * 60 * 1000); // Extend by 1 day
          
          const visiblePastEvents = filteredPastEvents.filter(event => {
            if (!event.actualDateTime) return false;
            const eventTime = new Date(event.actualDateTime).getTime();
            return eventTime <= now && eventTime >= minDataTime && eventTime <= extendedMaxDataTime;
          });
          
          if (visiblePastEvents.length === 0) {
            setHoverCatalyst(null);
            setHoverPastEvent(null);
          } else {
            let minEventPixelDistance = Infinity;
            let closestPastEvent: MarketEvent | null = null;
            let closestEventCandleIndex = -1;
            
            // Get the hovered candle's X position
            const hoveredCandle = validData[closestIndex];
            let hoveredCandleX: number;
            if (effectiveTimeRange === '1D') {
              hoveredCandleX = calculateIntradayXPosition(hoveredCandle.date.getTime(), marketHours, splitPosition);
            } else if (effectiveTimeRange === '5Y') {
              const fiveYearsPast = 5 * MS.YEAR;
              const startTime = now - fiveYearsPast;
              hoveredCandleX = ((hoveredCandle.date.getTime() - startTime) / fiveYearsPast) * splitPosition;
            } else {
              hoveredCandleX = (closestIndex / Math.max(1, validData.length - 1)) * splitPosition;
            }
            
            visiblePastEvents.forEach(event => {
              // Only consider past events
              if (!event.actualDateTime) return;
              const eventTime = new Date(event.actualDateTime).getTime();
              if (eventTime > now) return;
            
            // Find the closest candlestick to this event's timestamp
            let eventCandleIndex = 0;
            let eventMinTimeDiff = Infinity;
            
            validData.forEach((candle, i) => {
              const candleTimestamp = candle.date.getTime();
              const timeDiff = Math.abs(candleTimestamp - eventTime);
              if (timeDiff < eventMinTimeDiff) {
                eventMinTimeDiff = timeDiff;
                eventCandleIndex = i;
              }
            });
            
            // Calculate the event's X position in pixels
            const eventCandle = validData[eventCandleIndex];
            let eventX: number;
            if (effectiveTimeRange === '1D') {
              eventX = calculateIntradayXPosition(eventCandle.date.getTime(), marketHours, splitPosition);
            } else if (effectiveTimeRange === '5Y') {
              const fiveYearsPast = 5 * MS.YEAR;
              const startTime = now - fiveYearsPast;
              eventX = ((eventCandle.date.getTime() - startTime) / fiveYearsPast) * splitPosition;
            } else {
              eventX = (eventCandleIndex / Math.max(1, validData.length - 1)) * splitPosition;
            }
            
            // Calculate pixel distance from hovered position to event
            const pixelDistance = Math.abs(hoveredCandleX - eventX);
            
              if (pixelDistance < minEventPixelDistance) {
                minEventPixelDistance = pixelDistance;
                closestPastEvent = event;
                closestEventCandleIndex = eventCandleIndex;
              }
            });
            
            // Snap threshold: 5 pixels (matching line chart)
            const snapThreshold = 5;
            
            if (minEventPixelDistance <= snapThreshold && closestPastEvent) {
              // Snap the hoverIndex to the event's candle for exact crosshair alignment
              if (closestEventCandleIndex !== -1 && closestEventCandleIndex !== closestIndex) {
                setHoverIndex(closestEventCandleIndex);
              }
              
              setHoverCatalyst(closestPastEvent);
              setHoverPastEvent({
                event: closestPastEvent,
                x: 0,
                y: 0
              });
            } else {
              setHoverCatalyst(null);
              setHoverPastEvent(null);
            }
          }
        } else {
          setHoverCatalyst(null);
          setHoverPastEvent(null);
        }
      } else {
        setHoverIndex(null);
        setHoverCatalyst(null);
        setHoverPastEvent(null);
      }
    } else {
      // Future section - snap to event dots
      setHoverIndex(null);
      
      const xInFuture = x - splitPosition; // x position within the future section
      const futureWidth = chartWidth - splitPosition; // Width of the future section
      const xPercentInFuture = xInFuture / futureWidth; // 0 to 1 within future section
      
      // Always set the future hover position for crosshair rendering
      setFutureHoverXPercent(xPercentInFuture);
      
      if (!filteredFutureCatalysts || filteredFutureCatalysts.length === 0) {
        setHoverEvent(null);
        return;
      }

      const now = Date.now();
      
      // Find closest event
      let minDistance = Infinity;
      let closestEvent: any | null = null;
      
      filteredFutureCatalysts.forEach((catalyst) => {
        const timeFromNow = catalyst.timestamp - now;
        // Add time buffer to match event dot positioning (14 days)
        const timeBufferMs = 14 * 24 * 60 * 60 * 1000;
        const adjustedTimeFromNow = timeFromNow + timeBufferMs;
        const eventXPercent = Math.min(1, Math.max(0, adjustedTimeFromNow / futureWindowMs));
        
        const distance = Math.abs(xPercentInFuture - eventXPercent);
        if (distance < minDistance) {
          minDistance = distance;
          closestEvent = catalyst;
        }
      });
      
      // Snap to event if close enough (within ~20px)
      const snapThreshold = 20 / futureWidth;
      
      if (minDistance < snapThreshold && closestEvent) {
        setHoverEvent(closestEvent);
        setFutureHoverXPercent(null); // Clear continuous hover when snapped to event
      } else {
        setHoverEvent(null);
        // futureHoverXPercent already set, so continuous crosshair will show
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPressed(true);
  };
  
  const handleMouseUp = () => {
    setIsPressed(false);
  };
  
  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverEvent(null);
    setFutureHoverXPercent(null);
    setIsPressed(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPressed) {
      handleInteraction(e.clientX, e.clientY);
    }
  };

  // Native touch event handlers (to support preventDefault with passive: false)
  const handleNativeTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length > 0) {
      setIsPressed(true);
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleInteraction]);

  const handleNativeTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleInteraction]);

  const handleNativeTouchEnd = useCallback(() => {
    setIsPressed(false);
    setHoverIndex(null);
    setHoverEvent(null);
  }, []);

  // Attach native touch event listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const chartElement = fullChartRef.current;
    const svgElement = svgRef.current;
    
    if (chartElement) {
      chartElement.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
      chartElement.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
      chartElement.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    }
    
    if (svgElement) {
      svgElement.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
      svgElement.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
      svgElement.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    }
    
    return () => {
      if (chartElement) {
        chartElement.removeEventListener('touchstart', handleNativeTouchStart);
        chartElement.removeEventListener('touchmove', handleNativeTouchMove);
        chartElement.removeEventListener('touchend', handleNativeTouchEnd);
      }
      if (svgElement) {
        svgElement.removeEventListener('touchstart', handleNativeTouchStart);
        svgElement.removeEventListener('touchmove', handleNativeTouchMove);
        svgElement.removeEventListener('touchend', handleNativeTouchEnd);
      }
    };
  }, [handleNativeTouchStart, handleNativeTouchMove, handleNativeTouchEnd]);

  const handleTimeRangeChange = (range: TimeRange) => {
    onTimeRangeChange?.(range);
  };

  const chartData = useMemo(() => {
    console.log(`[DEBUG CandlestickChart ${ticker}] 🔍 Received data.length: ${data.length}`);
    if (data.length === 0) {
      console.log(`[DEBUG CandlestickChart ${ticker}] ❌ No data provided - returning null`);
      return null;
    }

    // Filter valid data
    let validData = data.filter(d => 
      d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0
    );
    
    console.log(`[DEBUG CandlestickChart ${ticker}] ✅ After filtering valid data: ${validData.length} candles (removed ${data.length - validData.length} invalid candles)`);
    
    // Track session field usage for debugging
    const sessionFieldCount = validData.filter(d => d.session).length;
    const timestampFallbackCount = validData.length - sessionFieldCount;
    console.log(`[DEBUG CandlestickChart ${ticker}] 📊 Session field usage: ${sessionFieldCount} candles have session field, ${timestampFallbackCount} will use timestamp fallback. Total candles: ${validData.length}`);
    
    // Aggregate candlesticks for longer time ranges
    const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
    
    // For 1D view, we want to show the most recent trading day's data
    // This could be today if market is open, or the last trading day if market is closed
    if (effectiveTimeRange === '1D') {
      const beforeFilterCount = validData.length;
      
      // For 1D candlestick view, we want ALL candles from the dataset since they're already 
      // filtered to the appropriate day by the data fetching logic
      // The data is fetched with days=1 which gives us today's trading data
      // We don't need to filter further here
      
      console.log(`[DEBUG CandlestickChart ${ticker}] 📅 1D view: Showing all ${validData.length} candles from current/most recent trading day`);
      if (validData.length > 0) {
        const firstCandle = validData[0];
        const lastCandle = validData[validData.length - 1];
        console.log(`[DEBUG CandlestickChart ${ticker}] 🕐 First candle: ${firstCandle.date.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} ET`);
        console.log(`[DEBUG CandlestickChart ${ticker}] 🕐 Last candle: ${lastCandle.date.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} ET`);
      }
    }
    
    if (effectiveTimeRange === 'YTD' || effectiveTimeRange === '1Y') {
      // Aggregate into weekly candles
      const weeklyMap = new Map<string, CandlestickData>();
      
      validData.forEach(candle => {
        // Get Monday of this week as the key
        const date = candle.date;
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(date);
        monday.setDate(date.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);
        const weekKey = monday.toISOString().split('T')[0];
        
        if (!weeklyMap.has(weekKey)) {
          // First candle of this week - initialize
          weeklyMap.set(weekKey, {
            date: monday,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume
          });
        } else {
          // Update existing week candle
          const existing = weeklyMap.get(weekKey)!;
          existing.high = Math.max(existing.high, candle.high);
          existing.low = Math.min(existing.low, candle.low);
          existing.close = candle.close; // Last close becomes the week's close
          existing.volume += candle.volume;
        }
      });
      
      // Convert map to sorted array
      validData = Array.from(weeklyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    } else if (effectiveTimeRange === '5Y') {
      // Aggregate into monthly candles
      const monthlyMap = new Map<string, CandlestickData>();
      
      validData.forEach(candle => {
        // Get first of this month as the key
        const date = candle.date;
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
          // First candle of this month - initialize
          monthlyMap.set(monthKey, {
            date: monthStart,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume
          });
        } else {
          // Update existing month candle
          const existing = monthlyMap.get(monthKey)!;
          existing.high = Math.max(existing.high, candle.high);
          existing.low = Math.min(existing.low, candle.low);
          existing.close = candle.close; // Last close becomes the month's close
          existing.volume += candle.volume;
        }
      });
      
      // Convert map to sorted array
      validData = Array.from(monthlyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    
    if (validData.length === 0) return null;

    // Determine if we're in intraday mode (1D view)
    const isIntradayMode = selectedTimeRange === '1D' || defaultTimeRange === '1D';

    // For intraday mode, calculate time-based positioning parameters using shared utils
    let marketHours = { extendedOpen: 0, regularOpen: 0, regularClose: 0, extendedClose: 0 };
    
    if (isIntradayMode && validData.length > 0) {
      // Use shared util to get market hours from the data
      const dataWithTimestamp = validData.map(d => ({ timestamp: d.date.getTime() }));
      const tradingDay = getTradingDayFromData(dataWithTimestamp);
      marketHours = getMarketHoursBounds(tradingDay);
      
      // Adjust for shortened trading hours (e.g., day after Thanksgiving closes at 1 PM)
      if (shortenedTradingHours) {
        const [closeHour, closeMinute] = shortenedTradingHours.close.split(':').map(Number);
        const adjustedClose = new Date(tradingDay);
        adjustedClose.setHours(closeHour, closeMinute, 0, 0);
        marketHours.regularClose = adjustedClose.getTime();
      }
    }

    // Calculate price range
    const allPrices = validData.flatMap(d => [d.open, d.high, d.low, d.close]);
    
    // Include previousClose in the range calculation to match the line chart
    if (previousClose) {
      allPrices.push(previousClose);
    }
    
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;
    
    // Calculate volume range
    const maxVolume = Math.max(...validData.map(d => d.volume));

    // Chart layout - match the line chart structure
    // Total height: 312px -> 272px candlesticks + 40px volume bar
    const margin = { left: 0, right: 60, top: 40, bottom: 20 };
    const candleHeight = height - 40; // Reserve 40px for volume bar below (312 - 40 = 272)
    
    const chartWidth = width - margin.left - margin.right;
    const candleChartHeight = candleHeight - margin.top - margin.bottom;

    // Calculate candle width based on data density
    let candleWidth;
    if (selectedTimeRange === '1D' || defaultTimeRange === '1D') {
      // For intraday 1D mode using time-based positioning:
      // Each 5-minute candle represents 5 minutes out of the full extended trading session
      // Extended hours: 4am-8pm ET = 16 hours = 960 minutes
      // 5 minutes / 960 minutes = 0.0052 of the full width
      // We want the candle to take up ~80% of its time slot for better visibility
      const fiveMinutesInMs = 5 * 60 * 1000;
      const extendedHoursInMs = EXTENDED_HOURS_TOTAL * 60 * 60 * 1000; // EXTENDED_HOURS_TOTAL is in hours
      
      // CRITICAL: Use the past section width (not full width) since we have future events section
      // customViewportSplit is the percentage of width allocated to past data
      const pastSectionWidth = width * (customViewportSplit / 100);
      const timeSlotWidth = (fiveMinutesInMs / extendedHoursInMs) * pastSectionWidth;
      candleWidth = Math.max(2, Math.min(12, timeSlotWidth * 0.8)); // 80% of time slot, min 2px, max 12px
    } else {
      // For index-based positioning (multi-day views), use the original calculation
      candleWidth = Math.max(2, Math.min(10, chartWidth / validData.length * 0.7));
    }
    
    // Calculate last candle position - UPDATED to use width instead of chartWidth
    const lastIndex = validData.length - 1;
    const lastCandleX = margin.left + (lastIndex / Math.max(1, validData.length - 1)) * width;

    return {
      validData,
      minPrice: minPrice - pricePadding,
      maxPrice: maxPrice + pricePadding,
      priceRange: maxPrice - minPrice + 2 * pricePadding,
      maxVolume,
      margin,
      candleHeight,
      chartWidth,
      candleChartHeight,
      candleWidth,
      marketHours,
      isIntradayMode
    };
  }, [data, width, height, selectedTimeRange, defaultTimeRange, customViewportSplit, ticker, shortenedTradingHours]);

  if (!chartData) {
    return (
      <div 
        className="flex items-center justify-center bg-background rounded-[12px] border border-border/50" 
        style={{ width, height }}
      >
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    );
  }

  const {
    validData,
    minPrice,
    maxPrice,
    priceRange,
    maxVolume,
    margin,
    candleHeight,
    chartWidth,
    candleChartHeight,
    candleWidth,
    marketHours,
    isIntradayMode
  } = chartData;

  // Helper to convert price to Y coordinate
  const priceToY = (price: number) => {
    return margin.top + candleChartHeight - ((price - minPrice) / priceRange) * candleChartHeight;
  };

  const hoverData = hoverIndex !== null ? validData[hoverIndex] : null;

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'];

  // Calculate last candle position for the horizontal line to events
  const lastCandle = validData[validData.length - 1];
  const lastCandleY = lastCandle ? priceToY(lastCandle.close) : candleChartHeight / 2;
  
  // Calculate actual x-position of last candle (matching the positioning logic in the rendering)
  const lastCandleX = useMemo(() => {
    if (validData.length === 0) return width / 2;
    
    const lastIndex = validData.length - 1;
    const lastCandle = validData[lastIndex];
    const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
    
    if (effectiveTimeRange === '1D') {
      // Time-based positioning for intraday using shared util
      const pointTime = lastCandle.date.getTime();
      return calculateIntradayXPosition(pointTime, marketHours, width);
    } else if (effectiveTimeRange === '5Y') {
      // Timestamp-based positioning for 5Y
      const now = Date.now();
      const fiveYearsPast = 5 * MS.YEAR;
      const startTime = now - fiveYearsPast;
      const totalDuration = fiveYearsPast;
      const pointTime = lastCandle.date.getTime();
      const timeFromStart = pointTime - startTime;
      const xPercent = timeFromStart / totalDuration;
      return xPercent * width;
    } else {
      // Index-based positioning for other multi-day views
      return margin.left + calculateIndexBasedXPosition(lastIndex, validData.length, width);
    }
  }, [validData, selectedTimeRange, defaultTimeRange, width, margin.left, marketHours]);
  
  // Use customViewportSplit for dynamic past/future split
  // When showUpcomingRange is false, past section takes 100% width
  const pastWidthPercent = showUpcomingRange ? customViewportSplit : 100;
  const futureWidthPercent = showUpcomingRange ? (100 - customViewportSplit) : 0;
  
  // Calculate dynamic wick width based on view and compression
  // For 1D: thinner wicks. When upcoming range is shown, make even thinner
  const wickStrokeWidth = useMemo(() => {
    const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
    if (effectiveTimeRange === '1D') {
      // Base wick width for 1D: 0.5px
      // Scale down proportionally when past section is compressed
      const compressionFactor = pastWidthPercent / 100; // 1.0 when full width, 0.5 when 50% width, etc.
      return Math.max(0.3, 0.5 * compressionFactor);
    } else {
      // For other views: slightly thicker wicks
      const compressionFactor = pastWidthPercent / 100;
      return Math.max(0.5, 1 * compressionFactor);
    }
  }, [selectedTimeRange, defaultTimeRange, pastWidthPercent]);
  
  // Calculate future window dynamically based on viewport split AND time range
  // This ensures event dots align consistently between line and candlestick charts
  const futureWindowMs = useMemo(() => {
    const now = new Date();
    
    // Calculate how many months to show based on viewport split
    // futureWidthPercent determines how much space we have
    // Base case: 50% width = 3 months, scale linearly
    const baseMonths = 3;
    const baseWidth = 50;
    const monthsToShow = Math.max(1, Math.round((futureWidthPercent / baseWidth) * baseMonths));
    
    const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
    
    if (effectiveTimeRange === '1D' || effectiveTimeRange === '1W' || effectiveTimeRange === '1M') {
      // Short ranges: scale months based on available space
      return monthsToShow * 30 * 24 * 60 * 60 * 1000;
    } else if (effectiveTimeRange === '3M') {
      // 3M: scale months based on available space
      return monthsToShow * 30 * 24 * 60 * 60 * 1000;
    } else if (effectiveTimeRange === 'YTD') {
      // YTD: match the past duration (from Jan 1 to now, show same duration forward)
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const pastDurationMs = now.getTime() - yearStart.getTime();
      return Math.max(pastDurationMs, 90 * 24 * 60 * 60 * 1000); // At least 3 months
    } else if (effectiveTimeRange === '1Y') {
      // 1Y: show 1 year into the future
      return 365 * 24 * 60 * 60 * 1000; // 1 year
    } else if (effectiveTimeRange === '5Y') {
      // 5Y: show 5 years into the future
      return 5 * 365 * 24 * 60 * 60 * 1000; // 5 years
    } else {
      // Default: 3 months
      return 90 * 24 * 60 * 60 * 1000;
    }
  }, [futureWidthPercent, selectedTimeRange, defaultTimeRange]);

  // Calculate time labels for 1D intraday mode
  const timeLabels = useMemo(() => {
    const isIntradayModeLabels = selectedTimeRange === '1D' || defaultTimeRange === '1D';
    
    const labels: Array<{ label: string; xPercent: number }> = [];
    
    if (validData.length === 0) return labels;
    
    if (isIntradayModeLabels) {
      // For 1D: show 9:30 AM, 4 PM, 8 PM labels on the past side
      // Use shared utils for market hours
      const dataWithTimestamp = validData.map(d => ({ timestamp: d.date.getTime() }));
      const tradingDay = getTradingDayFromData(dataWithTimestamp);
      const labelMarketHours = getMarketHoursBounds(tradingDay);
      
      // 9:30 AM - calculate as percent of past section
      const marketOpenXPercent = calculateIntradayXPosition(labelMarketHours.regularOpen, labelMarketHours, 1);
      labels.push({ label: '9:30 AM', xPercent: marketOpenXPercent * pastWidthPercent });
      
      // 4 PM
      const marketCloseXPercent = calculateIntradayXPosition(labelMarketHours.regularClose, labelMarketHours, 1);
      labels.push({ label: '4 PM', xPercent: marketCloseXPercent * pastWidthPercent });
      
      // 8 PM
      const extendedCloseXPercent = calculateIntradayXPosition(labelMarketHours.extendedClose, labelMarketHours, 1);
      labels.push({ label: '8 PM', xPercent: extendedCloseXPercent * pastWidthPercent });
    } else if (selectedTimeRange === '1W' || selectedTimeRange === '1M') {
      // For 1W and 1M: Show date labels based on index-based positioning
      const now = Date.now();
      const pastData = validData.filter(d => d.date.getTime() <= now);
      
      if (pastData.length > 0) {
        // Group data by unique days
        const dayMap = new Map<string, number[]>(); // day label -> array of indices
        pastData.forEach((point, index) => {
          const date = point.date;
          const month = (date.getMonth() + 1).toString();
          const day = date.getDate().toString();
          const label = `${month}/${day}`;
          
          if (!dayMap.has(label)) {
            dayMap.set(label, []);
          }
          dayMap.get(label)!.push(index);
        });
        
        // Get unique days and select evenly spaced ones
        const uniqueDays = Array.from(dayMap.entries());
        const numLabels = selectedTimeRange === '1W' ? Math.min(5, uniqueDays.length) : Math.min(6, uniqueDays.length);
        
        for (let i = 0; i < numLabels; i++) {
          const dayIndex = Math.floor((uniqueDays.length - 1) * i / Math.max(1, numLabels - 1));
          const [label, dataIndices] = uniqueDays[dayIndex];
          
          // Use the middle data point of this day for positioning
          const middleIndex = dataIndices[Math.floor(dataIndices.length / 2)];
          const xPercent = (middleIndex / Math.max(1, pastData.length - 1)) * pastWidthPercent;
          
          labels.push({ label, xPercent });
        }
      }
    } else if (selectedTimeRange === '5Y') {
      // For 5Y: Show year labels
      const now = Date.now();
      const pastDuration = 5 * 365 * 24 * 60 * 60 * 1000;
      const startTime = now - pastDuration;
      const endTime = now + pastDuration;
      const totalDuration = pastDuration * 2;
      
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      for (let year = startYear; year <= endYear; year++) {
        const yearStart = Date.UTC(year, 0, 1, 0, 0, 0);
        const yearEnd = Date.UTC(year + 1, 0, 1, 0, 0, 0);
        const yearCenter = (yearStart + yearEnd) / 2;
        
        if (yearCenter >= startTime && yearCenter <= endTime) {
          const xPercent = ((yearCenter - startTime) / totalDuration) * 100;
          labels.push({ label: year.toString(), xPercent });
        }
      }
    } else {
      // For 1Y, 3M, YTD: Show month labels
      const now = Date.now();
      const firstDataPoint = validData[0].date.getTime();
      const pastDuration = now - firstDataPoint;
      const futureDuration = pastDuration;
      const totalDuration = pastDuration + futureDuration;
      const startTime = now - pastDuration;
      const endTime = now + futureDuration;
      
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      let monthCounter = 0;
      
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthCenter = Date.UTC(year, month, 15, 12, 0, 0);
        
        if (monthCenter >= startTime && monthCenter <= endTime) {
          const shouldShowLabel = selectedTimeRange === '3M' || (monthCounter % 2 === 0);
          
          if (shouldShowLabel) {
            const xPercent = ((monthCenter - startTime) / totalDuration) * 100;
            const monthLabel = new Date(monthCenter).toLocaleDateString('en-US', { month: 'short' });
            labels.push({ label: monthLabel, xPercent });
          }
          
          monthCounter++;
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    // Add future labels for 1D, 1W, and 1M (dynamically calculated based on viewport split)
    if (selectedTimeRange === '1D' || selectedTimeRange === '1W' || selectedTimeRange === '1M' || 
        defaultTimeRange === '1D') {
      const now = Date.now();
      
      // Calculate number of month labels based on future window size
      const monthsInWindow = Math.round(futureWindowMs / (30 * 24 * 60 * 60 * 1000));
      const numLabels = Math.max(1, Math.min(3, monthsInWindow)); // Show 1-3 labels
      
      for (let i = 1; i <= numLabels; i++) {
        const futureTimestamp = now + (futureWindowMs * i / (numLabels + 1));
        const date = new Date(futureTimestamp);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
        const xPercent = pastWidthPercent + ((i / (numLabels + 1)) * futureWidthPercent);
        labels.push({ label: monthLabel, xPercent });
      }
    }
    
    return labels;
  }, [validData, selectedTimeRange, defaultTimeRange, futureWindowMs, pastWidthPercent, futureWidthPercent]);

  // Detect label overlaps and hide labels when they're too close
  const visibleTimeLabels = useMemo(() => {
    if (timeLabels.length === 0) return [];
    
    // Estimate label width in percentage (assuming average label is ~40px and container is ~350px wide)
    const minLabelSpacing = 12; // Minimum percentage distance between labels
    const edgeThreshold = 8; // Minimum percentage distance from section edge
    
    const visible = new Set<number>();
    
    // Separate past and future labels based on their position
    const pastLabels = timeLabels.filter(l => l.xPercent < pastWidthPercent).sort((a, b) => a.xPercent - b.xPercent);
    const futureLabels = timeLabels.filter(l => l.xPercent >= pastWidthPercent).sort((a, b) => a.xPercent - b.xPercent);
    
    // Check past section for overlaps
    let lastPastPosition = -Infinity;
    pastLabels.forEach((label) => {
      const originalIndex = timeLabels.indexOf(label);
      // Hide label if it's too close to the start edge when section is compressed
      if (label.xPercent < edgeThreshold && pastWidthPercent < 25) {
        return; // Skip this label
      }
      if (label.xPercent - lastPastPosition >= minLabelSpacing) {
        visible.add(originalIndex);
        lastPastPosition = label.xPercent;
      }
    });
    
    // Check future section for overlaps
    let lastFuturePosition = -Infinity;
    futureLabels.forEach((label) => {
      const originalIndex = timeLabels.indexOf(label);
      // Hide label if it's too close to the start edge (at pastWidthPercent) when section is compressed
      const distanceFromFutureStart = label.xPercent - pastWidthPercent;
      if (distanceFromFutureStart < edgeThreshold && (100 - pastWidthPercent) < 25) {
        return; // Skip this label
      }
      if (label.xPercent - lastFuturePosition >= minLabelSpacing) {
        visible.add(originalIndex);
        lastFuturePosition = label.xPercent;
      }
    });
    
    return timeLabels.map((label, idx) => ({
      ...label,
      showLabel: visible.has(idx)
    }));
  }, [timeLabels, pastWidthPercent]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Price display - Fixed height to prevent layout shift when hovering */}
      <div className="mb-4 min-h-[78px] relative z-10" ref={priceDisplayRef}>
        {/* When interacting, show Robinhood-style OHLC grid + timestamp OR event info */}
        {hoverPastEvent ? (
          <>
            {/* Past event information display - matched height with price display */}
            <div className="flex items-center gap-2 mb-2 h-[26px]">
              {(() => {
                const eventConfig = eventTypeConfig[hoverPastEvent.event.type as keyof typeof eventTypeConfig] || eventTypeConfig.launch;
                const EventIcon = eventTypeIcons[hoverPastEvent.event.type as keyof typeof eventTypeIcons] || eventTypeIcons.launch;
                return (
                  <div 
                    className={`w-7 h-7 ${eventConfig.color} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <EventIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                );
              })()}
              <div className="font-semibold text-foreground text-[16px] overflow-hidden line-clamp-1">
                {hoverPastEvent.event.title}
              </div>
            </div>
            {/* Fixed height container to prevent jumping - matches price display */}
            <div className="h-[44px] ml-9">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {eventTypeConfig[hoverPastEvent.event.type as keyof typeof eventTypeConfig]?.label || hoverPastEvent.event.type}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 -mt-px" />
                  <span>
                    {hoverPastEvent.event.actualDateTime 
                      ? new Date(hoverPastEvent.event.actualDateTime).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Date unavailable'
                    }
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : hoverEvent ? (
          <>
            {/* Event information display - matched height with price display */}
            <div className="flex items-center gap-2 mb-2 h-[26px]">
              {(() => {
                const eventConfig = eventTypeConfig[hoverEvent.catalyst.type as keyof typeof eventTypeConfig] || eventTypeConfig.launch;
                const EventIcon = eventTypeIcons[hoverEvent.catalyst.type as keyof typeof eventTypeIcons] || eventTypeIcons.launch;
                return (
                  <div 
                    className={`w-7 h-7 ${eventConfig.color} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <EventIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                );
              })()}
              <div className="font-semibold text-foreground text-[16px] overflow-hidden line-clamp-1">
                {hoverEvent.catalyst.title}
              </div>
            </div>
            {/* Fixed height container to prevent jumping - matches price display */}
            <div className="h-[44px] ml-9">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {eventTypeConfig[hoverEvent.catalyst.type as keyof typeof eventTypeConfig]?.label || hoverEvent.catalyst.type}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 -mt-px" />
                  <span>
                    {new Date(hoverEvent.timestamp).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : hoverData ? (
          <>
            {/* Robinhood-style 2x3 grid layout */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open</span>
                <span className="text-foreground">{formatCurrency(hoverData.open)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Close</span>
                <span className="text-foreground">{formatCurrency(hoverData.close)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">High</span>
                <span className="text-foreground">{formatCurrency(hoverData.high)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Low</span>
                <span className="text-foreground">{formatCurrency(hoverData.low)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume</span>
                <span className="text-foreground">{hoverData.volume.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className={hoverData.close >= hoverData.open ? "text-[rgb(0,200,5)]" : "text-[rgb(255,80,0)]"}>
                  {((hoverData.close - hoverData.open) / hoverData.open * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground text-[22px] mb-2">
              <AnimatedPrice price={livePrice} />
            </div>
            {/* Fixed height container to prevent jumping when switching chart types */}
            <div className="h-[44px]">
              {/* Price change info - match LargeSVGChart logic for market periods */}
              {(() => {
                // Determine if we're in intraday mode
                const isIntradayMode = selectedTimeRange === '1D' || defaultTimeRange === '1D';
                
                if (!isIntradayMode) {
                  // Non-intraday mode: show simple single line
                  return priceChange !== undefined && priceChangePercent !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${priceChange >= 0 ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                        {priceChange >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(priceChange))} ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                      </span>
                    </div>
                  );
                }
                
                if (!previousClose) {
                  // No previous close data, show simple display
                  return priceChange !== undefined && priceChangePercent !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${priceChange >= 0 ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                        {priceChange >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(priceChange))} ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                      </span>
                    </div>
                  );
                }
                
                // Use market status from database instead of time-based logic
                // On holidays, treat as 'closed'
                let currentPeriod: 'premarket' | 'regular' | 'afterhours' | 'closed';
                if (isHoliday || marketPeriod === 'holiday') {
                  currentPeriod = 'closed';
                } else if (marketPeriod === 'premarket') {
                  currentPeriod = 'premarket';
                } else if (marketPeriod === 'regular') {
                  currentPeriod = 'regular';
                } else if (marketPeriod === 'afterhours') {
                  currentPeriod = 'afterhours';
                } else {
                  currentPeriod = 'closed';
                }
                
                // Use fetched market close price from parent (passed as prop)
                // If not available yet, calculate from data as fallback
                let effectiveMarketClosePrice: number | null = externalMarketClosePrice;
                if (effectiveMarketClosePrice === null && validData.length > 0) {
                  // Fallback: Find the last candle before or at market close (4 PM)
                  // On holidays, we're showing yesterday's data, so find the last data point (yesterday's close)
                  const now = new Date();
                  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                  const marketCloseTime = new Date(todayET);
                  marketCloseTime.setHours(16, 0, 0, 0);
                  const marketCloseTimestamp = marketCloseTime.getTime();
                  for (let i = validData.length - 1; i >= 0; i--) {
                    if (validData[i].date.getTime() <= marketCloseTimestamp) {
                      effectiveMarketClosePrice = validData[i].close;
                      break;
                    }
                  }
                }
                
                if (currentPeriod === 'premarket') {
                  // Pre-market: Show dual display
                  return (
                    <div className="space-y-0.5">
                      <div className="flex flex-col gap-0.5">
                        {/* Yesterday's performance */}
                        <div className="flex items-center gap-2">
                          {(() => {
                            if (previousDayData) {
                              const yesterdayChange = previousDayData.close - previousDayData.previousClose;
                              const yesterdayChangePercent = (yesterdayChange / previousDayData.previousClose) * 100;
                              const isPositiveYesterday = yesterdayChange >= 0;
                              return (
                                <>
                                  <span className={`${isPositiveYesterday ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                                    {isPositiveYesterday ? '▲' : '▼'} {formatCurrency(Math.abs(yesterdayChange))} ({isPositiveYesterday ? '+' : ''}{yesterdayChangePercent.toFixed(2)}%)
                                  </span>
                                  <span className="text-muted-foreground text-[14px]">Prev Close</span>
                                </>
                              );
                            } else {
                              return (
                                <>
                                  <span className="text-muted-foreground">—</span>
                                  <span className="text-muted-foreground">Prev Close</span>
                                </>
                              );
                            }
                          })()}
                        </div>
                        {/* Pre-market change */}
                        <div className="flex items-center gap-2">
                          {(() => {
                            const basePrice = previousDayData?.close || previousClose;
                            const preMarketChange = livePrice - basePrice;
                            const preMarketChangePercent = (preMarketChange / basePrice) * 100;
                            const isPositivePreMarket = preMarketChange >= 0;
                            return (
                              <>
                                <span className={`${isPositivePreMarket ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                                  {isPositivePreMarket ? '▲' : '▼'} {formatCurrency(Math.abs(preMarketChange))} ({isPositivePreMarket ? '+' : ''}{preMarketChangePercent.toFixed(2)}%)
                                </span>
                                <span className="text-muted-foreground text-[14px]">Pre-Market</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                } else if ((currentPeriod === 'afterhours' || currentPeriod === 'closed') && effectiveMarketClosePrice !== null) {
                  // After-hours or Closed: Show dual display
                  return (
                    <div className="space-y-0.5">
                      <div className="flex flex-col gap-0.5">
                        {/* Today's/Prev Close change */}
                        <div className="flex items-center gap-2">
                          {(() => {
                            const todayChange = effectiveMarketClosePrice - previousClose;
                            const todayChangePercent = (todayChange / previousClose) * 100;
                            const isPositiveToday = todayChange >= 0;
                            
                            // Determine if we're on a weekend or holiday (using shared utility)
                            const isWeekend = isCurrentlyWeekend();
                            
                            // Use "Prev Close" on weekends/holidays, "Today" on weekdays
                            const firstLabel = ((currentPeriod === 'closed' && isWeekend) || isHoliday || marketPeriod === 'holiday') ? 'Prev Close' : 'Today';
                            
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`text-[14px] ${isPositiveToday ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                                  {isPositiveToday ? '▲' : '▼'} {formatCurrency(Math.abs(todayChange))} ({isPositiveToday ? '+' : ''}{todayChangePercent.toFixed(2)}%)
                                </span>
                                <span className="text-muted-foreground text-[14px]">{firstLabel}</span>
                              </div>
                            );
                          })()}
                        </div>
                        {/* After-hours change */}
                        <div className="flex items-center gap-2">
                          {(() => {
                            const afterHoursChange = livePrice - effectiveMarketClosePrice;
                            const afterHoursChangePercent = (afterHoursChange / effectiveMarketClosePrice) * 100;
                            const isPositiveAfterHours = afterHoursChange >= 0;
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`text-[14px] ${isPositiveAfterHours ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                                  {isPositiveAfterHours ? '▲' : '▼'} {formatCurrency(Math.abs(afterHoursChange))} ({isPositiveAfterHours ? '+' : ''}{afterHoursChangePercent.toFixed(2)}%)
                                </span>
                                <span className="text-muted-foreground text-[14px]">After Hours</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Regular hours: Show single line
                  return priceChange !== undefined && priceChangePercent !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${priceChange >= 0 ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                        {priceChange >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(priceChange))} ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                      </span>
                    </div>
                  );
                }
              })()}
            </div>
          </>
        )}
      </div>

      {/* Chart container */}
      <div className="relative w-full bg-background rounded-lg overflow-visible -mx-[20px] lg:-mx-[44px]" ref={chartContainerRef}>
        {/* Full-width interactive overlay for crosshair */}
        <div 
          ref={fullChartRef}
          className="absolute inset-0 z-20" 
          style={{ 
            width: '100%',
            right: `calc(-100vw + ${pastWidthPercent}%)`, // Extend to screen edge from future section start
            height: `${height}px`,
            cursor: 'crosshair',
            touchAction: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        />
        
        {/* Chart area */}
        <div className="relative w-full" style={{ height: `${height}px`, overflow: 'visible' }}>
          {/* Left 50%: Candlesticks */}
          <div className="absolute inset-0" style={{ width: `${pastWidthPercent}%` }}>
            <svg 
              width={width} 
              height={height} 
              className="w-full h-full" 
              viewBox={`0 0 ${width} ${height}`} 
              preserveAspectRatio="none" 
              ref={svgRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
              style={{ touchAction: 'none' }}
            >
              {/* Price grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
                const price = minPrice + priceRange * percent;
                const y = priceToY(price);
                return (
                  <line
                    key={i}
                    x1={margin.left}
                    y1={y}
                    x2={width - margin.right}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {/* Candlesticks */}
              {validData.map((candle, i) => {
                // For intraday mode (1D), use time-based positioning to match the line chart
                // For 5Y, use timestamp-based positioning to show proper time scale
                // For other multi-day modes, use index-based positioning
                let x;
                const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
                
                if (effectiveTimeRange === '1D') {
                  // Time-based positioning using shared util
                  const pointTime = candle.date.getTime();
                  x = calculateIntradayXPosition(pointTime, marketHours, width);
                } else if (effectiveTimeRange === '5Y') {
                  // Timestamp-based positioning for 5Y to match line chart
                  // This shows blank space on the left if data doesn't go back full 5 years
                  const now = Date.now();
                  const fiveYearsPast = 5 * MS.YEAR;
                  const startTime = now - fiveYearsPast;
                  const totalDuration = fiveYearsPast;
                  const pointTime = candle.date.getTime();
                  const timeFromStart = pointTime - startTime;
                  const xPercent = timeFromStart / totalDuration;
                  x = xPercent * width;
                } else {
                  // Index-based positioning for other multi-day views (1W, 1M, 3M, YTD, 1Y)
                  x = margin.left + calculateIndexBasedXPosition(i, validData.length, width);
                }
                
                // Determine if this is extended hours for opacity adjustment
                let isExtendedHours = false;
                if (effectiveTimeRange === '1D') {
                  const pointTime = candle.date.getTime();
                  
                  // Use session field from database if available (source of truth), otherwise fall back to timestamp-based detection
                  if (candle.session) {
                    isExtendedHours = candle.session === 'pre-market' || candle.session === 'after-hours';
                    
                    // Debug log for first few pre-market candles
                    if (candle.session === 'pre-market' && i < 10) {
                      console.log(`[DEBUG CandlestickChart ${ticker}] Candle ${i}: session="${candle.session}" -> isExtendedHours=${isExtendedHours}, time=${new Date(pointTime).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
                    }
                  } else {
                    // Fallback to timestamp-based detection
                    isExtendedHours = pointTime < marketHours.regularOpen || pointTime > marketHours.regularClose;
                  }
                }
                
                const isGreen = candle.close >= candle.open;
                const color = isGreen ? "rgb(0, 200, 5)" : "rgb(255, 80, 0)";
                const opacity = isExtendedHours ? 0.3 : 1.0; // Reduced opacity for extended hours

                const highY = priceToY(candle.high);
                const lowY = priceToY(candle.low);
                const openY = priceToY(candle.open);
                const closeY = priceToY(candle.close);

                const bodyTop = Math.min(openY, closeY);
                const bodyBottom = Math.max(openY, closeY);
                const bodyHeight = Math.max(1, bodyBottom - bodyTop);

                return (
                  <g key={i} opacity={opacity}>
                    {/* Wick (high-low line) */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke="rgb(100, 100, 100)"
                      strokeWidth={wickStrokeWidth}
                      vectorEffect="non-scaling-stroke"
                    />
                    
                    {/* Body (open-close rect) */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                    />
                  </g>
                );
              })}

              {/* Previous close line - only in intraday mode */}
              {(selectedTimeRange === '1D' || defaultTimeRange === '1D') && previousClose && (
                <line
                  x1={margin.left}
                  y1={priceToY(previousClose)}
                  x2={width}
                  y2={priceToY(previousClose)}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="1,5"
                  strokeLinecap="round"
                  className="opacity-20 dark:opacity-40"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Price Target Lines - analyst price targets with 12-month slope */}
              {(() => {
                console.log(`[DEBUG CandlestickChart ${ticker}] 🎯 Price Target Check:`, {
                  showUpcomingRange,
                  hasPriceTargets: !!priceTargets,
                  priceTargetsLength: priceTargets?.length || 0,
                  priceTargets: priceTargets,
                  customViewportSplit,
                  width
                });
                return null;
              })()}
              {false && showUpcomingRange && priceTargets && priceTargets.length > 0 && (() => {
                // Calculate average, max, and min from all valid price targets
                const validTargets = priceTargets
                  .filter(t => t && typeof t.price_target === 'number')
                  .map(t => t.price_target);
                
                if (validTargets.length === 0) return null;
                
                const avgPrice = validTargets.reduce((sum, p) => sum + p, 0) / validTargets.length;
                const maxPrice = Math.max(...validTargets);
                const minPrice = Math.min(...validTargets);
                
                const targets = [
                  { label: 'Avg PT', price: avgPrice, color: '#3b82f6', opacity: '1', strokeWidth: '2' },
                  { label: 'High PT', price: maxPrice, color: '#22c55e', opacity: '1', strokeWidth: '1.5' },
                  { label: 'Low PT', price: minPrice, color: '#ef4444', opacity: '1', strokeWidth: '1.5' }
                ];
                
                // Common calculations
                const splitX = (customViewportSplit / 100) * width;
                const x1 = splitX;
                const y1 = priceToY(currentPrice);
                const futureWidth = width - splitX;
                const targetPositionInFuture = 0.8;
                const x2 = splitX + (futureWidth * targetPositionInFuture);
                
                console.log(`[DEBUG CandlestickChart ${ticker}] 🎯 Price Target Stats:`, {
                  count: validTargets.length,
                  avg: avgPrice.toFixed(2),
                  max: maxPrice.toFixed(2),
                  min: minPrice.toFixed(2),
                  currentPrice
                });
                
                return targets.map((target, idx) => {
                  const y2 = priceToY(target.price);
                  
                  // Skip if completely out of visible range
                  if ((y1 < 0 && y2 < 0) || (y1 > candleChartHeight && y2 > candleChartHeight)) {
                    return null;
                  }
                  
                  const clampedY1 = Math.max(0, Math.min(candleChartHeight, y1));
                  const clampedY2 = Math.max(0, Math.min(candleChartHeight, y2));
                  
                  // Calculate midpoint for label placement
                  const midX = (x1 + x2) / 2;
                  const midY = (clampedY1 + clampedY2) / 2;
                  
                  return (
                    <g key={`price-target-${target.label}-${idx}`}>
                      {/* Sloped dashed line */}
                      <line
                        x1={x1}
                        y1={clampedY1}
                        x2={x2}
                        y2={clampedY2}
                        stroke={target.color}
                        strokeWidth={target.strokeWidth}
                        strokeDasharray="1,5"
                        strokeLinecap="round"
                        style={{ opacity: target.opacity }}
                      />
                      {/* Price label at target end */}
                      <text
                        x={x2 + 5}
                        y={clampedY2 + 4}
                        textAnchor="start"
                        fontSize="10"
                        fill={target.color}
                        className="font-medium"
                        style={{ opacity: target.opacity }}
                      >
                        ${target.price.toFixed(0)}
                      </text>
                      {/* Label at midpoint */}
                      <text
                        x={midX}
                        y={midY - 4}
                        textAnchor="middle"
                        fontSize="9"
                        fill={target.color}
                        className="font-medium"
                        style={{ opacity: target.opacity }}
                      >
                        {target.label}
                      </text>
                    </g>
                  );
                });
              })()}

              {/* Crosshair - vertical and horizontal lines when hovering */}
              {hoverIndex !== null && (() => {
                const candle = validData[hoverIndex];
                let x;
                const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
                
                if (effectiveTimeRange === '1D') {
                  const pointTime = candle.date.getTime();
                  x = calculateIntradayXPosition(pointTime, marketHours, width);
                } else if (effectiveTimeRange === '5Y') {
                  // Timestamp-based positioning for 5Y
                  const now = Date.now();
                  const fiveYearsPast = 5 * MS.YEAR;
                  const startTime = now - fiveYearsPast;
                  const totalDuration = fiveYearsPast;
                  const pointTime = candle.date.getTime();
                  const timeFromStart = pointTime - startTime;
                  const xPercent = timeFromStart / totalDuration;
                  x = xPercent * width;
                } else {
                  x = margin.left + calculateIndexBasedXPosition(hoverIndex, validData.length, width);
                }
                const y = priceToY(candle.close);
                
                // Determine if candle is green or red
                const isGreen = candle.close >= candle.open;
                const defaultColor = isGreen ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
                const color = hoverCatalyst ? getEventTypeHexColor(hoverCatalyst.type) : defaultColor;

                return (
                  <g className="pointer-events-none">
                    {/* Vertical crosshair line - colored and dashed like line chart, starts below label */}
                    <line
                      x1={x}
                      y1={20}
                      x2={x}
                      y2={height}
                      stroke={color}
                      strokeWidth="1"
                      opacity={0.5}
                      strokeDasharray="3,3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })()}
            </svg>
            
            {/* Floating timestamp label on crosshair */}
            {hoverIndex !== null && (() => {
              const candle = validData[hoverIndex];
              let x;
              const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
              
              if (effectiveTimeRange === '1D') {
                const pointTime = candle.date.getTime();
                x = calculateIntradayXPosition(pointTime, marketHours, width);
              } else if (effectiveTimeRange === '5Y') {
                const now = Date.now();
                const fiveYearsPast = 5 * MS.YEAR;
                const startTime = now - fiveYearsPast;
                const pointTime = candle.date.getTime();
                const timeFromStart = pointTime - startTime;
                const xPercent = timeFromStart / fiveYearsPast;
                x = xPercent * width;
              } else {
                x = margin.left + calculateIndexBasedXPosition(hoverIndex, validData.length, width);
              }
              
              // Determine label format based on time range:
              // 1D, 1W: Show candle start and end time
              // 1M, 3M: Show just the date
              // YTD, 1Y: Show week range (Mon - Fri) since candles are weekly
              // 5Y: Show date with year
              
              return (
                <div 
                  className="absolute pointer-events-none"
                  style={{ 
                    left: `${(x / width) * 100}%`,
                    top: '0px',
                    // Smoothly interpolate transform from 0% (left edge) to -50% (center) to -100% (right edge)
                    transform: `translateX(${Math.max(-100, Math.min(0, -50 + (width / 2 - x) / (width / 2) * 50))}%)`,
                    zIndex: 11
                  }}
                >
                  <div className={`text-xs whitespace-nowrap select-none ${hoverCatalyst ? 'text-foreground' : 'text-foreground/60'}`}>
                    {(() => {
                      if (effectiveTimeRange === '1D') {
                        // For 1D: Show candle start and end time only
                        const candleStart = candle.date;
                        const candleDurationMs = 5 * 60 * 1000; // 5-minute candles
                        const candleEnd = new Date(candleStart.getTime() + candleDurationMs);
                        
                        const formatTime = (date: Date) => date.toLocaleString('en-US', { 
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        return `${formatTime(candleStart)} - ${formatTime(candleEnd)}`;
                      } else if (effectiveTimeRange === '1W') {
                        // For 1W: Show date before time (Nov 11, 2:00 PM - 3:00 PM)
                        const candleStart = candle.date;
                        const candleDurationMs = 60 * 60 * 1000; // hourly candles
                        const candleEnd = new Date(candleStart.getTime() + candleDurationMs);
                        
                        const dateStr = candleStart.toLocaleString('en-US', { 
                          month: 'short',
                          day: 'numeric'
                        });
                        
                        const formatTime = (date: Date) => date.toLocaleString('en-US', { 
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        return `${dateStr}, ${formatTime(candleStart)} - ${formatTime(candleEnd)}`;
                      } else if (effectiveTimeRange === 'YTD' || effectiveTimeRange === '1Y') {
                        // For YTD and 1Y: Show week range (Mon - Fri) with year only on end date
                        const candleDate = candle.date;
                        // Get Monday of this week
                        const monday = new Date(candleDate);
                        const dayOfWeek = monday.getDay();
                        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        monday.setDate(monday.getDate() - daysToMonday);
                        
                        // Get Friday of this week
                        const friday = new Date(monday);
                        friday.setDate(monday.getDate() + 4);
                        
                        const startStr = monday.toLocaleString('en-US', { 
                          month: 'short',
                          day: 'numeric'
                        });
                        const endStr = friday.toLocaleString('en-US', { 
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                        
                        return `${startStr} - ${endStr}`;
                      } else if (effectiveTimeRange === '5Y') {
                        // For 5Y: Show month range since candles are monthly
                        const candleDate = candle.date;
                        const monthStart = new Date(candleDate.getFullYear(), candleDate.getMonth(), 1);
                        const monthEnd = new Date(candleDate.getFullYear(), candleDate.getMonth() + 1, 0);
                        
                        const monthName = monthStart.toLocaleString('en-US', { month: 'short' });
                        const year = monthStart.getFullYear();
                        
                        return `${monthName} ${year}`;
                      } else {
                        // For 1M, 3M: Show date with year (Nov 11, 2025)
                        return candle.date.toLocaleString('en-US', { 
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      }
                    })()}
                  </div>
                </div>
              );
            })()}
            
            {/* Past event dots - only show if enabled */}
            {showPastEvents && filteredPastEvents && filteredPastEvents.length > 0 && validData.length > 0 && (() => {
              const now = Date.now();
              const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
              
              // Get the time range of the visible data
              const minDataTime = validData.length > 0 ? Math.min(...validData.map(d => d.date.getTime())) : 0;
              const maxDataTime = validData.length > 0 ? Math.max(...validData.map(d => d.date.getTime())) : 0;
              
              // Extend maxDataTime by 1 day to catch events that occur later on the same calendar day as the last candle
              // (e.g., if last candle is at midnight 12/1, include events at 2pm on 12/1)
              const extendedMaxDataTime = maxDataTime + (24 * 60 * 60 * 1000);
              
              console.log(`[CandlestickChart] Data range: ${new Date(minDataTime).toLocaleDateString()} to ${new Date(maxDataTime).toLocaleDateString()}, now: ${new Date(now).toLocaleDateString()}`);
              console.log(`[CandlestickChart] filteredPastEvents count: ${filteredPastEvents.length}`);
              
              const visiblePastEvents = filteredPastEvents.filter(event => {
                if (!event.actualDateTime) return false;
                const eventTime = new Date(event.actualDateTime).getTime();
                const isVisible = eventTime <= now && eventTime >= minDataTime && eventTime <= extendedMaxDataTime;
                if (!isVisible) {
                  console.log(`  -> Event "${event.title}" (${new Date(event.actualDateTime).toLocaleDateString()}) filtered out: past=${eventTime <= now}, inRange=${eventTime >= minDataTime && eventTime <= maxDataTime}`);
                }
                // Only show events that are both past AND within the visible data range
                return isVisible;
              });
              
              // Deduplicate events with the same title and actualDateTime
              const uniqueVisiblePastEvents = visiblePastEvents.filter((event, index, arr) => {
                return index === arr.findIndex(e => 
                  e.title === event.title && e.actualDateTime === event.actualDateTime
                );
              });
              
              console.log(`[CandlestickChart] visiblePastEvents count: ${visiblePastEvents.length}`);
              visiblePastEvents.forEach((e, i) => {
                console.log(`  [${i}] "${e.title}" - actualDateTime: ${e.actualDateTime}`);
              });
              console.log(`[CandlestickChart] After deduplication: ${uniqueVisiblePastEvents.length} unique events`);
              
              return uniqueVisiblePastEvents.map((event, index) => {
                if (!event.actualDateTime) {
                  console.log(`  -> Event "${event.title}" has no actualDateTime - skipping dot render`);
                  return null;
                }
                const eventTimestamp = new Date(event.actualDateTime).getTime();
                
                // Find the closest candlestick to this event by timestamp
                let closestCandle: CandlestickData | null = null;
                let closestCandleIndex = -1;
                let minTimeDiff = Infinity;
                
                validData.forEach((candle, i) => {
                  const candleTimestamp = candle.date.getTime();
                  const timeDiff = Math.abs(candleTimestamp - eventTimestamp);
                  if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestCandle = candle;
                    closestCandleIndex = i;
                  }
                });
                
                // Allow matching within a reasonable threshold based on timeframe
                // YTD/1Y with weekly candles: 7 days = 604800000 ms
                // 1W/1M/3M with daily candles: 1 day = 86400000 ms
                const maxTimeDiff = (effectiveTimeRange === 'YTD' || effectiveTimeRange === '1Y' || effectiveTimeRange === '5Y') 
                  ? 7 * 24 * 60 * 60 * 1000  // 7 days for weekly candles
                  : 1 * 24 * 60 * 60 * 1000; // 1 day for daily candles
                
                if (!closestCandle || closestCandleIndex === -1 || minTimeDiff > maxTimeDiff) {
                  console.log(`[CandlestickChart] Event "${event.title}" (${new Date(event.actualDateTime).toLocaleDateString()}) skipped: minTimeDiff=${(minTimeDiff / (24*60*60*1000)).toFixed(1)} days, threshold=${(maxTimeDiff / (24*60*60*1000)).toFixed(1)} days`);
                  return null;
                }
                
                // Calculate X position - interpolate within candle based on event's actual time
                let eventX: number;
                if (effectiveTimeRange === '1D') {
                  // 1D intraday: Use the event's actual timestamp for precise positioning
                  eventX = calculateIntradayXPosition(eventTimestamp, marketHours, width);
                } else if (effectiveTimeRange === '5Y') {
                  // 5Y mode: Use the event's actual timestamp for positioning
                  const fiveYearsPast = 5 * MS.YEAR;
                  const startTime = now - fiveYearsPast;
                  const timeFromStart = eventTimestamp - startTime;
                  const xPercent = timeFromStart / fiveYearsPast;
                  eventX = xPercent * width;
                } else {
                  // For multi-day views (1W, 1M, 3M, YTD, 1Y): interpolate within candle
                  // Get the candle's time span
                  const candleStart = closestCandle.date.getTime();
                  let candleDuration: number;
                  
                  if (effectiveTimeRange === '1W' || effectiveTimeRange === '1M' || effectiveTimeRange === '3M') {
                    // Daily candles: ~24 hours
                    candleDuration = 24 * 60 * 60 * 1000;
                  } else if (effectiveTimeRange === 'YTD' || effectiveTimeRange === '1Y') {
                    // Weekly candles: ~7 days
                    candleDuration = 7 * 24 * 60 * 60 * 1000;
                  } else {
                    candleDuration = 24 * 60 * 60 * 1000; // Default to daily
                  }
                  
                  // Calculate how far into the candle the event occurred (0 to 1)
                  const timeIntoCandle = eventTimestamp - candleStart;
                  const candleProgress = Math.max(0, Math.min(1, timeIntoCandle / candleDuration));
                  
                  // Get the base X position for this candle
                  const candleBaseX = margin.left + calculateIndexBasedXPosition(closestCandleIndex, validData.length, width);
                  
                  // Calculate candle spacing (distance to next candle)
                  let candleSpacing: number;
                  if (closestCandleIndex < validData.length - 1) {
                    const nextCandleX = margin.left + calculateIndexBasedXPosition(closestCandleIndex + 1, validData.length, width);
                    candleSpacing = nextCandleX - candleBaseX;
                  } else if (closestCandleIndex > 0) {
                    const prevCandleX = margin.left + calculateIndexBasedXPosition(closestCandleIndex - 1, validData.length, width);
                    candleSpacing = candleBaseX - prevCandleX;
                  } else {
                    candleSpacing = width / Math.max(1, validData.length);
                  }
                  
                  // Offset within the candle based on event time (centered around candle position)
                  // candleProgress 0 = left edge, 0.5 = center, 1 = right edge
                  const offsetFromCenter = (candleProgress - 0.5) * candleSpacing * 0.8; // 0.8 to keep within candle bounds
                  eventX = candleBaseX + offsetFromCenter;
                }
                
                // Fixed Y position - align all dots horizontally just above volume section
                // Chart height is 312px (height - 40), volume is 40px, so dots go at chart bottom
                const fixedDotY = height - 40 - 8 + 20; // 8px above volume section + 20px down
                
                const eventColor = getEventTypeHexColor(event.type);
                const EventIcon = eventTypeIcons[event.type as keyof typeof eventTypeIcons] || Sparkles;
                const xPercent = (eventX / width) * 100;
                
                // Debug logging for event positioning
                console.log(`[CandlestickChart] Event "${event.title}" (${new Date(event.actualDateTime).toLocaleDateString()}): xPercent=${xPercent.toFixed(1)}%, eventX=${eventX}, width=${width}, closestCandleIndex=${closestCandleIndex}`);
                
                // Skip events that are positioned off-screen
                if (xPercent < -5 || xPercent > 105 || isNaN(xPercent)) {
                  console.log(`  -> Skipped: off-screen or invalid`);
                  return null;
                }
                
                return (
                  <>
                    {/* Dashed vertical line extending from dot to top of chart */}
                    <div
                      key={`past-event-line-${event.id}-${index}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${xPercent}%`,
                        top: '0px',
                        width: '1px',
                        height: `${fixedDotY}px`,
                        borderLeft: `1px dashed ${eventColor}`,
                        opacity: 0.4,
                        transform: 'translateX(-0.5px)',
                        zIndex: 3
                      }}
                    />
                    
                    {/* Event dot aligned horizontally */}
                    <div
                      key={`past-event-dot-${event.id}-${index}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${xPercent}%`,
                        top: `${fixedDotY}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 5
                      }}
                    >
                      <div
                        className="flex items-center justify-center"
                        style={{
                          backgroundColor: eventColor,
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }}
                      >
                        <EventIcon className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                  </>
                );
              });
            })()}
          </div>
          
          {/* Continuous upcoming events line */}
          <svg 
            className="absolute pointer-events-none"
            style={{ 
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              zIndex: 10
            }}
            viewBox={`0 0 ${width / (pastWidthPercent / 100)} ${height}`}
            preserveAspectRatio="none"
          >
            {!isNaN(lastCandleY) && (
              <line
                x1={lastCandleX}
                y1={lastCandleY}
                x2={width / (pastWidthPercent / 100)}
                y2={lastCandleY}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="1,5"
                strokeLinecap="round"
                opacity="0.6"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          
          {/* Full-width crosshair overlay - spans entire chart */}
          <svg 
            className="absolute inset-0 pointer-events-none" 
            width={width} 
            height={height} 
            viewBox={`0 0 ${width} ${height}`} 
            preserveAspectRatio="none"
            style={{ 
              width: '100%', 
              height: `${height}px`,
              zIndex: 25 
            }}
          >
            {/* Crosshair for event hover in future section */}
            {hoverEvent && (() => {
              const now = Date.now();
              const timeFromNow = hoverEvent.timestamp - now;
              // Add time buffer to match event dot positioning (14 days)
              const timeBufferMs = 14 * 24 * 60 * 60 * 1000;
              const adjustedTimeFromNow = timeFromNow + timeBufferMs;
              const eventXPercent = Math.min(1, Math.max(0, adjustedTimeFromNow / futureWindowMs));
              // Map eventXPercent (0 to 1 in future) to SVG coordinates
              // Past section: 0 to (pastWidthPercent% of width)
              // Future section: (pastWidthPercent% of width) to width
              const pastWidth = width * (pastWidthPercent / 100);
              const futureWidth = width * (futureWidthPercent / 100);
              const eventX = pastWidth + (eventXPercent * futureWidth);
              const eventColor = getEventTypeHexColor(hoverEvent.catalyst.type);
              
              return (
                <g className="pointer-events-none">
                  {/* Vertical crosshair line */}
                  <line
                    x1={eventX}
                    y1={0}
                    x2={eventX}
                    y2={height}
                    stroke={eventColor}
                    strokeWidth="1"
                    opacity={0.5}
                    strokeDasharray="3,3"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })()}
            
            {/* Crosshair for future section hover without event snap */}
            {!hoverEvent && futureHoverXPercent !== null && (() => {
              // Map futureHoverXPercent (0 to 1 in future) to SVG coordinates
              const pastWidth = width * (pastWidthPercent / 100);
              const futureWidth = width * (futureWidthPercent / 100);
              const futureX = pastWidth + (futureHoverXPercent * futureWidth);
              
              return (
                <g className="pointer-events-none">
                  {/* Vertical crosshair line - matches line chart styling */}
                  <line
                    x1={futureX}
                    y1={0}
                    x2={futureX}
                    y2={height}
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity={0.3}
                    strokeDasharray="3,3"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })()}
          </svg>
          
          {/* Price Target Lines - separate SVG with proper aspect ratio to avoid stretching */}
          {showUpcomingRange && priceTargets && priceTargets.length > 0 && (() => {
            // Calculate average, max, and min from all valid price targets
            const validTargets = priceTargets
              .filter(t => t && typeof t.price_target === 'number')
              .map(t => t.price_target);
            
            if (validTargets.length === 0) return null;
            
            const avgPrice = validTargets.reduce((sum, p) => sum + p, 0) / validTargets.length;
            const maxPrice = Math.max(...validTargets);
            const minPrice = Math.min(...validTargets);
            
            const targets = [
              { price: avgPrice, color: '#3b82f6', opacity: '1', strokeWidth: '2' },
              { price: maxPrice, color: '#22c55e', opacity: '1', strokeWidth: '1.5' },
              { price: minPrice, color: '#ef4444', opacity: '1', strokeWidth: '1.5' }
            ];
            
            // Use lastCandleX to start lines at the current price location
            // Use a stretched viewBox like the line chart to match coordinate systems
            const fullWidth = width / (pastWidthPercent / 100);
            const futureWidth = fullWidth - lastCandleX;
            const targetPositionInFuture = 1.0; // Extend to 100% of future area
            
            console.log(`[DEBUG CandlestickChart ${ticker}] 🎯 Price Target Rendering:`, {
              lastCandleX,
              fullWidth,
              pastWidthPercent,
              width,
              futureWidth,
              currentPrice,
              avgPrice,
              maxPrice,
              minPrice,
              candleChartHeight
            });
            
            return (
              <svg
                className="absolute pointer-events-none"
                style={{
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: `${candleChartHeight}px`,
                  zIndex: 11
                }}
                viewBox={`0 0 ${fullWidth} ${candleChartHeight}`}
                preserveAspectRatio="none"
              >
                {targets.map((target, idx) => {
                  const x1 = lastCandleX;
                  const y1 = priceToY(currentPrice);
                  const x2 = lastCandleX + (futureWidth * targetPositionInFuture);
                  const y2 = priceToY(target.price);
                  
                  console.log(`[DEBUG CandlestickChart ${ticker}] 🎯 Target ${idx}:`, {
                    targetPrice: target.price,
                    x1, y1, x2, y2,
                    skipCondition: (y1 < 0 && y2 < 0) || (y1 > candleChartHeight && y2 > candleChartHeight)
                  });
                  
                  // Skip if completely out of visible range
                  if ((y1 < 0 && y2 < 0) || (y1 > candleChartHeight && y2 > candleChartHeight)) {
                    return null;
                  }
                  
                  const clampedY1 = Math.max(0, Math.min(candleChartHeight, y1));
                  const clampedY2 = Math.max(0, Math.min(candleChartHeight, y2));
                  
                  // Calculate midpoint for label placement
                  const midX = (x1 + x2) / 2;
                  const midY = (clampedY1 + clampedY2) / 2;
                  
                  return (
                    <g key={`price-target-${idx}`}>
                      {/* Sloped dashed line */}
                      <line
                        x1={x1}
                        y1={clampedY1}
                        x2={x2}
                        y2={clampedY2}
                        stroke={target.color}
                        strokeWidth={target.strokeWidth}
                        strokeDasharray="1,5"
                        strokeLinecap="round"
                        style={{ opacity: target.opacity }}
                      />
                    </g>
                  );
                })}
              </svg>
            );
          })()}
          
          {/* Floating date label for event crosshair */}
          {hoverEvent && (() => {
            const now = Date.now();
            const timeFromNow = hoverEvent.timestamp - now;
            // Add time buffer to match event dot positioning (14 days)
            const timeBufferMs = 14 * 24 * 60 * 60 * 1000;
            const adjustedTimeFromNow = timeFromNow + timeBufferMs;
            const eventXPercent = Math.min(1, Math.max(0, adjustedTimeFromNow / futureWindowMs));
            const eventXInView = pastWidthPercent + eventXPercent * futureWidthPercent; // Position in the full viewport (0-100%)
            
            return (
              <div 
                className="absolute pointer-events-none"
                style={{ 
                  left: `${eventXInView}%`,
                  top: '0px',
                  transform: 'translateX(-50%)',
                  zIndex: 30
                }}
              >
                <div className="text-xs text-foreground whitespace-nowrap select-none">
                  {new Date(hoverEvent.timestamp).toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            );
          })()}
          
          {/* Floating date label for future hover without event */}
          {!hoverEvent && futureHoverXPercent !== null && (() => {
            const futureXInView = pastWidthPercent + futureHoverXPercent * futureWidthPercent; // Position in the full viewport (0-100%)
            const now = Date.now();
            // ✅ Use the dynamic futureWindowMs from component scope (it updates with viewport split)
            const estimatedTime = now + (futureHoverXPercent * futureWindowMs);
            
            return (
              <div 
                className="absolute pointer-events-none"
                style={{ 
                  left: `${futureXInView}%`,
                  top: '0px',
                  // Smoothly interpolate transform based on position within future section
                  // pastWidthPercent is left edge of future, 100 is right edge
                  transform: `translateX(${Math.max(-100, Math.min(0, -50 + (pastWidthPercent + futureWidthPercent / 2 - futureXInView) / (futureWidthPercent / 2) * 50))}%)`,
                  zIndex: 30
                }}
              >
                <div className="text-xs text-foreground/60 whitespace-nowrap select-none">
                  {new Date(estimatedTime).toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            );
          })()}

          {/* Right 50%: Future catalyst timeline with gradient - only shown when showUpcomingRange is true */}
          {showUpcomingRange && (
          <div 
            className="absolute right-0 flex items-center"
            style={{ 
              width: `${futureWidthPercent}%`,
              top: '-20px',
              bottom: '-9px',
              height: 'calc(100% + 29px)',
              pointerEvents: 'auto' // Enable pointer events for extended future section
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gradient overlay background */}
            <div 
              className="absolute inset-0 transition-opacity duration-200"
              style={{
                background: 'linear-gradient(to right, rgba(236, 236, 240, 0) 0%, rgba(236, 236, 240, 0.75) 15%, rgba(236, 236, 240, 0.75) 85%, rgba(236, 236, 240, 0) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%',
                opacity: 1
              }}
            />
            <div 
              className="absolute inset-0 dark:block hidden transition-opacity duration-200"
              style={{
                background: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.25) 15%, rgba(0, 0, 0, 0.25) 85%, rgba(0, 0, 0, 0) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%',
                opacity: 1
              }}
            />
            {/* Vertical gradient overlay - top to bottom fade */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 8%, rgba(255, 255, 255, 0) 92%, rgba(255, 255, 255, 1) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%'
              }}
            />
            <div 
              className="absolute inset-0 dark:block hidden"
              style={{
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 8%, rgba(0, 0, 0, 0) 92%, rgba(0, 0, 0, 0.8) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%'
              }}
            />
            
            {/* Catalyst dots on timeline */}
            <div className="relative w-full h-full flex items-center">
              {/* Catalyst event dots - all circular */}
              {filteredFutureCatalysts && filteredFutureCatalysts.map((catalyst, index) => {
                // Position dots based on actual time within 3-month window
                const now = Date.now();
                const timeFromNow = catalyst.timestamp - now;
                
                // Add time buffer: shift events further right to prevent visual intersection with current price dot
                // Events appear further away than they actually are, creating clear visual separation
                const timeBufferMs = 14 * 24 * 60 * 60 * 1000; // 14 days (2 weeks)
                const adjustedTimeFromNow = timeFromNow + timeBufferMs; // ADD buffer to push right
                const leftPercent = Math.min(100, Math.max(0, (adjustedTimeFromNow / futureWindowMs) * 100));
                const eventColor = getEventTypeHexColor(catalyst.catalyst.type);
                const EventIcon = eventTypeIcons[catalyst.catalyst.type as keyof typeof eventTypeIcons] || Sparkles;
                
                return (
                  <div
                    key={`catalyst-${catalyst.timestamp}-${index}`}
                    className="absolute"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${lastCandleY + 20}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}
                  >
                    <div
                      className="catalyst-dot flex items-center justify-center"
                      style={{
                        width: '23px',
                        height: '23px',
                        borderRadius: '50%',
                        backgroundColor: eventColor,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }}
                    >
                      <EventIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
          

        </div>

        {/* Volume chart section - same as LargeSVGChart */}
        <div className="flex w-full pb-3 pt-1" style={{ height: '40px' }}>
          <div className="relative w-full" style={{ width: `${pastWidthPercent}%` }}>
            {(() => {
              if (validData.length === 0) return null;
              
              const barHeight = 30;
              
              // Build colored volume bars
              return (
                <svg width="100%" height={barHeight} className="w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${barHeight}`}>
                  {validData.map((candle, index) => {
                    // Match candlestick positioning - use time-based for 1D, 5Y timestamp-based, index-based for others
                    let x;
                    const effectiveTimeRange = selectedTimeRange || defaultTimeRange;
                    
                    if (effectiveTimeRange === '1D') {
                      // Time-based positioning using shared util
                      const pointTime = candle.date.getTime();
                      x = calculateIntradayXPosition(pointTime, marketHours, width);
                    } else if (effectiveTimeRange === '5Y') {
                      // Timestamp-based positioning for 5Y to match candlesticks and line chart
                      // This shows blank space on the left if data doesn't go back full 5 years
                      const now = Date.now();
                      const fiveYearsPast = 5 * MS.YEAR;
                      const startTime = now - fiveYearsPast;
                      const totalDuration = fiveYearsPast;
                      const pointTime = candle.date.getTime();
                      const timeFromStart = pointTime - startTime;
                      const xPercent = timeFromStart / totalDuration;
                      x = xPercent * width;
                    } else if (effectiveTimeRange === '3M' || effectiveTimeRange === '1M' || effectiveTimeRange === 'YTD' || effectiveTimeRange === '1Y') {
                      // For 3M, 1M, YTD, 1Y: use timestamp-based positioning to show gaps for non-trading days
                      const firstTimestamp = validData[0].date.getTime();
                      const lastTimestamp = validData[validData.length - 1].date.getTime();
                      const totalDuration = lastTimestamp - firstTimestamp;
                      const timeFromStart = candle.date.getTime() - firstTimestamp;
                      const xPercent = totalDuration > 0 ? timeFromStart / totalDuration : 0;
                      x = xPercent * width;
                    } else {
                      // Index-based positioning for other multi-day views (1W)
                      x = (index / Math.max(1, validData.length - 1)) * width;
                    }
                    
                    // Calculate bar height based on volume
                    const volumeBarHeight = (candle.volume / maxVolume) * barHeight;
                    const y = barHeight - volumeBarHeight;
                    
                    // Determine if this is extended hours for opacity adjustment
                    let isExtendedHours = false;
                    if (effectiveTimeRange === '1D') {
                      const pointTime = candle.date.getTime();
                      
                      // Use session field from database if available (source of truth), otherwise fall back to timestamp-based detection
                      if (candle.session) {
                        isExtendedHours = candle.session === 'pre-market' || candle.session === 'after-hours';
                      } else {
                        // Fallback to timestamp-based detection
                        isExtendedHours = pointTime < marketHours.regularOpen || pointTime > marketHours.regularClose;
                      }
                    }
                    
                    // Determine color based on candle direction
                    const isGreen = candle.close >= candle.open;
                    const color = isGreen ? "rgba(0, 200, 5, 0.5)" : "rgba(255, 80, 0, 0.5)";
                    
                    // Calculate bar width
                    const barWidth = Math.max(1, candleWidth);
                    
                    // Apply additional opacity reduction for extended hours
                    const baseOpacity = hoverIndex === index ? 1 : 0.7;
                    const finalOpacity = isExtendedHours ? baseOpacity * 0.43 : baseOpacity; // 0.43 ≈ 0.3/0.7 to match candle opacity
                    
                    return (
                      <rect
                        key={index}
                        x={x - barWidth / 2}
                        y={y}
                        width={barWidth}
                        height={volumeBarHeight}
                        fill={color}
                        opacity={finalOpacity}
                      />
                    );
                  })}
                </svg>
              );
            })()}
          </div>
          {/* Empty space for right side to maintain alignment - only when showing upcoming range */}
          {showUpcomingRange && <div style={{ width: `${futureWidthPercent}%` }} />}
        </div>

        {/* Time labels - REMOVED for cleaner look */}
      </div>

      {/* Time range selector and chart toggle button */}
      <div className="flex items-center gap-2 pb-4 pt-2 mt-[15px] mb-[-15px] -mx-[20px] lg:-mx-[44px] px-[20px] lg:px-[44px]">
        {/* Horizontally scrollable time range selector with fade indicator */}
        <div className="flex-1 overflow-x-auto scrollbar-hide relative">
          <div className="flex gap-0.5 min-w-max">
            {timeRanges.map((range, index) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${
                  selectedTimeRange === range
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                } ${index === 0 && selectedTimeRange !== range ? 'opacity-40' : ''}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        {/* Chart settings gear icon with popover */}
        {onToggleChart && (
          <div className="relative flex gap-3 flex-shrink-0 pl-2">
            {/* Settings gear icon */}
            <div className="relative z-10">
              <button
                ref={settingsButtonRef}
                className="p-0 transition-colors"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <Settings className="h-5 w-5 text-foreground transition-colors" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Settings Bottom Sheet Modal */}
      {settingsOpen && createPortal(
        <div className="fixed inset-0" style={{ zIndex: 2147483647 }}>
          {/* Dark overlay backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setSettingsOpen(false)}
          />
          
          {/* Bottom sheet - 75% height */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out"
            style={{ height: '75vh' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Chart Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Chart Type Selection */}
              <div className="space-y-3">
                <span className="text-sm font-medium text-foreground">Chart Type</span>
                <div className="flex gap-3 mt-[10px] mr-[0px] mb-[0px] ml-[0px]">
                  <button
                    onClick={() => {
                      if (showAdvancedChart) onToggleChart?.();
                    }}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl transition-all ${
                      !showAdvancedChart 
                        ? 'bg-black text-white border-0' 
                        : 'border-2 border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Line</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!showAdvancedChart) onToggleChart?.();
                    }}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl transition-all ${
                      showAdvancedChart 
                        ? 'bg-black text-white border-0' 
                        : 'border-2 border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    <CandlestickIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Candle</span>
                  </button>
                </div>
              </div>
              
              {/* Show Upcoming Range Toggle */}
              <div className="flex items-center justify-between py-2 m-[0px]">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">Show Upcoming Range</span>
                  <p className="text-xs text-muted-foreground">Display future catalyst events on chart</p>
                </div>
                <Switch
                  checked={showUpcomingRange}
                  onCheckedChange={setShowUpcomingRange}
                />
              </div>
              
              {/* Show Past Events Toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">Show Past Events</span>
                  <p className="text-xs text-muted-foreground">Display historical event dots on price chart</p>
                </div>
                <Switch
                  checked={showPastEvents}
                  onCheckedChange={setShowPastEvents}
                />
              </div>
              
              {/* Event Type Filters */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Event Types</span>
                  <button
                    onClick={() => {
                      if (selectedEventTypes.length === allEventTypes.length) {
                        setSelectedEventTypes([]);
                      } else {
                        setSelectedEventTypes(allEventTypes);
                      }
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    {selectedEventTypes.length === allEventTypes.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {allEventTypes.map((eventType) => {
                    const config = eventTypeConfig[eventType as keyof typeof eventTypeConfig];
                    if (!config) return null;
                    
                    return (
                      <div key={eventType} className="flex items-center space-x-2">
                        <Checkbox
                          id={`event-type-${eventType}`}
                          checked={selectedEventTypes.includes(eventType)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEventTypes([...selectedEventTypes, eventType]);
                            } else {
                              setSelectedEventTypes(selectedEventTypes.filter(t => t !== eventType));
                            }
                          }}
                        />
                        <label
                          htmlFor={`event-type-${eventType}`}
                          className="text-xs text-foreground cursor-pointer select-none"
                        >
                          {config.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Safe area padding for mobile */}
            <div className="h-6" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};