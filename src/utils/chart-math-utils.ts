/**
 * Chart Math Utilities
 * 
 * Shared mathematical calculation functions for chart components.
 * Handles price scaling, volume calculations, and data transformations.
 */

import {
  UnifiedChartPoint,
  PriceScale,
  VolumeScale,
  ChartDimensions,
  DEFAULT_CHART_DIMENSIONS,
} from '../types/chart-types';

// ============================================================================
// Price Scale Functions
// ============================================================================

/**
 * Calculate the price range from data points, including OHLC if available
 * @param data - Array of chart data points
 * @param previousClose - Previous close price to include in range
 * @param paddingPercent - Percentage padding to add (default 10%)
 * @returns Min and max values with padding applied
 */
export function calculatePriceRange(
  data: UnifiedChartPoint[] | { value: number; open?: number; high?: number; low?: number; close?: number }[],
  previousClose: number | null,
  paddingPercent: number = 0.1
): { minPrice: number; maxPrice: number; priceRange: number } {
  if (data.length === 0) {
    const fallbackPrice = previousClose || 100;
    return { minPrice: fallbackPrice * 0.9, maxPrice: fallbackPrice * 1.1, priceRange: fallbackPrice * 0.2 };
  }

  // Collect all price values
  const allPrices: number[] = [];
  
  data.forEach(d => {
    // Handle both UnifiedChartPoint and simple DataPoint formats
    const value = 'close' in d && d.close !== undefined ? d.close : (d as any).value;
    
    if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
      // Include OHLC values for candlestick charts
      allPrices.push(d.open, d.high, d.low, d.close);
    } else {
      allPrices.push(value);
    }
  });

  // Include previous close in range calculation
  if (previousClose !== null) {
    allPrices.push(previousClose);
  }

  const minValue = Math.min(...allPrices);
  const maxValue = Math.max(...allPrices);
  const range = maxValue - minValue;
  
  // Add padding
  const padding = range * paddingPercent;
  
  return {
    minPrice: minValue - padding,
    maxPrice: maxValue + padding,
    priceRange: range + (2 * padding),
  };
}

/**
 * Create a price scale for Y-axis calculations
 * @param data - Chart data points
 * @param previousClose - Previous close price
 * @param dimensions - Chart dimensions
 * @returns Price scale with conversion functions
 */
export function createPriceScale(
  data: UnifiedChartPoint[] | { value: number; open?: number; high?: number; low?: number; close?: number }[],
  previousClose: number | null,
  dimensions: ChartDimensions = DEFAULT_CHART_DIMENSIONS
): PriceScale {
  const { minPrice, maxPrice, priceRange } = calculatePriceRange(data, previousClose);
  
  const { margin, priceChartHeight } = dimensions;
  const chartHeight = priceChartHeight - margin.top - margin.bottom;
  
  /**
   * Convert price to Y coordinate
   * Y is inverted because SVG coordinates are top-down
   */
  const priceToY = (price: number): number => {
    return margin.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };
  
  /**
   * Convert Y coordinate back to price
   */
  const yToPrice = (y: number): number => {
    return minPrice + ((margin.top + chartHeight - y) / chartHeight) * priceRange;
  };
  
  return {
    minPrice,
    maxPrice,
    priceRange,
    priceToY,
    yToPrice,
  };
}

/**
 * Get the effective previous close based on market period
 * During pre-market, use yesterday's close; otherwise use standard previous close
 * @param previousClose - Standard previous close
 * @param previousDayData - Previous day data with close and previousClose
 * @param isPreMarket - Whether we're in pre-market hours
 * @returns Effective previous close for calculations
 */
export function getEffectivePreviousClose(
  previousClose: number | null,
  previousDayData: { close: number; previousClose: number } | null,
  isPreMarket: boolean
): number | null {
  if (isPreMarket && previousDayData?.close) {
    return previousDayData.close;
  }
  return previousClose;
}

// ============================================================================
// Volume Scale Functions
// ============================================================================

