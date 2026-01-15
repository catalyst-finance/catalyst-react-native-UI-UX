/**
 * Realtime Price Service
 * 
 * Subscribes to live price updates from the stock_quote_now table via Supabase Realtime
 * and broadcasts changes to all components in the app.
 */

import { supabase } from './supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  previousPrice?: number;
}

type PriceUpdateCallback = (update: PriceUpdate) => void;

class RealtimePriceService {
  private channel: RealtimeChannel | null = null;
  private subscribers: Set<PriceUpdateCallback> = new Set();
  private isConnected = false;
  private lastPrices: Map<string, number> = new Map();

  // Subscribe to price updates
  subscribe(callback: PriceUpdateCallback): () => void {
    this.subscribers.add(callback);
    
    // Start listening if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.startListening();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      
      // Stop listening if no more subscribers
      if (this.subscribers.size === 0) {
        this.stopListening();
      }
    };
  }

  // Start listening to realtime updates
  private startListening() {
    if (this.isConnected) return;

    // console.log('📡 Starting realtime price updates...');

    this.channel = supabase
      .channel('stock_quote_now_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stock_quote_now'
        },
        (payload) => {
          this.handlePriceUpdate(payload.new as any);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          // console.log('✅ Realtime price updates connected');
        } else if (status === 'CLOSED') {
          this.isConnected = false;
          // console.log('❌ Realtime price updates disconnected');
        }
      });
  }

  // Stop listening to realtime updates
  private stopListening() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isConnected = false;
      // console.log('🔌 Stopped realtime price updates');
    }
  }

  // Handle incoming price update
  private handlePriceUpdate(data: any) {
    const symbol = data.symbol?.toUpperCase();
    if (!symbol) return;

    // Map fields from stock_quote_now table
    // The table has: close, change, change_percent, previous_close, etc.
    const newPrice = data.close; // Use 'close' column from stock_quote_now
    const change = data.change;
    const changePercent = data.change_percent;
    
    // Validate that we have valid numeric data
    if (typeof newPrice !== 'number' || isNaN(newPrice)) {
      console.warn(`⚠️ Invalid price data for ${symbol}:`, data);
      return;
    }

    const previousPrice = this.lastPrices.get(symbol);

    // Update stored price
    this.lastPrices.set(symbol, newPrice);

    // Create update object
    const update: PriceUpdate = {
      symbol,
      price: newPrice,
      change: change || 0,
      changePercent: changePercent || 0,
      timestamp: data.timestamp || data.ingested_at || new Date().toISOString(),
      previousPrice
    };

    // console.log(`📊 Price update for ${symbol}: $${newPrice.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent?.toFixed(2)}%)`);

    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in price update callback:', error);
      }
    });
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get subscriber count
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  // Manually trigger a price update (for testing)
  triggerUpdate(symbol: string, price: number, change: number, changePercent: number) {
    const previousPrice = this.lastPrices.get(symbol.toUpperCase());
    this.lastPrices.set(symbol.toUpperCase(), price);

    const update: PriceUpdate = {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      timestamp: new Date().toISOString(),
      previousPrice
    };

    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in price update callback:', error);
      }
    });
  }
}

// Export singleton instance
export const realtimePriceService = new RealtimePriceService();
export default realtimePriceService;