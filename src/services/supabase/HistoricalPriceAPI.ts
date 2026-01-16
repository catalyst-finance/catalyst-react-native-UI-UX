/**
 * HistoricalPriceAPI - Fetch historical price data for different time ranges
 * 
 * Data sources by time range:
 * - 1D: five_minute_prices (5-minute intervals)
 * - 1W: five_minute_prices (5-minute intervals)
 * - 1M: hourly_prices (1-hour intervals)
 * - 3M, YTD, 1Y, 5Y: daily_prices (daily intervals)
 * 
 * Includes in-memory caching for smooth slider performance.
 */

import { supabase } from './client';

export interface HistoricalDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  value: number; // Close price
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  session?: string; // Only for intraday data
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y';

interface StockSplit {
  symbol: string;
  split_date: string;
  from_factor: number;
  to_factor: number;
  split_ratio: number;
}

// Cache entry with timestamp for expiration
interface CacheEntry {
  data: HistoricalDataPoint[];
  fetchedAt: number;
}

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  '1D': 60 * 1000,        // 1 minute for intraday
  '1W': 5 * 60 * 1000,    // 5 minutes for weekly
  '1M': 15 * 60 * 1000,   // 15 minutes for monthly
  '3M': 30 * 60 * 1000,   // 30 minutes for 3 months
  'YTD': 30 * 60 * 1000,  // 30 minutes for YTD
  '1Y': 60 * 60 * 1000,   // 1 hour for yearly
  '5Y': 60 * 60 * 1000,   // 1 hour for 5 years
};

class HistoricalPriceAPIClass {
  // In-memory cache: symbol -> timeRange -> CacheEntry
  private cache: Map<string, Map<TimeRange, CacheEntry>> = new Map();
  
  // Track ongoing fetches to prevent duplicate requests
  private pendingFetches: Map<string, Promise<HistoricalDataPoint[]>> = new Map();

