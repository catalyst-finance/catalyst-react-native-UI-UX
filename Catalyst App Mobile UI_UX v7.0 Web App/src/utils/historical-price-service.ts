/**
 * Historical Price Service
 * 
 * This service provides historical stock price data for charts with the following data source priority:
 * 
 * 1. **Memory Cache** - Fast in-memory cache for recently fetched data
 * 2. **Supabase daily_prices table** (for daily timeframe) - Up to 3 years of historical daily prices
 * 3. **Finnhub API** (via server) - Real-time and intraday data when not available in database
 * 4. **Mock Data** - Fallback when all other sources fail
 * 
 * The daily_prices table is the primary source for daily historical data and contains:
 * - symbol, date, open, high, low, close, volume
 * - Up to 3 years of historical data per symbol
 * - Optimized for batch fetching multiple symbols
 */

import { projectId, publicAnonKey } from './supabase/info';
import StockAPI from './supabase/stock-api';
import { supabase } from './supabase/client';
import { isTodayHoliday, getHolidayName, getMarketStatus } from './market-status';
import { adjustPricesForSplits as applyStockSplitAdjustments } from './stock-split-adjuster';

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session?: string; // Session type: pre-market, regular, after-hours
}

export interface ChartData {
  symbol: string;
  prices: HistoricalPrice[];
  timeframe: 'daily' | 'hourly' | '5min' | 'intraday' | '10min';
  fromDate: string;
  toDate: string;
  cached: boolean;
  source: 'database' | 'api' | 'mock';
}

class HistoricalPriceService {
  private static cache = new Map<string, { data: ChartData; timestamp: number }>();
  private static cacheTimeout = 2 * 60 * 1000; // Reduced to 2 minutes for faster testing
  private static cacheVersion = 'v5-stock-splits'; // Version identifier to invalidate old cache

  // Helper to adjust prices for stock splits
  private static async adjustPricesForSplits(
    symbol: string,
    prices: HistoricalPrice[]
  ): Promise<HistoricalPrice[]> {
    try {
      // Fetch stock splits for this symbol
      const splits = await StockAPI.getStockSplits(symbol);
      
      if (splits.length === 0) {
        // No splits, return prices as-is
        return prices;
      }

      console.log(`[${symbol}] Found ${splits.length} stock split(s), adjusting historical prices...`);
      
      // Apply split adjustments
      const adjustedPrices = applyStockSplitAdjustments(prices, splits);
      
      console.log(`[${symbol}] Split adjustment complete`);
      
      return adjustedPrices;
    } catch (error) {
      console.error(`[${symbol}] Error applying stock split adjustments:`, error);
      // On error, return original prices
      return prices;
    }
  }

  // Helper function to get from cache
  private static getFromCache(key: string): ChartData | null {
    const versionedKey = `${this.cacheVersion}-${key}`;
    const cached = this.cache.get(versionedKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { ...cached.data, cached: true };
    }
    return null;
  }

  // Helper function to set cache
  private static setCache(key: string, data: ChartData): void {
    const versionedKey = `${this.cacheVersion}-${key}`;
    this.cache.set(versionedKey, { data: { ...data, cached: false }, timestamp: Date.now() });
  }

