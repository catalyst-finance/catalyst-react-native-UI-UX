import StockAPI, { StockData as APIStockData } from './supabase/stock-api';
import EventsService from './events-service';
import { MarketEvent } from './supabase/events-api';

// Unified interface for stock data
export interface StockData {
  symbol: string;
  company: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  sector: string;
  marketCap: string;
  volume: number;
  avgVolume: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
  marketCapValue: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  dividendYield?: number;
  beta?: number;
  eps?: number;
  lastUpdated?: string;
  // Previous session performance (from finnhub_quote_snapshots)
  previousSessionChange?: number;  // Friday's session change
  previousSessionChangePercent?: number; // Friday's session change%
  // Company information fields
  logo?: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  currency?: string;
  employeeTotal?: number;
  exchange?: string;
  industry?: string;
  ipo?: string;
  shareOutstanding?: number;
  weburl?: string;
}

// Convert API stock data to unified format
function apiToUnified(apiStock: APIStockData): StockData {
  // Company name fallbacks
  let company = apiStock.company;
  if (!company || company === 'Unknown Company') {
    const companyMap: Record<string, string> = {
      'AMD': 'Advanced Micro Devices Inc.',
      'PLTR': 'Palantir Technologies Inc.',
      'COIN': 'Coinbase Global Inc.',
      'TSLA': 'Tesla Inc.',
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corp.',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corp.'
    };
    company = companyMap[apiStock.symbol] || `${apiStock.symbol} Inc.`;
  }

  // Sector fallbacks
  let sector = apiStock.sector;
  if (!sector || sector === 'Unknown') {
    const sectorMap: Record<string, string> = {
      'AMD': 'Technology',
      'PLTR': 'Technology',
      'COIN': 'Financial Services',
      'TSLA': 'Consumer Discretionary',
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Communication Services',
      'AMZN': 'Consumer Discretionary',
      'META': 'Communication Services',
      'NVDA': 'Technology'
    };
    sector = sectorMap[apiStock.symbol] || 'Technology';
  }

  return {
    symbol: apiStock.symbol,
    company: company,
    currentPrice: apiStock.currentPrice,
    priceChange: apiStock.priceChange,
    priceChangePercent: apiStock.priceChangePercent,
    sector: sector,
    marketCap: apiStock.marketCap,
    volume: apiStock.volume,
    avgVolume: apiStock.avgVolume,
    peRatio: apiStock.peRatio,
    week52High: apiStock.week52High,
    week52Low: apiStock.week52Low,
    marketCapValue: apiStock.marketCapValue,
    open: apiStock.open,
    high: apiStock.high,
    low: apiStock.low,
    previousClose: apiStock.previousClose,
    dividendYield: apiStock.dividendYield,
    beta: apiStock.beta,
    eps: apiStock.eps,
    lastUpdated: apiStock.lastUpdated,
    // Previous session performance (from finnhub_quote_snapshots)
    previousSessionChange: apiStock.previousSessionChange,
    previousSessionChangePercent: apiStock.previousSessionChangePercent,
    // Company information fields
    logo: apiStock.logo,
    description: apiStock.description,
    city: apiStock.city,
    state: apiStock.state,
    country: apiStock.country,
    currency: apiStock.currency,
    employeeTotal: apiStock.employeeTotal,
    exchange: apiStock.exchange,
    industry: apiStock.industry,
    ipo: apiStock.ipo,
    shareOutstanding: apiStock.shareOutstanding,
    weburl: apiStock.weburl
  };
}

// NOTE: Mock stock data conversion removed - app now only uses real data from Supabase

// Helper function to format market cap
function formatMarketCap(amount: number): string {
  // Check if the amount looks like it's already in actual dollars (mock data)
  // vs. in millions (database data). Database values are typically smaller numbers.
  const isAlreadyInDollars = amount >= 1000000000; // >= 1 billion suggests actual dollars
  const actualAmount = isAlreadyInDollars ? amount : amount * 1000000;
  
  if (actualAmount >= 1000000000000) {
    return `${(actualAmount / 1000000000000).toFixed(2)}T`;
  } else if (actualAmount >= 1000000000) {
    return `${(actualAmount / 1000000000).toFixed(1)}B`;
  } else if (actualAmount >= 1000000) {
    return `${(actualAmount / 1000000).toFixed(1)}M`;
  }
  return `${actualAmount.toLocaleString()}`;
}

class DataService {
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, { data: any; timestamp: number }>();

