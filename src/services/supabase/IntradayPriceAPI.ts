/**
 * Intraday Price API Service for React Native
 * 
 * Fetches 5-minute intraday price data from the intraday_prices table.
 * Used by MiniChart to display real price movements throughout the trading day.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './client';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'intraday_v5_'; // Changed to v5 - removed limit, fetch all day's data

export interface IntradayPrice {
  timestamp: number; // Unix timestamp in milliseconds
  value: number;
  session?: 'pre-market' | 'regular' | 'after-hours';
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

class IntradayPriceAPI {
  /**
   * Get from cache
   */
  private static async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const { data, timestamp }: CachedData<T> = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log(`✅ [IntradayPriceAPI] Cache hit for ${key}`);
        return data;
      }

      // Cache expired
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache
   */
  private static async setCache<T>(key: string, data: T): Promise<void> {
    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
      console.log(`💾 [IntradayPriceAPI] Cached ${key}`);
    } catch (error) {
      console.error(`Error writing cache for ${key}:`, error);
    }
  }

  /**
   * Check network state
   */
  private static async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }

  /**
   * Determine session based on ET time
   */
  private static getSession(timestampET: string): 'pre-market' | 'regular' | 'after-hours' {
    // timestampET is a UTC timestamp, we need to convert to ET hours
    const date = new Date(timestampET);
    
    // Get UTC hours and convert to ET (UTC-5 for EST)
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    
    // Convert UTC to ET (subtract 5 hours for EST)
    let etHours = utcHours - 5;
    let etMinutes = utcMinutes;
    
    // Handle day boundary
    if (etHours < 0) {
      etHours += 24;
    }
    
    const currentMinutes = etHours * 60 + etMinutes;
    
    // Debug log for first call
    if (Math.random() < 0.01) { // Log 1% of calls to avoid spam
      console.log(`🕐 [IntradayPriceAPI] Session calc: UTC ${utcHours}:${utcMinutes} -> ET ${etHours}:${etMinutes} (${currentMinutes} mins) -> ${currentMinutes >= 480 && currentMinutes < 570 ? 'pre-market' : currentMinutes >= 570 && currentMinutes < 960 ? 'regular' : 'after-hours'}`);
    }

    // Pre-market: 8:00 AM - 9:30 AM ET (480 - 570 minutes)
    if (currentMinutes >= 480 && currentMinutes < 570) {
      return 'pre-market';
    }

    // Regular hours: 9:30 AM - 4:00 PM ET (570 - 960 minutes)
    if (currentMinutes >= 570 && currentMinutes < 960) {
      return 'regular';
    }

    // After-hours: 4:00 PM - 8:00 PM ET
    return 'after-hours';
  }

  /**
   * Get intraday prices for a symbol (today's data)
   * Returns 5-minute sampled data for the MiniChart
   */
  static async getIntradayPrices(
    symbol: string,
    skipCache: boolean = false
  ): Promise<IntradayPrice[]> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `${upperSymbol}_today`;

    // Try cache first (unless skipping)
    if (!skipCache) {
      const cached = await this.getFromCache<IntradayPrice[]>(cacheKey);
      if (cached) return cached;
    } else {
      console.log(`🔄 [IntradayPriceAPI] Skipping cache for ${upperSymbol}`);
    }

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn(`⚠️ [IntradayPriceAPI] Offline, checking cache for ${upperSymbol}`);
      // Try cache even if skipCache was true, as fallback when offline
      const cached = await this.getFromCache<IntradayPrice[]>(cacheKey);
      return cached || [];
    }

    try {
      // Get current time
      const now = new Date();
      
      // Get today's date in ET timezone by using Intl.DateTimeFormat
      const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const etParts = etFormatter.formatToParts(now);
      const etDate = {
        year: parseInt(etParts.find(p => p.type === 'year')?.value || '0'),
        month: parseInt(etParts.find(p => p.type === 'month')?.value || '0') - 1, // Month is 0-indexed
        day: parseInt(etParts.find(p => p.type === 'day')?.value || '0'),
      };
      
      // Create start of day at 8:00 AM ET (websocket start time)
      const startOfDay = new Date(Date.UTC(
        etDate.year,
        etDate.month,
        etDate.day,
        8 + 5, // 8 AM ET = 1 PM UTC (EST is UTC-5)
        0,
        0,
        0
      ));
      
      // Create end of day at 8:00 PM ET
      const endOfDay = new Date(Date.UTC(
        etDate.year,
        etDate.month,
        etDate.day,
        20 + 5, // 8 PM ET = 1 AM UTC next day (EST is UTC-5)
        0,
        0,
        0
      ));

      const fromTimestamp = startOfDay.toISOString();
      const toTimestamp = endOfDay.toISOString();

      console.log(`📊 [IntradayPriceAPI] Fetching ${upperSymbol} from ${fromTimestamp} to ${toTimestamp}`);

      // Query intraday_prices table
      // Get all rows for the day (no limit - we filter by time range)
      const { data, error } = await supabase
        .from('intraday_prices')
        .select('timestamp, timestamp_et, price, volume')
        .eq('symbol', upperSymbol)
        .gte('timestamp', fromTimestamp)
        .lte('timestamp', toTimestamp)
        .order('timestamp', { ascending: true }); // Get chronological order directly

      if (error) {
        console.error(`❌ [IntradayPriceAPI] Error fetching ${upperSymbol}:`, error.message);
        // Return cached data as fallback
        const cached = await this.getFromCache<IntradayPrice[]>(cacheKey);
        return cached || [];
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️ [IntradayPriceAPI] No data for ${upperSymbol}`);
        // Return cached data as fallback
        const cached = await this.getFromCache<IntradayPrice[]>(cacheKey);
        return cached || [];
      }

      console.log(`📊 [IntradayPriceAPI] Raw data: ${data.length} rows for ${upperSymbol}`);

      // Sample every 5th row for ~5-minute intervals
      const sampledData = data.filter((_, index) => index % 5 === 0);

      console.log(`📊 [IntradayPriceAPI] Sampled data: ${sampledData.length} rows (every 5th)`);

      // Convert to IntradayPrice format
      const prices: IntradayPrice[] = sampledData.map((row: any) => {
        // Use the UTC timestamp, not timestamp_et
        const session = this.getSession(row.timestamp);
        
        return {
          timestamp: new Date(row.timestamp).getTime(),
          value: row.price || 0,
          session,
        };
      });

      console.log(`✅ [IntradayPriceAPI] Fetched ${prices.length} prices for ${upperSymbol}`);
      
      if (prices.length > 0) {
        console.log(`📊 [IntradayPriceAPI] First: ${prices[0].value} at ${new Date(prices[0].timestamp).toISOString()}`);
        console.log(`📊 [IntradayPriceAPI] Last: ${prices[prices.length - 1].value} at ${new Date(prices[prices.length - 1].timestamp).toISOString()}`);
      }

      // Cache the result
      await this.setCache(cacheKey, prices);

      return prices;
    } catch (error) {
      console.error(`❌ [IntradayPriceAPI] Exception fetching ${upperSymbol}:`, error);
      // Return cached data as fallback
      const cached = await this.getFromCache<IntradayPrice[]>(cacheKey);
      return cached || [];
    }
  }

  /**
   * Clear all cached intraday data (all versions)
   */
  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      // Clear all intraday cache items regardless of version
      const intradayKeys = keys.filter(key => key.startsWith('intraday_'));
      await AsyncStorage.multiRemove(intradayKeys);
      console.log(`🗑️ [IntradayPriceAPI] Cleared ${intradayKeys.length} cached items (all versions)`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export default IntradayPriceAPI;