  /**
   * Get cache key for a symbol and time range
   */
  private getCacheKey(symbol: string, timeRange: TimeRange): string {
    return `${symbol}:${timeRange}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(symbol: string, timeRange: TimeRange): boolean {
    const symbolCache = this.cache.get(symbol);
    if (!symbolCache) return false;
    
    const entry = symbolCache.get(timeRange);
    if (!entry) return false;
    
    const now = Date.now();
    const expiration = CACHE_EXPIRATION[timeRange] || 60 * 1000;
    return (now - entry.fetchedAt) < expiration;
  }

  /**
   * Get cached data if valid
   */
  private getCachedData(symbol: string, timeRange: TimeRange): HistoricalDataPoint[] | null {
    if (!this.isCacheValid(symbol, timeRange)) return null;
    
    const symbolCache = this.cache.get(symbol);
    return symbolCache?.get(timeRange)?.data || null;
  }

  /**
   * Store data in cache
   */
  private setCachedData(symbol: string, timeRange: TimeRange, data: HistoricalDataPoint[]): void {
    if (!this.cache.has(symbol)) {
      this.cache.set(symbol, new Map());
    }
    
    this.cache.get(symbol)!.set(timeRange, {
      data,
      fetchedAt: Date.now(),
    });
  }

  /**
   * Clear cache for a specific symbol (useful for refresh)
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.delete(symbol);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Preload all time ranges for a symbol (for smooth slider experience)
   * Returns a promise that resolves when all data is loaded
   */
  async preloadAllTimeRanges(symbol: string): Promise<void> {
    const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'];
    
    // Fetch all time ranges in parallel
    await Promise.all(
      timeRanges.map(range => this.fetchHistoricalData(symbol, range))
    );
    
    console.log(`✅ [HistoricalPriceAPI] Preloaded all time ranges for ${symbol}`);
  }

  /**
   * Check if all time ranges are cached for a symbol
   */
  isFullyCached(symbol: string): boolean {
    const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'];
    return timeRanges.every(range => this.isCacheValid(symbol, range));
  }
  /**
   * Fetch stock splits for a symbol within a date range
   */
  private async fetchStockSplits(symbol: string, startDate: Date): Promise<StockSplit[]> {
    const { data, error } = await supabase
      .from('stock_splits')
      .select('*')
      .eq('symbol', symbol)
      .gte('split_date', startDate.toISOString().split('T')[0])
      .order('split_date', { ascending: true });

    if (error) {
      console.error('❌ [HistoricalPriceAPI] Error fetching stock splits:', error);
      return [];
    }

    return (data || []).map(row => ({
      symbol: row.symbol,
      split_date: row.split_date,
      from_factor: parseFloat(row.from_factor),
      to_factor: parseFloat(row.to_factor),
      split_ratio: parseFloat(row.split_ratio),
    }));
  }

  /**
   * Adjust historical prices for stock splits
   * Prices before a split are divided by the split ratio to make them comparable
   */
  private adjustForSplits(
    data: HistoricalDataPoint[],
    splits: StockSplit[]
  ): HistoricalDataPoint[] {
    if (splits.length === 0) return data;

    // Sort splits by date (oldest first)
    const sortedSplits = [...splits].sort((a, b) => 
      new Date(a.split_date).getTime() - new Date(b.split_date).getTime()
    );

    return data.map(point => {
      const pointDate = new Date(point.timestamp);
      
      // Calculate cumulative adjustment factor for all splits after this data point
      let adjustmentFactor = 1;
      for (const split of sortedSplits) {
        const splitDate = new Date(split.split_date);
        if (pointDate < splitDate) {
          // This data point is before the split, so adjust it
          adjustmentFactor *= split.split_ratio;
        }
      }

      // Apply adjustment to all price fields
      if (adjustmentFactor !== 1) {
        return {
          ...point,
          value: point.value / adjustmentFactor,
          open: point.open ? point.open / adjustmentFactor : undefined,
          high: point.high ? point.high / adjustmentFactor : undefined,
          low: point.low ? point.low / adjustmentFactor : undefined,
          close: point.close ? point.close / adjustmentFactor : undefined,
        };
      }

      return point;
    });
  }

  /**
   * Fetch historical price data for a given symbol and time range
   * Uses caching to avoid redundant API calls
   */
  async fetchHistoricalData(
    symbol: string,
    timeRange: TimeRange
  ): Promise<HistoricalDataPoint[]> {
    // Check cache first
    const cachedData = this.getCachedData(symbol, timeRange);
    if (cachedData) {
      return cachedData;
    }

    // Check if there's already a pending fetch for this symbol/range
    const cacheKey = this.getCacheKey(symbol, timeRange);
    const pendingFetch = this.pendingFetches.get(cacheKey);
    if (pendingFetch) {
      return pendingFetch;
    }

    // Create the fetch promise
    const fetchPromise = this.fetchHistoricalDataInternal(symbol, timeRange);
    this.pendingFetches.set(cacheKey, fetchPromise);

    try {
      const data = await fetchPromise;
      // Cache the result
      this.setCachedData(symbol, timeRange, data);
      return data;
    } finally {
      // Clean up pending fetch
      this.pendingFetches.delete(cacheKey);
    }
  }

  /**
   * Internal method to actually fetch historical data from the API
   */
  private async fetchHistoricalDataInternal(
    symbol: string,
    timeRange: TimeRange
  ): Promise<HistoricalDataPoint[]> {
    try {
      // Determine the start date for the time range
      const now = new Date();
      let startDate = new Date(now);
      
      switch (timeRange) {
        case '1D':
          startDate.setDate(now.getDate() - 1);
          break;
        case '1W':
          startDate.setDate(now.getDate() - 7);
          break;
        case '1M':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'YTD':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case '1Y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case '5Y':
          startDate.setFullYear(now.getFullYear() - 5);
          break;
      }

      // Fetch splits for this time range
      const splits = await this.fetchStockSplits(symbol, startDate);

      // Fetch price data
      let data: HistoricalDataPoint[];
      switch (timeRange) {
        case '1D':
          data = await this.fetchFiveMinuteData(symbol);
          break;
        case '1W':
          data = await this.fetchWeeklyHourlyData(symbol);
          break;
        case '1M':
          data = await this.fetchHourlyData(symbol);
          break;
        case '3M':
          data = await this.fetchDailyData(symbol, 90);
          break;
        case 'YTD':
          data = await this.fetchYTDData(symbol);
          break;
        case '1Y':
          data = await this.fetchDailyData(symbol, 365);
          break;
        case '5Y':
          data = await this.fetchDailyData(symbol, 365 * 5);
          break;
        default:
          throw new Error(`Unsupported time range: ${timeRange}`);
      }

      // Apply split adjustments
      return this.adjustForSplits(data, splits);
    } catch (error) {
      console.error(`❌ [HistoricalPriceAPI] Error fetching ${timeRange} data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Fetch 1D data (5-minute intervals)
   * Limit to today's trading session in ET timezone
   * Between 12:00 AM and 4:00 AM ET (before pre-market), show previous day's data
   */
  private async fetchFiveMinuteData(symbol: string): Promise<HistoricalDataPoint[]> {
    // Get current time
    const now = new Date();
    
    // Get current hour in ET using Intl
    const etHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(now);
    const etHour = parseInt(etHourStr, 10);
    
    // Check if we're in the overnight period (12:00 AM - 4:00 AM ET)
    // Pre-market starts at 4:00 AM ET, so before that we should show previous day
    const isOvernightPeriod = etHour < 4;
    
    // Get today's date in ET
    const etDateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    
    let year = parseInt(etDateParts.find(p => p.type === 'year')?.value || '2026', 10);
    let month = parseInt(etDateParts.find(p => p.type === 'month')?.value || '01', 10);
    let day = parseInt(etDateParts.find(p => p.type === 'day')?.value || '01', 10);
    
    // If overnight, go back one day
    if (isOvernightPeriod) {
      const tempDate = new Date(year, month - 1, day);
      tempDate.setDate(tempDate.getDate() - 1);
      year = tempDate.getFullYear();
      month = tempDate.getMonth() + 1;
      day = tempDate.getDate();
    }
    
    // Create start of day in UTC (midnight ET = 5:00 AM UTC for EST)
    // Using Date.UTC to avoid any local timezone issues
    const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
    const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('five_minute_prices')
      .select('timestamp, open, high, low, close, volume, session')
      .eq('symbol', symbol)
      .gte('timestamp', startOfDayUTC.toISOString())
      .lt('timestamp', endOfDayUTC.toISOString())
      .order('timestamp', { ascending: true })
      .limit(200); // ~16 hours × 12 intervals = 192 points

    if (error) {
      console.error('❌ [HistoricalPriceAPI] Error fetching 5-minute data:', error);
      return [];
    }

    return (data || []).map(row => ({
      timestamp: new Date(row.timestamp).getTime(),
      value: row.close,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      session: row.session || 'regular', // Use session from database
    }));
  }

  /**
   * Fetch 1W data (5-minute intervals)
   * Limit to last 7 days
   */
  private async fetchWeeklyHourlyData(symbol: string): Promise<HistoricalDataPoint[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('five_minute_prices')
      .select('timestamp, open, high, low, close, volume, session')
      .eq('symbol', symbol)
      .gte('timestamp', oneWeekAgo.toISOString())
      .order('timestamp', { ascending: true })
      .limit(2000); // ~7 days × 12 hours × 12 intervals = ~1000 points

    if (error) {
      console.error('❌ [HistoricalPriceAPI] Error fetching 1W 5-minute data:', error);
      return [];
    }

    return (data || []).map(row => ({
      timestamp: new Date(row.timestamp).getTime(),
      value: row.close,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      session: row.session, // Include session from database
    }));
  }

  /**
   * Fetch 1M data (hourly intervals)
   * Limit to last 30 days
   */
  private async fetchHourlyData(symbol: string): Promise<HistoricalDataPoint[]> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data, error } = await supabase
      .from('hourly_prices')
      .select('timestamp, open, high, low, close, volume, session')
      .eq('symbol', symbol)
      .gte('timestamp', oneMonthAgo.toISOString())
      .order('timestamp', { ascending: true })
      .limit(500); // ~30 days × 12 hours = 360 points

