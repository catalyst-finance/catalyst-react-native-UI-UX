/**
 * Realtime Intraday Price API Service
 * 
 * Industry-standard approach using Supabase Realtime WebSocket subscriptions.
 * Fetches historical data once, then subscribes to real-time INSERT events.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';

export interface IntradayPrice {
  timestamp: number; // Unix timestamp in milliseconds
  value: number;
  session?: 'pre-market' | 'regular' | 'after-hours';
}

interface RawIntradayRow {
  symbol: string;
  timestamp: string;
  price: number;
  volume: number;
  session: string;
}

type PriceUpdateCallback = (symbol: string, newPrice: IntradayPrice) => void;

class RealtimeIntradayAPI {
  private static subscriptions: Map<string, RealtimeChannel> = new Map();
  private static callbacks: Map<string, PriceUpdateCallback[]> = new Map();

  /**
   * Determine session based on ET time
   */
  private static getSession(timestampUTC: string): 'pre-market' | 'regular' | 'after-hours' {
    const date = new Date(timestampUTC);
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    
    // Convert UTC to ET (subtract 5 hours for EST)
    let etHours = utcHours - 5;
    if (etHours < 0) etHours += 24;
    
    const currentMinutes = etHours * 60 + utcMinutes;
    
    // Pre-market: 8:00 AM - 9:30 AM ET (480 - 570 minutes)
    if (currentMinutes >= 480 && currentMinutes < 570) return 'pre-market';
    
    // Regular hours: 9:30 AM - 4:00 PM ET (570 - 960 minutes)
    if (currentMinutes >= 570 && currentMinutes < 960) return 'regular';
    
    // After-hours: 4:00 PM - 8:00 PM ET
    return 'after-hours';
  }

  /**
   * Get today's date range in ET timezone
   */
  private static getTodayRange(): { start: string; end: string } {
    const now = new Date();
    
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    
    const etParts = etFormatter.formatToParts(now);
    const etDate = {
      year: parseInt(etParts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(etParts.find(p => p.type === 'month')?.value || '0') - 1,
      day: parseInt(etParts.find(p => p.type === 'day')?.value || '0'),
    };
    
    // 8:00 AM ET = 1:00 PM UTC (EST is UTC-5)
    const startOfDay = new Date(Date.UTC(
      etDate.year,
      etDate.month,
      etDate.day,
      13, 0, 0, 0
    ));
    
    // 8:00 PM ET = 1:00 AM UTC next day
    const endOfDay = new Date(Date.UTC(
      etDate.year,
      etDate.month,
      etDate.day + 1,
      1, 0, 0, 0
    ));

    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    };
  }

  /**
   * Fetch historical intraday data for today (one-time fetch)
   * Uses one_minute_prices table for fast, aggregated data
   */
  static async fetchHistoricalData(symbol: string): Promise<IntradayPrice[]> {
    const upperSymbol = symbol.toUpperCase();
    const { start, end } = this.getTodayRange();

    try {
      // Use one_minute_prices for fast aggregated data
      const { data, error } = await supabase
        .from('one_minute_prices')
        .select('timestamp, close, session')
        .eq('symbol', upperSymbol)
        .gte('timestamp', start)
        .lte('timestamp', end)
        .order('timestamp', { ascending: true })
        .limit(800); // Max ~12 hours × 60 minutes = 720 points

      if (error) {
        console.error(`❌ [RealtimeAPI] Error fetching ${upperSymbol}:`, error.message);
        return [];
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️ [RealtimeAPI] No historical data for ${upperSymbol}`);
        return [];
      }

      const prices: IntradayPrice[] = data.map((row: any) => ({
        timestamp: new Date(row.timestamp).getTime(),
        value: row.close || 0,
        session: row.session || this.getSession(row.timestamp), // Use session from DB, fallback to calculation
      }));

      return prices;
    } catch (error) {
      console.error(`❌ [RealtimeAPI] Exception fetching ${upperSymbol}:`, error);
      return [];
    }
  }

  /**
   * Subscribe to real-time updates for a symbol
   */
  static subscribe(symbol: string, callback: PriceUpdateCallback): void {
    const upperSymbol = symbol.toUpperCase();
    
    // Add callback to list
    if (!this.callbacks.has(upperSymbol)) {
      this.callbacks.set(upperSymbol, []);
    }
    this.callbacks.get(upperSymbol)!.push(callback);

    // If already subscribed, don't create duplicate subscription
    if (this.subscriptions.has(upperSymbol)) {
      return;
    }

    // Create Realtime subscription
    const channel = supabase
      .channel(`intraday_${upperSymbol}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intraday_prices',
          filter: `symbol=eq.${upperSymbol}`,
        },
        (payload) => {
          const row = payload.new as RawIntradayRow;
          
          // Convert to IntradayPrice format
          const newPrice: IntradayPrice = {
            timestamp: new Date(row.timestamp).getTime(),
            value: row.price || 0,
            session: this.getSession(row.timestamp),
          };

          // Notify all callbacks for this symbol
          const callbacks = this.callbacks.get(upperSymbol) || [];
          callbacks.forEach(cb => cb(upperSymbol, newPrice));
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [RealtimeAPI] Subscription error for ${upperSymbol}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ [RealtimeAPI] Subscription timeout for ${upperSymbol}`);
        }
      });

    this.subscriptions.set(upperSymbol, channel);
  }

  /**
   * Unsubscribe from real-time updates for a symbol
   */
  static async unsubscribe(symbol: string, callback?: PriceUpdateCallback): Promise<void> {
    const upperSymbol = symbol.toUpperCase();

    // Remove specific callback or all callbacks
    if (callback) {
      const callbacks = this.callbacks.get(upperSymbol) || [];
      const filtered = callbacks.filter(cb => cb !== callback);
      this.callbacks.set(upperSymbol, filtered);

      // If still have callbacks, keep subscription
      if (filtered.length > 0) return;
    } else {
      this.callbacks.delete(upperSymbol);
    }

    // Remove subscription
    const channel = this.subscriptions.get(upperSymbol);
    if (channel) {
      await supabase.removeChannel(channel);
      this.subscriptions.delete(upperSymbol);
    }
  }

  /**
   * Unsubscribe from all symbols
   */
  static async unsubscribeAll(): Promise<void> {
    for (const [symbol, channel] of this.subscriptions.entries()) {
      await supabase.removeChannel(channel);
    }
    
    this.subscriptions.clear();
    this.callbacks.clear();
  }
}

export default RealtimeIntradayAPI;
