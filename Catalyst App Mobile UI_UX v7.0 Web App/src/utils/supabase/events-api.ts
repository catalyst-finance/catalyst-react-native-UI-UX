import { supabase, CatalystEventData, CATALYST_TABLE } from './client';
import StockAPI from './stock-api';

// Convert database event to app format
export interface MarketEvent {
  id: string;
  type: 'product' | 'earnings' | 'investor_day' | 'regulatory' | 'guidance_update' | 'conference' | 'commerce_event' | 'partnership' | 'merger' | 'legal' | 'corporate' | 'pricing' | 'capital_markets' | 'defense_contract' | 'guidance' | string;
  title: string;
  company: string;
  ticker: string;
  sector: string;
  time: string;
  timeUntil?: string;
  impactRating: number; // -3 to +3 scale
  confidence: number;
  aiInsight: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  marketCap: number;
  actualDateTime?: string;
  created_on?: string;
  updated_on?: string;
  symbol?: string; // Alias for ticker
  eventType?: string; // Alias for type
}

class EventsAPI {
  // Helper function to add timeout to Supabase queries
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Supabase query timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Convert database event to app format (fast, non-blocking)
  private static convertToMarketEvent(dbEvent: CatalystEventData, stockData?: any): MarketEvent {
    // Calculate time until for upcoming events
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

    // Use provided stock data if available
    let currentPrice: number | undefined;
    let priceChange: number | undefined;
    let priceChangePercent: number | undefined;
    let marketCap = 0;

    if (stockData) {
      currentPrice = stockData.currentPrice;
      priceChange = stockData.priceChange;
      priceChangePercent = stockData.priceChangePercent;
      marketCap = stockData.marketCapValue || 0;
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
      currentPrice,
      priceChange,
      priceChangePercent,
      marketCap,
      actualDateTime: dbEvent.actualDateTime || undefined,
      created_on: dbEvent.created_on || undefined,
      updated_on: dbEvent.updated_on || undefined,
      symbol: dbEvent.ticker || undefined,
      eventType: dbEvent.type || undefined
    };
  }

  // Enrich events with stock data in batch (optional, non-blocking)
  private static async enrichEventsWithStockData(events: MarketEvent[]): Promise<MarketEvent[]> {
    try {
      // Get unique tickers from events
      const tickers = [...new Set(events
        .map(event => event.ticker)
        .filter(ticker => ticker && ticker !== 'N/A')
      )];

      if (tickers.length === 0) {
        return events;
      }

      // Batch fetch stock data with timeout - silently fail if it takes too long
      const stocksData = await this.withTimeout(
        StockAPI.getStocks(tickers), 
        10000 // 10 second timeout for stock data (increased from 3s)
      );

      // Enrich events with stock data
      return events.map(event => {
        if (event.ticker && stocksData[event.ticker]) {
          const stockData = stocksData[event.ticker];
          return {
            ...event,
            currentPrice: stockData.currentPrice,
            priceChange: stockData.priceChange,
            priceChangePercent: stockData.priceChangePercent,
            marketCap: stockData.marketCapValue || 0
          };
        }
        return event;
      });
    } catch (error) {
      // Silently fail - stock data enrichment is optional
      // Don't log warnings as this is expected behavior when stock API is slow
      return events;
    }
  }

