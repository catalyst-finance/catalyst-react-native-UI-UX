import { useMemo } from 'react';
import { motion } from 'motion/react';
import { getEventTypeHexColor } from '../../utils/formatting';
import { BarChart3, AlertCircle, Package, Users, Shield, TrendingUp, ShoppingCart, Handshake, Target, Building, Tag, DollarSign, Sparkles, Circle } from 'lucide-react';
import { Point, generateContinuousSmoothPath } from '../../utils/bezier-path-utils';
import { getEffectivePreviousClose } from '../../utils/chart-math-utils';
import { getTradingDayFromData, createTradingDayContext, EXTENDED_HOURS_TOTAL } from '../../utils/chart-time-utils';

interface MarketEvent {
  id: string;
  type: string;
  [key: string]: any;
}

// Event Type Icon Components mapping
const eventTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  earnings: BarChart3,
  product: Package,
  investor_day: Users,
  regulatory: Shield,
  guidance_update: TrendingUp,
  conference: Users,
  commerce_event: ShoppingCart,
  partnership: Handshake,
  merger: Target,
  legal: AlertCircle,
  corporate: Building,
  pricing: Tag,
  capital_markets: DollarSign,
  defense_contract: Shield,
  guidance: TrendingUp,
  launch: Sparkles,
  fda: AlertCircle,
  split: TrendingUp,
  dividend: DollarSign,
};

interface DataPoint {
  timestamp: number;
  value: number;
  session?: string; // Session type: pre-market, regular, after-hours
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: MarketEvent;
  dayIndex: number;
  position: number;
}

interface SimpleMiniChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  ticker?: string;
  futureCatalysts?: FutureCatalyst[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  centeredEventId?: string | null;
  disableAnimation?: boolean;
  previousDayData?: { close: number; previousClose: number } | null;
  shortenedTradingHours?: { open: string; close: string } | null; // e.g., { open: "09:30", close: "13:00" }
  globalMinValue?: number; // Optional: for standardized y-scale across multiple charts
  globalMaxValue?: number; // Optional: for standardized y-scale across multiple charts
}

