import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MarketEvent } from '../../utils/supabase/events-api';
import { getEventTypeHexColor, formatCurrency, eventTypeConfig } from '../../utils/formatting';
import { calculateUnifiedTimeLabels, UnifiedLabel } from './unified-time-labels-helper';
import {
  getMarketHoursBounds,
  getTradingDayFromData,
  calculateIntradayXPosition,
  calculateIndexBasedXPosition,
  EXTENDED_HOURS_TOTAL,
  MS,
  getEffectivePreviousClose,
  createTradingDayContext,
  isCurrentlyWeekend
} from '../../utils/chart-time-utils';
import { calculatePriceRange } from '../../utils/chart-math-utils';
import { Button } from '../ui/button';
import { AnimatedPrice } from '../animated-price';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import realtimePriceService from '../../utils/realtime-price-service';
import { getCurrentMarketPeriod, useMarketStatus } from '../../utils/market-status';
import StockAPI from '../../utils/supabase/stock-api';
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
} from 'lucide-react';
import { CandlestickIcon } from '../icons/candlestick-icon';
import { 
  generateSmoothPath, 
  generateSegmentedSmoothPaths,
  generateContinuousSmoothPath,
  getYOnSegmentedSmoothCurve,
  generateLinearPath,
  Point 
} from '../../utils/bezier-path-utils';
import { PriceTarget } from '../../utils/price-targets-service';
import { PriceTargetModal } from './price-target-modal';

interface DataPoint {
  timestamp: number;
  value: number;
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

interface LargeSVGChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  priceChange?: number;
  priceChangePercent?: number;
  futureCatalysts?: FutureCatalyst[];
  pastEvents?: MarketEvent[]; // Past events to show on chart
  width?: number;
  height?: number;
  strokeWidth?: number;
  onTimeRangeChange?: (range: TimeRange) => void;
  defaultTimeRange?: TimeRange;
  previousDayData?: { close: number; previousClose: number } | null;
  showAdvancedChart?: boolean;
  onToggleChart?: () => void;
  onEventClick?: (event: MarketEvent) => void;
  centeredEventId?: string | null;
  disableAnimation?: boolean;
  customViewportSplit?: number; // Percentage of screen for past (50 = 50/50 split)
  onViewportSplitChange?: (split: number) => void;
  ticker?: string; // Added for realtime price updates
  marketClosePrice?: number | null; // Shared market close price from parent
  shortenedTradingHours?: { open: string; close: string } | null; // For shortened trading days like day after Thanksgiving
  showUpcomingRange?: boolean; // Whether to show the upcoming catalysts section
  onShowUpcomingRangeChange?: (show: boolean) => void;
  showPastEvents?: boolean; // Whether to show past event dots
  onShowPastEventsChange?: (show: boolean) => void;
  settingsOpen?: boolean; // Whether settings popover is open
  onSettingsOpenChange?: (open: boolean) => void;
  hideChartTypeSelector?: boolean; // Hide the chart type selector in settings (for portfolio chart)
  selectedEventTypes?: string[]; // Which event types to show on chart
  onSelectedEventTypesChange?: (types: string[]) => void;
  priceTargets?: PriceTarget[]; // Analyst price targets for forward-looking projections
}

interface HoverPoint {
  x: number;
  y: number;
  value: number;
  timestamp: number;
  catalyst?: MarketEvent; // Optional catalyst when hovering near a past event
}

interface FutureHoverPoint {
  xPercent: number; // 0 to 1 position in future section
  timestamp: number;
}

