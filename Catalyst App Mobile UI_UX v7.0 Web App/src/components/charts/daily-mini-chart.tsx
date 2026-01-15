import { useMemo, useState, useRef } from 'react';
import { 
  generateContinuousSmoothPath, 
  Point 
} from '../../utils/bezier-path-utils';

interface DataPoint {
  timestamp: number;
  value: number;
  isLivePrice?: boolean; // Add isLivePrice flag to DataPoint
}

interface DailyMiniChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  ticker: string;
  company?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  onTickerClick?: (ticker: string) => void;
  snapInterval?: 'hourly' | 'daily' | 'none'; // Controls crosshair snapping behavior
}

/**
 * DailyMiniChart - Designed for multi-day timeframes (1W, 1M, 3M, 6M, 1Y, 5Y)
 * Uses simple linear spacing for daily data points across calendar days
 * Similar design to IntradayMiniChart but without trading hours logic
 */
export function DailyMiniChart({ 
  data, 
  previousClose, 
  currentPrice,
  ticker,
  company,
  width = 300, 
  height = 100,
  strokeWidth = 1.5,
  onTickerClick,
  snapInterval = 'none'
}: DailyMiniChartProps) {
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

    // Map data points to screen coordinates using simple linear spacing
    const mappedPoints = data.map((point, index) => {
      // Evenly space points across the width
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minY) / valueRange) * height;
      
      return {
        x,
        y,
        value: point.value,
        timestamp: point.timestamp
      };
    });

    // Create snap points based on snapInterval
    let snapPoints = mappedPoints;
    
    if (snapInterval === 'hourly') {
      // Filter to only include points at the top of each hour (minutes = 0)
      snapPoints = mappedPoints.filter(point => {
        const date = new Date(point.timestamp);
        const minutes = date.getUTCMinutes();
        return minutes === 0;
      });
      console.log(`[DailyMiniChart ${ticker}] Hourly snap: ${snapPoints.length} points from ${mappedPoints.length} total`);
    } else if (snapInterval === 'daily') {
      // Filter to only include one point per day (e.g., end of day or last point of each day)
      const dailyPointsMap = new Map<string, typeof mappedPoints[0]>();
      
      mappedPoints.forEach(point => {
        const date = new Date(point.timestamp);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Keep the last point of each day
        if (!dailyPointsMap.has(dateKey) || point.timestamp > dailyPointsMap.get(dateKey)!.timestamp) {
          dailyPointsMap.set(dateKey, point);
        }
      });
      
      snapPoints = Array.from(dailyPointsMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      console.log(`[DailyMiniChart ${ticker}] Daily snap: ${snapPoints.length} points from ${mappedPoints.length} total`);
    }

    return {
      mappedPoints,
      snapPoints,
      minY,
      maxY,
      valueRange
    };
  }, [data, width, height, previousClose, snapInterval, ticker]);

  // Handle mouse/touch interactions
  const handleInteraction = (clientX: number, clientY: number) => {
    if (!svgRef.current || !chartData) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * width;

    // Find closest point from snap points (not all points)
    const pointsToSearch = chartData.snapPoints;
    let closestPoint = pointsToSearch[0];
    let minDistance = Infinity;

    pointsToSearch.forEach(point => {
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

  // Calculate SVG path from data points
  const { continuousPath, isPositive, lastPointY, lastPointX, changePercent } = useMemo(() => {
    if (data.length === 0) {
      return { 
        continuousPath: '', 
        isPositive: true, 
        lastPointY: height / 2, 
        lastPointX: width,
        changePercent: 0
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
    
    // Sort data by timestamp to ensure chronological order
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // RENDER ALL DATA POINTS for granular, rough-looking chart
    // (Don't filter - we want all 10-minute points visible)
    const points: Point[] = [];
    
    sortedData.forEach((point, index) => {
      const x = (index / (sortedData.length - 1)) * width;
      const y = height - ((point.value - minY) / valueRange) * height;
      points.push({ x, y });
    });
    
    console.log(`[DailyMiniChart ${ticker}] Rendering ${points.length} points with snapInterval=${snapInterval}`);
    
    // Generate path with minimal smoothing for more granular appearance
    const totalPoints = points.length;
    const tension = 0.15; // Low tension for more granular/rough look
    const continuousPathString = generateContinuousSmoothPath([points], tension);
    
    const lastPoint = points[points.length - 1];
    const lastValue = sortedData[sortedData.length - 1]?.value || currentPrice;
    
    // Calculate change percentage from first to last data point
    const firstValue = sortedData[0]?.value || 0;
    const change = firstValue ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    const isPos = change >= 0;
    
    return { 
      continuousPath: continuousPathString,
      isPositive: isPos, 
      lastPointY: lastPoint.y, 
      lastPointX: lastPoint.x,
      changePercent: change
    };
  }, [data, width, height, previousClose, currentPrice, ticker, snapInterval]);

  // Generate x-axis labels based on data range and snapInterval
  const xAxisLabels = useMemo(() => {
    if (data.length === 0) return [];
    
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const firstTimestamp = sortedData[0].timestamp;
    const lastTimestamp = sortedData[sortedData.length - 1].timestamp;
    const timeRange = lastTimestamp - firstTimestamp;
    const daysRange = timeRange / (1000 * 60 * 60 * 24);
    
    let labelPoints: { x: number; label: string }[] = [];
    
    if (snapInterval === 'hourly') {
      // For 1W view - show daily labels
      const dailyPointsMap = new Map<string, number>();
      sortedData.forEach((point, index) => {
        const date = new Date(point.timestamp);
        const dateKey = date.toISOString().split('T')[0];
        if (!dailyPointsMap.has(dateKey)) {
          dailyPointsMap.set(dateKey, index);
        }
      });
      
      const dailyIndices = Array.from(dailyPointsMap.values()).sort((a, b) => a - b);
      labelPoints = dailyIndices.map(index => {
        const point = sortedData[index];
        const date = new Date(point.timestamp);
        const x = (index / (sortedData.length - 1)) * width;
        const label = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: 'America/New_York'
        });
        return { x, label };
      });
    } else if (snapInterval === 'daily') {
      // For 1M view - show only 3 labels: start, middle, and end
      const startIndex = 0;
      const middleIndex = Math.floor(sortedData.length / 2);
      const endIndex = sortedData.length - 1;
      
      const indices = [startIndex, middleIndex, endIndex];
      
      labelPoints = indices.map(index => {
        const point = sortedData[index];
        const date = new Date(point.timestamp);
        const x = (index / (sortedData.length - 1)) * width;
        const label = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: 'America/New_York'
        });
        return { x, label };
      });
    } else {
      // For other views (3M, 6M, 1Y, 5Y) - show monthly or appropriate intervals
      if (daysRange > 365) {
        // For 5Y view - show yearly labels
        const yearlyPointsMap = new Map<number, number>();
        sortedData.forEach((point, index) => {
          const date = new Date(point.timestamp);
          const year = date.getFullYear();
          if (!yearlyPointsMap.has(year)) {
            yearlyPointsMap.set(year, index);
          }
        });
        
        const yearlyIndices = Array.from(yearlyPointsMap.values()).sort((a, b) => a - b);
        labelPoints = yearlyIndices.map(index => {
          const point = sortedData[index];
          const date = new Date(point.timestamp);
          const x = (index / (sortedData.length - 1)) * width;
          const label = date.getFullYear().toString();
          return { x, label };
        });
      } else if (daysRange > 90) {
        // For 3M-1Y view - show monthly labels
        const monthlyPointsMap = new Map<string, number>();
        sortedData.forEach((point, index) => {
          const date = new Date(point.timestamp);
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          if (!monthlyPointsMap.has(monthKey)) {
            monthlyPointsMap.set(monthKey, index);
          }
        });
        
        const monthlyIndices = Array.from(monthlyPointsMap.values()).sort((a, b) => a - b);
        labelPoints = monthlyIndices.map(index => {
          const point = sortedData[index];
          const date = new Date(point.timestamp);
          const x = (index / (sortedData.length - 1)) * width;
          const label = date.toLocaleDateString('en-US', { 
            month: 'short',
            timeZone: 'America/New_York'
          });
          return { x, label };
        });
      }
    }
    
    return labelPoints;
  }, [data, width, snapInterval]);

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

  return (
    <div className="w-full space-y-3">
      {/* Header with ticker, price, and change */}
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
              {snapInterval === 'hourly' ? (
                // For hourly snap (1W view), show date and time
                new Date(hoverPoint.timestamp).toLocaleString('en-US', {
                  timeZone: 'America/New_York',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) + ' ET'
              ) : (
                // For daily snap (1M view) or no snap, show just date
                new Date(hoverPoint.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              )}
            </div>
          )}
          {!hoverPoint && changePercent !== 0 && (
            <div className="text-xs mt-1">
              <div className={isPositive ? 'text-positive' : 'text-negative'}>
                {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </div>
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
          {/* Main chart line */}
          <path
            d={continuousPath}
            fill="none"
            stroke={chartColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          
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
        
        {/* End point dot */}
        {!hoverPoint && (
          <div 
            className="absolute pointer-events-none"
            style={{ 
              left: `${(lastPointX / width) * 100}%`,
              top: `${lastPointY}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
          >
            {/* Check if last point is a live price (has isLivePrice flag) */}
            {(data[data.length - 1] as any)?.isLivePrice ? (
              // Live price indicator - pulsing animated dot
              <>
                <div 
                  className="absolute"
                  style={{
                    backgroundColor: chartColor,
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    opacity: 0.6,
                    animation: 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
                <div 
                  style={{
                    backgroundColor: chartColor,
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    boxShadow: `0 0 8px ${chartColor}, 0 0 4px rgba(0,0,0,0.3)`
                  }}
                />
                <style jsx>{`
                  @keyframes pulse-slow {
                    0%, 100% {
                      opacity: 0.6;
                      transform: scale(1);
                    }
                    50% {
                      opacity: 0;
                      transform: scale(1.5);
                    }
                  }
                `}</style>
              </>
            ) : (
              // Regular end point dot
              <div 
                style={{
                  backgroundColor: chartColor,
                  width: '6.6px',
                  height: '6.6px',
                  borderRadius: '50%',
                  boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                }}
              />
            )}
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
      
      {/* X-axis labels */}
      <div className="relative w-full" style={{ height: '20px' }}>
        {xAxisLabels.map((labelPoint, idx) => {
          // Determine alignment based on position
          let transform = 'translateX(-50%)'; // Center by default
          if (idx === 0) {
            transform = 'translateX(0%)'; // Left-align first label
          } else if (idx === xAxisLabels.length - 1) {
            transform = 'translateX(-100%)'; // Right-align last label
          }
          
          return (
            <div
              key={idx}
              className="absolute text-xs text-muted-foreground whitespace-nowrap"
              style={{
                left: `${(labelPoint.x / width) * 100}%`,
                transform,
                top: '0px'
              }}
            >
              {labelPoint.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}