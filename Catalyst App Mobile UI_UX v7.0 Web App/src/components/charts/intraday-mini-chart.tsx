import { useMemo, useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  generateContinuousSmoothPath, 
  Point 
} from '../../utils/bezier-path-utils';
import { 
  getTradingDayFromData, 
  createTradingDayContext, 
  EXTENDED_HOURS_TOTAL,
  determineMarketPeriod
} from '../../utils/chart-time-utils';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface IntradayMiniChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  ticker: string;
  company?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  upcomingEventsCount?: number;
  onToggleTimeline?: () => void;
  showTimeline?: boolean;
  onTickerClick?: (ticker: string) => void;
}

export function IntradayMiniChart({ 
  data, 
  previousClose, 
  currentPrice,
  ticker,
  company,
  width = 300, 
  height = 100,
  strokeWidth = 1.5,
  upcomingEventsCount = 0,
  onToggleTimeline,
  showTimeline = false,
  onTickerClick
}: IntradayMiniChartProps) {
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; value: number; timestamp: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPressed, setIsPressed] = useState(false);
  
  // Precompute chart data for interaction
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const allValues = previousClose ? [...values, previousClose] : values;
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;

    const tradingDayContext = createTradingDayContext(data);
    const extendedOpenTimestamp = tradingDayContext.marketHours.extendedOpen;

    // Map data points to screen coordinates
    const mappedPoints = data.map(point => {
      const hoursFromOpen = (point.timestamp - extendedOpenTimestamp) / (1000 * 60 * 60);
      const xPercent = hoursFromOpen / EXTENDED_HOURS_TOTAL;
      const x = xPercent * width;
      const y = height - ((point.value - minY) / valueRange) * height;
      
      return {
        x,
        y,
        value: point.value,
        timestamp: point.timestamp
      };
    });

    return {
      mappedPoints,
      minY,
      maxY,
      valueRange,
      extendedOpenTimestamp
    };
  }, [data, width, height, previousClose]);

  // Handle mouse/touch interactions
  const handleInteraction = (clientX: number, clientY: number) => {
    if (!svgRef.current || !chartData) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * width;

    // Find closest point
    let closestPoint = chartData.mappedPoints[0];
    let minDistance = Infinity;

    chartData.mappedPoints.forEach(point => {
      const distance = Math.abs(point.x - x);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    if (minDistance < width / 2) {
      setHoverPoint(closestPoint);
    }
  };

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => {
    setIsPressed(false);
    setHoverPoint(null);
  };
  const handleMouseLeave = () => {
    setHoverPoint(null);
    setIsPressed(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPressed) {
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(true);
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    setHoverPoint(null);
  };

  // Calculate SVG path from data points - using same logic as SimpleMiniChart
  const { continuousPath, preMarketEndX, regularHoursEndX, isPositive, lastPointY, lastPointX, currentPeriod, todayChangePercent, afterHoursChangePercent } = useMemo(() => {
    if (data.length === 0) {
      return { 
        continuousPath: '', 
        preMarketEndX: 0,
        regularHoursEndX: 0,
        isPositive: true, 
        lastPointY: height / 2, 
        lastPointX: width, 
        currentPeriod: 'regular' as const,
        todayChangePercent: 0,
        afterHoursChangePercent: 0
      };
    }

    const values = data.map(d => d.value);
    const allValues = previousClose ? [...values, previousClose, currentPrice] : [...values, currentPrice];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.1;
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
    
    // CRITICAL FIX: Use marketBounds from trading day context instead of creating new Date objects
    // marketBounds already contains the correct UTC millisecond timestamps for market hours
    // These are calculated from the trading day in ET timezone and converted to UTC
    const marketOpenTimestamp = marketBounds.regularOpen;
    const marketCloseTimestamp = marketBounds.regularClose;
    
    // Find market open and close prices
    let marketOpenPrice: number | null = null;
    let marketClosePrice: number | null = null;
    
    let closestOpenDiff = Infinity;
    for (const point of data) {
      const timeDiff = Math.abs(point.timestamp - marketOpenTimestamp);
      if (timeDiff < closestOpenDiff && point.timestamp >= marketOpenTimestamp - 60000) {
        closestOpenDiff = timeDiff;
        marketOpenPrice = point.value;
      }
    }
    
    let closestCloseDiff = Infinity;
    for (const point of data) {
      const timeDiff = Math.abs(point.timestamp - marketCloseTimestamp);
      if (timeDiff < closestCloseDiff && point.timestamp <= marketCloseTimestamp + 60000) {
        closestCloseDiff = timeDiff;
        marketClosePrice = point.value;
      }
    }
    
    // Fallback: If we didn't find a market close price, use the last regular hours point
    if (!marketClosePrice) {
      const regularHoursData = data.filter(p => p.timestamp >= marketOpenTimestamp && p.timestamp <= marketCloseTimestamp);
      if (regularHoursData.length > 0) {
        marketClosePrice = regularHoursData[regularHoursData.length - 1].value;
      }
    }
    
    // Calculate percentage changes using currentPrice prop (not chart data)
    // This ensures the displayed price and percentage always match
    const todayChange = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
    const afterHoursChange = marketClosePrice ? ((currentPrice - marketClosePrice) / marketClosePrice) * 100 : 0;
    
    console.log(`[${ticker}] Price calculations:`, {
      currentPrice,
      previousClose,
      marketClosePrice,
      todayChange: todayChange.toFixed(2),
      afterHoursChange: afterHoursChange.toFixed(2)
    });
    
    // Determine current period using shared utility context
    let currentPeriod: 'premarket' | 'regular' | 'afterhours' | 'closed';
    
    // Use trading day context for weekend/historical detection
    const { isWeekend, isHistorical: isHistoricalDay } = tradingDayContext;
    
    const tradingDayDateOnly = tradingDayET.toISOString().split('T')[0];
    const todayDateOnly = todayET.toISOString().split('T')[0];
    
    // On weekends or when showing historical data, always return 'closed' 
    if (isWeekend || isHistoricalDay) {
      currentPeriod = 'closed';
    } else if (currentTimestamp < marketOpenTimestamp) {
      currentPeriod = 'premarket';
    } else if (currentTimestamp <= marketCloseTimestamp) {
      currentPeriod = 'regular';
    } else if (currentTimestamp <= extendedCloseTimestamp) {
      currentPeriod = 'afterhours';
    } else {
      currentPeriod = 'closed';
    }
    
    console.log(`[${ticker}] Current period:`, currentPeriod, '| Trading day:', tradingDayDateOnly, '| Today:', todayDateOnly);
    
    // Sort data by timestamp to ensure chronological order
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // Collect points for each segment
    const preMarketPoints: Point[] = [];
    const regularHoursPoints: Point[] = [];
    const afterHoursPoints: Point[] = [];
    let lastY = height / 2;
    let lastX = 0;
    let lastPreMarketPoint: Point | null = null;
    let lastRegularHoursPoint: Point | null = null;
    
    sortedData.forEach((point, index) => {
      const pointTime = point.timestamp;
      const hoursFromOpen = (pointTime - extendedOpenTimestamp) / (1000 * 60 * 60);
      const xPercent = hoursFromOpen / EXTENDED_HOURS_TOTAL;
      const x = xPercent * width;
      const y = height - ((point.value - minY) / valueRange) * height;
      
      // Skip points that are before the chart starts (negative X) or after it ends
      // This handles data that might extend beyond the 8 AM - 8 PM window
      if (x < 0 || x > width) {
        return; // Skip this point
      }
      
      if (pointTime < marketOpenTimestamp) {
        // Pre-market (8:00 AM - 9:30 AM)
        preMarketPoints.push({ x, y });
        lastPreMarketPoint = { x, y };
      } else if (pointTime <= marketCloseTimestamp) {
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
    });
    
    // Find the actual last point from the segment arrays
    // This ensures the dot is positioned at the visual end of the path
    let lastSegmentPoint: Point | null = null;
    if (afterHoursPoints.length > 0) {
      lastSegmentPoint = afterHoursPoints[afterHoursPoints.length - 1];
      console.log(`[${ticker}] Using afterHours last point: x=${lastSegmentPoint.x.toFixed(1)}, y=${lastSegmentPoint.y.toFixed(1)}`);
    } else if (regularHoursPoints.length > 0) {
      lastSegmentPoint = regularHoursPoints[regularHoursPoints.length - 1];
      console.log(`[${ticker}] Using regularHours last point: x=${lastSegmentPoint.x.toFixed(1)}, y=${lastSegmentPoint.y.toFixed(1)}, total reg points=${regularHoursPoints.length}`);
      if (regularHoursPoints.length > 1) {
        console.log(`[${ticker}] RegularHours first point: x=${regularHoursPoints[0].x.toFixed(1)}, y=${regularHoursPoints[0].y.toFixed(1)}`);
      }
    } else if (preMarketPoints.length > 0) {
      lastSegmentPoint = preMarketPoints[preMarketPoints.length - 1];
      console.log(`[${ticker}] Using preMarket last point: x=${lastSegmentPoint.x.toFixed(1)}, y=${lastSegmentPoint.y.toFixed(1)}`);
    }
    
    if (lastSegmentPoint) {
      lastX = lastSegmentPoint.x;
      lastY = lastSegmentPoint.y;
    }
    
    console.log(`[${ticker}] Chart data: ${sortedData.length} points, first: ${new Date(sortedData[0]?.timestamp).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} ET, last: ${new Date(sortedData[sortedData.length - 1]?.timestamp).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} ET, lastX=${lastX.toFixed(1)}, lastY=${lastY.toFixed(1)}`);
    console.log(`[${ticker}] Segments: pre=${preMarketPoints.length}, reg=${regularHoursPoints.length}, after=${afterHoursPoints.length}`);
    
    // Generate smooth continuous path across all segments
    // Use generateContinuousSmoothPath with segment arrays (not flattened) for better smoothing
    const totalPoints = preMarketPoints.length + regularHoursPoints.length + afterHoursPoints.length;
    const tension = totalPoints < 20 ? 0.2 : 0.4; // Match SimpleMiniChart tension
    
    const segments = [preMarketPoints, regularHoursPoints, afterHoursPoints];
    const continuousPathString = generateContinuousSmoothPath(segments, tension);
    console.log(`[${ticker}] Generated path (first 100 chars): ${continuousPathString.substring(0, 100)}`);
    
    // Calculate boundary X positions for clipping
    const preMarketEnd = preMarketPoints.length > 0 ? preMarketPoints[preMarketPoints.length - 1].x : 0;
    const regularHoursEnd = regularHoursPoints.length > 0 ? regularHoursPoints[regularHoursPoints.length - 1].x : preMarketEnd;
    
    const lastValue = data[data.length - 1]?.value || currentPrice;
    const isPos = previousClose ? lastValue >= previousClose : currentPrice >= 0;
    
    return { 
      continuousPath: continuousPathString,
      preMarketEndX: preMarketEnd,
      regularHoursEndX: regularHoursEnd,
      isPositive: isPos, 
      lastPointY: lastY, 
      lastPointX: lastX, 
      currentPeriod,
      todayChangePercent: todayChange,
      afterHoursChangePercent: afterHoursChange
    };
  }, [data, width, height, previousClose, currentPrice, ticker]);

  const previousCloseY = useMemo(() => {
    if (data.length === 0 || !previousClose) return null;
    
    const values = data.map(d => d.value);
    const allValues = [...values, previousClose];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY;
    
    return height - ((previousClose - minY) / valueRange) * height;
  }, [previousClose, data, height]);

  if (data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-xs text-muted-foreground">No data</div>
      </div>
    );
  }

  const chartColor = isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
  const todayIsPositive = todayChangePercent >= 0;
  const afterHoursIsPositive = afterHoursChangePercent >= 0;

  return (
    <div className="w-full space-y-3">
      {/* Header with ticker, price, and changes */}
      <div className="flex items-start justify-between px-3">
        <div className="flex items-center gap-2">
          <div 
            className="bg-black text-white px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-gray-800 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (onTickerClick) {
                onTickerClick(ticker);
              }
            }}
          >
            {ticker}
          </div>
          {company && (
            <span className="text-sm text-muted-foreground">{company}</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold" style={{ color: chartColor }}>
            ${(hoverPoint?.value || currentPrice).toFixed(2)}
          </div>
          {hoverPoint && (
            <div className="text-xs text-muted-foreground">
              {new Date(hoverPoint.timestamp).toLocaleTimeString('en-US', {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} ET
            </div>
          )}
          {!hoverPoint && (
            <div className="flex items-center gap-3 text-xs mt-1">
              {todayChangePercent !== 0 && (
                <div className="text-center">
                  <div className={todayIsPositive ? 'text-positive' : 'text-negative'}>
                    {todayIsPositive ? '▲' : '▼'} {todayIsPositive ? '+' : ''}{todayChangePercent.toFixed(2)}%
                  </div>
                  <div className="text-muted-foreground">Today</div>
                </div>
              )}
              {afterHoursChangePercent !== 0 && (currentPeriod === 'afterhours' || currentPeriod === 'closed') && Math.abs(afterHoursChangePercent) >= 0.01 && (
                <div className="text-center">
                  <div className={afterHoursIsPositive ? 'text-positive' : 'text-negative'}>
                    {afterHoursIsPositive ? '▲' : '▼'} {afterHoursIsPositive ? '+' : ''}{afterHoursChangePercent.toFixed(2)}%
                  </div>
                  <div className="text-muted-foreground">After Hours</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div 
        className="relative w-full touch-none select-none cursor-crosshair" 
        style={{ height: `${height}px` }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg 
          ref={svgRef}
          width="100%"
          height={height}
          className="w-full h-full"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {/* Define clip paths for each market period */}
          <defs>
            <clipPath id={`premarket-clip-${ticker}`}>
              <rect x="0" y="0" width={preMarketEndX} height={height} />
            </clipPath>
            <clipPath id={`regular-clip-${ticker}`}>
              <rect x={preMarketEndX} y="0" width={regularHoursEndX - preMarketEndX} height={height} />
            </clipPath>
            <clipPath id={`afterhours-clip-${ticker}`}>
              <rect x={regularHoursEndX} y="0" width={width - regularHoursEndX} height={height} />
            </clipPath>
          </defs>
          
          {/* Pre-market section - clipped continuous path */}
          <path
            d={continuousPath}
            fill="none"
            stroke={chartColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={currentPeriod === 'closed' ? 1 : (currentPeriod === 'premarket' ? 1 : 0.3)}
            clipPath={`url(#premarket-clip-${ticker})`}
          />
          
          {/* Regular hours section - clipped continuous path */}
          <path
            d={continuousPath}
            fill="none"
            stroke={chartColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={currentPeriod === 'closed' ? 1 : (currentPeriod === 'regular' ? 1 : 0.3)}
            clipPath={`url(#regular-clip-${ticker})`}
          />
          
          {/* After-hours section - clipped continuous path */}
          <path
            d={continuousPath}
            fill="none"
            stroke={chartColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={currentPeriod === 'closed' ? 1 : (currentPeriod === 'afterhours' ? 1 : 0.3)}
            clipPath={`url(#afterhours-clip-${ticker})`}
          />
          
          {/* Extension line from last data point to current price (unclipped) */}
          {currentPeriod !== 'closed' && data.length > 0 && (
            <line
              x1={lastPointX}
              y1={lastPointY}
              x2={lastPointX}
              y2={lastPointY}
              stroke={chartColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={1}
            />
          )}
          
          {/* Previous close dotted line */}
          {previousClose && previousCloseY !== null && (
            <line
              x1="0"
              y1={previousCloseY}
              x2={width}
              y2={previousCloseY}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2,4"
              strokeLinecap="round"
              className="opacity-30"
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
              stroke={chartColor}
              strokeWidth="1"
              opacity={0.5}
              strokeDasharray="3,3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        
        {/* Pulsing dot at end of line */}
        {currentPeriod !== 'closed' && !hoverPoint && (
          <div 
            className="absolute pointer-events-none"
            style={{ 
              left: `${(lastPointX / width) * 100}%`,
              top: `${lastPointY}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
          >
            <div className="relative">
              <div 
                className="absolute"
                style={{
                  backgroundColor: chartColor,
                  opacity: 0.4,
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  left: '-2.2px',
                  top: '-2.2px',
                  animation: 'slow-ping 4s cubic-bezier(0, 0, 0.2, 1) infinite'
                }}
              />
              <div 
                style={{
                  backgroundColor: chartColor,
                  width: '6.6px',
                  height: '6.6px',
                  borderRadius: '50%',
                  boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Hover point */}
        {hoverPoint && (
          <div 
            className="absolute pointer-events-none"
            style={{ 
              left: `${(hoverPoint.x / width) * 100}%`,
              top: `${hoverPoint.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
          >
            <div 
              style={{
                backgroundColor: chartColor,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 6px rgba(0,0,0,0.4)'
              }}
            />
          </div>
        )}
      </div>

      {/* Time labels */}
      <div className="relative text-[10px] text-muted-foreground px-3 pb-2">
        <span className="absolute" style={{ left: '12.5%', transform: 'translateX(-50%)' }}>9:30 AM</span>
        <span className="absolute" style={{ left: '66.67%', transform: 'translateX(-50%)' }}>4 PM</span>
        <span className="absolute" style={{ right: '8px' }}>8 PM</span>
      </div>

      {/* Show Timeline button */}
      {upcomingEventsCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTimeline}
          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Show Timeline ({upcomingEventsCount}+ upcoming events)
          {showTimeline ? (
            <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
          )}
        </Button>
      )}
    </div>
  );
}