export function LargeSVGChart({ 
  data, 
  previousClose, 
  currentPrice,
  priceChange,
  priceChangePercent,
  futureCatalysts = [],
  pastEvents = [],
  width = 400, 
  height = 312,
  strokeWidth = 2,
  onTimeRangeChange,
  defaultTimeRange = '1D',
  previousDayData = null,
  showAdvancedChart = false,
  onToggleChart,
  customViewportSplit: externalViewportSplit,
  onViewportSplitChange,
  ticker,
  marketClosePrice: externalMarketClosePrice,
  shortenedTradingHours,
  showUpcomingRange: externalShowUpcomingRange,
  onShowUpcomingRangeChange,
  showPastEvents: externalShowPastEvents,
  onShowPastEventsChange,
  settingsOpen: externalSettingsOpen,
  onSettingsOpenChange,
  hideChartTypeSelector = false,
  selectedEventTypes: externalSelectedEventTypes,
  onSelectedEventTypesChange,
  priceTargets = []
}: LargeSVGChartProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(defaultTimeRange);
  
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
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const [hoverEvent, setHoverEvent] = useState<FutureCatalyst | null>(null);
  const [hoverPastEvent, setHoverPastEvent] = useState<{ event: MarketEvent; x: number; y: number } | null>(null);
  const [futureHoverPoint, setFutureHoverPoint] = useState<FutureHoverPoint | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  
  // Market period and after-hours tracking
  const marketStatus = useMarketStatus();
  const [currentMarketPeriod, setCurrentMarketPeriod] = useState<'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'>('regular');
  
  // Fixed viewport split at 60% past, 40% future
  const customViewportSplit = 60;
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const priceDisplayRef = useRef<HTMLDivElement>(null);
  
  // Price target modal state
  const [priceTargetModalOpen, setPriceTargetModalOpen] = useState(false);
  const [priceTargetModalType, setPriceTargetModalType] = useState<'high' | 'low' | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const fullChartRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsDropdownPosition, setSettingsDropdownPosition] = useState({ top: 0, right: 0 });
  
  // Track actual rendered width for edge-to-edge rendering
  const [actualWidth, setActualWidth] = useState(width);
  
  // Track screen size for responsive padding
  const [edgePadding, setEdgePadding] = useState(20);
  
  useEffect(() => {
    const updatePadding = () => {
      // lg breakpoint is 1024px in Tailwind
      setEdgePadding(window.innerWidth >= 1024 ? 44 : 20);
    };
    
    updatePadding();
    window.addEventListener('resize', updatePadding);
    return () => window.removeEventListener('resize', updatePadding);
  }, []);

  // Filter events based on selected event types
  const filteredFutureCatalysts = useMemo(() => {
    return futureCatalysts.filter(catalyst => selectedEventTypes.includes(catalyst.catalyst.type));
  }, [futureCatalysts, selectedEventTypes]);

  const filteredPastEvents = useMemo(() => {
    return pastEvents.filter(event => selectedEventTypes.includes(event.type));
  }, [pastEvents, selectedEventTypes]);

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

  // Update market period from database every minute
  useEffect(() => {
    const updatePeriod = async () => {
      const period = await getCurrentMarketPeriod();
      setCurrentMarketPeriod(period);
    };
    
    // Update immediately
    updatePeriod();
    
    // Then update every minute
    const interval = setInterval(updatePeriod, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Measure actual rendered width to account for negative margins
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setActualWidth(width);
      }
    });
    
    resizeObserver.observe(chartContainerRef.current);
    
    return () => resizeObserver.disconnect();
  }, []);



  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    onTimeRangeChange?.(range);
  };
  
  // Check if we're in intraday mode (1D view only)
  const isIntradayMode = selectedTimeRange === '1D';

  // Handle mouse/touch interactions for crosshair
  const handleInteraction = (clientX: number, clientY: number) => {
    // Use actualWidth for coordinate calculations
    const width = actualWidth;
    
    if (!fullChartRef.current || !svgRef.current) return;
    
    const chartRect = fullChartRef.current.getBoundingClientRect();
    const x = clientX - chartRect.left;
    // Use actualWidth directly instead of chartRect.width for consistent calculations
    const chartWidth = actualWidth;
    
    // Calculate the actual split position based on customViewportSplit
    const splitPosition = (customViewportSplit / 100) * chartWidth;

    // Check if we're in the past or future section based on customViewportSplit
    if (x < splitPosition) {
      // Past section - snap to data points
      setHoverEvent(null);
      setFutureHoverPoint(null);
      
      const rect = svgRef.current.getBoundingClientRect();
      const xInSvg = clientX - rect.left;
      const y = clientY - rect.top;
    
    // Scale x from actual pixel coordinates to viewBox coordinates
    // The SVG has preserveAspectRatio="none", so we need to scale properly
    const scaleX = actualWidth / rect.width;
    const scaleY = height / rect.height;
    
    // Remap x to account for customViewportSplit
    // x position in chart ranges from 0 to splitPosition
    // We need to map this to 0 to actualWidth in the SVG viewBox
    const xPercent = x / splitPosition; // 0 to 1 within past section
    const viewBoxX = xPercent * actualWidth;
    const viewBoxY = y * scaleY;

    // Calculate renderData and renderDataIndices - MUST match chart path and event dots
    let renderData = data;
    let renderDataIndices: number[] = [];
    if (!isIntradayMode && data.length > 150) {
      const targetPoints = 50;
      const step = Math.floor(data.length / targetPoints);
      const downsampled: DataPoint[] = [];
      const downsampledIndices: number[] = [];
      
      for (let i = 0; i < data.length; i += step) {
        downsampled.push(data[i]);
        downsampledIndices.push(i);
      }
      
      if (downsampled[downsampled.length - 1] !== data[data.length - 1]) {
        downsampled.push(data[data.length - 1]);
        downsampledIndices.push(data.length - 1);
      }
      
      renderData = downsampled;
      renderDataIndices = downsampledIndices;
    } else {
      renderDataIndices = data.map((_, i) => i);
    }
    
    // PRE-CALCULATE price range values ONCE (not inside the loop!)
    const allPriceValues: number[] = [];
    data.forEach(d => {
      if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
        allPriceValues.push(d.open, d.high, d.low, d.close);
      } else {
        allPriceValues.push(d.value);
      }
    });
    const effectivePreviousClose = previousClose;
    const allValues = effectivePreviousClose ? [...allPriceValues, effectivePreviousClose] : allPriceValues;
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    const margin = { top: 40, bottom: 20 };
    const candleHeight = height - 40;
    const chartHeight = candleHeight - margin.top - margin.bottom;
    
    // Find the closest data point IN RENDER DATA (same as chart path and event dots)
    let closestPoint: HoverPoint | null = null;
    let minDistance = Infinity;

    // Get market hours bounds once for all data points (only needed for intraday)
    const tradingDay = getTradingDayFromData(data);
    const marketHours = getMarketHoursBounds(tradingDay);

    renderData.forEach((point, renderIndex) => {
      const originalIndex = renderDataIndices[renderIndex];
      
      // Calculate the expected x position in viewBox coordinates
      let pointX: number;
      
      if (isIntradayMode) {
        // Intraday mode: Use shared util for time-based positioning
        pointX = calculateIntradayXPosition(point.timestamp, marketHours, width);
      } else if (selectedTimeRange === '5Y') {
        // 5Y mode: Use timestamp-based positioning to match rendering
        const now = Date.now();
        const fiveYearsPast = 5 * MS.YEAR;
        const startTime = now - fiveYearsPast;
        const timeFromStart = point.timestamp - startTime;
        pointX = (timeFromStart / fiveYearsPast) * actualWidth;
      } else {
        // Multi-period mode: Use originalIndex from renderDataIndices (same as chart path)
        pointX = calculateIndexBasedXPosition(originalIndex, data.length, actualWidth);
      }

      const distance = Math.abs(pointX - viewBoxX);
      
      if (distance < minDistance) {
        minDistance = distance;
        
        // Use pre-calculated price range values for Y position
        const pointY = margin.top + chartHeight - ((point.value - minY) / valueRange) * chartHeight;
        
        closestPoint = {
          x: pointX,
          y: pointY,
          value: point.value,
          timestamp: point.timestamp
        };
      }
    });

      // Snap timestamp based on time range for cleaner display
      if (minDistance < actualWidth / 2 && closestPoint !== null) {
        // Type assertion needed because TypeScript has trouble with control flow across forEach
        const currentClosestPoint: HoverPoint = closestPoint;
        
        // Determine snap interval based on timeRange
        let snapIntervalMs: number;
        if (selectedTimeRange === '1W') {
          // 1W: Snap to hourly intervals
          snapIntervalMs = 60 * 60 * 1000; // 1 hour
        } else if (selectedTimeRange === '1M') {
          // 1M: Snap to daily intervals (start of day)
          const date = new Date(currentClosestPoint.timestamp);
          date.setHours(0, 0, 0, 0);
          currentClosestPoint.timestamp = date.getTime();
          snapIntervalMs = 0; // Already snapped to day start
        } else {
          // Default: Snap to 5-minute intervals for 1D and other views
          snapIntervalMs = 5 * 60 * 1000; // 5 minutes
        }
        
        if (snapIntervalMs > 0) {
          const snappedTimestamp = Math.round(currentClosestPoint.timestamp / snapIntervalMs) * snapIntervalMs;
          currentClosestPoint.timestamp = snappedTimestamp;
        }
        
        // Check proximity to past events - snap if close enough
        if (showPastEvents && filteredPastEvents && filteredPastEvents.length > 0) {
          const now = Date.now();
          let minEventDistance = Infinity;
          let closestPastEvent: MarketEvent | null = null;
          let closestEventDataPoint: DataPoint | null = null;
          let closestEventX: number | null = null;
          
          filteredPastEvents.forEach(event => {
            // Only consider past events
            if (!event.actualDateTime) return;
            const eventTime = new Date(event.actualDateTime).getTime();
            if (eventTime > now) return;
            
            // Find the data point closest to this event's timestamp IN RENDER DATA
            let eventRenderIndex = 0;
            let eventMinTimeDiff = Math.abs(renderData[0].timestamp - eventTime);
            
            renderData.forEach((point, idx) => {
              const timeDiff = Math.abs(point.timestamp - eventTime);
              if (timeDiff < eventMinTimeDiff) {
                eventMinTimeDiff = timeDiff;
                eventRenderIndex = idx;
              }
            });
            
            const eventDataPoint = renderData[eventRenderIndex];
            const eventOriginalIndex = renderDataIndices[eventRenderIndex];
            
            // Calculate the event's x position using the same logic as the data point
            let eventX: number;
            
            if (isIntradayMode) {
              eventX = calculateIntradayXPosition(eventDataPoint.timestamp, marketHours, actualWidth);
            } else if (selectedTimeRange === '5Y') {
              const fiveYearsPast = 5 * MS.YEAR;
              const startTime = now - fiveYearsPast;
              const timeFromStart = eventDataPoint.timestamp - startTime;
              eventX = (timeFromStart / fiveYearsPast) * actualWidth;
            } else {
              // Use eventOriginalIndex from renderDataIndices (same as chart path and event dots)
              eventX = calculateIndexBasedXPosition(eventOriginalIndex, data.length, actualWidth);
            }
            
            // Calculate pixel distance from hover point to event point
            const distance = Math.abs(eventX - currentClosestPoint.x);
            
            if (distance < minEventDistance) {
              minEventDistance = distance;
              closestPastEvent = event;
              closestEventDataPoint = eventDataPoint;
              closestEventX = eventX;
            }
          });
          
          // Snap threshold: 5 pixels for precise interaction while still allowing nearby price points
          const snapThreshold = 5;
          
          if (minEventDistance < snapThreshold && closestPastEvent && closestEventDataPoint && closestEventX !== null && closestPoint) {
            // Use the SAME data point from renderData that the event dot uses
            const eventDataPoint = closestEventDataPoint as DataPoint;
            
            // Use the eventX that was already calculated (aligned with event dot)
            const eventX = closestEventX;
            
            // Use the pre-calculated Y scale values (already computed at top of function)
            const eventY = margin.top + chartHeight - ((eventDataPoint.value - minY) / valueRange) * chartHeight;
            
            // Snap the closestPoint to the event's exact position
            (closestPoint as HoverPoint).x = eventX;
            (closestPoint as HoverPoint).y = eventY;
            (closestPoint as HoverPoint).value = eventDataPoint.value;
            (closestPoint as HoverPoint).timestamp = eventDataPoint.timestamp;
            (closestPoint as HoverPoint).catalyst = closestPastEvent;
            
            setHoverPastEvent({ 
              event: closestPastEvent, 
              x: eventX, 
              y: eventY 
            });
          } else {
            setHoverPastEvent(null);
          }
        } else {
          setHoverPastEvent(null);
        }
        
        setHoverPoint(closestPoint);
      } else {
        setHoverPoint(null);
        setHoverPastEvent(null);
      }
    } else {
      // Future section - show continuous crosshair
      setHoverPoint(null);
      setHoverPastEvent(null); // Clear past event when entering future section
      
      // Calculate position within future section accounting for customViewportSplit
      const futureWidth = chartWidth - splitPosition; // width of future section
      const xInFuture = x - splitPosition; // x position within the future section
      const xPercentInFuture = Math.min(1, Math.max(0, xInFuture / futureWidth)); // 0 to 1 within future section, clamped
      
      const now = Date.now();
      // ✅ Use the dynamic futureWindowMs from component scope (it updates with viewport split)
      const hoverTimestamp = now + (xPercentInFuture * futureWindowMs);
      
      // Always set the continuous future hover point
      setFutureHoverPoint({
        xPercent: xPercentInFuture,
        timestamp: hoverTimestamp
      });
      
      // Check if we should snap to an event
      if (filteredFutureCatalysts && filteredFutureCatalysts.length > 0) {
        // Find closest event
        let minDistance = Infinity;
        let closestEvent: FutureCatalyst | null = null;
        
        filteredFutureCatalysts.forEach((catalyst, idx) => {
          const timeFromNow = catalyst.timestamp - now;
          const eventXPercent = Math.min(1, Math.max(0, timeFromNow / futureWindowMs));
          
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
        } else {
          setHoverEvent(null);
        }
      } else {
        setHoverEvent(null);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPressed(true);
  };
  
  const handleMouseUp = () => {
    setIsPressed(false);
    setHoverPoint(null);
    setHoverEvent(null);
    setFutureHoverPoint(null);
    setHoverPastEvent(null);
  };
  
  const handleMouseLeave = () => {
    setHoverPoint(null);
    setHoverEvent(null);
    setFutureHoverPoint(null);
    setHoverPastEvent(null);
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
    setHoverPoint(null);
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
  
  // Calculate SVG path from data points
  const { continuousPath, preMarketEndX, regularHoursEndX, isPositive, lastPointY, lastPointX, currentPeriod, chartMarketClosePrice, minY, valueRange } = useMemo(() => {
    // Use actualWidth for all coordinate calculations to account for edge-to-edge rendering
    const width = actualWidth;
    
    if (data.length === 0) {
      return { continuousPath: '', preMarketEndX: 0, regularHoursEndX: 0, isPositive: true, lastPointY: height / 2, lastPointX: width, currentPeriod: 'regular' as const, chartMarketClosePrice: null, minY: 0, valueRange: 100 };
    }

    // No downsampling for multi-day views - use all data points for crisp angular lines
    // The hover/crosshair uses the same full data
    let renderData = data;
    let renderDataIndices = data.map((_, i) => i);

    // Find min/max values for scaling
    // Include OHLC values if available to match candlestick chart's Y-scale
    let allPriceValues: number[] = [];
    data.forEach(d => {
      // If OHLC data exists (check for undefined/null, not truthiness), include all four prices
      if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
        allPriceValues.push(d.open, d.high, d.low, d.close);
      } else {
        // Otherwise just use the closing value
        allPriceValues.push(d.value);
      }
    });
    
    // Determine the effective previous close for chart calculations
    // Uses shared utility that properly handles weekends (not pre-market)
    const effectivePreviousClose = getEffectivePreviousClose(previousClose, previousDayData);
    
    // Include effective previous close in the range calculation to ensure it's always visible
    const allValues = effectivePreviousClose ? [...allPriceValues, effectivePreviousClose] : allPriceValues;
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    
    // Add 10% padding on top and bottom
    const padding = range * 0.1;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    
    // Chart layout margins - MUST match advanced-financial-chart.tsx for perfect alignment
    const margin = { top: 40, bottom: 20 };
    const candleHeight = height - 40; // Reserve 40px for volume bar (312 - 40 = 272)
    const chartHeight = candleHeight - margin.top - margin.bottom; // 272 - 40 - 20 = 212
    
    let preMarketPathString = '';
    let regularHoursPathString = '';
    let afterHoursPathString = '';
    let intraPreMarketEndX = 0;
    let intraRegularHoursEndX = 0;
    let lastY = height / 2;
    let lastX = 0;
    let marketClose: number | null = null;
    
    if (isIntradayMode) {
      // INTRADAY MODE: Scale based on market hours (8 AM - 8 PM ET) with session separation
      // Use shared utils for market hours calculation
      const tradingDay = getTradingDayFromData(data);
      const tradingDayContext = createTradingDayContext(data);
      const marketHours = tradingDayContext.marketHours;
      const now = new Date();
      const currentTimestamp = now.getTime();
      
      // Adjust for shortened trading hours (e.g., day after Thanksgiving closes at 1 PM)
      if (shortenedTradingHours) {
        const [closeHour, closeMinute] = shortenedTradingHours.close.split(':').map(Number);
        const adjustedClose = new Date(tradingDay);
        adjustedClose.setHours(closeHour, closeMinute, 0, 0);
        marketHours.regularClose = adjustedClose.getTime();
      }
      
      // Determine current period using trading day context
      let currentPeriod: 'premarket' | 'regular' | 'afterhours' | 'closed';
      
      // Use trading day context for weekend/historical detection
      const { isWeekend, isHistorical: isHistoricalDay } = tradingDayContext;
      
      // On weekends or when showing historical data (e.g., holidays), always return 'closed' 
      if (isWeekend || isHistoricalDay) {
        currentPeriod = 'closed';
      } else if (currentTimestamp < marketHours.regularOpen) {
        currentPeriod = 'premarket';
      } else if (currentTimestamp <= marketHours.regularClose) {
        currentPeriod = 'regular';
      } else if (currentTimestamp <= marketHours.extendedClose) {
        currentPeriod = 'afterhours';
      } else {
        currentPeriod = 'closed';
      }
      
      // Collect points for each segment, then generate smooth paths
      const preMarketPoints: Point[] = [];
      const regularHoursPoints: Point[] = [];
      const afterHoursPoints: Point[] = [];
      let lastRegularHoursPoint: { x: number; y: number; value: number } | null = null;
      let lastPreMarketPoint: Point | null = null;
      let lastRegularPoint: Point | null = null;
      
      // Track session usage for debugging
      let sessionFieldCount = 0;
      let timestampFallbackCount = 0;
      
      renderData.forEach((point, index) => {
        const pointTime = point.timestamp;
        // Use shared util for X position calculation
        const x = calculateIntradayXPosition(pointTime, marketHours, width);
        
        // Invert Y because SVG coordinates are top-down - with margins to match candlestick chart
        const y = margin.top + chartHeight - ((point.value - minY) / valueRange) * chartHeight;
        
        // Determine which segment this point belongs to
        // Use session field from database if available, otherwise fall back to timestamp-based detection
        let segmentType: 'premarket' | 'regular' | 'afterhours';
        
        if (point.session) {
          // Use session field from database (source of truth for actual trade execution time)
          sessionFieldCount++;
          if (point.session === 'pre-market') {
            segmentType = 'premarket';
          } else if (point.session === 'regular') {
            segmentType = 'regular';
          } else if (point.session === 'after-hours') {
            segmentType = 'afterhours';
          } else {
            // Fallback for unknown session types
            segmentType = pointTime <= marketHours.regularClose ? 'regular' : 'afterhours';
          }
          
          // Log session-based classification for first few pre-market points
          if (point.session === 'pre-market' && index < 30) {
            console.log(`[DEBUG StockLineChart ${ticker}] Point ${index}: session="${point.session}" -> segmentType="${segmentType}", time=${new Date(pointTime).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
          }
        } else {
          // Fall back to timestamp-based detection
          timestampFallbackCount++;
          if (pointTime < marketHours.regularOpen) {
            segmentType = 'premarket';
          } else if (pointTime <= marketHours.regularClose) {
            segmentType = 'regular';
          } else {
            segmentType = 'afterhours';
          }
        }
        
        // Add point to appropriate segment
        if (segmentType === 'premarket') {
          // Pre-market (8:00 AM - 9:30 AM)
          preMarketPoints.push({ x, y });
          lastPreMarketPoint = { x, y };
        } else if (segmentType === 'regular') {
          // Regular hours (9:30 AM - 4:00 PM)
          // Add the last pre-market point as the first point to ensure continuity
          // Only if the time gap is less than 5 minutes
          if (regularHoursPoints.length === 0 && lastPreMarketPoint) {
            const timeGap = Math.abs(pointTime - renderData[index - 1]?.timestamp || 0);
            if (timeGap < 5 * 60 * 1000) { // 5 minutes in milliseconds
              regularHoursPoints.push(lastPreMarketPoint);
            }
          }
          regularHoursPoints.push({ x, y });
          lastRegularHoursPoint = { x, y, value: point.value };
          lastRegularPoint = { x, y };
        } else {
          // After-hours (4:00 PM - 8:00 PM)
          // Add the last regular hours point as the first point to ensure continuity
          // Only if the time gap is less than 5 minutes
          if (afterHoursPoints.length === 0 && lastRegularPoint) {
            const timeGap = Math.abs(pointTime - renderData[index - 1]?.timestamp || 0);
            if (timeGap < 5 * 60 * 1000) { // 5 minutes in milliseconds
              afterHoursPoints.push(lastRegularPoint);
            }
          }
          afterHoursPoints.push({ x, y });
        }
        
        if (index === renderData.length - 1) {
          lastY = y;
          lastX = x;
        }
      });
      
      // Generate smooth Bezier paths for each segment
      // Adjust tension based on data density - use lower tension for sparse data
      const totalIntraPoints = preMarketPoints.length + regularHoursPoints.length + afterHoursPoints.length;
      const tension = totalIntraPoints < 20 ? 0.2 : 0.4; // Less smooth for sparse data
      
      const segments = [preMarketPoints, regularHoursPoints, afterHoursPoints];
      
      // Generate continuous path for seamless rendering
      const continuousIntraPath = generateContinuousSmoothPath(segments, tension);
      
      // Calculate boundary X positions for clipping
      const preMarketEnd = preMarketPoints.length > 0 ? preMarketPoints[preMarketPoints.length - 1].x : 0;
      const regularHoursEnd = regularHoursPoints.length > 0 ? regularHoursPoints[regularHoursPoints.length - 1].x : preMarketEnd;
      
      preMarketPathString = continuousIntraPath;
      regularHoursPathString = '';
      afterHoursPathString = '';
      intraPreMarketEndX = preMarketEnd;
      intraRegularHoursEndX = regularHoursEnd;
      
      // Capture market close price if available
      if (lastRegularHoursPoint) {
        marketClose = lastRegularHoursPoint.value;
      }
      
      if (ticker === 'PORTFOLIO') {
        console.log(`[DEBUG ${ticker} Chart] Market close price from last regular hours point: ${marketClose?.toFixed(2) || 'null'}, lastRegularHoursPoint exists: ${!!lastRegularHoursPoint}`);
      }
      
      // Clamp lastX to not exceed width - ensures dot stays in past section even on weekends
      lastX = Math.min(lastX, width);
      
      // Determine if chart is positive or negative based on effective previous close
      const lastValue = data[data.length - 1]?.value || currentPrice;
      const isPos = effectivePreviousClose ? lastValue >= effectivePreviousClose : currentPrice >= 0;
      
      if (ticker === 'PORTFOLIO') {
        console.log(`[DEBUG ${ticker} Chart] Intraday color calculation: lastValue=${lastValue.toFixed(2)}, effectivePreviousClose=${effectivePreviousClose?.toFixed(2)}, isPositive=${isPos}, change=${lastValue - (effectivePreviousClose || 0)}`);
      }
      
      return { continuousPath: preMarketPathString, preMarketEndX: intraPreMarketEndX, regularHoursEndX: intraRegularHoursEndX, isPositive: isPos, lastPointY: lastY, lastPointX: lastX, currentPeriod, chartMarketClosePrice: marketClose, minY, valueRange };
    } else {
      // MULTI-PERIOD MODE: Sequential index-based positioning (no gaps for weekends)
      // This makes Friday's last point connect directly to Monday's first point
      const points: Point[] = [];
      const totalPoints = renderData.length;
      
      // For 5Y view, use timestamp-based positioning to show blank space when data doesn't go back full 5 years
      if (selectedTimeRange === '5Y') {
        const now = Date.now();
        const fiveYearsPast = 5 * MS.YEAR;
        const startTime = now - fiveYearsPast;
        const totalDuration = fiveYearsPast; // Only the past section (50% of chart width)
        
        renderData.forEach((point, index) => {
          // Calculate x position based on timestamp relative to the 5-year range
          // This creates blank space on the left if data doesn't go back full 5 years
          const timeFromStart = point.timestamp - startTime;
          const xPercent = timeFromStart / totalDuration;
          const x = xPercent * width;
          
          // Invert Y because SVG coordinates are top-down - with margins to match candlestick chart
          const y = margin.top + chartHeight - ((point.value - minY) / valueRange) * chartHeight;
          
          points.push({ x, y });
          
          if (index === renderData.length - 1) {
            lastY = y;
            lastX = x;
          }
        });
      } else {
        // For other time ranges, use index-based positioning (no gaps)
        renderData.forEach((point, index) => {
          // Use the original data index for positioning to ensure alignment with hover/events
          const originalIndex = renderDataIndices[index];
          const x = calculateIndexBasedXPosition(originalIndex, data.length, width);
          
          // Invert Y because SVG coordinates are top-down - with margins to match candlestick chart
          const y = margin.top + chartHeight - ((point.value - minY) / valueRange) * chartHeight;
          
          points.push({ x, y });
          
          if (index === renderData.length - 1) {
            lastY = y;
            lastX = x;
          }
        });
      }
      
      // Use smooth Bezier path for all views (consistent smoothing across all time ranges)
      // Adjust tension based on data density and time range
      // Higher tension for 1W and 1M views to smooth out the granular 10-minute data
      let tension: number;
      if (selectedTimeRange === '1W' || selectedTimeRange === '1M') {
        tension = points.length < 20 ? 0.3 : 0.6; // Extra smoothing for granular data
      } else {
        tension = points.length < 20 ? 0.2 : 0.4; // Standard smoothing for other views
      }
      const pathString = generateSmoothPath(points, tension);
      
      // Determine if chart is positive or negative
      // For multi-day views: compare last vs first VALUE in the range
      // But skip zero values (portfolio data before purchase date)
      const firstNonZeroValue = data.find(d => d.value > 0)?.value || data[0]?.value || currentPrice;
      const lastValue = data[data.length - 1]?.value || currentPrice;
      const isPos = lastValue >= firstNonZeroValue;
      
      if (ticker === 'PORTFOLIO') {
        console.log(`[DEBUG ${ticker} Chart] Multi-day color calculation: lastValue=${lastValue.toFixed(2)}, firstNonZeroValue=${firstNonZeroValue.toFixed(2)}, isPositive=${isPos}, change=${lastValue - firstNonZeroValue}`);
      }
      
      return { continuousPath: pathString, preMarketEndX: 0, regularHoursEndX: 0, isPositive: isPos, lastPointY: lastY, lastPointX: lastX, currentPeriod: 'regular' as const, chartMarketClosePrice: null, minY, valueRange };
    }
  }, [data, actualWidth, height, previousClose, currentPrice, isIntradayMode, previousDayData, selectedTimeRange, ticker]);



  // Calculate previous close line Y position
  const previousCloseY = useMemo(() => {
    if (data.length === 0) return null;
    
    // Uses shared utility that properly handles weekends (not pre-market)
    const effectivePreviousClose = getEffectivePreviousClose(previousClose, previousDayData);
    
    if (!effectivePreviousClose) return null;
    
    // Include OHLC values if available to match candlestick chart's Y-scale
    let allPriceValues: number[] = [];
    data.forEach(d => {
      if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
        allPriceValues.push(d.open, d.high, d.low, d.close);
      } else {
        allPriceValues.push(d.value);
      }
    });
    
    // Include effective previous close in the range calculation (same as path calculation)
    const allValues = [...allPriceValues, effectivePreviousClose];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    
    // Use same margin calculation as main chart for alignment
    const margin = { top: 40, bottom: 20 };
    const candleHeight = height - 40;
    const chartHeight = candleHeight - margin.top - margin.bottom;
    
    return margin.top + chartHeight - ((effectivePreviousClose - minY) / valueRange) * chartHeight;
  }, [previousClose, previousDayData, data, height]);

  // Calculate candlestick elements
  const candlestickElements = useMemo(() => {
    if (!showAdvancedChart || data.length === 0) return null;
    
    // Filter for candles with OHLC data AND only show past data (up to now)
    const currentTimestamp = Date.now();
    const candleData = data
      .filter(d => d.open && d.high && d.low && (d.close || d.value))
      .filter(d => d.timestamp <= currentTimestamp); // Only show past candlesticks
    

    
    if (candleData.length === 0) return null;
    
    // Calculate price range (same logic as line chart)
    // Uses shared utility that properly handles weekends (not pre-market)
    const effectivePreviousClose = getEffectivePreviousClose(previousClose, previousDayData);
    
    // Use ALL data (not just candleData) to calculate range - same as main path calculation
    let allPriceValues: number[] = [];
    data.forEach(d => {
      if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
        allPriceValues.push(d.open, d.high, d.low, d.close);
      } else {
        allPriceValues.push(d.value);
      }
    });
    if (effectivePreviousClose) allPriceValues.push(effectivePreviousClose);
    const minValue = Math.min(...allPriceValues);
    const maxValue = Math.max(...allPriceValues);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    
    // Use same margin calculation as main chart for alignment
    const margin = { top: 40, bottom: 20 };
    const candleHeight = height - 40;
    const chartHeight = candleHeight - margin.top - margin.bottom;
    
    const priceToY = (price: number) => margin.top + chartHeight - ((price - minY) / valueRange) * chartHeight;
    
    // Generate candle elements based on mode (intraday vs multi-day)
    if (isIntradayMode && candleData.length > 0) {
      // Intraday: Scale candlesticks to fill full width from first to last data point
      const firstTimestamp = candleData[0].timestamp;
      const lastTimestamp = candleData[candleData.length - 1].timestamp;
      const timeRange = lastTimestamp - firstTimestamp;
      
      const positions = candleData.map(candle => {
        const timeProgress = (candle.timestamp - firstTimestamp) / timeRange;
        return timeProgress * width;
      });
      const avgSpacing = positions.length > 1 ? Math.abs(positions[1] - positions[0]) : width / 10;
      const candleWidth = Math.max(1, Math.min(8, avgSpacing * 0.7));
      
      return candleData.map((candle, i) => {
        const timeProgress = (candle.timestamp - firstTimestamp) / timeRange;
        const x = timeProgress * width;
        
        const open = candle.open || candle.value;
        const high = candle.high || candle.value;
        const low = candle.low || candle.value;
        const close = candle.close || candle.value;
        const isGreen = close >= open;
        const color = isGreen ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
        const highY = priceToY(high);
        const lowY = priceToY(low);
        const openY = priceToY(open);
        const closeY = priceToY(close);
        const bodyTop = Math.min(openY, closeY);
        const bodyBottom = Math.max(openY, closeY);
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        
        return (
          <g key={`candle-${i}-${candle.timestamp}`}>
            <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={color} />
          </g>
        );
      });
    } else {
      // Multi-day: index-based positioning (no gaps)
      const candleWidth = Math.max(1, Math.min(8, width / candleData.length * 0.7));
      const candleSpacing = width / candleData.length;
      
      return candleData.map((candle, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        
        const open = candle.open || candle.value;
        const high = candle.high || candle.value;
        const low = candle.low || candle.value;
        const close = candle.close || candle.value;
        const isGreen = close >= open;
        const color = isGreen ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
        const highY = priceToY(high);
        const lowY = priceToY(low);
        const openY = priceToY(open);
        const closeY = priceToY(close);
        const bodyTop = Math.min(openY, closeY);
        const bodyBottom = Math.max(openY, closeY);
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        
        return (
          <g key={`candle-${i}-${candle.timestamp}`}>
            <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={color} />
          </g>
        );
      });
    }
  }, [data, actualWidth, height, previousClose, previousDayData, isIntradayMode, showAdvancedChart]);

  // Calculate layout percentages for viewport split (needed by useMemo hooks below)
  // When showUpcomingRange is false, past section takes 100% width
  const pastWidthPercent = showUpcomingRange ? customViewportSplit : 100;
  const futureWidthPercent = showUpcomingRange ? (100 - customViewportSplit) : 0;

  // Calculate month labels for the future catalyst timeline
  const { futureWindowMs, futureLabels } = useMemo(() => {
    const now = new Date();
    
    // Determine the future window size based on selected time range
    let windowMs: number;
    let labels: Array<{ label: string; position: number }> = [];
    
    // Calculate how many months to show based on viewport split
    // futureWidthPercent determines how much space we have
    // Base case: 50% width = 3 months, scale linearly
    const baseMonths = 3;
    const baseWidth = 50;
    const monthsToShow = Math.max(1, Math.round((futureWidthPercent / baseWidth) * baseMonths));
    
    if (selectedTimeRange === '1D' || selectedTimeRange === '1W' || selectedTimeRange === '1M') {
      // Short ranges: scale months based on available space
      windowMs = monthsToShow * 30 * 24 * 60 * 60 * 1000; // monthsToShow * 30 days
      
      // Generate month labels
      for (let i = 1; i <= monthsToShow; i++) {
        const futureDate = new Date(now);
        futureDate.setMonth(now.getMonth() + i);
        labels.push({
          label: futureDate.toLocaleDateString('en-US', { month: 'short' }),
          position: (i / (monthsToShow + 1)) * 100
        });
      }
    } else if (selectedTimeRange === '3M') {
      // 3M: scale months based on available space
      windowMs = monthsToShow * 30 * 24 * 60 * 60 * 1000;
      
      for (let i = 1; i <= monthsToShow; i++) {
        const futureDate = new Date(now);
        futureDate.setMonth(now.getMonth() + i);
        labels.push({
          label: futureDate.toLocaleDateString('en-US', { month: 'short' }),
          position: (i / (monthsToShow + 1)) * 100
        });
      }
    } else if (selectedTimeRange === 'YTD') {
      // YTD: match the past duration (from Jan 1 to now, show same duration forward)
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const pastDurationMs = now.getTime() - yearStart.getTime();
      windowMs = Math.max(pastDurationMs, 90 * 24 * 60 * 60 * 1000); // At least 3 months
      
      // Calculate how many months are in the future window
      const monthsInFuture = Math.ceil(windowMs / (30 * 24 * 60 * 60 * 1000));
      
      // Generate 4 labels to match the past side (which has 4 labels at 0%, 33%, 67%, 100%)
      const numFutureLabels = 4;
      
      for (let i = 1; i <= numFutureLabels; i++) {
        const futureDate = new Date(now);
        // Distribute across the full future window
        const monthsToAdd = Math.round((monthsInFuture * i) / numFutureLabels);
        futureDate.setMonth(now.getMonth() + monthsToAdd);
        labels.push({
          label: futureDate.toLocaleDateString('en-US', { month: 'short' }),
          position: (i / numFutureLabels) * 100  // 25%, 50%, 75%, 100%
        });
      }
    } else if (selectedTimeRange === '1Y') {
      // 1Y: show 1 year into the future
      windowMs = 365 * 24 * 60 * 60 * 1000; // 1 year
      
      // Show 4 quarter labels
      for (let i = 1; i <= 4; i++) {
        const futureDate = new Date(now);
        futureDate.setMonth(now.getMonth() + (i * 3)); // Every 3 months
        labels.push({
          label: futureDate.toLocaleDateString('en-US', { month: 'short' }),
          position: ((i - 0.5) / 4) * 100  // 12.5%, 37.5%, 62.5%, 87.5%
        });
      }
    } else if (selectedTimeRange === '5Y') {
      // 5Y: show 5 years into the future
      windowMs = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years
      
      // Show year labels evenly spaced across 5 years
      const numYears = 5; // Show 5 year labels
      for (let i = 0; i < numYears; i++) {
        const futureDate = new Date(now);
        futureDate.setFullYear(now.getFullYear() + i + 1); // +1, +2, +3, +4, +5 years
        labels.push({
          label: futureDate.getFullYear().toString(),
          position: ((i + 0.5) / numYears) * 100 // Center each label: 10%, 30%, 50%, 70%, 90%
        });
      }
    } else {
      // Default: 3 months
      windowMs = 90 * 24 * 60 * 60 * 1000;
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(now);
        futureDate.setMonth(now.getMonth() + i);
        labels.push({
          label: futureDate.toLocaleDateString('en-US', { month: 'short' }),
          position: (i / 4) * 100
        });
      }
    }
    
    return { futureWindowMs: windowMs, futureLabels: labels };
  }, [selectedTimeRange, futureWidthPercent]);

  // Calculate unified time labels that span both past and future sections
  const unifiedTimeLabels = useMemo(() => {
    if (data.length === 0) return [];
    
    return calculateUnifiedTimeLabels(
      selectedTimeRange,
      isIntradayMode,
      data[0].timestamp,
      data, // Pass the actual data points for index-based positioning in 1W view
      futureWindowMs // Pass the dynamic future window
    );
  }, [data, isIntradayMode, selectedTimeRange, futureWindowMs]);

  if (data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-sm text-muted-foreground">No data</div>
      </div>
    );
  }

  // Adjust time label positions based on custom viewport split
  const adjustedTimeLabels = useMemo(() => {
    return unifiedTimeLabels.map(label => {
      let adjustedPosition: number;
      
      if (label.section === 'past') {
        // Past labels: remap from 0-50% to 0-{customViewportSplit}%
        adjustedPosition = (label.position / 50) * customViewportSplit;
      } else {
        // Future labels: remap from 50-100% to {customViewportSplit}-100%
        adjustedPosition = customViewportSplit + ((label.position - 50) / 50) * (100 - customViewportSplit);
      }
      
      return {
        ...label,
        position: adjustedPosition
      };
    });
  }, [unifiedTimeLabels, customViewportSplit]);

  // Detect label overlaps and hide labels when they're too close
  const visibleLabels = useMemo(() => {
    if (adjustedTimeLabels.length === 0) return [];
    
    // Estimate label width in percentage (assuming average label is ~40px and container is ~350px wide)
    const minLabelSpacing = 12; // Minimum percentage distance between labels
    const edgeThreshold = 8; // Minimum percentage distance from section edge
    
    const visible = new Set<number>();
    const pastLabels = adjustedTimeLabels.filter(l => l.section === 'past').sort((a, b) => a.position - b.position);
    const futureLabels = adjustedTimeLabels.filter(l => l.section === 'future').sort((a, b) => a.position - b.position);
    
    // Check past section for overlaps
    let lastPastPosition = -Infinity;
    pastLabels.forEach((label, idx) => {
      const originalIndex = adjustedTimeLabels.indexOf(label);
      // Hide label if it's too close to the start edge when section is compressed
      if (label.position < edgeThreshold && customViewportSplit < 25) {
        return; // Skip this label
      }
      if (label.position - lastPastPosition >= minLabelSpacing) {
        visible.add(originalIndex);
        lastPastPosition = label.position;
      }
    });
    
    // Check future section for overlaps
    let lastFuturePosition = -Infinity;
    futureLabels.forEach((label, idx) => {
      const originalIndex = adjustedTimeLabels.indexOf(label);
      // Hide label if it's too close to the start edge (at customViewportSplit) when section is compressed
      const distanceFromFutureStart = label.position - customViewportSplit;
      if (distanceFromFutureStart < edgeThreshold && (100 - customViewportSplit) < 25) {
        return; // Skip this label
      }
      if (label.position - lastFuturePosition >= minLabelSpacing) {
        visible.add(originalIndex);
        lastFuturePosition = label.position;
      }
    });
    
    return adjustedTimeLabels.map((label, idx) => ({
      ...label,
      showLabel: visible.has(idx)
    }));
  }, [adjustedTimeLabels, customViewportSplit]);

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Price display */}
      <div ref={priceDisplayRef} className="mb-4 relative z-10">
        {/* When hovering over past event, show event info */}
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
        ) : hoverPoint ? (
          <>
            <div className="text-3xl font-bold text-foreground text-[22px] mb-2">
              {formatCurrency(hoverPoint.value)}
            </div>
            {/* Fixed height container to prevent jumping */}
            <div className="h-[44px]">
              {previousClose !== null && isIntradayMode ? (
                (() => {
                  // Determine which period the hover point is in
                  const hoverDate = new Date(hoverPoint.timestamp);
                  const tradingDay = new Date(hoverDate);
                  tradingDay.setHours(0, 0, 0, 0);
                  
                  const marketOpenTime = new Date(tradingDay);
                  marketOpenTime.setHours(9, 30, 0, 0);
                  const marketCloseTime = new Date(tradingDay);
                  marketCloseTime.setHours(16, 0, 0, 0);
                  
                  const hoverTimestamp = hoverPoint.timestamp;
                  
                  let hoverPeriod: 'premarket' | 'regular' | 'afterhours';
                  let basePrice: number;
                  let label: string;
                  
                  if (hoverTimestamp < marketOpenTime.getTime()) {
                    hoverPeriod = 'premarket';
                    basePrice = previousDayData?.close || previousClose;
                    label = 'Pre-market';
                  } else if (hoverTimestamp <= marketCloseTime.getTime()) {
                    hoverPeriod = 'regular';
                    basePrice = previousClose;
                    label = 'Today';
                  } else {
                    hoverPeriod = 'afterhours';
                    basePrice = externalMarketClosePrice || previousClose;
                    label = 'After-hours';
                  }
                  
                  const change = hoverPoint.value - basePrice;
                  const changePercent = (change / basePrice) * 100;
                  const isPos = change >= 0;
                  
                  return (
                    <div className="flex items-center gap-2">
                      <span className={`text-[14px] ${isPos ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                        {isPos ? '▲' : '▼'} {formatCurrency(Math.abs(change))} ({isPos ? '+' : ''}{changePercent.toFixed(2)}%)
                      </span>
                      <span className="text-muted-foreground text-[14px]">{label}</span>
                    </div>
                  );
                })()
              ) : (
                // Non-intraday mode or no previous close
                <div className="flex items-center gap-2">
                  {previousClose !== null && (() => {
                    const change = hoverPoint.value - previousClose;
                    const changePercent = (change / previousClose) * 100;
                    const isPos = change >= 0;
                    return (
                      <span className={`text-sm ${isPos ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                        {isPos ? '▲' : '▼'} {formatCurrency(Math.abs(change))} ({isPos ? '+' : ''}{changePercent.toFixed(2)}%)
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground text-[22px] mb-2">
              <AnimatedPrice price={livePrice} />
            </div>
            {/* Fixed height container to prevent jumping */}
            <div className="h-[44px]">
              {/* Price change info - moved underneath current price */}
              {previousClose !== null && isIntradayMode && (
                <div className="space-y-0.5">
                {currentPeriod === 'premarket' ? (
                  // Pre-market: Show dual display
                  <div className="flex flex-col gap-0.5">
                    {/* Yesterday's performance (show previous day's close vs its previous close) */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        if (previousDayData) {
                          // Calculate yesterday's performance
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
                              <span className="text-muted-foreground">
                                —
                              </span>
                              <span className="text-muted-foreground">Prev Close</span>
                            </>
                          );
                        }
                      })()}
                    </div>
                    {/* Pre-market change (current price vs yesterday's close) */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Use yesterday's close (previousDayData.close) as the base for pre-market calculation
                        const basePrice = previousDayData?.close || previousClose;
                        const preMarketChange = currentPrice - basePrice;
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
                ) : (currentMarketPeriod === 'afterhours' || currentMarketPeriod === 'closed' || currentMarketPeriod === 'holiday') && (externalMarketClosePrice !== null || chartMarketClosePrice !== null) && previousClose !== null ? (
                  // After-hours or Closed: Show dual display
                  <div className="space-y-0.5">
                    {(() => {
                      // Use external market close if available, otherwise use chart-calculated market close
                      const marketClosePrice = externalMarketClosePrice ?? chartMarketClosePrice;
                      
                      // Defensive math to prevent division by zero
                      const todayChange = marketClosePrice! - previousClose;
                      const todayChangePercent = previousClose !== 0 && isFinite(previousClose) 
                        ? (todayChange / previousClose) * 100 
                        : 0;
                      const isPositiveToday = todayChange >= 0;
                      
                      const afterHoursChange = currentPrice - marketClosePrice!;
                      const afterHoursChangePercent = marketClosePrice && marketClosePrice !== 0 && isFinite(marketClosePrice)
                        ? (afterHoursChange / marketClosePrice) * 100
                        : 0;
                      const isPositiveAfterHours = afterHoursChange >= 0;
                      
                      // Determine if we're on a weekend or holiday (using shared utility)
                      const isWeekend = isCurrentlyWeekend();
                      const isHoliday = currentMarketPeriod === 'holiday';
                      
                      // Use "Prev Close" on weekends/holidays, "Today" on weekdays
                      const firstLabel = ((currentMarketPeriod === 'closed' && isWeekend) || isHoliday) ? 'Prev Close' : 'Today';
                      
                      return (
                        <>
                          {/* Today's/Prev Close change (market close vs previous close) */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[14px] ${isPositiveToday ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                              {isPositiveToday ? '▲' : '▼'} {formatCurrency(Math.abs(todayChange))} ({isPositiveToday ? '+' : ''}{todayChangePercent.toFixed(2)}%)
                            </span>
                            <span className="text-muted-foreground text-[14px]">{firstLabel}</span>
                          </div>
                          {/* After-hours change (current price vs market close) */}
                          <div className="flex items-center gap-2 mt-[0px] mr-[0px] mb-[30px] ml-[0px] m-[0px]">
                            <span className={`text-[14px] ${isPositiveAfterHours ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                              {isPositiveAfterHours ? '▲' : '▼'} {formatCurrency(Math.abs(afterHoursChange))} ({isPositiveAfterHours ? '+' : ''}{afterHoursChangePercent.toFixed(2)}%)
                            </span>
                            <span className="text-muted-foreground text-[14px]">After Hours</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // Regular hours: Show single line
                  priceChange !== undefined && priceChangePercent !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isPositive ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                        {isPositive ? '▲' : '▼'} {formatCurrency(Math.abs(priceChange))} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
              {/* Non-intraday mode: show simple single line */}
              {!isIntradayMode && priceChange !== undefined && priceChangePercent !== undefined && (
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isPositive ? 'text-[rgb(0,200,5)]' : 'text-[rgb(255,80,0)]'}`}>
                    {isPositive ? '▲' : '▼'} {formatCurrency(Math.abs(priceChange))} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chart container */}
      <div ref={chartContainerRef} className="relative w-full bg-background overflow-visible -mx-[20px] lg:-mx-[44px]">
        {/* Full-width interactive overlay for crosshair */}
        <div 
          ref={fullChartRef}
          className="absolute z-30" 
          style={{ 
            left: 0,
            top: 0,
            width: '100%',
            height: `${height}px`,
            touchAction: 'none',
            cursor: 'crosshair'
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        />
        
        {/* Chart area */}
        <div className="relative w-full" style={{ height: `${height}px`, overflow: 'visible' }}>
          {/* Left side: Clean SVG line chart */}
          <div className="absolute top-0 left-0 bottom-0" style={{ width: `${pastWidthPercent}%` }}>
            <div className="relative w-full h-full">
              <svg 
                viewBox={`0 0 ${actualWidth} ${height}`}
                preserveAspectRatio="none"
                className="w-full h-full absolute top-0 left-0"
                ref={svgRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
              >
              {!showAdvancedChart && (
                <>
                  {isIntradayMode ? (
                    <>
                      {/* Define clip paths for each market period */}
                      <defs>
                        <clipPath id="stock-premarket-clip">
                          <rect x="0" y="0" width={preMarketEndX} height={height} />
                        </clipPath>
                        <clipPath id="stock-regular-clip">
                          <rect x={preMarketEndX} y="0" width={regularHoursEndX - preMarketEndX} height={height} />
                        </clipPath>
                        <clipPath id="stock-afterhours-clip">
                          <rect x={regularHoursEndX} y="0" width={actualWidth - regularHoursEndX} height={height} />
                        </clipPath>
                      </defs>
                      
                      {(() => {
                        // Determine which session contains the hover point (Robinhood-style)
                        let hoveredSession: 'premarket' | 'regular' | 'afterhours' | null = null;
                        
                        if (hoverPoint && hoverPoint.timestamp) {
                          const hoverTimestamp = hoverPoint.timestamp;
                          const hoverDate = new Date(hoverTimestamp);
                          const hours = hoverDate.getUTCHours();
                          const minutes = hoverDate.getUTCMinutes();
                          const timeInMinutes = hours * 60 + minutes;
                          
                          // Market hours in UTC (ET converted)
                          // Pre-market: 4:00 AM - 9:30 AM ET = 9:00 - 14:30 UTC
                          // Regular: 9:30 AM - 4:00 PM ET = 14:30 - 21:00 UTC
                          // After-hours: 4:00 PM - 8:00 PM ET = 21:00 - 1:00 UTC (next day)
                          
                          if (timeInMinutes >= 9 * 60 && timeInMinutes < 14 * 60 + 30) {
                            hoveredSession = 'premarket';
                          } else if (timeInMinutes >= 14 * 60 + 30 && timeInMinutes < 21 * 60) {
                            hoveredSession = 'regular';
                          } else {
                            hoveredSession = 'afterhours';
                          }
                        }
                        
                        // If no hover point, use current period behavior (all sections visible when closed)
                        const getSessionOpacity = (session: 'premarket' | 'regular' | 'afterhours') => {
                          if (hoveredSession) {
                            return hoveredSession === session ? 1 : 0.3;
                          }
                          // Default behavior: highlight current session when market is open
                          return currentPeriod === 'closed' ? 1 : (currentPeriod === session ? 1 : 0.3);
                        };
                        
                        return (
                          <>
                            {/* Pre-market section - clipped continuous path */}
                            <path
                              d={continuousPath}
                              fill="none"
                              stroke={isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                              opacity={getSessionOpacity('premarket')}
                              clipPath="url(#stock-premarket-clip)"
                            />
                            
                            {/* Regular hours section - clipped continuous path */}
                            <path
                              d={continuousPath}
                              fill="none"
                              stroke={isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                              opacity={getSessionOpacity('regular')}
                              clipPath="url(#stock-regular-clip)"
                            />
                            
                            {/* After-hours section - clipped continuous path */}
                            <path
                              d={continuousPath}
                              fill="none"
                              stroke={isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                              opacity={getSessionOpacity('afterhours')}
                              clipPath="url(#stock-afterhours-clip)"
                            />
                          </>
                        );
                      })()}
                    </>
                  ) : selectedTimeRange === '1W' ? (
                    /* 1W view - segment by trading day for Robinhood-style highlighting */
                    <>
                      {(() => {
                        // Group data points by trading day (4:00 AM ET to 8:00 PM ET)
                        const daySegments: { [key: string]: { minX: number; maxX: number; dayKey: string } } = {};
                        
                        // Helper to get trading day key (accounts for pre-market starting at 4 AM ET)
                        const getTradingDayKey = (timestamp: number): string => {
                          const date = new Date(timestamp);
                          // Convert to ET hours
                          const etHours = date.getUTCHours();
                          
                          // If before 4 AM ET (9 AM UTC), this belongs to previous trading day
                          if (etHours < 9) {
                            const prevDay = new Date(date);
                            prevDay.setUTCDate(prevDay.getUTCDate() - 1);
                            return prevDay.toISOString().split('T')[0];
                          }
                          
                          return date.toISOString().split('T')[0];
                        };
                        
                        data.forEach((point, i) => {
                          const dayKey = getTradingDayKey(point.timestamp);
                          
                          const x = (i / Math.max(1, data.length - 1)) * actualWidth;
                          
                          if (!daySegments[dayKey]) {
                            daySegments[dayKey] = { minX: x, maxX: x, dayKey };
                          } else {
                            daySegments[dayKey].minX = Math.min(daySegments[dayKey].minX, x);
                            daySegments[dayKey].maxX = Math.max(daySegments[dayKey].maxX, x);
                          }
                        });
                        
                        // Determine which day contains the hover point
                        let hoveredDayKey: string | null = null;
                        if (hoverPoint && hoverPoint.timestamp) {
                          hoveredDayKey = getTradingDayKey(hoverPoint.timestamp);
                        }
                        
                        const dayKeys = Object.keys(daySegments).sort();
                        
                        return (
                          <>
                            <defs>
                              {dayKeys.map((dayKey) => {
                                const segment = daySegments[dayKey];
                                return (
                                  <clipPath key={`clip-${dayKey}`} id={`stock-day-clip-${dayKey}`}>
                                    <rect 
                                      x={segment.minX} 
                                      y="0" 
                                      width={Math.max(1, segment.maxX - segment.minX + (actualWidth / Math.max(1, data.length - 1)))} 
                                      height={height} 
                                    />
                                  </clipPath>
                                );
                              })}
                            </defs>
                            
                            {dayKeys.map((dayKey) => {
                              const isHovered = hoveredDayKey === dayKey;
                              const opacity = hoveredDayKey ? (isHovered ? 1 : 0.3) : 1;
                              
                              return (
                                <path
                                  key={`path-${dayKey}`}
                                  d={continuousPath}
                                  fill="none"
                                  stroke={isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'}
                                  strokeWidth={strokeWidth}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  vectorEffect="non-scaling-stroke"
                                  opacity={opacity}
                                  clipPath={`url(#stock-day-clip-${dayKey})`}
                                />
                              );
                            })}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    /* Other multi-day views - single continuous path */
                    <path
                      d={continuousPath}
                      fill="none"
                      stroke={isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
              
              {/* Previous close dotted line - ONLY show on 1D view */}
              {isIntradayMode && previousClose && previousCloseY !== null && !isNaN(previousCloseY) && (
                <line
                  x1="0"
                  y1={previousCloseY}
                  x2={actualWidth}
                  y2={previousCloseY}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="1,5"
                  strokeLinecap="round"
                  className="opacity-20 dark:opacity-40"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Crosshair vertical line */}
              {hoverPoint && (
                <line
                  x1={hoverPoint.x}
                  y1={0}
                  x2={hoverPoint.x}
                  y2={height}
                  stroke={hoverPoint.catalyst ? getEventTypeHexColor(hoverPoint.catalyst.type) : (isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)')}
                  strokeWidth="1"
                  opacity={0.5}
                  strokeDasharray="3,3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
                </>
              )}
              
              {/* Candlestick rendering */}
              {showAdvancedChart && (
                <>
                  {candlestickElements}
                  
                  {/* Previous close dotted line - ONLY show on 1D view */}
                  {isIntradayMode && previousClose && previousCloseY !== null && !isNaN(previousCloseY) && (
                    <line
                      x1="0"
                      y1={previousCloseY}
                      x2={actualWidth}
                      y2={previousCloseY}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="1,5"
                      strokeLinecap="round"
                      className="opacity-20 dark:opacity-40"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}

                  {/* Crosshair vertical line */}
                  {hoverPoint && (
                    <line
                      x1={hoverPoint.x}
                      y1={0}
                      x2={hoverPoint.x}
                      y2={height}
                      stroke={hoverPoint.catalyst ? getEventTypeHexColor(hoverPoint.catalyst.type) : (isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)')}
                      strokeWidth="1"
                      opacity={0.5}
                      strokeDasharray="3,3"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </>
              )}
              
              {/* Past event dots as SVG circles - renders in exact same coordinate system as price line */}
              {/* Placed OUTSIDE both line chart and candlestick blocks so it renders for both */}
              </svg>
            
            {/* Past event dots as fixed-size HTML elements - same styling as upcoming dots */}
            {showPastEvents && filteredPastEvents && filteredPastEvents.length > 0 && data.length > 0 && (() => {
                // Use actualWidth for coordinate calculations
                const width = actualWidth;
                
                const now = Date.now();
                const minDataTime = data.length > 0 ? Math.min(...data.map(d => d.timestamp)) : 0;
                const maxDataTime = data.length > 0 ? Math.max(...data.map(d => d.timestamp)) : 0;
                
                // Calculate renderData and renderDataIndices - MUST match chart path (lines 710-733)
                let renderData = data;
                let renderDataIndices: number[] = [];
                if (!isIntradayMode && data.length > 150) {
                  const targetPoints = 50;
                  const step = Math.floor(data.length / targetPoints);
                  const downsampled: DataPoint[] = [];
                  const downsampledIndices: number[] = [];
                  
                  for (let i = 0; i < data.length; i += step) {
                    downsampled.push(data[i]);
                    downsampledIndices.push(i);
                  }
                  
                  if (downsampled[downsampled.length - 1] !== data[data.length - 1]) {
                    downsampled.push(data[data.length - 1]);
                    downsampledIndices.push(data.length - 1);
                  }
                  
                  renderData = downsampled;
                  renderDataIndices = downsampledIndices;
                } else {
                  renderDataIndices = data.map((_, i) => i);
                }
                
                // Calculate Y scale params - MUST match chart path calculation EXACTLY (lines 736-767)
                let allPriceValues: number[] = [];
                data.forEach(d => {
                  if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
                    allPriceValues.push(d.open, d.high, d.low, d.close);
                  } else {
                    allPriceValues.push(d.value);
                  }
                });
                const effPrevClose = getEffectivePreviousClose(previousClose, previousDayData);
                const allVals = effPrevClose ? [...allPriceValues, effPrevClose] : allPriceValues;
                const minValue = Math.min(...allVals);
                const maxValue = Math.max(...allVals);
                const range = maxValue - minValue;
                const padding = range * 0.1;
                const minY = minValue - padding;
                const maxY = maxValue + padding;
                const valueRange = maxY - minY;
                const margin = { top: 40, bottom: 20 };
                const candleHeight = height - 40;
                const chartHeight = candleHeight - margin.top - margin.bottom;
                
                const pastEventsToRender = filteredPastEvents
                  .filter(event => {
                    if (!event.actualDateTime) return false;
                    const eventTime = new Date(event.actualDateTime).getTime();
                    return eventTime <= now && eventTime >= minDataTime && eventTime <= maxDataTime;
                  });
                
                return pastEventsToRender
                  .map((event, idx) => {
                    // Calculate z-index: earlier events (lower idx) get higher z-index
                    const baseZIndex = 5;
                    const zIndex = baseZIndex + (pastEventsToRender.length - idx);
                    if (!event.actualDateTime) return null;
                    const eventTimestamp = new Date(event.actualDateTime).getTime();
                    
                    // Find closest data point IN RENDER DATA (the downsampled data that chart uses)
                    let closestRenderIndex = -1;
                    let minTimeDiff = Infinity;
                    renderData.forEach((point, i) => {
                      const diff = Math.abs(point.timestamp - eventTimestamp);
                      if (diff < minTimeDiff) {
                        minTimeDiff = diff;
                        closestRenderIndex = i;
                      }
                    });
                    
                    if (closestRenderIndex === -1) return null;
                    const point = renderData[closestRenderIndex];
                    const originalIndex = renderDataIndices[closestRenderIndex];
                    
                    // X position - MUST match chart path calculation (lines 915 or 889-895)
                    let x: number;
                    if (isIntradayMode) {
                      const tradingDay = getTradingDayFromData(data);
                      const marketHours = getMarketHoursBounds(tradingDay);
                      x = calculateIntradayXPosition(point.timestamp, marketHours, width);
                    } else if (selectedTimeRange === '5Y') {
                      const fiveYearsPast = 5 * MS.YEAR;
                      const startTime = now - fiveYearsPast;
                      x = ((point.timestamp - startTime) / fiveYearsPast) * width;
                    } else {
                      // Use originalIndex from renderDataIndices, same as chart path
                      x = calculateIndexBasedXPosition(originalIndex, data.length, width);
                    }
                    
                    // Y position calculation depends on chart type
                    let yPosition: number;
                    
                    if (showAdvancedChart) {
                      // CANDLESTICK CHART: Fixed Y position - align all dots horizontally just above volume section
                      yPosition = height - 40 - 8 + 20; // 8px above volume section + 20px down
                    } else {
                      // LINE CHART: Position on the price line itself
                      // Calculate Y coordinate using same formula as path generation (margin.top + chartHeight - scaled value)
                      yPosition = margin.top + chartHeight - ((point.value - minY) / valueRange) * chartHeight;
                    }
                    
                    // Convert SVG viewBox coordinates to percentage position
                    const xPercent = (x / width) * 100;
                    const EventIcon = eventTypeIcons[event.type as keyof typeof eventTypeIcons] || Sparkles;
                    const eventColor = getEventTypeHexColor(event.type);
                    
                    return (
                      <>
                        {showAdvancedChart && (
                          /* Dashed vertical line extending from dot to top of chart - ONLY for candlestick */
                          <div
                            key={`past-event-line-${event.id}-${idx}`}
                            className="absolute pointer-events-none"
                            style={{
                              left: `${xPercent}%`,
                              top: '0px',
                              width: '1px',
                              height: `${yPosition}px`,
                              borderLeft: `1px dashed ${eventColor}`,
                              opacity: 0.4,
                              transform: 'translateX(-0.5px)',
                              zIndex: zIndex - 2
                            }}
                          />
                        )}
                        
                        {/* Event dot */}
                        <div
                          key={`past-event-dot-${event.id}-${idx}`}
                          className="absolute pointer-events-none"
                          style={{
                            left: `${xPercent}%`,
                            top: `${yPosition}px`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: zIndex
                          }}
                        >
                          <div
                            className="flex items-center justify-center"
                            style={{
                              backgroundColor: eventColor,
                              width: showAdvancedChart ? '23px' : '7.68px',
                              height: showAdvancedChart ? '23px' : '7.68px',
                              borderRadius: '50%',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                            }}
                          >
                            {showAdvancedChart && (
                              <EventIcon 
                                className="w-3.5 h-3.5 text-white"
                                strokeWidth={2.5} 
                              />
                            )}
                          </div>
                        </div>
                      </>
                    );
                  });
              })()}
            
            {/* Hover point */}
            {hoverPoint && !hoverPastEvent && (
              <>
                <div 
                  className="absolute pointer-events-none"
                  style={{ 
                    left: `${(hoverPoint.x / actualWidth) * 100}%`,
                    top: `${hoverPoint.y}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                >
                  <div 
                    style={{
                      backgroundColor: hoverPoint.catalyst ? getEventTypeHexColor(hoverPoint.catalyst.type) : (isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'),
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      boxShadow: '0 0 6px rgba(0,0,0,0.4)'
                    }}
                  />
                </div>
                
                {/* Floating timestamp label on crosshair */}
                <div 
                  className="absolute pointer-events-none"
                  style={{ 
                    left: `${(hoverPoint.x / actualWidth) * 100}%`,
                    top: '0px',
                    // Smoothly interpolate transform from 0% (left edge) to -50% (center) to -100% (right edge)
                    transform: `translateX(${Math.max(-100, Math.min(0, -50 + (actualWidth / 2 - hoverPoint.x) / (actualWidth / 2) * 50))}%)`,
                    zIndex: 11
                  }}
                >
                  <div className={`text-xs whitespace-nowrap select-none ${hoverPoint.catalyst ? 'text-foreground' : 'text-foreground/60'}`}>
                    {(() => {
                      const date = new Date(hoverPoint.timestamp);
                      
                      if (selectedTimeRange === '1D') {
                        // For 1D: just show time
                        return date.toLocaleString('en-US', { 
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                      } else if (selectedTimeRange === '1W') {
                        // For 1W: show date with time (Nov 11, 12:00 PM)
                        return date.toLocaleString('en-US', { 
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                      } else if (selectedTimeRange === '1M') {
                        // For 1M: show date with year (Nov 11, 2025)
                        return date.toLocaleString('en-US', { 
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      } else {
                        // For 3M and beyond: show date with year (Nov 11, 2025)
                        return date.toLocaleString('en-US', { 
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      }
                    })()}
                  </div>
                </div>
              </>
            )}
            
            {/* Pulsing "now" dot at end of line */}
            <div 
              className="absolute"
              style={{ 
                left: `${(lastPointX / actualWidth) * 100}%`,
                top: `${lastPointY}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20
              }}

            >
              <div className="relative">
                {/* Pulsing ring - only show during active trading periods (pre-market, regular, after-hours) */}
                {currentPeriod !== 'closed' && (
                  <div 
                    className="absolute catalyst-dot"
                    style={{
                      backgroundColor: isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)',
                      opacity: 0.4,
                      width: '13px',
                      height: '13px',
                      borderRadius: '50%',
                      left: '-2.5px',
                      top: '-2.5px',
                      animation: 'slow-ping 4s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }}
                  />
                )}
                {/* Solid circular dot - always visible */}
                <div 
                  className="relative catalyst-dot"
                  style={{
                    backgroundColor: isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
            </div>
            </div>
          </div>
          
          {/* Continuous upcoming events line - spans from current price to right edge of screen */}
          <svg 
            className="absolute pointer-events-none"
            style={{ 
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              overflow: 'visible'
            }}
            viewBox={`0 0 ${actualWidth / (pastWidthPercent / 100)} ${height}`}
            preserveAspectRatio="none"
          >
            {!isNaN(lastPointY) && (
              <line
                x1={lastPointX}
                y1={lastPointY}
                x2={50000}
                y2={lastPointY}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="1,5"
                strokeLinecap="round"
                opacity="0.6"
                vectorEffect="non-scaling-stroke"
              />
            )}
            
            {/* Removed from here - moved to separate SVG below */}
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
              const x1 = lastPointX;
              const y1 = lastPointY;
              const fullWidth = actualWidth / (pastWidthPercent / 100);
              const futureWidth = fullWidth - lastPointX;
              const targetPositionInFuture = 0.8;
              const x2 = lastPointX + (futureWidth * targetPositionInFuture);
              const margin = { top: 40, bottom: 20 };
              const chartHeight = height - margin.top - margin.bottom;
              
              console.log(`[DEBUG LineChart ${ticker}] 🎯 Price Target Stats:`, {
                count: validTargets.length,
                avg: avgPrice.toFixed(2),
                max: maxPrice.toFixed(2),
                min: minPrice.toFixed(2),
                currentPrice
              });
              
              return targets.map((target, idx) => {
                const y2 = margin.top + chartHeight - ((target.price - minY) / valueRange) * chartHeight;
                
                // Skip if completely out of visible range
                if ((y1 < 0 && y2 < 0) || (y1 > height && y2 > height)) {
                  return null;
                }
                
                const clampedY1 = Math.max(0, Math.min(height, y1));
                const clampedY2 = Math.max(0, Math.min(height, y2));
                
                // Calculate midpoint for label placement
                const midX = (x1 + x2) / 2;
                const midY = (clampedY1 + clampedY2) / 2;
                
                return (
                  <g key={`price-target-${target.label}-${idx}`} className="pointer-events-none">
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
                      vectorEffect="non-scaling-stroke"
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
            
            {/* Crosshair for future section - continuous or snapped to event */}
            {(futureHoverPoint || hoverEvent) && (() => {
              let crosshairX: number;
              let crosshairColor: string;
              
              if (hoverEvent) {
                // Snapped to event - use event position and color
                const now = Date.now();
                // ✅ Use the dynamic futureWindowMs from component scope (it updates with viewport split)
                const timeFromNow = hoverEvent.timestamp - now;
                // Add time buffer to match event dot positioning (14 days)
                const timeBufferMs = 14 * 24 * 60 * 60 * 1000;
                const adjustedTimeFromNow = timeFromNow + timeBufferMs;
                const eventXPercent = Math.min(1, Math.max(0, adjustedTimeFromNow / futureWindowMs));
                // Map from 0-1 in future section to customViewportSplit-100% in view
                crosshairX = (actualWidth / (pastWidthPercent / 100)) * ((pastWidthPercent / 100) + eventXPercent * (futureWidthPercent / 100));
                crosshairColor = getEventTypeHexColor(hoverEvent.catalyst.type);
              } else if (futureHoverPoint) {
                // Continuous hover - use hover position and neutral color
                crosshairX = (actualWidth / (pastWidthPercent / 100)) * ((pastWidthPercent / 100) + futureHoverPoint.xPercent * (futureWidthPercent / 100));
                crosshairColor = 'currentColor';
              } else {
                return null;
              }
              
              const crosshairY = lastPointY;
              
              return (
                <g className="pointer-events-none">
                  {/* Vertical crosshair line */}
                  <line
                    x1={crosshairX}
                    y1={0}
                    x2={crosshairX}
                    y2={height}
                    stroke={crosshairColor}
                    strokeWidth="1"
                    opacity={hoverEvent ? 0.5 : 0.3}
                    strokeDasharray="3,3"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })()}
          </svg>
          
          {/* Price Target Lines - separate SVG with proper aspect ratio to avoid stretching */}
          {showUpcomingRange && priceTargets && priceTargets.length > 0 && (() => {
            // Calculate average, max, min, and median from all valid price targets
            const validTargets = priceTargets
              .filter(t => t && typeof t.price_target === 'number')
              .map(t => t.price_target);
            
            if (validTargets.length === 0) return null;
            
            const avgPrice = validTargets.reduce((sum, p) => sum + p, 0) / validTargets.length;
            const maxPrice = Math.max(...validTargets);
            const minPrice = Math.min(...validTargets);
            
            // Calculate median
            const sortedTargets = [...validTargets].sort((a, b) => a - b);
            const medianPrice = sortedTargets.length % 2 === 0
              ? (sortedTargets[sortedTargets.length / 2 - 1] + sortedTargets[sortedTargets.length / 2]) / 2
              : sortedTargets[Math.floor(sortedTargets.length / 2)];
            
            const targets = [
              { price: avgPrice, color: '#3b82f6', opacity: '0.7', strokeWidth: '2', label: 'Avg' },
              { price: medianPrice, color: '#8b5cf6', opacity: '0.7', strokeWidth: '1.5', label: 'Med' },
              { price: maxPrice, color: '#22c55e', opacity: '0.7', strokeWidth: '1.5', label: 'High' },
              { price: minPrice, color: '#ef4444', opacity: '0.7', strokeWidth: '1.5', label: 'Low' }
            ];
            
            // Calculate initial positions and label widths for all targets
            const labelData = targets.map((target, idx) => {
              const margin = { top: 40, bottom: 20 };
              const chartHeight = height - margin.top - margin.bottom;
              const y2 = margin.top + chartHeight - ((target.price - minY) / valueRange) * chartHeight;
              const clampedY2 = Math.max(0, Math.min(height, y2));
              
              const labelText = `${target.label}: $${Math.round(target.price)}`;
              const estimatedLabelWidth = labelText.length * 6.5 + 12;
              
              return {
                target,
                idx,
                y: clampedY2,
                text: labelText,
                labelWidth: estimatedLabelWidth
              };
            });
            
            // Sort by Y position for overlap detection
            const sorted = [...labelData].sort((a, b) => a.y - b.y);
            
            // Adjust positions to prevent overlap
            const minSpacing = 20;
            for (let i = 1; i < sorted.length; i++) {
              const prev = sorted[i - 1];
              const curr = sorted[i];
              const gap = curr.y - prev.y;
              
              if (gap < minSpacing) {
                curr.y = prev.y + minSpacing;
              }
            }
            
            // Apply boundary constraints after adjustments
            sorted.forEach(item => {
              if (item.y < 12) item.y = 12;
              if (item.y > height - 12) item.y = height - 12;
            });
            
            // If we're near the bottom, try shifting upward instead
            for (let i = sorted.length - 1; i > 0; i--) {
              const curr = sorted[i];
              if (curr.y >= height - 12) {
                const prev = sorted[i - 1];
                const maxY = height - 12;
                curr.y = maxY;
                if (curr.y - prev.y < minSpacing) {
                  prev.y = curr.y - minSpacing;
                }
              }
            }
            
            const fullWidth = actualWidth / (pastWidthPercent / 100);
            
            return (
              <svg
                className="absolute pointer-events-none"
                style={{
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 11
                }}
                viewBox={`0 0 ${fullWidth} ${height}`}
                preserveAspectRatio="none"
              >
                {labelData.map(({ target, idx, labelWidth }) => {
                  // Find the adjusted Y position for this label
                  const adjustedY = labelData.find(item => item.idx === idx).y;
                  
                  // Calculate where the label's left edge will be in screen coordinates
                  // Account for the negative margin that extends the chart beyond viewport
                  // Chart extends by 20px on mobile, 44px on large screens
                  const edgePadding = 44; // Using lg breakpoint value
                  const labelRightEdgeScreen = actualWidth + edgePadding;
                  const labelLeftEdgeScreen = labelRightEdgeScreen - labelWidth;
                  
                  // Convert to viewBox coordinates
                  const labelLeftEdgeViewBox = (labelLeftEdgeScreen / actualWidth) * fullWidth;
                  
                  // Add consistent margin between line end and label start (15px in screen space)
                  const marginScreen = 15;
                  const marginViewBox = (marginScreen / actualWidth) * fullWidth;
                  
                  const x1 = lastPointX;
                  const x2 = labelLeftEdgeViewBox - marginViewBox;
                  const y1 = lastPointY;
                  const y2 = adjustedY;
                  
                  // Skip if completely out of visible range
                  if ((y1 < 0 && y2 < 0) || (y1 > height && y2 > height)) {
                    return null;
                  }
                  
                  const clampedY1 = Math.max(0, Math.min(height, y1));
                  const clampedY2 = Math.max(0, Math.min(height, y2));
                  
                  return (
                    <g key={`price-target-${idx}`}>
                      <line
                        x1={x1}
                        y1={clampedY1}
                        x2={x2}
                        y2={clampedY2}
                        stroke={target.color}
                        strokeWidth={target.strokeWidth}
                        strokeDasharray="4,4"
                        strokeLinecap="round"
                        style={{ opacity: target.opacity }}
                      />
                    </g>
                  );
                })}
              </svg>
            );
          })()}
          
          {/* Price Target Labels - HTML elements to avoid SVG stretching */}
          {showUpcomingRange && priceTargets && priceTargets.length > 0 && (() => {
            // Calculate average, max, min, and median from all valid price targets
            const validTargets = priceTargets
              .filter(t => t && typeof t.price_target === 'number')
              .map(t => t.price_target);
            
            if (validTargets.length === 0) return null;
            
            const avgPrice = validTargets.reduce((sum, p) => sum + p, 0) / validTargets.length;
            const maxPrice = Math.max(...validTargets);
            const minPrice = Math.min(...validTargets);
            
            // Calculate median
            const sortedTargets = [...validTargets].sort((a, b) => a - b);
            const medianPrice = sortedTargets.length % 2 === 0
              ? (sortedTargets[sortedTargets.length / 2 - 1] + sortedTargets[sortedTargets.length / 2]) / 2
              : sortedTargets[Math.floor(sortedTargets.length / 2)];
            
            const targets = [
              { price: avgPrice, color: '#3b82f6', label: 'Avg' },
              { price: medianPrice, color: '#8b5cf6', label: 'Med' },
              { price: maxPrice, color: '#22c55e', label: 'High' },
              { price: minPrice, color: '#ef4444', label: 'Low' }
            ];
            
            // Determine decimal precision: show decimals only if any price is below $10
            const hasLowPrice = targets.some(t => t.price < 10);
            const decimals = hasLowPrice ? 2 : 0;
            
            // Calculate initial positions for all labels
            const labelPositions = targets.map((target, idx) => {
              const fullWidth = actualWidth / (pastWidthPercent / 100);
              
              const margin = { top: 40, bottom: 20 };
              const chartHeight = height - margin.top - margin.bottom;
              const y2 = margin.top + chartHeight - ((target.price - minY) / valueRange) * chartHeight;
              const clampedY2 = Math.max(0, Math.min(height, y2));
              
              const labelText = `${target.label}: $${target.price.toFixed(decimals)}`;
              const estimatedLabelWidth = labelText.length * 6.5 + 12;
              
              return {
                target,
                idx,
                y: clampedY2,
                text: labelText,
                labelWidth: estimatedLabelWidth
              };
            });
            
            // Sort by Y position for overlap detection
            const sorted = [...labelPositions].sort((a, b) => a.y - b.y);
            
            // Adjust positions to prevent overlap with increased spacing
            const minSpacing = 24; // Increased from 20 to ensure clear separation
            for (let i = 1; i < sorted.length; i++) {
              const prev = sorted[i - 1];
              const curr = sorted[i];
              const gap = curr.y - prev.y;
              
              if (gap < minSpacing) {
                // Shift current label down
                curr.y = prev.y + minSpacing;
              }
            }
            
            // Apply boundary constraints after adjustments
            sorted.forEach(item => {
              if (item.y < 12) item.y = 12;
              if (item.y > height - 12) item.y = height - 12;
            });
            
            // If we're near the bottom, try shifting upward instead
            for (let i = sorted.length - 1; i > 0; i--) {
              const curr = sorted[i];
              if (curr.y >= height - 12) {
                const prev = sorted[i - 1];
                const maxY = height - 12;
                curr.y = maxY;
                // Push previous labels up if needed
                if (curr.y - prev.y < minSpacing) {
                  prev.y = curr.y - minSpacing;
                }
              }
            }
            
            // Map the adjusted positions back to the original array for rendering
            sorted.forEach(adjustedItem => {
              const originalItem = labelPositions.find(item => item.idx === adjustedItem.idx);
              if (originalItem) {
                originalItem.y = adjustedItem.y;
              }
            });
            
            return (
              <>
                {labelPositions.map(({ target, idx, text, y }) => {
                  // Check if this label should be clickable (High or Low)
                  const isClickable = target.label === 'High' || target.label === 'Low';
                  
                  return (
                    <div
                      key={`price-label-${idx}`}
                      className={`absolute ${isClickable ? 'pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity' : 'pointer-events-none'}`}
                      style={{
                        right: '-32px',
                        top: `${y}px`,
                        transform: 'translateY(-50%)',
                        zIndex: 35,
                        fontSize: '11px',
                        fontWeight: 400,
                        color: '#000',
                        whiteSpace: 'nowrap',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '2px 6px',
                        borderRadius: '3px'
                      }}
                      onClick={isClickable ? () => {
                        setPriceTargetModalType(target.label === 'High' ? 'high' : 'low');
                        setPriceTargetModalOpen(true);
                      } : undefined}
                    >
                      {text}
                    </div>
                  );
                })}
              </>
            );
          })()}
          
          {/* Crosshair dot for upcoming events - HTML element to avoid SVG stretching */}
          {hoverEvent && (() => {
            const now = Date.now();
            const timeFromNow = hoverEvent.timestamp - now;
            // Add time buffer to match event dot positioning (14 days)
            const timeBufferMs = 14 * 24 * 60 * 60 * 1000;
            const adjustedTimeFromNow = timeFromNow + timeBufferMs;
            const eventXPercent = Math.min(1, Math.max(0, adjustedTimeFromNow / futureWindowMs));
            // Calculate X position as percentage of total width
            const crosshairXPercent = ((pastWidthPercent / 100) + eventXPercent * (futureWidthPercent / 100)) * 100;
            const crosshairY = lastPointY;
            const crosshairColor = getEventTypeHexColor(hoverEvent.catalyst.type);
            
            return (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${crosshairXPercent}%`,
                  top: `${crosshairY}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20
                }}
              >
                <div
                  className="catalyst-dot"
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: crosshairColor,
                    boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
            );
          })()}
          
          {/* Floating date label for future section crosshair */}
          {(futureHoverPoint || hoverEvent) && (() => {
            let labelXInView: number;
            let labelTimestamp: number;
            
            if (hoverEvent) {
              const now = Date.now();
              // ✅ Use the dynamic futureWindowMs from component scope (it updates with viewport split)
              const timeFromNow = hoverEvent.timestamp - now;
              const eventXPercent = Math.min(1, Math.max(0, timeFromNow / futureWindowMs));
              // Map from 0-1 in future section to customViewportSplit-100% in view
              labelXInView = pastWidthPercent + eventXPercent * futureWidthPercent;
              labelTimestamp = hoverEvent.timestamp;
            } else if (futureHoverPoint) {
              labelXInView = pastWidthPercent + futureHoverPoint.xPercent * futureWidthPercent;
              labelTimestamp = futureHoverPoint.timestamp;
            } else {
              return null;
            }
            
            return (
              <div 
                className="absolute pointer-events-none"
                style={{ 
                  left: `${labelXInView}%`,
                  top: '0px',
                  // Smoothly interpolate transform based on position within future section
                  // pastWidthPercent is left edge of future, 100 is right edge
                  transform: `translateX(${Math.max(-100, Math.min(0, -50 + (pastWidthPercent + futureWidthPercent / 2 - labelXInView) / (futureWidthPercent / 2) * 50))}%)`,
                  zIndex: 30
                }}
              >
                <div className={`text-xs whitespace-nowrap select-none ${hoverEvent ? 'text-foreground' : 'text-foreground/60'}`}>
                  {new Date(labelTimestamp).toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            );
          })()}

          {/* Right side: Future catalyst timeline with gradient - only shown when showUpcomingRange is true */}
          {showUpcomingRange && (
          <div 
            className="absolute flex items-center"
            style={{ 
              left: `${pastWidthPercent}%`,
              width: `${futureWidthPercent}%`,
              top: '-20px',
              bottom: '-9px',
              height: 'calc(100% + 29px)',
              pointerEvents: 'auto', // Enable pointer events for extended future section
              overflow: 'visible'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Extended background container to guarantee edge-to-edge coverage */}
            <div 
              className="absolute top-0 bottom-0"
              style={{
                left: '0px',
                width: '150vw', // Guaranteed to cover right edge
              }}
            >
              {/* Gradient overlay background */}
              <div 
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(to right, rgba(236, 236, 240, 0) 0px, rgba(236, 236, 240, 0.75) 50px, rgba(236, 236, 240, 0.75) 100%)',
                  pointerEvents: 'none',
                  opacity: 1
                }}
              />
              <div 
                className="absolute inset-0 dark:block hidden transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0.25) 50px, rgba(0, 0, 0, 0.25) 100%)',
                  pointerEvents: 'none',
                  opacity: 1
                }}
              />
              {/* Vertical gradient overlay - top to bottom fade */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 8%, rgba(255, 255, 255, 0) 92%, rgba(255, 255, 255, 1) 100%)',
                  pointerEvents: 'none'
                }}
              />
              <div 
                className="absolute inset-0 dark:block hidden"
                style={{
                  background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 8%, rgba(0, 0, 0, 0) 92%, rgba(0, 0, 0, 0.8) 100%)',
                  pointerEvents: 'none'
                }}
              />
            </div>
            
            {/* Catalyst dots on timeline - constrained to logical width */}
            <div className="relative w-full h-full flex items-center">
              {/* Catalyst event dots - all circular */}
              {filteredFutureCatalysts.map((catalyst, index) => {
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
                
                // Calculate z-index: earlier events (lower index) get higher z-index
                const baseZIndex = 10;
                const zIndex = baseZIndex + (filteredFutureCatalysts.length - index);
                
                return (
                  <div
                    key={`catalyst-${catalyst.timestamp}-${index}`}
                    className="absolute"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${lastPointY + 20}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: zIndex
                    }}
                  >
                    <div
                      className="catalyst-dot flex items-center justify-center"
                      style={{
                        width: '20.7px',
                        height: '20.7px',
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

        {/* Volume chart section */}
        <div className="flex w-full pb-3 pt-1" style={{ height: '40px' }}>
          <div className="relative w-full" style={{ width: `${pastWidthPercent}%` }}>
            {(() => {
              // Use actualWidth for coordinate calculations
              const width = actualWidth;
              
              // For 1D and 1W views, aggregate volume data into larger buckets to create distinct bars
              // For 1M, 3M, and longer views, use data as-is (daily volume)
              const aggregateVolume = (data: DataPoint[], bucketSizeMinutes: number) => {
                if (data.length === 0) return [];
                
                // Group data points into time buckets
                const buckets = new Map<number, number>();
                
                data.forEach((point) => {
                  if (!point.volume || point.volume === 0) return;
                  
                  // Round timestamp to nearest bucket
                  const bucketTime = Math.floor(point.timestamp / (bucketSizeMinutes * 60 * 1000)) * (bucketSizeMinutes * 60 * 1000);
                  
                  if (!buckets.has(bucketTime)) {
                    buckets.set(bucketTime, 0);
                  }
                  buckets.set(bucketTime, buckets.get(bucketTime)! + point.volume);
                });
                
                // Convert buckets back to array
                return Array.from(buckets.entries()).map(([timestamp, volume]) => ({
                  timestamp,
                  volume
                })).sort((a, b) => a.timestamp - b.timestamp);
              };
              
              // Determine bucket size based on time range
              // 1D: 5-minute buckets (~78 bars for 6.5 hours)
              // 1W: Use hourly data as-is (already aggregated)
              // 1M: Use daily data as-is
              // 3M+: Aggregate into weekly buckets for better visibility
              let volumeData: Array<{ timestamp: number; volume: number }>;
              let bucketSizeMinutes = 5;
              
              // VALIDATION: For 1M, 3M, YTD, 1Y, 5Y views, ensure we have DAILY data, not hourly
              // Daily data has timestamps at midnight (00:00:00.000Z), hourly has various hour times
              if ((selectedTimeRange === '1M' || selectedTimeRange === '3M' || selectedTimeRange === 'YTD' || selectedTimeRange === '1Y' || selectedTimeRange === '5Y') && data.length > 0) {
                const firstTimestamp = new Date(data[0].timestamp);
                const isHourlyData = firstTimestamp.getUTCHours() !== 0 || firstTimestamp.getUTCMinutes() !== 0;
                
                if (isHourlyData) {
                  return null; // Skip rendering until we get daily data
                }
              }
              
              if (selectedTimeRange === 'YTD' || selectedTimeRange === '1Y' || selectedTimeRange === '5Y') {
                // For YTD/1Y/5Y views: aggregate daily data into weekly buckets for better visibility
                // This creates ~52 bars for 1Y, etc.
                const weeklyBucketSizeMinutes = 7 * 24 * 60; // 1 week in minutes
                
                volumeData = aggregateVolume(data, weeklyBucketSizeMinutes);
              } else {
                // For 1D, 1W, 1M, and 3M: use data as-is
                // 1D data is 5-minute bars (from five_minute_prices table)
                // 1W data is 5-minute bars (from five_minute_prices table)
                // 1M and 3M data is daily (from daily_prices table)
                // IMPORTANT: Include ALL data points (even with zero volume) for complete timeline
                volumeData = data.map(d => ({
                  timestamp: d.timestamp,
                  volume: d.volume || 0 // Include zero-volume hours/days
                }));
              }
              
              // Filter out future volume bars (only show volume for times that have occurred)
              const currentTime = Date.now();
              const volumeDataBeforeFilter = volumeData.length;
              volumeData = volumeData.filter(d => d.timestamp <= currentTime);
              
              if (volumeData.length === 0) return null;
              
              // Calculate max volume
              // For 3M view (daily data): use max from the most recent 30 days with volume to avoid outliers from old data
              // For YTD/1Y (weekly aggregated data): use overall max since aggregation already smooths outliers
              let maxVolume: number;
              if (selectedTimeRange === '3M') {
                const thirtyDaysAgo = currentTime - (30 * 24 * 60 * 60 * 1000);
                const recentVolumes = volumeData
                  .filter(d => d.timestamp >= thirtyDaysAgo && d.volume > 0)
                  .map(d => d.volume);
                maxVolume = recentVolumes.length > 0 
                  ? Math.max(...recentVolumes)
                  : Math.max(...volumeData.map(d => d.volume));
              } else {
                maxVolume = Math.max(...volumeData.map(d => d.volume));
              }
              const barHeight = 30; // Height of volume bars
              
              // Build path data for area chart
              const pathPoints: Array<{ x: number; y: number }> = [];
              
              volumeData.forEach((point, index) => {
                // Calculate position using same logic as bar chart
                let x: number;
                if (isIntradayMode) {
                  const firstDataPoint = new Date(data[0].timestamp);
                  const tradingDay = new Date(firstDataPoint.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                  tradingDay.setHours(0, 0, 0, 0);
                  
                  const extendedOpenTime = new Date(tradingDay);
                  extendedOpenTime.setHours(8, 0, 0, 0);
                  const extendedOpenTimestamp = extendedOpenTime.getTime();
                  
                  const hoursFromOpen = (point.timestamp - extendedOpenTimestamp) / (1000 * 60 * 60);
                  const extendedHoursTotal = 12;
                  const xPercent = hoursFromOpen / extendedHoursTotal;
                  x = xPercent * width;
                } else if (selectedTimeRange === '5Y') {
                  const now = Date.now();
                  const fiveYearsPast = 5 * 365 * 24 * 60 * 60 * 1000;
                  const startTime = now - fiveYearsPast;
                  const totalDuration = fiveYearsPast;
                  
                  const timeFromStart = point.timestamp - startTime;
                  const xPercent = timeFromStart / totalDuration;
                  x = xPercent * width;
                } else if (selectedTimeRange === '1M' || selectedTimeRange === '3M') {
                  // For 3M and 1M: use timestamp-based positioning to show gaps for non-trading days
                  const firstTimestamp = data[0]?.timestamp || point.timestamp;
                  const lastTimestamp = data[data.length - 1]?.timestamp || point.timestamp;
                  const totalDuration = lastTimestamp - firstTimestamp;
                  const timeFromStart = point.timestamp - firstTimestamp;
                  const xPercent = totalDuration > 0 ? timeFromStart / totalDuration : 0;
                  x = xPercent * width;
                } else if (selectedTimeRange === 'YTD' || selectedTimeRange === '1Y') {
                  const firstDailyTimestamp = data[0]?.timestamp || point.timestamp;
                  const lastDailyTimestamp = data[data.length - 1]?.timestamp || point.timestamp;
                  const totalDuration = lastDailyTimestamp - firstDailyTimestamp;
                  const timeFromStart = point.timestamp - firstDailyTimestamp;
                  const xPercent = totalDuration > 0 ? timeFromStart / totalDuration : 0;
                  x = xPercent * width;
                } else {
                  x = (index / Math.max(1, volumeData.length - 1)) * width;
                }
                
                // Calculate y position based on volume
                const y = barHeight - ((point.volume / maxVolume) * barHeight);
                
                pathPoints.push({ x, y });
              });
              
              // Build SVG path string for area chart
              let pathD = '';
              if (pathPoints.length > 0) {
                // Start at bottom-left
                pathD = `M ${pathPoints[0].x} ${barHeight} `;
                
                // Line up to first point
                pathD += `L ${pathPoints[0].x} ${pathPoints[0].y} `;
                
                // Connect all volume points
                pathPoints.forEach((point, index) => {
                  if (index > 0) {
                    pathD += `L ${point.x} ${point.y} `;
                  }
                });
                
                // Line down to bottom-right
                pathD += `L ${pathPoints[pathPoints.length - 1].x} ${barHeight} `;
                
                // Close path
                pathD += 'Z';
              }
              
              return (
                <svg width="100%" height={barHeight} className="w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${barHeight}`}>
                  {pathD && (
                    <path
                      d={pathD}
                      fill="currentColor"
                      opacity={0.3}
                      className="text-muted-foreground"
                    />
                  )}
                </svg>
              );
            })()}
          </div>
          {/* Empty space for right side to maintain alignment - only when showing upcoming range */}
          {/* Upcoming events counter moved below chart selector */}

        </div>

        {/* Time labels - REMOVED for cleaner look */}
      </div>
      
      {/* Time range selector and chart toggle button */}
      <div className="flex items-center gap-2 pb-4 pt-2 mt-[0px] mb-[-15px] lg:-mx-[44px] px-[20px] lg:px-[44px] mr-[-20px] ml-[-20px] mx-[-20px] my-[-15px]">
        {/* Horizontally scrollable time range selector with fade indicator */}
        <div className="flex-1 overflow-x-auto scrollbar-hide relative">
          <div className="flex gap-0.5 min-w-max pt-[0px] pb-[0px] pl-[0px] p-[0px]">
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
                className="p-0 transition-colors flex items-center justify-center"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <Settings className="h-5 w-5 text-foreground transition-colors" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Upcoming events counter - portfolio chart only */}
      {hideChartTypeSelector && (() => {
        // Calculate number of upcoming events in next 3 months (portfolio chart only)
        const now = Date.now();
        const threeMonthsFromNow = now + (90 * 24 * 60 * 60 * 1000); // 90 days in milliseconds
        
        const upcomingEventsCount = filteredFutureCatalysts.filter(catalyst => {
          return catalyst.timestamp > now && catalyst.timestamp <= threeMonthsFromNow;
        }).length;
        
        return (
          <div className="flex items-center justify-center px-[20px] lg:px-[44px] pb-[0px] pt-[0px] text-center mt-[10px] mr-[0px] mb-[0px] ml-[0px]">
            <span className="text-muted-foreground text-center whitespace-nowrap text-[14px]">
              {upcomingEventsCount} Upcoming Event{upcomingEventsCount !== 1 ? 's' : ''} in Next 3 Months
            </span>
          </div>
        );
      })()}
      
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
            <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
              {/* Chart Type Selection */}
              {!hideChartTypeSelector && (
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
              )}
              
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
      
      {/* Price Target Modal */}
      {priceTargetModalOpen && priceTargetModalType && (
        <PriceTargetModal
          isOpen={priceTargetModalOpen}
          onClose={() => {
            setPriceTargetModalOpen(false);
            setPriceTargetModalType(null);
          }}
          title={priceTargetModalType === 'high' ? 'High' : 'Low'}
          priceTargets={priceTargets}
          type={priceTargetModalType}
        />
      )}
    </div>
  );
}