/**
 * Calculate volume scale from data
 * @param data - Chart data points with volume
 * @param volumeHeight - Height available for volume bars
 * @returns Volume scale with conversion function
 */
export function createVolumeScale(
  data: { volume?: number }[],
  volumeHeight: number = 30
): VolumeScale {
  const volumes = data.map(d => d.volume || 0);
  const maxVolume = Math.max(...volumes, 1); // Ensure at least 1 to avoid division by zero
  
  const volumeToHeight = (volume: number): number => {
    return (volume / maxVolume) * volumeHeight;
  };
  
  return {
    maxVolume,
    volumeToHeight,
  };
}

/**
 * Aggregate volume data into larger time buckets
 * Used for creating cleaner volume bar displays
 * @param data - Raw data points
 * @param bucketSizeMinutes - Size of each bucket in minutes
 * @returns Aggregated data with summed volumes
 */
export function aggregateVolume<T extends { timestamp: number; volume?: number }>(
  data: T[],
  bucketSizeMinutes: number
): Array<T & { aggregatedVolume: number; bucketStart: number }> {
  if (data.length === 0) return [];
  
  const bucketMs = bucketSizeMinutes * 60 * 1000;
  const buckets = new Map<number, { points: T[]; totalVolume: number }>();
  
  // Group data into buckets
  data.forEach(point => {
    const bucketStart = Math.floor(point.timestamp / bucketMs) * bucketMs;
    
    if (!buckets.has(bucketStart)) {
      buckets.set(bucketStart, { points: [], totalVolume: 0 });
    }
    
    const bucket = buckets.get(bucketStart)!;
    bucket.points.push(point);
    bucket.totalVolume += point.volume || 0;
  });
  
  // Convert buckets back to array, using first point of each bucket
  const result: Array<T & { aggregatedVolume: number; bucketStart: number }> = [];
  
  buckets.forEach((bucket, bucketStart) => {
    if (bucket.points.length > 0) {
      result.push({
        ...bucket.points[0],
        aggregatedVolume: bucket.totalVolume,
        bucketStart,
      });
    }
  });
  
  return result.sort((a, b) => a.bucketStart - b.bucketStart);
}

// ============================================================================
// Data Point Finding Functions
// ============================================================================

/**
 * Find the closest data point to a given X position
 * @param xPosition - X position to find closest point to
 * @param data - Array of data points
 * @param getXPosition - Function to calculate X position for each point
 * @returns Index of closest point and distance
 */