export function SimpleMiniChart({ 
  data, 
  previousClose, 
  currentPrice,
  ticker,
  futureCatalysts = [],
  width = 300, 
  height = 60,
  strokeWidth = 1.5,
  centeredEventId = null,
  disableAnimation = false,
  previousDayData = null,
  shortenedTradingHours = null,
  globalMinValue,
  globalMaxValue
}: SimpleMiniChartProps) {
  
  // Calculate SVG path from data points
  const { continuousPath, preMarketEndX, regularHoursEndX, isPositive, lastPointY, lastPointX, currentPeriod, todaysClosePrice, marketCloseX } = useMemo(() => {
    if (data.length === 0) {
      return { continuousPath: '', preMarketEndX: 0, regularHoursEndX: 0, isPositive: true, lastPointY: height / 2, lastPointX: width, currentPeriod: 'regular' as const, todaysClosePrice: null, marketCloseX: 0 };
    }

    // Find min/max values for scaling
    const values = data.map(d => d.value);
    
    // Determine the effective previous close for chart calculations
    // Uses shared utility that properly handles weekends (not pre-market)
    const effectivePreviousClose = getEffectivePreviousClose(previousClose, previousDayData);
    
    // Use global scale if provided, otherwise calculate local scale
    let minValue: number;
    let maxValue: number;
    
    if (globalMinValue !== undefined && globalMaxValue !== undefined) {
      // Use global scale for standardized comparison across multiple charts
      minValue = globalMinValue;
      maxValue = globalMaxValue;
    } else {
      // Calculate local scale for this chart only
      // Include effective previous close and current price in the range calculation to ensure they are always visible
      const allValues = effectivePreviousClose ? [...values, effectivePreviousClose, currentPrice] : [...values, currentPrice];
      minValue = Math.min(...allValues);
      maxValue = Math.max(...allValues);
    }
    
    const range = maxValue - minValue;
    
    // Add 30% padding on top and bottom to prevent clipping (accounting for stroke width)
    const padding = range * 0.3;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    
    // Use shared utility for trading day detection and market hours
    const tradingDayET = getTradingDayFromData(data);
    const tradingDayContext = createTradingDayContext(data);
    const marketBounds = tradingDayContext.marketHours;
    const extendedOpenTimestamp = marketBounds.extendedOpen;
    const extendedCloseTimestamp = marketBounds.extendedClose;
    
    // Get today's date in ET timezone for determining market status
    const now = new Date();
    const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentTimestamp = todayET.getTime();
    
    // Define regular market hours timestamps on the trading day
    // Use shortened hours if provided (e.g., day after Thanksgiving: 09:30-13:00)
    const marketOpenTime = new Date(tradingDayET);
    if (shortenedTradingHours) {
      const [openHour, openMinute] = shortenedTradingHours.open.split(':').map(Number);
      marketOpenTime.setHours(openHour, openMinute, 0, 0);
    } else {
      marketOpenTime.setHours(9, 30, 0, 0); // 9:30 AM ET on the trading day
    }
    const marketOpenTimestamp = marketOpenTime.getTime();
    
    const marketCloseTime = new Date(tradingDayET);
    if (shortenedTradingHours) {
      const [closeHour, closeMinute] = shortenedTradingHours.close.split(':').map(Number);
      marketCloseTime.setHours(closeHour, closeMinute, 0, 0);
      console.log(`[DEBUG SimpleMiniChart] Using shortened trading hours: ${shortenedTradingHours.open} - ${shortenedTradingHours.close}`);
    } else {
      marketCloseTime.setHours(16, 0, 0, 0); // 4:00 PM ET on the trading day
    }
    const marketCloseTimestamp = marketCloseTime.getTime();
    
    // Calculate 4 PM X position (using EXTENDED_HOURS_TOTAL constant from utilities)
    const hoursFrom8amTo4pm = (marketCloseTimestamp - extendedOpenTimestamp) / (1000 * 60 * 60);
    const marketCloseXPos = (hoursFrom8amTo4pm / EXTENDED_HOURS_TOTAL) * width;
    
    // Find the price at 4 PM close (or closest data point)
    let todaysClose: number | null = null;
    let closestTimeDiff = Infinity;
    for (const point of data) {
      const timeDiff = Math.abs(point.timestamp - marketCloseTimestamp);
      if (timeDiff < closestTimeDiff && point.timestamp <= marketCloseTimestamp + 60000) { // Within 1 minute
        closestTimeDiff = timeDiff;
        todaysClose = point.value;
      }
    }
    
    // Determine current period using shared utility context
    let currentPeriod: 'premarket' | 'regular' | 'afterhours' | 'closed';
    
    // Use trading day context for weekend/historical detection
    const { isWeekend, isHistorical: isHistoricalDay } = tradingDayContext;
    
    const tradingDayDateOnly = tradingDayET.toISOString().split('T')[0];
    const todayDateOnly = todayET.toISOString().split('T')[0];
    
    console.log(`[DEBUG SimpleMiniChart] Trading day: ${tradingDayDateOnly}, Today: ${todayDateOnly}, isHistoricalDay: ${isHistoricalDay}, isWeekend: ${isWeekend}`);
    
    // On weekends or when showing historical data (e.g., holidays), always return 'closed' 
    if (isWeekend || isHistoricalDay) {
      currentPeriod = 'closed';
      console.log(`[DEBUG SimpleMiniChart] Setting currentPeriod = 'closed' (isWeekend: ${isWeekend}, isHistoricalDay: ${isHistoricalDay})`);
    } else if (currentTimestamp < marketOpenTimestamp) {
      currentPeriod = 'premarket';
    } else if (currentTimestamp <= marketCloseTimestamp) {
      currentPeriod = 'regular';
    } else if (currentTimestamp <= extendedCloseTimestamp) {
      currentPeriod = 'afterhours';
    } else {
      currentPeriod = 'closed';
    }
    
    // Collect points for each segment, then generate smooth paths
    const preMarketPoints: Point[] = [];
    const regularHoursPoints: Point[] = [];
    const afterHoursPoints: Point[] = [];
    let lastY = height / 2;
    let lastX = 0;
    let lastPreMarketPoint: Point | null = null;
    let lastRegularHoursPoint: Point | null = null;
    
    data.forEach((point, index) => {
      // Calculate X position based on actual timestamp relative to extended hours (8 AM - 8 PM)
      const pointTime = point.timestamp;
      const hoursFromOpen = (pointTime - extendedOpenTimestamp) / (1000 * 60 * 60);
      const xPercent = hoursFromOpen / EXTENDED_HOURS_TOTAL;
      const x = xPercent * width;
      
      // Invert Y because SVG coordinates are top-down
      const y = height - ((point.value - minY) / valueRange) * height;
      
      // Determine which segment this point belongs to
      // Use session field from database if available, otherwise fall back to timestamp-based detection
      let segmentType: 'premarket' | 'regular' | 'afterhours';
      
      if (point.session) {
        // Use session field from database (more accurate)
        if (point.session === 'pre-market') {
          segmentType = 'premarket';
        } else if (point.session === 'regular') {
          segmentType = 'regular';
        } else if (point.session === 'after-hours') {
          segmentType = 'afterhours';
        } else {
          // Fallback for unknown session types
          segmentType = pointTime <= marketCloseTimestamp ? 'regular' : 'afterhours';
        }
        
        // Log session-based classification for first few points
        if (index < 5 || (point.session === 'pre-market' && index < 30)) {
          console.log(`[DEBUG SimpleMiniChart ${ticker}] Point ${index}: session="${point.session}" -> segmentType="${segmentType}", time=${new Date(pointTime).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
        }
      } else {
        // Fall back to timestamp-based detection
        if (pointTime < marketOpenTimestamp) {
          segmentType = 'premarket';
        } else if (pointTime <= marketCloseTimestamp) {
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
        if (regularHoursPoints.length === 0 && lastPreMarketPoint) {
          regularHoursPoints.push(lastPreMarketPoint);
        }
        regularHoursPoints.push({ x, y });
        lastRegularHoursPoint = { x, y };
      } else {
        // After-hours (4:00 PM - 8:00 PM)
        // Add the last regular hours point as the first point to ensure continuity
        if (afterHoursPoints.length === 0 && lastRegularHoursPoint) {
          afterHoursPoints.push(lastRegularHoursPoint);
        }
        afterHoursPoints.push({ x, y });
      }
      
      // Store last point Y position and X position
      if (index === data.length - 1) {
        lastY = y;
        // Clamp lastX to not exceed width - ensures dot stays in past section even on weekends
        lastX = Math.min(x, width);
      }
    });
    
    // Generate smooth Bezier paths for each segment
    // Adjust tension based on data density - use lower tension for sparse data
    const totalPoints = preMarketPoints.length + regularHoursPoints.length + afterHoursPoints.length;
    const tension = totalPoints < 20 ? 0.2 : 0.4; // Less smooth for sparse data
    
    const segments = [preMarketPoints, regularHoursPoints, afterHoursPoints];
    
    // Generate continuous path for seamless rendering
    const continuousPathString = generateContinuousSmoothPath(segments, tension);
    
    // Calculate boundary X positions for clipping
    const preMarketEnd = preMarketPoints.length > 0 ? preMarketPoints[preMarketPoints.length - 1].x : 0;
    const regularHoursEnd = regularHoursPoints.length > 0 ? regularHoursPoints[regularHoursPoints.length - 1].x : preMarketEnd;
    
    // Log segment distribution for debugging
    console.log(`[DEBUG SimpleMiniChart ${ticker}] 📊 Segment distribution: preMarket=${preMarketPoints.length} points (endX=${preMarketEnd.toFixed(1)}), regular=${regularHoursPoints.length} points (endX=${regularHoursEnd.toFixed(1)}), afterHours=${afterHoursPoints.length} points, total=${data.length} points`);
    
    // Determine if chart is positive or negative based on effective previous close
    const lastValue = data[data.length - 1]?.value || currentPrice;
    const isPos = effectivePreviousClose ? lastValue >= effectivePreviousClose : currentPrice >= 0;
    
    return { continuousPath: continuousPathString, preMarketEndX: preMarketEnd, regularHoursEndX: regularHoursEnd, isPositive: isPos, lastPointY: lastY, lastPointX: lastX, currentPeriod, todaysClosePrice: todaysClose, marketCloseX: marketCloseXPos };
  }, [data, width, height, previousClose, currentPrice, previousDayData, shortenedTradingHours, globalMinValue, globalMaxValue]);

  // Calculate previous close line Y position
  const previousCloseY = useMemo(() => {
    if (data.length === 0) return null;
    
    // Uses shared utility that properly handles weekends (not pre-market)
    const effectivePreviousClose = getEffectivePreviousClose(previousClose, previousDayData);
    
    if (!effectivePreviousClose) return null;
    
    const values = data.map(d => d.value);
    
    // Use global scale if provided, otherwise calculate local scale
    let minValue: number;
    let maxValue: number;
    
    if (globalMinValue !== undefined && globalMaxValue !== undefined) {
      minValue = globalMinValue;
      maxValue = globalMaxValue;
    } else {
      // Include effective previous close and current price in the range calculation
      const allValues = [...values, effectivePreviousClose, currentPrice];
      minValue = Math.min(...allValues);
      maxValue = Math.max(...allValues);
    }
    
    const range = maxValue - minValue;
    const padding = range * 0.3;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    
    return height - ((effectivePreviousClose - minY) / valueRange) * height;
  }, [previousClose, previousDayData, data, height, globalMinValue, globalMaxValue]);

  // Calculate today's close line Y position (for after-hours reference)
  const todaysCloseY = useMemo(() => {
    if (!todaysClosePrice || data.length === 0) return null;
    
    const values = data.map(d => d.value);
    
    // Use global scale if provided, otherwise calculate local scale
    let minValue: number;
    let maxValue: number;
    
    if (globalMinValue !== undefined && globalMaxValue !== undefined) {
      minValue = globalMinValue;
      maxValue = globalMaxValue;
    } else {
      // Include previous close and current price in the range calculation
      const allValues = previousClose ? [...values, previousClose, currentPrice] : [...values, currentPrice];
      minValue = Math.min(...allValues);
      maxValue = Math.max(...allValues);
    }
    
    const range = maxValue - minValue;
    const padding = range * 0.3;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    
    return height - ((todaysClosePrice - minY) / valueRange) * height;
  }, [todaysClosePrice, data, height, previousClose, globalMinValue, globalMaxValue, currentPrice]);

  if (data.length === 0) {
    return (
      <div className="w-full h-[120px] flex items-center justify-center">
        <div className="text-xs text-muted-foreground">No data</div>
      </div>
    );
  }

  // Calculate layout: 58% for past chart, 42% for future timeline
  const pastWidthPercent = 58;
  const futureWidthPercent = 42;

  // Calculate month labels for the next 3 months
  const monthLabels = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // Use evenly-spaced positions (25%, 50%, 75%) instead of time-based positioning
    // to prevent label overlap as we get closer to month boundaries
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(now);
      futureDate.setMonth(now.getMonth() + i);
      
      months.push({
        label: futureDate.toLocaleDateString('en-US', { month: 'short' }),
        position: (i / 4) * 100  // 25%, 50%, 75%
      });
    }
    
    return months;
  }, []);

  return (
    <div className="relative w-full">
      {/* Chart container */}
      <div className="relative w-full h-[120px]" style={{ overflow: 'visible' }}>
        {/* Left side: Clean SVG line chart */}
        <div className="absolute inset-0" style={{ width: `${pastWidthPercent}%` }}>
          <svg 
            width={width} 
            height={height} 
            className="w-full h-full"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            {/* Define clip paths for each market period */}
            <defs>
              <clipPath id={`premarket-clip-${ticker || 'default'}`}>
                <rect x="0" y="0" width={preMarketEndX} height={height} />
              </clipPath>
              <clipPath id={`regular-clip-${ticker || 'default'}`}>
                <rect x={preMarketEndX} y="0" width={regularHoursEndX - preMarketEndX} height={height} />
              </clipPath>
              <clipPath id={`afterhours-clip-${ticker || 'default'}`}>
                <rect x={regularHoursEndX} y="0" width={width - regularHoursEndX} height={height} />
              </clipPath>
            </defs>
            
            {/* Pre-market section - clipped continuous path */}
            <path
              d={continuousPath}
              fill="none"
              stroke={isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={currentPeriod === 'closed' ? 1 : (currentPeriod === 'premarket' ? 1 : 0.3)}
              clipPath={`url(#premarket-clip-${ticker || 'default'})`}
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
              opacity={currentPeriod === 'closed' ? 1 : (currentPeriod === 'regular' ? 1 : 0.3)}
              clipPath={`url(#regular-clip-${ticker || 'default'})`}
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
              opacity={currentPeriod === 'closed' ? 1 : (currentPeriod === 'afterhours' ? 1 : 0.3)}
              clipPath={`url(#afterhours-clip-${ticker || 'default'})`}
            />
            
            {/* Extension line from last data point to current price dot (unclipped) */}
            {currentPeriod !== 'closed' && data.length > 0 && (
              <line
                x1={lastPointX}
                y1={lastPointY}
                x2={lastPointX}
                y2={lastPointY}
                stroke={isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            
            {/* Previous close dotted line - during after-hours, only show from start to 4 PM */}
            {previousClose && previousCloseY !== null && (
              <line
                x1="0"
                y1={previousCloseY}
                x2={width}
                y2={previousCloseY}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="1,5"
                strokeLinecap="round"
                className="opacity-20 dark:opacity-40"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          
          {/* Pulsing "now" dot at end of line */}
          <div 
            className="absolute"
            style={{ 
              left: `${(lastPointX / width) * 100}%`,
              top: `${lastPointY}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 20
            }}
          >
            <div className="relative">
              {/* Pulsing ring - only during active trading periods (not when closed) */}
              {currentPeriod !== 'closed' && (
                <div 
                  className="absolute catalyst-dot"
                  style={{
                    backgroundColor: isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)',
                    opacity: 0.4,
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    left: '-2.2px',
                    top: '-2.2px',
                    animation: 'slow-ping 4s cubic-bezier(0, 0, 0.2, 1) infinite'
                  }}
                />
              )}
              {/* Solid circular dot - always visible */}
              <div 
                className="relative catalyst-dot"
                style={{
                  backgroundColor: isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)',
                  width: '6.6px',
                  height: '6.6px',
                  borderRadius: '50%',
                  boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Continuous upcoming events line - spans from current price to right edge of chart */}
        <svg 
          className="absolute pointer-events-none"
          style={{ 
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            zIndex: 1
          }}
          viewBox={`0 0 ${width / (pastWidthPercent / 100)} ${height}`}
          preserveAspectRatio="none"
        >
          <line
            x1={lastPointX}
            y1={lastPointY}
            x2={width / (pastWidthPercent / 100)}
            y2={lastPointY}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="1,5"
            strokeLinecap="round"
            opacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Right side: Future catalyst timeline with gradient */}
        <div 
          className="absolute right-0 flex items-center"
          style={{ 
            width: `${futureWidthPercent}%`,
            top: '-6px',
            bottom: '-6px',
            height: 'calc(100% + 12px)'
          }}
        >
          {/* Gradient overlay background - extends left to start transition before 8pm */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(236, 236, 240, 0) 0%, rgba(236, 236, 240, 0.75) 15%, rgba(236, 236, 240, 0.75) 85%, rgba(236, 236, 240, 0) 100%)',
              pointerEvents: 'none',
              left: '-4%',
              width: '104%'
            }}
          />
          <div 
            className="absolute inset-0 dark:block hidden"
            style={{
              background: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.25) 15%, rgba(0, 0, 0, 0.25) 85%, rgba(0, 0, 0, 0) 100%)',
              pointerEvents: 'none',
              left: '-4%',
              width: '104%'
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
          <div className="relative w-full h-full">
            {/* Catalyst event dots - all circular */}
            {(() => {
              // Group catalysts that are close together (within 8% of the width)
              const STACK_THRESHOLD = 8; // percent - increased to catch events that are visually close
              const groupedCatalysts: Array<Array<typeof futureCatalysts[0]>> = [];
              
              futureCatalysts.forEach((catalyst) => {
                const now = Date.now();
                const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
                const timeFromNow = catalyst.timestamp - now;
                
                // Add time buffer: shift events further right to prevent visual intersection with current price dot
                // Events appear further away than they actually are, creating clear visual separation
                const timeBufferMs = 14 * 24 * 60 * 60 * 1000; // 14 days (2 weeks)
                const adjustedTimeFromNow = timeFromNow + timeBufferMs; // ADD buffer to push right
                const leftPercent = Math.min(100, Math.max(0, (adjustedTimeFromNow / threeMonthsMs) * 100));
                
                // Find if there's an existing group within the stack threshold
                let foundGroup = false;
                for (const group of groupedCatalysts) {
                  const firstInGroup = group[0];
                  const firstTimeFromNow = firstInGroup.timestamp - now;
                  const firstLeftPercent = Math.min(100, Math.max(0, (firstTimeFromNow / threeMonthsMs) * 100));
                  
                  if (Math.abs(leftPercent - firstLeftPercent) <= STACK_THRESHOLD) {
                    group.push(catalyst);
                    foundGroup = true;
                    break;
                  }
                }
                
                if (!foundGroup) {
                  groupedCatalysts.push([catalyst]);
                }
              });
              
              return groupedCatalysts.map((group, groupIndex) => {
                // Sort group by timestamp (earliest first) so earliest is in front
                const sortedGroup = [...group].sort((a, b) => a.timestamp - b.timestamp);
                
                // Calculate position for the group (use the earliest event's position)
                const now = Date.now();
                const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
                const timeFromNow = sortedGroup[0].timestamp - now;
                
                // Add time buffer: shift events further right to prevent visual intersection with current price dot
                // Events appear further away than they actually are, creating clear visual separation
                const timeBufferMs = 14 * 24 * 60 * 60 * 1000; // 14 days (2 weeks)
                const adjustedTimeFromNow = timeFromNow + timeBufferMs; // ADD buffer to push right
                const leftPercent = Math.min(100, Math.max(0, (adjustedTimeFromNow / threeMonthsMs) * 100));
                
                // If only one event in group, render normally
                if (sortedGroup.length === 1) {
                  const catalyst = sortedGroup[0];
                  const eventColor = getEventTypeHexColor(catalyst.catalyst.type);
                  const isCentered = centeredEventId === catalyst.catalyst.id;
                  const EventIcon = eventTypeIcons[catalyst.catalyst.type] || Circle;
                  
                  return (
                    <div
                      key={`catalyst-${catalyst.timestamp}-${groupIndex}`}
                      className="absolute"
                      style={{
                        left: `${leftPercent}%`,
                        top: `${lastPointY + 6}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10
                      }}
                    >
                      {isCentered && !disableAnimation ? (
                        // Pulsing dot for centered event - matches timeline animation
                        <motion.div
                          className="catalyst-dot flex items-center justify-center"
                          style={{
                            width: '10.56px',
                            height: '10.56px',
                            borderRadius: '50%',
                            backgroundColor: eventColor,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                          }}
                          animate={{
                            scale: [1, 1.3, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                        </motion.div>
                      ) : (
                        // Regular dot (or centered but animation disabled)
                        <div
                          className="catalyst-dot flex items-center justify-center"
                          style={{
                            width: '10.56px',
                            height: '10.56px',
                            borderRadius: '50%',
                            backgroundColor: eventColor,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                          }}
                        >
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Multiple events - stack them with earliest in front (highest z-index)
                return (
                  <div
                    key={`catalyst-group-${groupIndex}`}
                    className="absolute flex"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${lastPointY + 6}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}
                  >
                    {sortedGroup.map((catalyst, stackIndex) => {
                      const eventColor = getEventTypeHexColor(catalyst.catalyst.type);
                      const isCentered = centeredEventId === catalyst.catalyst.id;
                      const EventIcon = eventTypeIcons[catalyst.catalyst.type] || Circle;
                      
                      return (
                        <div
                          key={`catalyst-${catalyst.timestamp}-${stackIndex}`}
                          className="flex-shrink-0"
                          style={{
                            marginLeft: stackIndex === 0 ? '0' : '-7px',
                            zIndex: sortedGroup.length - stackIndex // Earliest (index 0) gets highest z-index
                          }}
                        >
                          {isCentered && !disableAnimation ? (
                            // Pulsing dot for centered event - matches timeline animation
                            <motion.div
                              className="catalyst-dot flex items-center justify-center ring-1 ring-background"
                              style={{
                                width: '10.56px',
                                height: '10.56px',
                                borderRadius: '50%',
                                backgroundColor: eventColor,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                              }}
                              animate={{
                                scale: [1, 1.3, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                            </motion.div>
                          ) : (
                            // Regular dot (or centered but animation disabled)
                            <div
                              className="catalyst-dot flex items-center justify-center ring-1 ring-background"
                              style={{
                                width: '10.56px',
                                height: '10.56px',
                                borderRadius: '50%',
                                backgroundColor: eventColor,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                              }}
                            >
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>


    </div>
  );
}