  // Helper function to add timeout to promises
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Helper function to retry failed operations
  private static async withRetry<T>(
    operation: () => Promise<T>, 
    retries: number = 3, 
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[DataService] Attempt ${attempt}/${retries} failed:`, error);
        
        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = delayMs * Math.pow(2, attempt - 1);
          console.log(`[DataService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after all retries');
  }

  // Check if we should use database or fallback to mock data
  static async checkDatabaseAvailability(): Promise<boolean> {
    try {
      const stocks = await this.withTimeout(StockAPI.getAllStocks(), 1000);
      const hasStocks = Object.keys(stocks).length > 0;
      return hasStocks;
    } catch (error) {
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

  // Get all stocks
  static async getAllStocks(): Promise<Record<string, StockData>> {
    const cacheKey = 'all-stocks';
    const cached = this.getFromCache<Record<string, StockData>>(cacheKey);
    if (cached) return cached;

    try {
      const apiStocks = await StockAPI.getAllStocks();
      const unifiedStocks: Record<string, StockData> = {};
      
      for (const [symbol, apiStock] of Object.entries(apiStocks)) {
        unifiedStocks[symbol] = apiToUnified(apiStock);
      }
      
      this.setCache(cacheKey, unifiedStocks);
      return unifiedStocks;
    } catch (error) {
      // No fallback - return empty object if database unavailable
      this.setCache(cacheKey, {});
      return {};
    }
  }

  // Get specific stock
  static async getStock(symbol: string): Promise<StockData | null> {
    const cacheKey = `stock-${symbol.toUpperCase()}`;
    const cached = this.getFromCache<StockData>(cacheKey);
    if (cached) {
      console.log(`✅ [DataService] Returning cached data for ${symbol}`);
      return cached;
    }

    console.log(`📊 [DataService] Fetching fresh data for ${symbol}...`);

    try {
      const apiStock = await StockAPI.getStock(symbol);
      if (apiStock) {
        const unifiedStock = apiToUnified(apiStock);
        this.setCache(cacheKey, unifiedStock);
        console.log(`✅ [DataService] Successfully fetched and cached ${symbol}:`, {
          price: unifiedStock.currentPrice,
          company: unifiedStock.company
        });
        return unifiedStock;
      } else {
        console.warn(`⚠️ [DataService] StockAPI.getStock returned null for ${symbol}`);
      }
    } catch (error) {
      console.error(`❌ [DataService] Error fetching ${symbol}:`, error);
      // Log the full error details
      if (error instanceof Error) {
        console.error(`  Error message: ${error.message}`);
        console.error(`  Error stack:`, error.stack);
      }
    }

    // No fallback - return null if database unavailable
    console.warn(`❌ [DataService] Returning null for ${symbol} - data unavailable`);
    return null;
  }

  // Get multiple stocks by symbols
  static async getStocks(symbols: string[]): Promise<Record<string, StockData>> {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    const cacheKey = `stocks-${upperSymbols.sort().join(',')}`;
    const cached = this.getFromCache<Record<string, StockData>>(cacheKey);
    if (cached) {
      console.log(`✅ [DataService] Returning cached data for ${upperSymbols.join(', ')}`);
      return cached;
    }

    console.log(`📊 [DataService] Fetching fresh data for ${upperSymbols.join(', ')} with retry logic...`);

    try {
      // Use retry logic for critical portfolio data
      const apiStocks = await this.withRetry(
        () => this.withTimeout(StockAPI.getStocks(upperSymbols), 15000),
        3, // 3 retries
        1000 // 1s initial delay
      );
      
      const unifiedStocks: Record<string, StockData> = {};
      
      for (const [symbol, apiStock] of Object.entries(apiStocks)) {
        unifiedStocks[symbol] = apiToUnified(apiStock);
      }

      console.log(`✅ [DataService] Successfully fetched ${Object.keys(unifiedStocks).length}/${upperSymbols.length} stocks`);
      this.setCache(cacheKey, unifiedStocks);
      return unifiedStocks;
    } catch (error) {
      console.error(`❌ [DataService] Failed to fetch stocks after all retries:`, error);
      // Don't cache failures
      return {};
    }
  }

  // Get stocks by sector
  static async getStocksBySector(sector: string): Promise<StockData[]> {
    const cacheKey = `sector-${sector.toLowerCase()}`;
    const cached = this.getFromCache<StockData[]>(cacheKey);
    if (cached) return cached;

    try {
      const apiStocks = await StockAPI.getStocksBySector(sector);
      const unifiedStocks = apiStocks.map(apiToUnified);
      this.setCache(cacheKey, unifiedStocks);
      return unifiedStocks;
    } catch (error) {
      // No fallback - return empty array if database unavailable
      this.setCache(cacheKey, []);
      return [];
    }
  }

  // Search stocks
  static async searchStocks(query: string, limit: number = 20): Promise<StockData[]> {
    const cacheKey = `search-${query.toLowerCase()}-${limit}`;
    const cached = this.getFromCache<StockData[]>(cacheKey);
    if (cached) return cached;

    try {
      const apiStocks = await StockAPI.searchStocks(query, limit);
      const unifiedStocks = apiStocks.map(apiToUnified);
      this.setCache(cacheKey, unifiedStocks);
      return unifiedStocks;
    } catch (error) {
      // No fallback - return empty array if database unavailable
      this.setCache(cacheKey, []);
      return [];
    }
  }

  // Get all sectors
  static async getSectors(): Promise<string[]> {
    const cacheKey = 'sectors';
    const cached = this.getFromCache<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const sectors = await StockAPI.getSectors();
      this.setCache(cacheKey, sectors);
      return sectors;
    } catch (error) {
      // No fallback - return empty array if database unavailable
      this.setCache(cacheKey, []);
      return [];
    }
  }

  // Clear cache
  static clearCache(): void {
    this.cache.clear();
  }

  // Force refresh (clear cache and refetch)
  static async refreshStock(symbol: string): Promise<StockData | null> {
    this.cache.delete(`stock-${symbol.toUpperCase()}`);
    return this.getStock(symbol);
  }

  // Get cache stats
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Initialize the service (check database availability)
  static async initialize(): Promise<boolean> {
    try {
      let stocksReady = false;
      let eventsReady = false;
      
      // Check stocks database with very short timeout
      try {
        stocksReady = await this.withTimeout(this.checkDatabaseAvailability(), 2000);
      } catch (error) {
        stocksReady = false;
      }
      
      // Check events database with short timeout
      try {
        eventsReady = await this.withTimeout(EventsService.initialize(), 3000);
      } catch (error) {
        eventsReady = false;
      }
      
      const result = stocksReady || eventsReady;
      return result;
    } catch (error) {
      return false;
    }
  }
  // Event-related methods (delegating to EventsService)
  
  // Get all events
  static async getAllEvents(): Promise<MarketEvent[]> {
    return EventsService.getAllEvents();
  }

  // Get events by ticker
  static async getEventsByTicker(ticker: string): Promise<MarketEvent[]> {
    return EventsService.getEventsByTicker(ticker);
  }

  // Get events by multiple tickers
  static async getEventsByTickers(tickers: string[]): Promise<MarketEvent[]> {
    return EventsService.getEventsByTickers(tickers);
  }

  // Get upcoming events
  static async getUpcomingEvents(limit?: number): Promise<MarketEvent[]> {
    return EventsService.getUpcomingEvents(limit);
  }

  // Get recent events
  static async getRecentEvents(limit?: number): Promise<MarketEvent[]> {
    return EventsService.getRecentEvents(limit);
  }

  // Search events
  static async searchEvents(query: string): Promise<MarketEvent[]> {
    return EventsService.searchEvents(query);
  }

  // Get event by ID
  static async getEventById(id: string): Promise<MarketEvent | null> {
    return EventsService.getEventById(id);
  }

  // Get events by impact rating
  static async getEventsByImpact(minImpact: number, maxImpact?: number): Promise<MarketEvent[]> {
    return EventsService.getEventsByImpact(minImpact, maxImpact);
  }

  // Get unique tickers from events
  static async getEventTickers(): Promise<string[]> {
    return EventsService.getEventTickers();
  }

  // Get historical price data for a stock
  static async getHistoricalPrices(
    symbol: string,
    timeframe: 'daily' | 'hourly' | '5min' = 'daily',
    days: number = 30
  ) {
    const { default: HistoricalPriceService } = await import('./historical-price-service');
    return HistoricalPriceService.getHistoricalPrices(symbol, timeframe, days);
  }

  // Get historical price data for multiple stocks
  static async getMultipleHistoricalPrices(
    symbols: string[],
    timeframe: 'daily' | 'hourly' | '5min' = 'daily',
    days: number = 30
  ) {
    const { default: HistoricalPriceService } = await import('./historical-price-service');
    return HistoricalPriceService.getMultipleHistoricalPrices(symbols, timeframe, days);
  }

  // Clear all cache (stocks, events, and historical prices)
  static clearAllCache(): void {
    this.clearCache();
    EventsService.clearCache();
    // Dynamically import and clear historical price cache
    import('./historical-price-service').then(({ default: HistoricalPriceService }) => {
      HistoricalPriceService.clearCache();
    });
  }

  // Get company financials
  static async getFinancials(ticker: string): Promise<any | null> {
    try {
      console.log(`💰 [DataService] Fetching financials for ${ticker}...`);
      const StockAPI = (await import('./supabase/stock-api')).default;
      const financials = await StockAPI.getCompanyFinancials(ticker);
      
      if (financials) {
        console.log(`✅ [DataService] Successfully loaded financials for ${ticker}`);
      } else {
        console.log(`⚠️ [DataService] No financials data found for ${ticker}`);
      }
      
      return financials;
    } catch (error) {
      console.error(`❌ [DataService] Error loading financials for ${ticker}:`, error);
      return null;
    }
  }
}

export default DataService;