  // Get all events
  static async getAllEvents(): Promise<MarketEvent[]> {
    try {
      const query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .order('actualDateTime', { ascending: true });

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {
        console.error('Error fetching events:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Get events by ticker
  static async getEventsByTicker(ticker: string): Promise<MarketEvent[]> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('*')
          .eq('ticker', ticker.toUpperCase())
          .order('actualDateTime', { ascending: true }),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Get events by sector
  static async getEventsBySector(sector: string): Promise<MarketEvent[]> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('*')
          .eq('sector', sector)
          .order('actualDateTime', { ascending: true }),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Get events by type
  static async getEventsByType(type: string): Promise<MarketEvent[]> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('*')
          .eq('type', type)
          .order('actualDateTime', { ascending: true }),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Get upcoming events (events in the future)
  static async getUpcomingEvents(limit?: number): Promise<MarketEvent[]> {
    try {
      const now = new Date();
      const nowISOString = now.toISOString();
      

      
      let query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .gte('actualDateTime', nowISOString)
        .order('actualDateTime', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));

      
      // Try to enrich with stock data (non-blocking)
      events = await this.enrichEventsWithStockData(events);
      
      // Additional client-side filtering to ensure all events are truly upcoming
      const filteredEvents = events.filter(event => {
        if (!event.actualDateTime) {

          return true; // Include events without dates as upcoming
        }
        
        const eventDate = new Date(event.actualDateTime);
        const isUpcoming = eventDate > now;
        
        if (!isUpcoming) {

        }
        
        return isUpcoming;
      });


      return filteredEvents;
    } catch (error) {

      throw error;
    }
  }

  // Get recent events (events in the past)
  static async getRecentEvents(limit?: number): Promise<MarketEvent[]> {
    try {
      const now = new Date();
      const nowISOString = now.toISOString();
      

      
      let query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .lt('actualDateTime', nowISOString)
        .order('actualDateTime', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      let events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));

      
      // Try to enrich with stock data (non-blocking)
      events = await this.enrichEventsWithStockData(events);
      
      // Additional client-side filtering to ensure all events are truly in the past
      const filteredEvents = events.filter(event => {
        if (!event.actualDateTime) {

          return false; // Exclude events without dates from recent
        }
        
        const eventDate = new Date(event.actualDateTime);
        const isPast = eventDate <= now;
        
        if (!isPast) {

        }
        
        return isPast;
      });


      return filteredEvents;
    } catch (error) {

      throw error;
    }
  }

  // Get events by multiple tickers
  static async getEventsByTickers(tickers: string[]): Promise<MarketEvent[]> {
    try {
      const upperTickers = tickers.map(t => t.toUpperCase());
      
      const query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .in('ticker', upperTickers)
        .order('actualDateTime', { ascending: true });

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Search events
  static async searchEvents(query: string): Promise<MarketEvent[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('*')
          .or(`title.ilike.${searchTerm},company.ilike.${searchTerm},ticker.ilike.${searchTerm},type.ilike.${searchTerm}`)
          .order('actualDateTime', { ascending: true }),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Get events by impact rating
  static async getEventsByImpact(minImpact: number, maxImpact?: number): Promise<MarketEvent[]> {
    try {
      let query = supabase
        .from(CATALYST_TABLE)
        .select('*')
        .gte('impactRating', minImpact);

      if (maxImpact !== undefined) {
        query = query.lte('impactRating', maxImpact);
      }

      query = query.order('actualDateTime', { ascending: true });

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Get events by confidence level
  static async getEventsByConfidence(minConfidence: number): Promise<MarketEvent[]> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('*')
          .gte('confidence', minConfidence)
          .order('actualDateTime', { ascending: true }),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      // Convert events first (fast)
      const events = (data || []).map(dbEvent => this.convertToMarketEvent(dbEvent));
      
      // Try to enrich with stock data (non-blocking)
      return await this.enrichEventsWithStockData(events);
    } catch (error) {

      throw error;
    }
  }

  // Get event by ID
  static async getEventById(id: string): Promise<MarketEvent | null> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('*')
          .eq('PrimaryID', id)
          .single(),
        8000
      );

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }

        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;
      
      // Convert event first (fast)
      const event = this.convertToMarketEvent(data);
      
      // Try to enrich with stock data (non-blocking)
      const enrichedEvents = await this.enrichEventsWithStockData([event]);
      return enrichedEvents[0] || event;
    } catch (error) {

      throw error;
    }
  }

  // Get unique tickers from events
  static async getEventTickers(): Promise<string[]> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('ticker')
          .not('ticker', 'is', null),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      const tickers = [...new Set((data || []).map(item => item.ticker).filter(Boolean))];
      return tickers.sort();
    } catch (error) {

      throw error;
    }
  }

  // Get unique sectors from events
  static async getEventSectors(): Promise<string[]> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('sector')
          .not('sector', 'is', null),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      const sectors = [...new Set((data || []).map(item => item.sector).filter(Boolean))];
      return sectors.sort();
    } catch (error) {

      throw error;
    }
  }

  // Get event types
  static async getEventTypes(): Promise<string[]> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from(CATALYST_TABLE)
          .select('type')
          .not('type', 'is', null),
        8000
      );

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      const types = [...new Set((data || []).map(item => item.type).filter(Boolean))];
      return types.sort();
    } catch (error) {

      throw error;
    }
  }
}

export default EventsAPI;