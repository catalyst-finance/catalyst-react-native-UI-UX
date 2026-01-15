/**
 * Events API Service for React Native
 * 
 * Fetches catalyst events from the database.
 * Used by charts and screens to display upcoming and past market events.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './client';
import StockAPI from './StockAPI';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour for events
const CACHE_PREFIX = 'events_';
const CATALYST_TABLE = 'event_data';

export interface MarketEvent {
  id: string;
  type: string;
  title: string;
  company: string;
  ticker: string;
  sector: string;
  time: string;
  timeUntil?: string;
  impactRating: number;
  confidence: number;
  aiInsight: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  marketCap: number;
  actualDateTime?: string;
  created_on?: string;
  updated_on?: string;
  symbol?: string;
  eventType?: string;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface CatalystEventData {
  PrimaryID: string;
  type?: string;
  title?: string;
  company?: string;
  ticker?: string;
  sector?: string;
  time?: string;
  impactRating?: number;
  confidence?: number;
  aiInsight?: string;
  actualDateTime?: string;
  created_on?: string;
  updated_on?: string;
}

class EventsAPI {
  // Cache helpers
  private static async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const { data, timestamp }: CachedData<T> = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }

      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error);
      return null;
    }
  }

  private static async setCache<T>(key: string, data: T): Promise<void> {
    try {
      const cached: CachedData<T> = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
    } catch (error) {
      console.error(`Error writing cache for ${key}:`, error);
    }
  }

  private static async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }

  // Convert database event to app format
  private static convertToMarketEvent(dbEvent: CatalystEventData, stockData?: any): MarketEvent {
    let timeUntil: string | undefined;
    if (dbEvent.actualDateTime) {
      const eventDate = new Date(dbEvent.actualDateTime);
      const now = new Date();
      
      if (eventDate > now) {
        const diffMs = eventDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.ceil(diffMs / (1000 * 60));
        
        if (diffDays > 1) {
          timeUntil = `${diffDays} days`;
        } else if (diffHours > 1) {
          timeUntil = `${diffHours}h`;
        } else if (diffMinutes > 1) {
          timeUntil = `${diffMinutes}m`;
        } else {
          timeUntil = 'Now';
        }
      }
    }

    return {
      id: dbEvent.PrimaryID,
      type: dbEvent.type || 'launch',
      title: dbEvent.title || 'Market Event',
      company: dbEvent.company || 'Unknown Company',
      ticker: dbEvent.ticker || 'N/A',
      sector: dbEvent.sector || 'Unknown',
      time: dbEvent.time || 'TBD',
      timeUntil,
      impactRating: dbEvent.impactRating || 0,
      confidence: dbEvent.confidence || 50,
      aiInsight: dbEvent.aiInsight || 'No insights available.',
      currentPrice: stockData?.currentPrice,
      priceChange: stockData?.priceChange,
      priceChangePercent: stockData?.priceChangePercent,
      marketCap: stockData?.marketCapValue || 0,
      actualDateTime: dbEvent.actualDateTime,
      created_on: dbEvent.created_on,
      updated_on: dbEvent.updated_on,
      symbol: dbEvent.ticker,
      eventType: dbEvent.type,
    };
  }

  // Enrich events with stock data
  private static async enrichEventsWithStockData(events: MarketEvent[]): Promise<MarketEvent[]> {
    try {
      const tickers = [...new Set(events
        .map(event => event.ticker)
        .filter(ticker => ticker && ticker !== 'N/A')
      )];

      if (tickers.length === 0) return events;

      const stocksData = await StockAPI.getStocks(tickers);

      return events.map(event => {
        if (event.ticker && stocksData[event.ticker]) {
          const stockData = stocksData[event.ticker];
          return {
            ...event,
            currentPrice: stockData.currentPrice,
            priceChange: stockData.priceChange,
            priceChangePercent: stockData.priceChangePercent,
          };
        }
        return event;
      });
    } catch (error) {
      return events;
    }
  }


  /**
   * Get upcoming events (future events)
   */
  static async getUpcomingEvents(limit?: number, skipCache: boolean = false): Promise<MarketEvent[]> {
    const cacheKey = `upcoming_${limit || 'all'}`;

    if (!skipCache) {
      const cached = await this.getFromCache<MarketEvent[]>(cacheKey);
      if (cached) return cached;
    }

    const online = await this.isOnline();
    if (!online) {
      const cached = await this.getFromCache<MarketEvent[]>(cacheKey);
      return cached || [];
    }

    try {
      const now = new Date().toISOString();
      
      let query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .gte('actualDateTime', now)
        .order('actualDateTime', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [EventsAPI] Error fetching upcoming events:', error);
        return [];
      }

      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      events = await this.enrichEventsWithStockData(events);
      
      await this.setCache(cacheKey, events);
      return events;
    } catch (error) {
      console.error('❌ [EventsAPI] Exception fetching upcoming events:', error);
      return [];
    }
  }

  /**
   * Get recent events (past events)
   */
  static async getRecentEvents(limit?: number, skipCache: boolean = false): Promise<MarketEvent[]> {
    const cacheKey = `recent_${limit || 'all'}`;

    if (!skipCache) {
      const cached = await this.getFromCache<MarketEvent[]>(cacheKey);
      if (cached) return cached;
    }

    const online = await this.isOnline();
    if (!online) {
      const cached = await this.getFromCache<MarketEvent[]>(cacheKey);
      return cached || [];
    }

    try {
      const now = new Date().toISOString();
      
      let query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .lt('actualDateTime', now)
        .order('actualDateTime', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [EventsAPI] Error fetching recent events:', error);
        return [];
      }

      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      events = await this.enrichEventsWithStockData(events);
      
      await this.setCache(cacheKey, events);
      return events;
    } catch (error) {
      console.error('❌ [EventsAPI] Exception fetching recent events:', error);
      return [];
    }
  }

  /**
   * Get events by ticker
   */
  static async getEventsByTicker(ticker: string, skipCache: boolean = false): Promise<MarketEvent[]> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = `ticker_${upperTicker}`;

    if (!skipCache) {
      const cached = await this.getFromCache<MarketEvent[]>(cacheKey);
      if (cached) return cached;
    }

    const online = await this.isOnline();
    if (!online) {
      const cached = await this.getFromCache<MarketEvent[]>(cacheKey);
      return cached || [];
    }

    try {
      const { data, error } = await supabase
        .from(CATALYST_TABLE)
        .select('*')
        .eq('ticker', upperTicker)
        .order('actualDateTime', { ascending: true });

      if (error) {
        console.error(`❌ [EventsAPI] Error fetching events for ${upperTicker}:`, error);
        return [];
      }

      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      events = await this.enrichEventsWithStockData(events);
      
      await this.setCache(cacheKey, events);
      return events;
    } catch (error) {
      console.error(`❌ [EventsAPI] Exception fetching events for ${upperTicker}:`, error);
      return [];
    }
  }

  /**
   * Get upcoming events for a specific ticker
   */
  static async getUpcomingEventsByTicker(ticker: string, limit?: number): Promise<MarketEvent[]> {
    const upperTicker = ticker.toUpperCase();
    const now = new Date().toISOString();

    try {
      let query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .eq('ticker', upperTicker)
        .gte('actualDateTime', now)
        .order('actualDateTime', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`❌ [EventsAPI] Error fetching upcoming events for ${upperTicker}:`, error);
        return [];
      }

      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      events = await this.enrichEventsWithStockData(events);
      
      return events;
    } catch (error) {
      console.error(`❌ [EventsAPI] Exception fetching upcoming events for ${upperTicker}:`, error);
      return [];
    }
  }

  /**
   * Get events by multiple tickers
   */
  static async getEventsByTickers(tickers: string[]): Promise<MarketEvent[]> {
    const upperTickers = tickers.map(t => t.toUpperCase());

    try {
      const { data, error } = await supabase
        .from(CATALYST_TABLE)
        .select('*')
        .in('ticker', upperTickers)
        .order('actualDateTime', { ascending: true });

      if (error) {
        console.error('❌ [EventsAPI] Error fetching events by tickers:', error);
        return [];
      }

      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      events = await this.enrichEventsWithStockData(events);
      
      return events;
    } catch (error) {
      console.error('❌ [EventsAPI] Exception fetching events by tickers:', error);
      return [];
    }
  }

  /**
   * Search events
   */
  static async searchEvents(query: string): Promise<MarketEvent[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from(CATALYST_TABLE)
        .select('*')
        .or(`title.ilike.${searchTerm},company.ilike.${searchTerm},ticker.ilike.${searchTerm},type.ilike.${searchTerm}`)
        .order('actualDateTime', { ascending: true });

      if (error) {
        console.error('❌ [EventsAPI] Error searching events:', error);
        return [];
      }

      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      events = await this.enrichEventsWithStockData(events);
      
      return events;
    } catch (error) {
      console.error('❌ [EventsAPI] Exception searching events:', error);
      return [];
    }
  }

  /**
   * Clear all cached event data
   */
  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(eventKeys);
      console.log(`🗑️ [EventsAPI] Cleared ${eventKeys.length} cached items`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export default EventsAPI;
