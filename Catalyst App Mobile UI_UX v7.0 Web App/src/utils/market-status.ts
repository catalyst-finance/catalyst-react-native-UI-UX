import { supabase } from './supabase-client';
import { useState, useEffect } from 'react';

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

// Cache the market status to avoid too many database queries
let cachedMarketStatus: MarketStatus | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

/**
 * Fetch the current market status from the database
 * Returns the market status including whether market is open, current phase, and holiday info
 */
export async function getMarketStatus(): Promise<MarketStatus | null> {
  try {
    const now = Date.now();
    
    // Return cached value if still valid
    if (cachedMarketStatus && (now - lastFetchTime) < CACHE_DURATION) {
      return cachedMarketStatus;
    }
    
    const { data, error } = await supabase
      .from('market_status')
      .select('*')
      .eq('exchange', 'US')
      .single();

    if (error) {
      // Suppress specific error if it's just a fetch failure (e.g. offline/network)
      // but log others
      if (error.code === 'PGRST301' || error.message?.includes('Failed to fetch')) {
        // Silent fail for network issues
      } else {
        console.warn('Error fetching market status:', error);
      }
      return null;
    }

    cachedMarketStatus = data as MarketStatus;
    lastFetchTime = now;
    
    return cachedMarketStatus;
  } catch (error) {
    // Silent fail for exceptions (network/offline)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return null;
    }
    console.warn('Exception fetching market status:', error);
    return null;
  }
}

/**
 * Get the current market period for display purposes
 * Returns 'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'
 */
export async function getCurrentMarketPeriod(): Promise<'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'> {
  const status = await getMarketStatus();
  
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
      const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const currentMinutes = etNow.getHours() * 60 + etNow.getMinutes();
      const shortenedOpenMinutes = openHour * 60 + openMinute;
      const shortenedCloseMinutes = closeHour * 60 + closeMinute;
      
      // Pre-market: 4:00 AM - shortened open time
      const preMarketStart = 4 * 60; // 4:00 AM
      
      // After-hours: shortened close time - 8:00 PM
      const afterHoursEnd = 20 * 60; // 8:00 PM
      
      if (currentMinutes < preMarketStart) {
        // Before 4 AM - market fully closed
        return 'closed';
      } else if (currentMinutes < shortenedOpenMinutes) {
        // 4 AM to open time - pre-market
        return 'premarket';
      } else if (currentMinutes < shortenedCloseMinutes) {
        // During shortened regular hours
        return 'regular';
      } else if (currentMinutes < afterHoursEnd) {
        // After shortened close until 8 PM - after hours
        return 'afterhours';
      } else {
        // After 8 PM - market closed
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
 * Check if the market is currently open (including pre-market and after-hours)
 */
export async function isMarketOpenExtended(): Promise<boolean> {
  const period = await getCurrentMarketPeriod();
  // Extended hours includes premarket, regular, and afterhours
  return period === 'premarket' || period === 'regular' || period === 'afterhours';
}

/**
 * Check if the market is currently in regular trading hours
 */
export async function isMarketOpenRegular(): Promise<boolean> {
  const period = await getCurrentMarketPeriod();
  return period === 'regular';
}

/**
 * Check if today is a market holiday (full closure, no trading)
 * Returns false for shortened trading days (e.g., day after Thanksgiving)
 */
export async function isTodayHoliday(): Promise<boolean> {
  const status = await getMarketStatus();
  // Only return true if it's a full holiday (no shortened hours)
  return (status?.is_holiday && !status?.holiday_trading_hours) ?? false;
}

/**
 * Check if today is a shortened trading day
 */
export async function isShortenedTradingDay(): Promise<boolean> {
  const status = await getMarketStatus();
  return (status?.is_holiday && !!status?.holiday_trading_hours) ?? false;
}

/**
 * Get shortened trading hours if applicable
 * Returns { open: "HH:MM", close: "HH:MM" } or null
 */
export async function getShortenedTradingHours(): Promise<{ open: string; close: string } | null> {
  const status = await getMarketStatus();
  if (status?.holiday_trading_hours) {
    const [open, close] = status.holiday_trading_hours.split('-');
    return { open, close };
  }
  return null;
}

/**
 * Get the holiday name if today is a holiday or shortened trading day
 */
export async function getHolidayName(): Promise<string | null> {
  const status = await getMarketStatus();
  return status?.is_holiday ? status.holiday_name : null;
}

/**
 * Clear the cache (useful for testing or forcing a refresh)
 */
export function clearMarketStatusCache() {
  cachedMarketStatus = null;
  lastFetchTime = 0;
}

// Legacy type for backwards compatibility with existing components
export type MarketStatus = 'open' | 'pre-market' | 'after-hours' | 'closed';

/**
 * React hook for market status (backwards compatible with existing components)
 * Returns a legacy-compatible market status object
 */
export function useMarketStatus() {
  const [status, setStatus] = useState<MarketStatus>('closed');
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateStatus = async () => {
      // Use getCurrentMarketPeriod which properly handles shortened trading days
      const period = await getCurrentMarketPeriod();
      
      // Convert new period format to legacy format
      switch (period) {
        case 'premarket':
          setStatus('pre-market');
          break;
        case 'regular':
          setStatus('open');
          break;
        case 'afterhours':
          setStatus('after-hours');
          break;
        case 'closed':
        case 'holiday':
        default:
          setStatus('closed');
          break;
      }

      // Update time
      const now = new Date();
      const etTime = now.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      setTime(etTime);
    };

    updateStatus();
    
    // Update every minute
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    status,
    time,
    isOpen: status === 'open',
    isPreMarket: status === 'pre-market',
    isAfterHours: status === 'after-hours'
  };
}