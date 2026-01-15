/**
 * Stock API Service for React Native
 * 
 * Simplified version focusing on essential functions needed for charts.
 * Uses AsyncStorage for caching and handles network state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './client';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for stock data
const CACHE_PREFIX = 'stock_';

export interface StockData {
  symbol: string;
  company: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  sector: string;
  marketCap: string;
  volume: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  lastUpdated?: string;
  logo?: string;
}

export interface CompanyInfo {
  symbol: string;
  name: string;
  logo?: string;
  weburl?: string;
  exchange?: string;
  industry?: string;
  gsubind?: string;
  employeeTotal?: number;
  city?: string;
  state?: string;
  country?: string;
  ipo?: string;
  description?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
}

export interface CompanyOwnership {
  id: number;
  symbol: string;
  name: string;
  share: number | null;
  change: number | null;
  filing_date: string | null;
  fetched_at: string;
}

export interface CompanyExecutive {
  id: number;
  symbol: string;
  name: string;
  position: string | null;
  age: number | null;
  compensation: number | null;
  currency: string | null;
  sex: string | null;
  since: string | null;
  fetched_at: string;
  raw: any | null;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

class StockAPI {
  // Cache helpers
  private static async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const { data, timestamp }: CachedData<T> = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
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

  private static async setCache<T>(key: string, data: T): Promise<void> {
    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
    } catch (error) {
      console.error(`Error writing cache for ${key}:`, error);
    }
  }

  // Network state check
  private static async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }

  // Format market cap
  private static formatMarketCap(amount: number): string {
    const actualAmount = amount * 1000000; // Amount is in millions
    
    if (actualAmount >= 1000000000000) {
      return `${(actualAmount / 1000000000000).toFixed(2)}T`;
    } else if (actualAmount >= 1000000000) {
      return `${(actualAmount / 1000000000).toFixed(1)}B`;
    } else if (actualAmount >= 1000000) {
      return `${(actualAmount / 1000000).toFixed(1)}M`;
    }
    return `${actualAmount.toFixed(2)}`;
  }

  /**
   * Get a single stock by symbol
   * @param symbol Stock symbol
   * @param skipCache If true, bypass cache and fetch fresh data
   */
  static async getStock(symbol: string, skipCache: boolean = false): Promise<StockData | null> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `stock_${upperSymbol}`;

    // Try cache first (unless skipping)
    if (!skipCache) {
      const cached = await this.getFromCache<StockData>(cacheKey);
      if (cached) return cached;
    }

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn(`⚠️ [StockAPI] Offline, no cached data for ${upperSymbol}`);
      return null;
    }

    try {
      // Fetch from Supabase
      const { data: quote, error } = await supabase
        .from('stock_quote_now')
        .select('*')
        .eq('symbol', upperSymbol)
        .single();

      if (error) {
        console.error(`❌ [StockAPI] Error fetching ${upperSymbol}:`, error);
        return null;
      }

      if (!quote) return null;

      // Get company info
      const { data: companyInfo } = await supabase
        .from('company_information')
        .select('*')
        .eq('symbol', upperSymbol)
        .single();

      // Get Finnhub snapshot for previous close
      const { data: snapshot } = await supabase
        .from('finnhub_quote_snapshots')
        .select('*')
        .eq('symbol', upperSymbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      // Determine baseline price (pre-market vs regular hours)
      const now = new Date();
      const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const dayOfWeek = todayET.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const marketOpenTime = new Date(todayET);
      marketOpenTime.setHours(9, 30, 0, 0);
      const isPreMarket = !isWeekend && todayET.getTime() < marketOpenTime.getTime();

      let baselinePrice: number | undefined;
      let previousClose: number | undefined;

      if (isPreMarket && snapshot?.close) {
        baselinePrice = snapshot.close;
        previousClose = snapshot.close;
      } else if (snapshot?.previous_close) {
        baselinePrice = snapshot.previous_close;
        previousClose = snapshot.previous_close;
      }

      // Calculate changes
      const priceChange = quote.close && baselinePrice ? quote.close - baselinePrice : 0;
      const priceChangePercent = quote.close && baselinePrice 
        ? ((quote.close - baselinePrice) / baselinePrice) * 100 
        : 0;

      const stockData: StockData = {
        symbol: quote.symbol,
        company: companyInfo?.name || 'Unknown Company',
        currentPrice: quote.close || 0,
        priceChange,
        priceChangePercent,
        sector: companyInfo?.gsubind || 'Unknown',
        marketCap: this.formatMarketCap(companyInfo?.marketCapitalization || 0),
        volume: quote.volume || 0,
        previousClose,
        open: snapshot?.open,
        high: snapshot?.high,
        low: snapshot?.low,
        lastUpdated: quote.ingested_at,
        logo: companyInfo?.logo || undefined,
      };

      // Cache the result
      await this.setCache(cacheKey, stockData);

      return stockData;
    } catch (error) {
      console.error(`❌ [StockAPI] Exception fetching ${upperSymbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple stocks by symbols
   * @param symbols Array of stock symbols
   * @param skipCache If true, bypass cache and fetch fresh data
   */
  static async getStocks(symbols: string[], skipCache: boolean = false): Promise<Record<string, StockData>> {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    const result: Record<string, StockData> = {};

    // Try to get from cache first (unless skipping)
    if (!skipCache) {
      const cachePromises = upperSymbols.map(async (symbol) => {
        const cached = await this.getFromCache<StockData>(`stock_${symbol}`);
        if (cached) {
          result[symbol] = cached;
        }
        return { symbol, cached: !!cached };
      });

      const cacheResults = await Promise.all(cachePromises);
      const uncachedSymbols = cacheResults
        .filter(r => !r.cached)
        .map(r => r.symbol);

      // If all cached, return
      if (uncachedSymbols.length === 0) {
        return result;
      }
    }

    // If skipping cache, fetch all symbols
    const symbolsToFetch = skipCache ? upperSymbols : upperSymbols.filter(s => !result[s]);

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn(`⚠️ [StockAPI] Offline, returning ${Object.keys(result).length}/${symbols.length} cached stocks`);
      return result;
    }

    try {
      // Fetch uncached stocks
      const { data: quotes, error } = await supabase
        .from('stock_quote_now')
        .select('*')
        .in('symbol', symbolsToFetch);

      if (error) {
        console.error('❌ [StockAPI] Error fetching stocks:', error);
        return result;
      }

      // Get company info for all
      const { data: companyInfos } = await supabase
        .from('company_information')
        .select('*')
        .in('symbol', symbolsToFetch);

      // Get snapshots for all
      const { data: snapshots } = await supabase
        .from('finnhub_quote_snapshots')
        .select('*')
        .in('symbol', symbolsToFetch)
        .order('timestamp', { ascending: false });

      // Create maps
      const companyMap = new Map(companyInfos?.map(c => [c.symbol, c]) || []);
      const snapshotMap = new Map<string, any>();
      snapshots?.forEach(s => {
        if (!snapshotMap.has(s.symbol)) {
          snapshotMap.set(s.symbol, s);
        }
      });

      // Process each quote
      quotes?.forEach(quote => {
        const companyInfo = companyMap.get(quote.symbol);
        const snapshot = snapshotMap.get(quote.symbol);

        // Determine baseline
        const now = new Date();
        const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const dayOfWeek = todayET.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const marketOpenTime = new Date(todayET);
        marketOpenTime.setHours(9, 30, 0, 0);
        const isPreMarket = !isWeekend && todayET.getTime() < marketOpenTime.getTime();

        let baselinePrice: number | undefined;
        let previousClose: number | undefined;

        if (isPreMarket && snapshot?.close) {
          baselinePrice = snapshot.close;
          previousClose = snapshot.close;
        } else if (snapshot?.previous_close) {
          baselinePrice = snapshot.previous_close;
          previousClose = snapshot.previous_close;
        }

        const priceChange = quote.close && baselinePrice ? quote.close - baselinePrice : 0;
        const priceChangePercent = quote.close && baselinePrice 
          ? ((quote.close - baselinePrice) / baselinePrice) * 100 
          : 0;

        const stockData: StockData = {
          symbol: quote.symbol,
          company: companyInfo?.name || 'Unknown Company',
          currentPrice: quote.close || 0,
          priceChange,
          priceChangePercent,
          sector: companyInfo?.gsubind || 'Unknown',
          marketCap: this.formatMarketCap(companyInfo?.marketCapitalization || 0),
          volume: quote.volume || 0,
          previousClose,
          open: snapshot?.open,
          high: snapshot?.high,
          low: snapshot?.low,
          lastUpdated: quote.ingested_at,
          logo: companyInfo?.logo || undefined,
        };

        result[quote.symbol] = stockData;
        this.setCache(`stock_${quote.symbol}`, stockData);
      });

      return result;
    } catch (error) {
      console.error('❌ [StockAPI] Exception fetching stocks:', error);
      return result;
    }
  }

  /**
   * Get all stocks (for watchlist/portfolio)
   */
  static async getAllStocks(): Promise<Record<string, StockData>> {
    const cacheKey = 'all_stocks';

    // Try cache first
    const cached = await this.getFromCache<Record<string, StockData>>(cacheKey);
    if (cached) return cached;

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn('⚠️ [StockAPI] Offline, no cached data for all stocks');
      return {};
    }

    try {
      const { data: quotes, error } = await supabase
        .from('stock_quote_now')
        .select('*')
        .order('symbol', { ascending: true });

      if (error) {
        console.error('❌ [StockAPI] Error fetching all stocks:', error);
        return {};
      }

      const symbols = quotes?.map(q => q.symbol) || [];
      
      // Get company info
      const { data: companyInfos } = await supabase
        .from('company_information')
        .select('*')
        .in('symbol', symbols);

      // Get snapshots
      const { data: snapshots } = await supabase
        .from('finnhub_quote_snapshots')
        .select('*')
        .in('symbol', symbols)
        .order('timestamp', { ascending: false });

      // Create maps
      const companyMap = new Map(companyInfos?.map(c => [c.symbol, c]) || []);
      const snapshotMap = new Map<string, any>();
      snapshots?.forEach(s => {
        if (!snapshotMap.has(s.symbol)) {
          snapshotMap.set(s.symbol, s);
        }
      });

      const result: Record<string, StockData> = {};

      quotes?.forEach(quote => {
        const companyInfo = companyMap.get(quote.symbol);
        const snapshot = snapshotMap.get(quote.symbol);

        // Determine baseline
        const now = new Date();
        const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const dayOfWeek = todayET.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const marketOpenTime = new Date(todayET);
        marketOpenTime.setHours(9, 30, 0, 0);
        const isPreMarket = !isWeekend && todayET.getTime() < marketOpenTime.getTime();

        let baselinePrice: number | undefined;
        let previousClose: number | undefined;

        if (isPreMarket && snapshot?.close) {
          baselinePrice = snapshot.close;
          previousClose = snapshot.close;
        } else if (snapshot?.previous_close) {
          baselinePrice = snapshot.previous_close;
          previousClose = snapshot.previous_close;
        }

        const priceChange = quote.close && baselinePrice ? quote.close - baselinePrice : 0;
        const priceChangePercent = quote.close && baselinePrice 
          ? ((quote.close - baselinePrice) / baselinePrice) * 100 
          : 0;

        result[quote.symbol] = {
          symbol: quote.symbol,
          company: companyInfo?.name || 'Unknown Company',
          currentPrice: quote.close || 0,
          priceChange,
          priceChangePercent,
          sector: companyInfo?.gsubind || 'Unknown',
          marketCap: this.formatMarketCap(companyInfo?.marketCapitalization || 0),
          volume: quote.volume || 0,
          previousClose,
          open: snapshot?.open,
          high: snapshot?.high,
          low: snapshot?.low,
          lastUpdated: quote.ingested_at,
          logo: companyInfo?.logo || undefined,
        };
      });

      // Cache the result
      await this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error('❌ [StockAPI] Exception fetching all stocks:', error);
      return {};
    }
  }

  /**
   * Search stocks by symbol or company name
   */
  static async searchStocks(query: string, limit: number = 20): Promise<StockData[]> {
    const online = await this.isOnline();
    if (!online) {
      console.warn('⚠️ [StockAPI] Offline, cannot search');
      return [];
    }

    try {
      const searchTerm = query.toLowerCase();

      // Search in company_information
      const { data: companyData, error: companyError } = await supabase
        .from('company_information')
        .select('*')
        .or(`symbol.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .order('symbol', { ascending: true })
        .limit(limit);

      if (companyError || !companyData || companyData.length === 0) {
        return [];
      }

      const symbols = companyData.map(c => c.symbol);

      // Get quotes for these symbols
      const { data: quotes } = await supabase
        .from('stock_quote_now')
        .select('*')
        .in('symbol', symbols);

      // Get snapshots
      const { data: snapshots } = await supabase
        .from('finnhub_quote_snapshots')
        .select('*')
        .in('symbol', symbols)
        .order('timestamp', { ascending: false });

      const quotesMap = new Map(quotes?.map(q => [q.symbol, q]) || []);
      const snapshotMap = new Map<string, any>();
      snapshots?.forEach(s => {
        if (!snapshotMap.has(s.symbol)) {
          snapshotMap.set(s.symbol, s);
        }
      });

      const results: StockData[] = companyData.map(company => {
        const quote = quotesMap.get(company.symbol);
        const snapshot = snapshotMap.get(company.symbol);

        if (!quote) {
          return {
            symbol: company.symbol,
            company: company.name || 'Unknown Company',
            currentPrice: 0,
            priceChange: 0,
            priceChangePercent: 0,
            sector: company.gsubind || 'Unknown',
            marketCap: this.formatMarketCap(company.marketCapitalization || 0),
            volume: 0,
            logo: company.logo || undefined,
          };
        }

        // Determine baseline
        const now = new Date();
        const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const dayOfWeek = todayET.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const marketOpenTime = new Date(todayET);
        marketOpenTime.setHours(9, 30, 0, 0);
        const isPreMarket = !isWeekend && todayET.getTime() < marketOpenTime.getTime();

        let baselinePrice: number | undefined;
        let previousClose: number | undefined;

        if (isPreMarket && snapshot?.close) {
          baselinePrice = snapshot.close;
          previousClose = snapshot.close;
        } else if (snapshot?.previous_close) {
          baselinePrice = snapshot.previous_close;
          previousClose = snapshot.previous_close;
        }

        const priceChange = quote.close && baselinePrice ? quote.close - baselinePrice : 0;
        const priceChangePercent = quote.close && baselinePrice 
          ? ((quote.close - baselinePrice) / baselinePrice) * 100 
          : 0;

        return {
          symbol: quote.symbol,
          company: company.name || 'Unknown Company',
          currentPrice: quote.close || 0,
          priceChange,
          priceChangePercent,
          sector: company.gsubind || 'Unknown',
          marketCap: this.formatMarketCap(company.marketCapitalization || 0),
          volume: quote.volume || 0,
          previousClose,
          open: snapshot?.open,
          high: snapshot?.high,
          low: snapshot?.low,
          lastUpdated: quote.ingested_at,
          logo: company.logo || undefined,
        };
      });

      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ [StockAPI] Exception searching stocks:', error);
      return [];
    }
  }

  /**
   * Clear all cached stock data
   */
  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stockKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(stockKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get full company information by symbol
   * @param symbol Stock symbol
   * @param skipCache If true, bypass cache and fetch fresh data
   */
  static async getCompanyInfo(symbol: string, skipCache: boolean = false): Promise<CompanyInfo | null> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `company_info_${upperSymbol}`;

    // Try cache first (unless skipping)
    if (!skipCache) {
      const cached = await this.getFromCache<CompanyInfo>(cacheKey);
      if (cached) return cached;
    }

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn(`⚠️ [StockAPI] Offline, no cached company info for ${upperSymbol}`);
      return null;
    }

    try {
      // Fetch from Supabase company_information table
      const { data: companyInfo, error } = await supabase
        .from('company_information')
        .select('*')
        .eq('symbol', upperSymbol)
        .single();

      if (error) {
        console.error(`❌ [StockAPI] Error fetching company info for ${upperSymbol}:`, error);
        return null;
      }

      if (!companyInfo) return null;

      const result: CompanyInfo = {
        symbol: companyInfo.symbol,
        name: companyInfo.name || 'Unknown Company',
        logo: companyInfo.logo,
        weburl: companyInfo.weburl,
        exchange: companyInfo.exchange,
        industry: companyInfo.finnhubIndustry || companyInfo.gsubind,
        gsubind: companyInfo.gsubind,
        employeeTotal: companyInfo.employeeTotal,
        city: companyInfo.city,
        state: companyInfo.state,
        country: companyInfo.country,
        ipo: companyInfo.ipo,
        description: companyInfo.description,
        marketCapitalization: companyInfo.marketCapitalization,
        shareOutstanding: companyInfo.shareOutstanding,
      };

      // Cache the result
      await this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`❌ [StockAPI] Exception fetching company info for ${upperSymbol}:`, error);
      return null;
    }
  }

  /**
   * Get company financials by symbol
   * @param symbol Stock symbol
   * @param skipCache If true, bypass cache and fetch fresh data
   */
  static async getFinancials(symbol: string, skipCache: boolean = false): Promise<any | null> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `financials_${upperSymbol}`;

    // Try cache first (unless skipping)
    if (!skipCache) {
      const cached = await this.getFromCache<any>(cacheKey);
      if (cached) return cached;
    }

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn(`⚠️ [StockAPI] Offline, no cached financials for ${upperSymbol}`);
      return null;
    }

    try {
      // Fetch from Supabase company_financials table
      const { data: financials, error } = await supabase
        .from('company_financials')
        .select('*')
        .eq('symbol', upperSymbol)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error(`❌ [StockAPI] Error fetching financials for ${upperSymbol}:`, error);
        return null;
      }

      if (!financials) return null;

      // Cache the result
      await this.setCache(cacheKey, financials);

      return financials;
    } catch (error) {
      console.error(`❌ [StockAPI] Exception fetching financials for ${upperSymbol}:`, error);
      return null;
    }
  }

  /**
   * Get company ownership data by symbol
   * @param symbol Stock symbol
   * @param limit Maximum number of records to return (default: 100)
   * @param skipCache If true, bypass cache and fetch fresh data
   */
  static async getCompanyOwnership(symbol: string, limit: number = 100, skipCache: boolean = false): Promise<CompanyOwnership[]> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `ownership_${upperSymbol}`;

    // Try cache first (unless skipping)
    if (!skipCache) {
      const cached = await this.getFromCache<CompanyOwnership[]>(cacheKey);
      if (cached) return cached;
    }

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn(`⚠️ [StockAPI] Offline, no cached ownership for ${upperSymbol}`);
      return [];
    }

    try {
      // Fetch from Supabase company_ownership table
      const { data, error } = await supabase
        .from('company_ownership')
        .select('*')
        .eq('symbol', upperSymbol)
        .order('share', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.error(`❌ [StockAPI] Error fetching ownership for ${upperSymbol}:`, error);
        return [];
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️ [StockAPI] No ownership data found for ${upperSymbol}`);
        return [];
      }

      const result = data as CompanyOwnership[];

      // Cache the result
      await this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`❌ [StockAPI] Exception fetching ownership for ${upperSymbol}:`, error);
      return [];
    }
  }

  /**
   * Get company executives data by symbol
   * @param symbol Stock symbol
   * @param limit Maximum number of records to return (default: 100)
   * @param skipCache If true, bypass cache and fetch fresh data
   */
  static async getCompanyExecutives(symbol: string, limit: number = 100, skipCache: boolean = false): Promise<CompanyExecutive[]> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `executives_${upperSymbol}`;

    // Try cache first (unless skipping)
    if (!skipCache) {
      const cached = await this.getFromCache<CompanyExecutive[]>(cacheKey);
      if (cached) return cached;
    }

    // Check network
    const online = await this.isOnline();
    if (!online) {
      console.warn(`⚠️ [StockAPI] Offline, no cached executives for ${upperSymbol}`);
      return [];
    }

    try {
      // Fetch from Supabase company_executives table
      const { data, error } = await supabase
        .from('company_executives')
        .select('*')
        .eq('symbol', upperSymbol)
        .order('id', { ascending: true })
        .limit(limit);

      if (error) {
        console.error(`❌ [StockAPI] Error fetching executives for ${upperSymbol}:`, error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log(`⚠️ [StockAPI] No executives data found for ${upperSymbol}`);
        return [];
      }

      const result = data as CompanyExecutive[];

      // Cache the result
      await this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`❌ [StockAPI] Exception fetching executives for ${upperSymbol}:`, error);
      return [];
    }
  }
}

export default StockAPI;
