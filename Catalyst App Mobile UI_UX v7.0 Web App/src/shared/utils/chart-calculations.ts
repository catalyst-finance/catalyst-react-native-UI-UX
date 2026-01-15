/**
 * Platform-agnostic chart calculation utilities
 * Pure functions with no DOM or React Native dependencies
 * Can be used in both web and native implementations
 */

import type { 
  PricePoint, 
  ChartCalculations, 
  CandlestickData,
  ChartViewport 
} from '../types/chart.types';

/**
 * Calculate basic statistics for a price dataset
 */
export function calculateChartStatistics(data: PricePoint[]): ChartCalculations {
  if (data.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 0,
      priceRange: 0,
      avgPrice: 0,
      volatility: 0,
      trend: 'sideways',
    };
  }

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  // Calculate volatility (standard deviation)
  const variance = prices.reduce((sum, price) => 
    sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
  const volatility = Math.sqrt(variance);

  // Determine trend
  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const priceChangePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  let trend: 'up' | 'down' | 'sideways';
  if (priceChangePercent > 1) trend = 'up';
  else if (priceChangePercent < -1) trend = 'down';
  else trend = 'sideways';

  return {
    minPrice,
    maxPrice,
    priceRange,
    avgPrice,
    volatility,
    trend,
  };
}

/**
 * Convert OHLC data to candlestick format
 */
export function convertToCandlestickData(data: PricePoint[]): CandlestickData[] {
  return data
    .filter(d => d.open !== undefined && d.high !== undefined && 
                 d.low !== undefined && d.close !== undefined)
    .map(d => ({
      timestamp: d.timestamp,
      open: d.open!,
      high: d.high!,
      low: d.low!,
      close: d.close!,
      volume: d.volume,
      bullish: d.close! >= d.open!,
    }));
}

/**
 * Calculate viewport split for past/future sections
 */
export function calculateViewportSplit(
  totalWidth: number,
  pastPercent: number,
  showFutureSection: boolean
): ChartViewport {
  if (!showFutureSection) {
    return {
      pastSection: {
        startX: 0,
        endX: totalWidth,
        width: totalWidth,
        widthPercent: 100,
      },
      futureSection: {
        startX: totalWidth,
        endX: totalWidth,
        width: 0,
        widthPercent: 0,
      },
      totalWidth,
    };
  }

  const pastWidth = (totalWidth * pastPercent) / 100;
  const futurePercent = 100 - pastPercent;
  const futureWidth = totalWidth - pastWidth;

  return {
    pastSection: {
      startX: 0,
      endX: pastWidth,
      width: pastWidth,
      widthPercent: pastPercent,
    },
    futureSection: {
      startX: pastWidth,
      endX: totalWidth,
      width: futureWidth,
      widthPercent: futurePercent,
    },
    totalWidth,
  };
}

/**
 * Calculate moving average for a dataset
 */
export function calculateMovingAverage(
  data: PricePoint[],
  period: number
): PricePoint[] {
  if (data.length < period) return [];

  const result: PricePoint[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, d) => sum + d.price, 0) / period;
    
    result.push({
      timestamp: data[i].timestamp,
      price: avg,
    });
  }

  return result;
}

/**
 * Calculate price scale for Y-axis
 */
export function calculatePriceScale(
  minPrice: number,
  maxPrice: number,
  tickCount: number = 5
): number[] {
  const range = maxPrice - minPrice;
  const step = range / (tickCount - 1);
  
  return Array.from({ length: tickCount }, (_, i) => 
    minPrice + (step * i)
  );
}

/**
 * Find nearest data point to a given timestamp
 */
export function findNearestPoint(
  data: PricePoint[],
  targetTimestamp: number
): PricePoint | null {
  if (data.length === 0) return null;

  let nearest = data[0];
  let minDiff = Math.abs(data[0].timestamp - targetTimestamp);

  for (const point of data) {
    const diff = Math.abs(point.timestamp - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = point;
    }
  }

  return nearest;
}

/**
 * Filter data points within a time range
 */
export function filterDataByTimeRange(
  data: PricePoint[],
  startTimestamp: number,
  endTimestamp: number
): PricePoint[] {
  return data.filter(d => 
    d.timestamp >= startTimestamp && d.timestamp <= endTimestamp
  );
}

/**
 * Downsample data for performance (use every Nth point)
 */
export function downsampleData(
  data: PricePoint[],
  maxPoints: number
): PricePoint[] {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
}

/**
 * Calculate percentage change between two prices
 */
export function calculatePercentageChange(
  oldPrice: number,
  newPrice: number
): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Format large numbers (e.g., market cap)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

/**
 * Interpolate between two values
 */
export function interpolate(
  start: number,
  end: number,
  progress: number
): number {
  return start + (end - start) * progress;
}

/**
 * Check if a point is within viewport bounds
 */
export function isPointInViewport(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number
): boolean {
  return x >= 0 && x <= viewportWidth && y >= 0 && y <= viewportHeight;
}