    if (error) {
      console.error('❌ [HistoricalPriceAPI] Error fetching hourly data:', error);
      return [];
    }

    return (data || []).map(row => ({
      timestamp: new Date(row.timestamp).getTime(),
      value: row.close,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      session: row.session, // Include session from database
    }));
  }

  /**
   * Fetch daily data for 3M, 1Y, 5Y
   * Limit based on expected data points
   */
  private async fetchDailyData(symbol: string, days: number): Promise<HistoricalDataPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('daily_prices')
      .select('date, open, high, low, close, volume')
      .eq('symbol', symbol)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(days + 10); // Add buffer for weekends/holidays

    if (error) {
      console.error('❌ [HistoricalPriceAPI] Error fetching daily data:', error);
      return [];
    }

    return (data || []).map(row => ({
      timestamp: new Date(row.date).getTime(),
      value: row.close,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    }));
  }

  /**
   * Fetch YTD data (from January 1st of current year)
   * If less than 3 months have elapsed, use hourly_prices (same table as 1M)
   * Otherwise use daily_prices
   */
  private async fetchYTDData(symbol: string): Promise<HistoricalDataPoint[]> {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysElapsed = Math.floor((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // If less than 90 days (3 months) have elapsed, use hourly_prices (same as 1M)
    if (daysElapsed < 90) {
      console.log(`📊 [HistoricalPriceAPI] YTD < 3 months (${daysElapsed} days), using hourly_prices from year start`);
      
      const { data, error } = await supabase
        .from('hourly_prices')
        .select('timestamp, open, high, low, close, volume, session')
        .eq('symbol', symbol)
        .gte('timestamp', yearStart.toISOString())
        .order('timestamp', { ascending: true })
        .limit(2500); // ~90 days × 12 hours = 1,080 points

      if (error) {
        console.error('❌ [HistoricalPriceAPI] Error fetching YTD hourly data:', error);
        return [];
      }

      return (data || []).map(row => ({
        timestamp: new Date(row.timestamp).getTime(),
        value: row.close,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        session: row.session, // Include session from database
      }));
    }
    
    // Otherwise, use daily_prices from year start
    console.log(`📊 [HistoricalPriceAPI] YTD >= 3 months (${daysElapsed} days), using daily_prices from year start`);
    
    const { data, error } = await supabase
      .from('daily_prices')
      .select('date, open, high, low, close, volume')
      .eq('symbol', symbol)
      .gte('date', yearStart.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(400); // Max ~365 days

    if (error) {
      console.error('❌ [HistoricalPriceAPI] Error fetching YTD daily data:', error);
      return [];
    }

    return (data || []).map(row => ({
      timestamp: new Date(row.date).getTime(),
      value: row.close,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    }));
  }
}

export const HistoricalPriceAPI = new HistoricalPriceAPIClass();
export default HistoricalPriceAPI;
