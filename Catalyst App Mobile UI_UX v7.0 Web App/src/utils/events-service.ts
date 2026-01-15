import EventsAPI, { MarketEvent } from './supabase/events-api';

class EventsService {
  private static useDatabase = true;
  private static cacheTimeout = 2 * 60 * 1000; // 2 minutes for events (shorter than stocks)
  private static cache = new Map<string, { data: any; timestamp: number }>();

  // Helper function to add timeout to promises
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Events operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Check if we should use database or fallback to mock data
  static async checkDatabaseAvailability(): Promise<boolean> {
    try {
      const events = await this.withTimeout(EventsAPI.getAllEvents(), 5000);
      const hasEvents = events.length > 0;
      this.useDatabase = hasEvents;

      return hasEvents;
    } catch (error) {

      this.useDatabase = false;
      return false;
    }
  }

  // Get from cache if available and not expired
  private static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  // Set cache
  private static setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Get all events
  static async getAllEvents(): Promise<MarketEvent[]> {
    const cacheKey = 'all-events';
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.getAllEvents();
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {

      this.useDatabase = false;
    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Get events by ticker
  static async getEventsByTicker(ticker: string): Promise<MarketEvent[]> {
    const cacheKey = `events-ticker-${ticker.toUpperCase()}`;
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.getEventsByTicker(ticker);
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {

    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Get events by multiple tickers
  static async getEventsByTickers(tickers: string[]): Promise<MarketEvent[]> {
    const upperTickers = tickers.map(t => t.toUpperCase());
    const cacheKey = `events-tickers-${upperTickers.sort().join(',')}`;
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.getEventsByTickers(tickers);
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {

    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Get upcoming events
  static async getUpcomingEvents(limit?: number): Promise<MarketEvent[]> {
    const cacheKey = `upcoming-events-${limit || 'all'}`;
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.getUpcomingEvents(limit);
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {
    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Get recent events
  static async getRecentEvents(limit?: number): Promise<MarketEvent[]> {
    const cacheKey = `recent-events-${limit || 'all'}`;
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.getRecentEvents(limit);
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {
    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Get events by sector
  static async getEventsBySector(sector: string): Promise<MarketEvent[]> {
    const cacheKey = `events-sector-${sector}`;
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.getEventsBySector(sector);
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {
      console.warn(`Error fetching events for sector ${sector} from database:`, error);
    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Search events
  static async searchEvents(query: string): Promise<MarketEvent[]> {
    const cacheKey = `search-events-${query.toLowerCase()}`;
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.searchEvents(query);
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {

    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Get event by ID
  static async getEventById(id: string): Promise<MarketEvent | null> {
    const cacheKey = `event-${id}`;
    const cached = this.getFromCache<MarketEvent>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const event = await EventsAPI.getEventById(id);
        if (event) {
          this.setCache(cacheKey, event);
          return event;
        }
      }
    } catch (error) {

    }

    // No fallback - return null if database unavailable
    return null;
  }

  // Get events by impact rating
  static async getEventsByImpact(minImpact: number, maxImpact?: number): Promise<MarketEvent[]> {
    const cacheKey = `events-impact-${minImpact}-${maxImpact || 'max'}`;
    const cached = this.getFromCache<MarketEvent[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const events = await EventsAPI.getEventsByImpact(minImpact, maxImpact);
        this.setCache(cacheKey, events);
        return events;
      }
    } catch (error) {

    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Get unique tickers from events
  static async getEventTickers(): Promise<string[]> {
    const cacheKey = 'event-tickers';
    const cached = this.getFromCache<string[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.useDatabase) {
        const tickers = await EventsAPI.getEventTickers();
        this.setCache(cacheKey, tickers);
        return tickers;
      }
    } catch (error) {

    }

    // No fallback - return empty array if database unavailable
    this.setCache(cacheKey, []);
    return [];
  }

  // Clear cache
  static clearCache(): void {
    this.cache.clear();
  }

  // Force refresh
  static async refreshEvents(): Promise<MarketEvent[]> {
    this.clearCache();
    return this.getAllEvents();
  }

  // Initialize the service
  static async initialize(): Promise<boolean> {
    try {
      const available = await this.withTimeout(this.checkDatabaseAvailability(), 1000);
      
      return available;
    } catch (error) {
      this.useDatabase = false;
      return false;
    }
  }

  // Get cache stats
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default EventsService;