export function findClosestDataPoint<T>(
  xPosition: number,
  data: T[],
  getXPosition: (point: T, index: number) => number
): { index: number; distance: number } | null {
  if (data.length === 0) return null;
  
  let closestIndex = 0;
  let minDistance = Infinity;
  
  data.forEach((point, index) => {
    const pointX = getXPosition(point, index);
    const distance = Math.abs(pointX - xPosition);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  
  return { index: closestIndex, distance: minDistance };
}

/**
 * Find data point at specific price for drawing reference lines
 * @param targetPrice - Price to find
 * @param priceScale - Price scale to use for conversion
 * @returns Y position for the target price
 */
export function findPriceY(
  targetPrice: number,
  priceScale: PriceScale
): number {
  return priceScale.priceToY(targetPrice);
}

// ============================================================================
// Line Path Generation Functions
// ============================================================================

/**
 * Generate SVG path string from data points
 * @param data - Array of points with x and y coordinates
 * @returns SVG path string (M x y L x y L x y...)
 */
export function generateLinePath(
  data: Array<{ x: number; y: number }>
): string {
  if (data.length === 0) return '';
  
  let path = `M ${data[0].x} ${data[0].y}`;
  
  for (let i = 1; i < data.length; i++) {
    path += ` L ${data[i].x} ${data[i].y}`;
  }
  
  return path;
}

/**
 * Generate separate SVG paths for pre-market, regular hours, and after-hours
 * @param data - Chart data points
 * @param priceScale - Price scale for Y conversion
 * @param getXPosition - Function to get X position for each point
 * @param marketHours - Market hours bounds { regularOpen, regularClose }
 * @returns Object with three path strings
 */
export function generateSessionPaths(
  data: Array<{ timestamp: number; value: number }>,
  priceScale: PriceScale,
  getXPosition: (timestamp: number, index: number) => number,
  marketHours: { regularOpen: number; regularClose: number }
): { preMarket: string; regularHours: string; afterHours: string; lastPoint: { x: number; y: number } } {
  let preMarketPath = '';
  let regularHoursPath = '';
  let afterHoursPath = '';
  let lastPoint = { x: 0, y: 0 };
  
  let lastPreMarketPoint: { x: number; y: number } | null = null;
  let lastRegularPoint: { x: number; y: number } | null = null;
  
  data.forEach((point, index) => {
    const x = getXPosition(point.timestamp, index);
    const y = priceScale.priceToY(point.value);
    
    if (point.timestamp < marketHours.regularOpen) {
      // Pre-market
      if (preMarketPath === '') {
        preMarketPath = `M ${x} ${y}`;
      } else {
        preMarketPath += ` L ${x} ${y}`;
      }
      lastPreMarketPoint = { x, y };
    } else if (point.timestamp <= marketHours.regularClose) {
      // Regular hours
      if (regularHoursPath === '') {
        if (lastPreMarketPoint) {
          // Connect from last pre-market point
          regularHoursPath = `M ${lastPreMarketPoint.x} ${lastPreMarketPoint.y} L ${x} ${y}`;
        } else {
          regularHoursPath = `M ${x} ${y}`;
        }
      } else {
        regularHoursPath += ` L ${x} ${y}`;
      }
      lastRegularPoint = { x, y };
    } else {
      // After-hours
      if (afterHoursPath === '') {
        if (lastRegularPoint) {
          // Connect from last regular hours point
          afterHoursPath = `M ${lastRegularPoint.x} ${lastRegularPoint.y} L ${x} ${y}`;
        } else {
          afterHoursPath = `M ${x} ${y}`;
        }
      } else {
        afterHoursPath += ` L ${x} ${y}`;
      }
    }
    
    // Track last point
    if (index === data.length - 1) {
      lastPoint = { x, y };
    }
  });
  
  return {
    preMarket: preMarketPath,
    regularHours: regularHoursPath,
    afterHours: afterHoursPath,
    lastPoint,
  };
}

// ============================================================================
// Candlestick Calculation Functions
// ============================================================================

/**
 * Calculate candlestick geometry
 * @param candle - OHLC data
 * @param x - X position for the candle
 * @param priceScale - Price scale for Y conversion
 * @param candleWidth - Width of the candle body
 * @returns Candlestick geometry for rendering
 */
export function calculateCandlestickGeometry(
  candle: { open: number; high: number; low: number; close: number },
  x: number,
  priceScale: PriceScale,
  candleWidth: number
): {
  wickX: number;
  wickTop: number;
  wickBottom: number;
  bodyX: number;
  bodyY: number;
  bodyWidth: number;
  bodyHeight: number;
  isGreen: boolean;
} {
  const highY = priceScale.priceToY(candle.high);
  const lowY = priceScale.priceToY(candle.low);
  const openY = priceScale.priceToY(candle.open);
  const closeY = priceScale.priceToY(candle.close);
  
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  const bodyHeight = Math.max(1, bodyBottom - bodyTop); // Minimum 1px height
  
  return {
    wickX: x,
    wickTop: highY,
    wickBottom: lowY,
    bodyX: x - candleWidth / 2,
    bodyY: bodyTop,
    bodyWidth: candleWidth,
    bodyHeight,
    isGreen: candle.close >= candle.open,
  };
}

/**
 * Calculate optimal candle width based on data density
 * @param dataLength - Number of data points
 * @param chartWidth - Total chart width
 * @param minWidth - Minimum candle width (default 1)
 * @param maxWidth - Maximum candle width (default 10)
 * @returns Calculated candle width
 */
export function calculateCandleWidth(
  dataLength: number,
  chartWidth: number,
  minWidth: number = 1,
  maxWidth: number = 10
): number {
  if (dataLength === 0) return maxWidth;
  
  const spacing = chartWidth / dataLength;
  const calculatedWidth = spacing * 0.7; // 70% of available space
  
  return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Determine if chart should show positive (green) or negative (red) styling
 * @param currentPrice - Current price
 * @param previousClose - Previous close price
 * @returns true if positive/green, false if negative/red
 */
export function isChartPositive(
  currentPrice: number,
  previousClose: number | null
): boolean {
  if (previousClose === null) return currentPrice >= 0;
  return currentPrice >= previousClose;
}

/**
 * Get chart color based on direction
 * @param isPositive - Whether showing positive movement
 * @returns CSS color string
 */
export function getChartColor(isPositive: boolean): string {
  return isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
}

/**
 * Get volume bar color based on candle direction
 * @param open - Open price
 * @param close - Close price
 * @param opacity - Opacity value (default 0.5)
 * @returns CSS color string with opacity
 */
export function getVolumeBarColor(open: number, close: number, opacity: number = 0.5): string {
  const isGreen = close >= open;
  return isGreen 
    ? `rgba(0, 200, 5, ${opacity})` 
    : `rgba(255, 80, 0, ${opacity})`;
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Convert simple data points to unified chart points
 * @param data - Array of simple data points
 * @returns Array of unified chart points
 */
export function normalizeToUnifiedPoints(
  data: Array<{ 
    timestamp: number; 
    value: number; 
    volume?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    dayIndex?: number;
  }>
): UnifiedChartPoint[] {
  return data.map((point, index) => ({
    date: new Date(point.timestamp).toISOString(),
    timestamp: point.timestamp,
    close: point.close ?? point.value,
    open: point.open ?? point.value,
    high: point.high ?? point.value,
    low: point.low ?? point.value,
    volume: point.volume ?? 0,
    dayIndex: point.dayIndex ?? index,
  }));
}

/**
 * Downsample data for smoother rendering
 * Used for multi-day views with many data points
 * @param data - Original data array
 * @param targetPoints - Target number of points
 * @returns Downsampled data array
 */
export function downsampleData<T>(
  data: T[],
  targetPoints: number
): T[] {
  if (data.length <= targetPoints) return data;
  
  const step = Math.floor(data.length / targetPoints);
  const downsampled: T[] = [];
  
  for (let i = 0; i < data.length; i += step) {
    downsampled.push(data[i]);
  }
  
  // Always include the last point
  if (downsampled[downsampled.length - 1] !== data[data.length - 1]) {
    downsampled.push(data[data.length - 1]);
  }
  
  return downsampled;
}

/**
 * Aggregate raw intraday data into 5-minute OHLCV candles
 * Used for candlestick charts to convert tick-by-tick data into proper candles
 * Fills in missing time periods with candles using the last known price (zero volume)
 * @param data - Raw intraday data points (can be every trade or every minute)
 * @param intervalMinutes - Candle interval in minutes (default 5)
 * @returns Aggregated OHLCV candles at specified interval with continuous time coverage
 */
export function aggregateIntradayTo5MinCandles(
  data: Array<{ timestamp: number | string; value?: number; open?: number; high?: number; low?: number; close?: number; volume?: number }>,
  intervalMinutes: number = 5
): Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> {
  if (data.length === 0) return [];
  
  const intervalMs = intervalMinutes * 60 * 1000;
  const buckets = new Map<number, Array<typeof data[0]>>();
  
  // Track min and max timestamps to fill gaps
  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;
  
  // Group data points into time buckets
  data.forEach(point => {
    const timestamp = typeof point.timestamp === 'string' 
      ? new Date(point.timestamp).getTime() 
      : point.timestamp;
    
    minTimestamp = Math.min(minTimestamp, timestamp);
    maxTimestamp = Math.max(maxTimestamp, timestamp);
    
    // Round down to nearest interval
    const bucketTime = Math.floor(timestamp / intervalMs) * intervalMs;
    
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, []);
    }
    buckets.get(bucketTime)!.push(point);
  });
  
  // Convert each bucket into an OHLCV candle
  const candles: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> = [];
  
  Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0]) // Sort by timestamp
    .forEach(([bucketTime, points]) => {
      if (points.length === 0) return;
      
      // Extract prices from points (handle both value and OHLC formats)
      const prices = points.map(p => {
        if (p.close !== undefined) return p.close;
        if (p.value !== undefined) return p.value;
        return p.open ?? 0;
      }).filter(p => p > 0);
      
      if (prices.length === 0) return;
      
      // Calculate OHLC
      const open = points[0].open ?? points[0].close ?? points[0].value ?? prices[0];
      const close = points[points.length - 1].close ?? points[points.length - 1].value ?? prices[prices.length - 1];
      const high = Math.max(
        ...points.map(p => p.high ?? p.close ?? p.value ?? 0),
        open,
        close
      );
      const low = Math.min(
        ...points.filter(p => (p.low ?? p.close ?? p.value ?? Infinity) > 0).map(p => p.low ?? p.close ?? p.value ?? Infinity),
        open,
        close
      );
      const volume = points.reduce((sum, p) => sum + (p.volume ?? 0), 0);
      
      candles.push({
        timestamp: bucketTime,
        open,
        high,
        low,
        close,
        volume
      });
    });
  
  // CRITICAL FIX: Fill in missing time periods with flat candles (last known price, zero volume)
  // This ensures even spacing and consistent visual appearance across all stocks
  if (candles.length > 0) {
    const filledCandles: typeof candles = [];
    const startBucket = Math.floor(minTimestamp / intervalMs) * intervalMs;
    const endBucket = Math.floor(maxTimestamp / intervalMs) * intervalMs;
    
    let lastKnownClose = candles[0].close;
    let candleIndex = 0;
    
    // Iterate through all time buckets from start to end
    for (let bucketTime = startBucket; bucketTime <= endBucket; bucketTime += intervalMs) {
      // Check if we have a candle for this bucket
      if (candleIndex < candles.length && candles[candleIndex].timestamp === bucketTime) {
        // We have real data for this bucket
        filledCandles.push(candles[candleIndex]);
        lastKnownClose = candles[candleIndex].close;
        candleIndex++;
      } else {
        // No data for this bucket - create a flat candle with last known price and zero volume
        filledCandles.push({
          timestamp: bucketTime,
          open: lastKnownClose,
          high: lastKnownClose,
          low: lastKnownClose,
          close: lastKnownClose,
          volume: 0
        });
      }
    }
    
    return filledCandles;
  }
  
  return candles;
}

/**
 * Aggregate 5-minute data to 10-minute candlesticks
 * @param data - 5-minute data points
 * @returns 10-minute aggregated candlesticks
 */
export function aggregate5MinTo10MinCandles(
  data: Array<{ timestamp: number; value: number; open?: number; high?: number; low?: number; close?: number; volume?: number }>
): Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> {
  const aggregated: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> = [];
  
  for (let i = 0; i < data.length; i += 2) {
    const chunk = data.slice(i, i + 2);
    if (chunk.length === 0) continue;
    
    const open = chunk[0].open ?? chunk[0].value;
    const close = chunk[chunk.length - 1].close ?? chunk[chunk.length - 1].value;
    const high = Math.max(...chunk.map(p => p.high ?? p.value));
    const low = Math.min(...chunk.map(p => p.low ?? p.value));
    const volume = chunk.reduce((sum, p) => sum + (p.volume || 0), 0);
    
    aggregated.push({
      timestamp: chunk[0].timestamp,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  
  return aggregated;
}
