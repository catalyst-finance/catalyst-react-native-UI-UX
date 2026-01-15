/**
 * Market Status API Service for React Native
 * 
 * Fetches authoritative market status from the market_status table.
 * Includes caching to avoid excessive database queries.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './client';

const CACHE_KEY = 'market_status';
const CACHE_DURATION = 60 * 1000; // 1 minute cache

interface MarketStatus {
  id: number;
  exchange: string;
  is_open: boolean;
  session: string | null;
  market_phase: 'market-open' | 'pre-market' | 'after-hours' | 'market-closed' | 'holiday';
  is_holiday: boolean;
  holiday_name: string | null;
  holiday_trading_hours: string | null;
  timezone: string;
  api_timestamp: number;
  upcoming_holidays: Array<{
    date: string;
    name: string;
    isPartialDay: boolean;
    tradingHours: string | null;
  }>;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
}

interface CachedMarketStatus {
  data: MarketStatus;
  timestamp: number;
}

class MarketStatusAPI {
  /**
   * Fetch the current market status from the database
   */
  static async getMarketStatus(): Promise<MarketStatus | null> {
    try {
      const now = Date.now();

      // Try cache first
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp }: CachedMarketStatus = JSON.parse(cached);
        if (now - timestamp < CACHE_DURATION) {
          return data;
        }
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('market_status')
        .select('*')
        .eq('exchange', 'US')
        .single();

      if (error) {
        console.warn('⚠️ [MarketStatusAPI] Error fetching market status:', error);
        return null;
      }

      // Cache the result
      const cacheData: CachedMarketStatus = {
        data: data as MarketStatus,
        timestamp: now,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      return data as MarketStatus;
    } catch (error) {
      console.warn('⚠️ [MarketStatusAPI] Exception fetching market status:', error);
      return null;
    }
  }

  /**
   * Get the current market period for display purposes
   * Returns 'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'
   */
  static async getCurrentMarketPeriod(): Promise<'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'> {
    const status = await this.getMarketStatus();

    if (!status) {
      return 'closed';
    }

    if (status.is_holiday) {
      // Check if this is a shortened trading day (has holiday_trading_hours)
      if (status.holiday_trading_hours) {
        // Parse the shortened hours (e.g., "09:30-13:00")
        const [openTime, closeTime] = status.holiday_trading_hours.split('-');
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const [closeHour, closeMinute] = closeTime.split(':').map(Number);

        // Get current ET time
        const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const currentMinutes = etNow.getHours() * 60 + etNow.getMinutes();
        const shortenedOpenMinutes = openHour * 60 + openMinute;
        const shortenedCloseMinutes = closeHour * 60 + closeMinute;

        // Pre-market: 4:00 AM - shortened open time
        const preMarketStart = 4 * 60; // 4:00 AM

        // After-hours: shortened close time - 8:00 PM
        const afterHoursEnd = 20 * 60; // 8:00 PM

        if (currentMinutes < preMarketStart) {
          return 'closed';
        } else if (currentMinutes < shortenedOpenMinutes) {
          return 'premarket';
        } else if (currentMinutes < shortenedCloseMinutes) {
          return 'regular';
        } else if (currentMinutes < afterHoursEnd) {
          return 'afterhours';
        } else {
          return 'closed';
        }
      }
      // Full holiday with no trading hours
      return 'holiday';
    }

    switch (status.market_phase) {
      case 'pre-market':
        return 'premarket';
      case 'market-open':
        return 'regular';
      case 'after-hours':
        return 'afterhours';
      case 'market-closed':
      case 'holiday':
      default:
        return 'closed';
    }
  }

  /**
   * Clear the cache (useful for testing or forcing a refresh)
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing market status cache:', error);
    }
  }
}

export default MarketStatusAPI;