  // Get historical data from server (which will use Finnhub API)
  private static async fetchFromServer(
    symbol: string, 
    resolution: string, 
    from: number, 
    to: number
  ): Promise<HistoricalPrice[]> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d2b7a00e/historical-prices`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            resolution,
            from,
            to
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Server response: ${response.status}`);
      }

      const data = await response.json();
      return data.prices || [];
    } catch (error) {
      throw error;
    }
  }

  // Cache historical data in database (optional)
  private static async cacheInDatabase(symbol: string, prices: HistoricalPrice[]): Promise<void> {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d2b7a00e/cache-historical-prices`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            prices
          })
        }
      );
    } catch (error) {
      // Failed to cache in database (non-critical)
    }
  }

  // Get prices from daily_prices table
  private static async getPricesFromDailyTable(
    symbol: string, 
    fromDate: string, 
    toDate: string
  ): Promise<HistoricalPrice[]> {
    try {
      const prices = await StockAPI.getDailyPrices(symbol, fromDate, toDate);
      return prices;
    } catch (error) {
      return [];
    }
  }

  // Get intraday prices and convert to HistoricalPrice format
  private static async getIntradayPrices(
    symbol: string,
    fromTimestamp: string,
    toTimestamp: string
  ): Promise<HistoricalPrice[]> {
    try {
      // Use one_minute_prices table for VWAP data (more accurate than intraday_prices)
      const intradayData = await StockAPI.getOneMinutePrices(symbol, fromTimestamp, toTimestamp);
      
      // Convert minute-by-minute intraday data to HistoricalPrice format
      // Group by date and aggregate to OHLCV
      const dateMap = new Map<string, {
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        prices: number[];
      }>();

      intradayData.forEach(point => {
        const date = point.timestamp.split('T')[0]; // Extract date part
        const price = point.close; // Use close price from OHLCV data

        if (!dateMap.has(date)) {
          dateMap.set(date, {
            open: point.open || price,
            high: point.high || price,
            low: point.low || price,
            close: price,
            volume: point.volume || 0,
            prices: []
          });
        }

        const dayData = dateMap.get(date)!;
        dayData.high = Math.max(dayData.high, point.high || price);
        dayData.low = Math.min(dayData.low, point.low || price);
        dayData.close = price; // Last price becomes close
        dayData.volume += point.volume || 0;
        dayData.prices.push(price);
      });

      // Convert map to array
      const prices: HistoricalPrice[] = [];
      dateMap.forEach((data, date) => {
        prices.push({
          date,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume
        });
      });

      // Sort by date
      prices.sort((a, b) => a.date.localeCompare(b.date));

      return prices;
    } catch (error) {
      return [];
    }
  }

  // Get raw intraday prices from intraday_prices table
  private static async getIntradayPricesRaw(
    symbol: string,
    fromTimestamp: string,
    toTimestamp: string,
    limit?: number,
    sampleRate?: number,
    days?: number // NEW: Pass days to determine granularity
  ): Promise<HistoricalPrice[]> {
    try {
      console.log(`[${symbol}] getIntradayPricesRaw called: fromTimestamp=${fromTimestamp}, toTimestamp=${toTimestamp}, days=${days}`);
      
      let prices;
      
      // DECISION LOGIC:
      // - 1D view (days=1): Use raw intraday_prices for maximum detail and real-time websocket data
      // - 1W+ view (days>1): Use aggregated five_minute_prices for cleaner multi-day visualization
      
      if (days === 1) {
        // 1D VIEW AND MINI CHARTS: Try five_minute_prices first (faster, pre-aggregated)
        // Fallback to raw intraday_prices only if needed
        console.log(`[${symbol}] Attempting to use five_minute_prices for 1D view (faster than raw intraday_prices)...`);
        
        prices = await StockAPI.getFiveMinutePrices(symbol, fromTimestamp, toTimestamp);
        console.log(`[${symbol}] five_minute_prices returned ${prices.length} rows`);
        
          // If five_minute_prices is empty or insufficient, fall back to raw intraday_prices
        if (prices.length < 10) {
          console.log(`[${symbol}] five_minute_prices insufficient (${prices.length} rows), falling back to raw intraday_prices`);
          
          // Use the provided fromTimestamp directly instead of constraining to last 24 hours
          // This allows fetching data for previous trading days (e.g., on holidays/weekends)
          // The caller (getHistoricalPrices) has already calculated the correct fromTimestamp
          const constrainedFromTimestamp = fromTimestamp;
          
          console.log(`[${symbol}] Querying raw intraday prices: ${constrainedFromTimestamp} to ${toTimestamp}`);
          
          const rawPrices = await StockAPI.getIntradayPrices(symbol, constrainedFromTimestamp, toTimestamp, limit || 500, sampleRate || 5);
          console.log(`[${symbol}] intraday_prices returned ${rawPrices.length} raw prices`);
          
          // Convert raw intraday prices to the format expected by the rest of the code
          prices = rawPrices.map(p => ({
            timestamp: p.timestamp,
            timestamp_et: p.timestamp, // Same for raw data
            price: p.price,
            open: p.price, // Use price as OHLC since raw data doesn't have OHLC
            high: p.price,
            low: p.price,
            close: p.price,
            volume: p.volume,
            session: p.session, // Pass through session field
            isRawData: true // Mark as raw data to skip stale quote filter
          })) as any;
          
          console.log(`[${symbol}] Converted ${prices.length} raw prices to OHLC format`);
        } else {
          console.log(`[${symbol}] Successfully using five_minute_prices for 1D view (${prices.length} bars)`);
        }
      } else {
        // MULTI-DAY VIEW (1W+): Use aggregated five_minute_prices
        console.log(`[${symbol}] Using five_minute_prices for multi-day view (${days} days)`);
        
        prices = await StockAPI.getFiveMinutePrices(symbol, fromTimestamp, toTimestamp);
        console.log(`[${symbol}] five_minute_prices returned ${prices.length} rows`);

        // Check how many are stale quotes BEFORE filtering
        const staleCount = prices.filter(point => 
          point.open === point.high && 
          point.high === point.low && 
          point.low === point.close &&
          point.close === point.price
        ).length;
        
        const stalePercentage = prices.length > 0 ? (staleCount / prices.length) * 100 : 0;
        console.log(`[${symbol}] Stale quote analysis: ${staleCount}/${prices.length} (${stalePercentage.toFixed(1)}%) are stale`);

        // FALLBACK: If five_minute_prices table is empty OR mostly stale (>50%), use raw intraday_prices
        if (prices.length === 0 || stalePercentage > 50) {
          if (prices.length === 0) {
            console.log(`[${symbol}] five_minute_prices is empty, falling back to intraday_prices`);
          } else {
            console.log(`[${symbol}] five_minute_prices is ${stalePercentage.toFixed(1)}% stale (>${50}% threshold), falling back to intraday_prices`);
          }
          
          // For multi-day fallback, constrain to reasonable time range to prevent timeout
          const now = new Date();
          const maxDaysBack = Math.min(days, 7); // Max 7 days for fallback
          const constrainedFromTimestamp = new Date(now.getTime() - maxDaysBack * 24 * 60 * 60 * 1000).toISOString();
          console.log(`[${symbol}] Constraining fallback query to ${maxDaysBack} days: ${constrainedFromTimestamp} to ${toTimestamp}`);
          
          const rawPrices = await StockAPI.getIntradayPrices(symbol, constrainedFromTimestamp, toTimestamp, limit || 1000, sampleRate || 5);
          
          console.log(`[${symbol}] intraday_prices returned ${rawPrices.length} raw prices`);
          
          // Convert raw intraday prices to the format expected by the rest of the code
          prices = rawPrices.map(p => ({
            timestamp: p.timestamp,
            timestamp_et: p.timestamp, // Same for raw data
            price: p.price,
            open: p.price, // Use price as OHLC since raw data doesn't have OHLC
            high: p.price,
            low: p.price,
            close: p.price,
            volume: p.volume,
            session: p.session, // Pass through session field
            isRawData: true // Mark as raw data to skip stale quote filter
          })) as any;
          
          console.log(`[${symbol}] Converted ${prices.length} raw prices to OHLC format (marked as isRawData)`);
        }
      }
      
      if (prices.length === 0) {
        console.log(`[${symbol}] No data available`);
        return [];
      }
      
      console.log(`[${symbol}] Before filtering: ${prices.length} prices`);
      
      // Filter for market hours based on view:
      // - 1W view: Only regular market hours (9:30 AM - 4:00 PM ET)
      // - 1D view and mini charts: Extended hours (8:00 AM - 8:00 PM ET)
      const currentTime = Date.now(); // Get current time to filter out future data
      const marketHoursData = prices.filter(point => {
        const timestamp = new Date(point.timestamp);
        
        // Skip corrupted timestamps (before year 2000)
        if (timestamp.getFullYear() < 2000) {
          return false;
        }
        
        // Skip future timestamps - only show data that has already occurred
        if (timestamp.getTime() > currentTime) {
          return false;
        }
        
        // Parse timestamp_et: it's stored as ET time but with +00 timezone marker
        // e.g., "2025-12-05 09:30:00+00" means 9:30 AM ET (not UTC!)
        // Strip the timezone and parse the hour/minute directly from the string
        let hour: number;
        let minute: number;
        
        if (point.timestamp_et && point.timestamp_et.length >= 16) {
          // Standard case: parse string directly "YYYY-MM-DD HH:MM..."
          hour = parseInt(point.timestamp_et.substring(11, 13), 10);
          minute = parseInt(point.timestamp_et.substring(14, 16), 10);
        } else {
          // Fallback case (e.g. raw data fallback): Convert timestamp to ET using locale
          // This handles cases where timestamp_et is missing or just a copy of UTC timestamp
          const etTime = new Date(timestamp.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          hour = etTime.getHours();
          minute = etTime.getMinutes();
        }
        
        // Get day of week from the UTC timestamp for weekend check
        const day = timestamp.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip weekends
        if (day === 0 || day === 6) {
          return false;
        }
        
        // Apply different hour filters based on whether this is 1W view or 1D view
        if (days && days > 1) {
          // 1W view: Only regular market hours (9:30 AM - 4:00 PM ET)
          const isAfterOpen = hour > 9 || (hour === 9 && minute >= 30);
          const isBeforeClose = hour < 16;
          
          if (!isAfterOpen || !isBeforeClose) {
            return false;
          }
        } else {
          // 1D view and mini charts: Extended hours (8:00 AM - 8:00 PM ET)
          if (hour < 8 || hour >= 20) {
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`[${symbol}] After market hours filtering: ${marketHoursData.length} prices`);
      
      // Calculate average volume from non-null volume points
      const validVolumes = marketHoursData
        .map(p => p.volume)
        .filter(v => v !== null && v !== undefined && v > 0);
      
      const avgVolume = validVolumes.length > 0
        ? validVolumes.reduce((sum, v) => sum + v, 0) / validVolumes.length
        : 100;
      
      // Filter out stale quotes (where all OHLC are identical)
      // BUT: Skip this filter for raw data from intraday_prices fallback
      const filteredPrices = marketHoursData.filter(point => {
        // If this is raw data from the fallback, don't filter it out
        if ((point as any).isRawData) {
          return true;
        }
        
        // Skip if all OHLC values are identical AND volume is 0 or null (true stale quote)
        // NOTE: In pre-market/low-volume trading, OHLC can legitimately be identical with volume > 0
        if (point.open === point.high && 
            point.high === point.low && 
            point.low === point.close &&
            point.close === point.price &&
            (!point.volume || point.volume === 0)) {
          return false;
        }
        return true;
      });

      console.log(`[${symbol}] After stale quote filtering: ${filteredPrices.length} prices (${marketHoursData.length - filteredPrices.length} stale quotes removed)`);
      
      // Convert to HistoricalPrice format
      const historicalPrices = filteredPrices.map(point => ({
        date: point.timestamp,
        open: point.open || point.price,
        high: point.high || point.price,
        low: point.low || point.price,
        close: point.close, // Use close from OHLC data
        volume: (point.volume && point.volume > 0) ? point.volume : avgVolume,
        session: point.session // Pass through session field
      }));

      console.log(`[${symbol}] Final result: ${historicalPrices.length} historical prices`);
      
      return historicalPrices;
    } catch (error) {
      console.error('Error in getIntradayPricesRaw:', error);
      return [];
    }
  }

  // Get hourly prices from hourly_prices table
  private static async getHourlyPrices(
    symbol: string,
    fromTimestamp: string,
    toTimestamp: string
  ): Promise<HistoricalPrice[]> {
    try {
      const hourlyData = await StockAPI.getHourlyPrices(symbol, fromTimestamp, toTimestamp);
      
      // Filter for regular market hours (9:30 AM - 4:00 PM ET) and weekdays only
      const filteredData = hourlyData.filter(point => {
        const timestamp = new Date(point.timestamp);
        
        // Skip corrupted timestamps (before year 2000)
        if (timestamp.getFullYear() < 2000) {
          return false;
        }
        
        // Convert to ET and check market hours
        const etTime = new Date(timestamp.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const hour = etTime.getHours();
        const minute = etTime.getMinutes();
        const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip weekends
        if (day === 0 || day === 6) {
          return false;
        }
        
        // Regular market hours: 9:30 AM - 4:00 PM ET
        const isAfterOpen = hour > 9 || (hour === 9 && minute >= 30);
        const isBeforeClose = hour < 16;
        
        return isAfterOpen && isBeforeClose;
      });
      
      // Convert to HistoricalPrice format
      const prices = filteredData.map(point => ({
        date: point.timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
      }));
      
      return prices;
    } catch (error) {
      console.error('Error in getHourlyPrices:', error);
      return [];
    }
  }

  // Get 5-minute prices from five_minute_prices table
  private static async getFiveMinutePrices(
    symbol: string,
    fromTimestamp: string,
    toTimestamp: string
  ): Promise<HistoricalPrice[]> {
    try {
      const fiveMinData = await StockAPI.getFiveMinutePrices(symbol, fromTimestamp, toTimestamp);
      
      // Filter for ALL tradeable hours (8:00 AM - 8:00 PM ET) and weekdays only
      const filteredData = fiveMinData.filter(point => {
        const timestamp = new Date(point.timestamp);
        
        // Skip corrupted timestamps (before year 2000)
        if (timestamp.getFullYear() < 2000) {
          return false;
        }
        
        // Convert to ET and check tradeable hours
        const etTime = new Date(timestamp.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const hour = etTime.getHours();
        const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip weekends
        if (day === 0 || day === 6) {
          return false;
        }
        
        // ALL tradeable hours: 8:00 AM - 8:00 PM ET (includes pre-market, regular, and after-hours)
        const isDuringTradeableHours = hour >= 8 && hour < 20;
        
        return isDuringTradeableHours;
      });
      
      // Convert to HistoricalPrice format
      const prices = filteredData.map(point => ({
        date: point.timestamp,
        open: point.open || point.close,
        high: point.high || point.close,
        low: point.low || point.close,
        close: point.close,
        volume: point.volume || 0
      }));
      
      return prices;
    } catch (error) {
      console.error('Error in getFiveMinutePrices:', error);
      return [];
    }
  }

  // Get 10-minute prices from ten_minute_prices table (for candlestick charts)
  private static async getTenMinutePrices(
    symbol: string,
    fromTimestamp: string,
    toTimestamp: string
  ): Promise<HistoricalPrice[]> {
    try {
      const tenMinuteData = await StockAPI.getTenMinutePrices(symbol, fromTimestamp, toTimestamp);
      
      // Filter for regular and extended market hours (8:00 AM - 8:00 PM ET) and weekdays only
      const filteredData = tenMinuteData.filter(point => {
        const timestamp = new Date(point.timestamp);
        
        // Skip corrupted timestamps (before year 2000)
        if (timestamp.getFullYear() < 2000) {
          return false;
        }
        
        // Convert to ET and check market hours
        const etTime = new Date(timestamp.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const hour = etTime.getHours();
        const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Skip weekends
        if (day === 0 || day === 6) {
          return false;
        }
        
        // Extended market hours: 8:00 AM - 8:00 PM ET
        const isAfterOpen = hour >= 8;
        const isBeforeClose = hour < 20;
        
        return isAfterOpen && isBeforeClose;
      });
      
      // Convert to HistoricalPrice format
      const prices = filteredData.map(point => ({
        date: point.timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume || 0
      }));
      
      return prices;
    } catch (error) {
      console.error('Error in getTenMinutePrices:', error);
      return [];
    }
  }

  // Get cached data from database (legacy method for server-cached data)
  private static async getCachedFromDatabase(
    symbol: string, 
    fromDate: string, 
    toDate: string
  ): Promise<HistoricalPrice[]> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d2b7a00e/get-cached-prices`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            fromDate,
            toDate
          })
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.prices || [];
    } catch (error) {
      // No cached data available
      return [];
    }
  }

  // Generate mock data as fallback
  private static generateMockData(symbol: string, days: number = 30): HistoricalPrice[] {
    const prices: HistoricalPrice[] = [];
    let basePrice = 100 + Math.random() * 200; // Random base price between 100-300
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic price movement
      const change = (Math.random() - 0.5) * 0.08; // ±4% max daily change
      basePrice = Math.max(basePrice * (1 + change), 1); // Don't go below $1
      
      const high = basePrice * (1 + Math.random() * 0.03);
      const low = basePrice * (1 - Math.random() * 0.03);
      const open = low + Math.random() * (high - low);
      const close = low + Math.random() * (high - low);
      
      prices.push({
        date: date.toISOString().split('T')[0],
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000
      });
      
      basePrice = close; // Use close as next day's base
    }
    
    return prices;
  }

  // Main method to get historical prices
  static async getHistoricalPrices(
    symbol: string,
    timeframe: 'daily' | 'hourly' | '5min' | 'intraday' | '10min' = 'daily',
    days: number = 30
  ): Promise<ChartData> {
    const cacheKey = `${symbol}-${timeframe}-${days}`;
    
    // Check memory cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let toDate = new Date();
    let fromDate = new Date();
    
    // For intraday, handle weekends, holidays, and post-market hours specially
    if (timeframe === 'intraday') {
      // Get current ET date/time
      const etNow = new Date(toDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const etDay = etNow.getDay(); // 0 = Sunday, 6 = Saturday
      const etHour = etNow.getHours();
      
      // For multi-day intraday (e.g., 1W view), use days parameter
      if (days > 1) {
        // Load X days of intraday data
        // Go back X days from today (or last trading day if weekend)
        let endDay = new Date(etNow);
        
        if (etDay === 0) {
          // Sunday: end on Friday
          endDay.setDate(etNow.getDate() - 2);
        } else if (etDay === 6) {
          // Saturday: end on Friday
          endDay.setDate(etNow.getDate() - 1);
        }
        // else: weekday, use current day as end
        
        // Set toDate to end of extended hours (8pm ET)
        toDate = new Date(endDay);
        toDate.setHours(20, 0, 0, 0); // 8pm ET
        
        // Set fromDate to X days before, start of market hours (8am ET)
        fromDate = new Date(endDay);
        fromDate.setDate(endDay.getDate() - days);
        fromDate.setHours(8, 0, 0, 0); // 8am ET
      } else {
        // Single-day intraday (1D view) - use original logic
        // Determine the last trading day
        let lastTradingDay = new Date(etNow);
        
        // CRITICAL: Check if today is a holiday first
        const isHoliday = await isTodayHoliday();
        if (isHoliday) {
          const holidayName = await getHolidayName();
          
          // Go back one day initially
          lastTradingDay.setDate(etNow.getDate() - 1);
          
          // Keep going back until we find a non-holiday, non-weekend
          let attempts = 0;
          while (attempts < 7) {
            const checkDay = lastTradingDay.getDay();
            
            // Skip weekends
            if (checkDay === 0 || checkDay === 6) {
              lastTradingDay.setDate(lastTradingDay.getDate() - 1);
              attempts++;
              continue;
            }
            
            // Check if this day was also a holiday using upcoming_holidays from market status
            const checkDateStr = lastTradingDay.toISOString().split('T')[0];
            const marketStatus = await getMarketStatus();
            const holidayInfo = marketStatus?.upcoming_holidays?.find(h => h.date === checkDateStr);
            
            // Only skip if it's a FULL holiday (no tradingHours)
            // Shortened trading days (like day after Thanksgiving) should still be used
            if (holidayInfo && !holidayInfo.tradingHours) {
              lastTradingDay.setDate(lastTradingDay.getDate() - 1);
              attempts++;
              continue;
            }
            
            // Found a valid trading day (including shortened trading days)
            break;
          }
        } else if (etDay === 0) {
          // Sunday: go back to Friday
          lastTradingDay.setDate(etNow.getDate() - 2);
        } else if (etDay === 6) {
          // Saturday: go back to Friday
          lastTradingDay.setDate(etNow.getDate() - 1);
        } else if (etHour >= 20 || etHour < 8) {
          // Weekday but after hours (8pm-8am): show previous trading day
          if (etDay === 1 && etHour < 8) {
            // Monday morning before market open: go back to Friday
            lastTradingDay.setDate(etNow.getDate() - 3);
          } else if (etHour < 8) {
            // Any other weekday morning before 8am: go back to previous day
            lastTradingDay.setDate(etNow.getDate() - 1);
          }
          // After 8pm: show current day's data (no change needed)
        }
        // else: during market hours (8am-8pm on weekday), show current day
        
        // Set the time range to 8am-8pm ET on the last trading day
        const year = lastTradingDay.getFullYear();
        const month = String(lastTradingDay.getMonth() + 1).padStart(2, '0');
        const day = String(lastTradingDay.getDate()).padStart(2, '0');
        const tradingDayStr = `${year}-${month}-${day}`;
        
        // Create UTC timestamps that represent 8am and 8pm EST/EDT
        // November 16, 2025 is during EST (UTC-5) since DST ended Nov 2, 2025
        // So 8am EST = 1pm UTC, 8pm EST = 1am+1 UTC
        // We'll use ISO strings that Supabase will interpret correctly
        const fromTimestampStr = `${tradingDayStr}T13:00:00.000Z`; // 8am EST = 1pm UTC
        const toTimestampStr = `${tradingDayStr}T${day === '15' ? '01:00:00' : '01:00:00'}.000Z`;   // 8pm EST = 1am next day UTC
        
        // But wait, we need to calculate the next day for the toTimestamp
        const nextDay = new Date(lastTradingDay);
        nextDay.setDate(lastTradingDay.getDate() + 1);
        const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
        const toTimestampStr2 = `${nextDayStr}T01:00:00.000Z`; // 8pm EST = 1am next day UTC
        
        fromDate = new Date(fromTimestampStr);
        toDate = new Date(toTimestampStr2);
        // console.log(`   ET now: ${etNow.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
      }
    } else {
      // For other timeframes, use days as-is
      fromDate.setDate(toDate.getDate() - days);
    }
    
    const toDateStr = toDate.toISOString().split('T')[0];
    const fromDateStr = fromDate.toISOString().split('T')[0];
    
    let dataSource: 'database' | 'api' | 'mock' = 'mock';
    
    try {
      let prices: HistoricalPrice[] = [];
      
      // For intraday timeframe, get minute-by-minute data from intraday_prices table
      if (timeframe === 'intraday') {
        const fromTimestamp = fromDate.toISOString();
        const toTimestamp = toDate.toISOString();
        
        prices = await this.getIntradayPricesRaw(symbol, fromTimestamp, toTimestamp, undefined, undefined, days);
        
        if (prices.length > 0) {
          dataSource = 'database';
          // CRITICAL: Sort intraday prices by date ascending
          // Database queries might return descending order (newest first), which causes chart lines to be drawn backwards
          prices.sort((a, b) => a.date.localeCompare(b.date));
        }
      }
      // For daily timeframe, try to combine daily_prices with intraday_prices for recent data
      else if (timeframe === 'daily') {
        // Get daily prices from daily_prices table (historical data)
        prices = await this.getPricesFromDailyTable(symbol, fromDateStr, toDateStr);
        
        if (prices.length > 0) {
          dataSource = 'database';
          
          // Try to get intraday prices for today and yesterday to get more recent data
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          const twoDaysAgoStr = twoDaysAgo.toISOString();
          const nowStr = toDate.toISOString();
          
          const intradayPrices = await this.getIntradayPrices(symbol, twoDaysAgoStr, nowStr);
          
          // If we have intraday prices, merge them with daily prices
          if (intradayPrices.length > 0) {
            // Remove any overlapping dates from daily prices
            const intradayDates = new Set(intradayPrices.map(p => p.date));
            const filteredDailyPrices = prices.filter(p => !intradayDates.has(p.date));
            
            // Combine and sort
            prices = [...filteredDailyPrices, ...intradayPrices];
            prices.sort((a, b) => a.date.localeCompare(b.date));
          }
        }
      }
      // For hourly timeframe, get data from hourly_prices table
      else if (timeframe === 'hourly') {
        const fromTimestamp = fromDate.toISOString();
        const toTimestamp = toDate.toISOString();
        
        prices = await this.getHourlyPrices(symbol, fromTimestamp, toTimestamp);
        
        if (prices.length > 0) {
          dataSource = 'database';
        }
      }
      // For 5-minute timeframe, get data from five_minute_prices table
      else if (timeframe === '5min') {
        const fromTimestamp = fromDate.toISOString();
        const toTimestamp = toDate.toISOString();
        
        prices = await this.getFiveMinutePrices(symbol, fromTimestamp, toTimestamp);
        
        if (prices.length > 0) {
          dataSource = 'database';
        }
      }
      // For 10-minute timeframe, get data from ten_minute_prices table (for candlestick charts)
      else if (timeframe === '10min') {
        const fromTimestamp = fromDate.toISOString();
        const toTimestamp = toDate.toISOString();
        
        prices = await this.getTenMinutePrices(symbol, fromTimestamp, toTimestamp);
        
        if (prices.length > 0) {
          dataSource = 'database';
        }
      }
      
      // If no data from daily_prices table or using intraday timeframe, try other sources
      if (prices.length === 0) {
        // Try to get cached data from legacy server cache
        prices = await this.getCachedFromDatabase(symbol, fromDateStr, toDateStr);
        
        if (prices.length > 0) {
          dataSource = 'database';
        } else {
          // Convert timeframe to Finnhub resolution
          const resolutionMap = {
            'daily': 'D',
            'hourly': '60',
            '5min': '5'
          };
          
          const resolution = resolutionMap[timeframe];
          const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
          const toTimestamp = Math.floor(toDate.getTime() / 1000);
          
          try {
            // Fetch from Finnhub via our server
            prices = await this.fetchFromServer(symbol, resolution, fromTimestamp, toTimestamp);
            
            if (prices.length > 0) {
              dataSource = 'api';
              // Cache the data in database for future use
              await this.cacheInDatabase(symbol, prices);
            } else {
              // No API data, use mock
              prices = this.generateMockData(symbol, days);
              dataSource = 'mock';
            }
          } catch (apiError) {
            prices = this.generateMockData(symbol, days);
            dataSource = 'mock';
          }
        }
      }

      // Adjust prices for stock splits
      // IMPORTANT: Skip split adjustments for intraday/5min data - it's already post-split
      // Only apply split adjustments to historical daily/hourly data
      if (timeframe !== 'intraday' && timeframe !== '5min') {
        prices = await this.adjustPricesForSplits(symbol, prices);
      } else {
        console.log(`[${symbol}] Skipping split adjustment for ${timeframe} data (already post-split)`);
      }

      const chartData: ChartData = {
        symbol: symbol.toUpperCase(),
        prices,
        timeframe,
        fromDate: fromDateStr,
        toDate: toDateStr,
        cached: false,
        source: dataSource
      };
      
      // Cache in memory
      this.setCache(cacheKey, chartData);
      
      return chartData;
      
    } catch (error) {
      // Return mock data as ultimate fallback
      const mockPrices = this.generateMockData(symbol, days);
      const fallbackData: ChartData = {
        symbol: symbol.toUpperCase(),
        prices: mockPrices,
        timeframe,
        fromDate: fromDateStr,
        toDate: toDateStr,
        cached: false,
        source: 'mock'
      };
      
      return fallbackData;
    }
  }

  // Get multiple stocks' historical data (optimized for batch fetching)
  static async getMultipleHistoricalPrices(
    symbols: string[],
    timeframe: 'daily' | 'hourly' | '5min' = 'daily',
    days: number = 30
  ): Promise<Record<string, ChartData>> {
    const results: Record<string, ChartData> = {};
    
    // For daily timeframe, use batch fetch from daily_prices table
    if (timeframe === 'daily') {
      try {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - days);
        
        const toDateStr = toDate.toISOString().split('T')[0];
        const fromDateStr = fromDate.toISOString().split('T')[0];
        
        // Batch fetch from daily_prices table
        const multiplePrices = await StockAPI.getMultipleDailyPrices(symbols, fromDateStr, toDateStr);
        
        // Convert to ChartData format
        symbols.forEach(symbol => {
          const upperSymbol = symbol.toUpperCase();
          const prices = multiplePrices[upperSymbol] || [];
          
          // If we have data from the table, use it
          if (prices.length > 0) {
            results[upperSymbol] = {
              symbol: upperSymbol,
              prices,
              timeframe,
              fromDate: fromDateStr,
              toDate: toDateStr,
              cached: false,
              source: 'database'
            };
          }
        });
        
        // For symbols without data, fall back to individual fetches
        const symbolsWithoutData = symbols.filter(s => !results[s.toUpperCase()]);
        if (symbolsWithoutData.length > 0) {
          const fallbackPromises = symbolsWithoutData.map(async (symbol) => {
            const data = await this.getHistoricalPrices(symbol, timeframe, days);
            results[symbol.toUpperCase()] = data;
          });
          await Promise.all(fallbackPromises);
        }
        
        return results;
      } catch (error) {
        console.error('Error in batch fetch, falling back to individual fetches:', error);
        // Fall through to individual fetches
      }
    }
    
    // For non-daily timeframes or if batch fetch failed, fetch individually
    const promises = symbols.map(async (symbol) => {
      const data = await this.getHistoricalPrices(symbol, timeframe, days);
      results[symbol.toUpperCase()] = data;
    });
    
    await Promise.all(promises);
    return results;
  }

  // Clear cache
  static clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default HistoricalPriceService;