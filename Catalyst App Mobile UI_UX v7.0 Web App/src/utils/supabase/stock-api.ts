import { supabase, CatalystStockData, StockQuoteNow, FinnhubQuoteSnapshot, CompanyInformation, CompanyOwnership, CompanyExecutive, CompanyFinancials, STOCK_TABLE, STOCK_QUOTE_TABLE, FINNHUB_SNAPSHOTS_TABLE, COMPANY_INFO_TABLE, COMPANY_OWNERSHIP_TABLE, COMPANY_EXECUTIVES_TABLE, COMPANY_FINANCIALS_TABLE, INTRADAY_PRICES_TABLE } from './client';

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

// Company information mapping (used when stock_quote_now doesn't have company details)
const COMPANY_INFO: Record<string, { company: string; sector: string }> = {
  'AAPL': { company: 'Apple Inc.', sector: 'Technology' },
  'MSFT': { company: 'Microsoft Corp.', sector: 'Technology' },
  'NVDA': { company: 'NVIDIA Corp.', sector: 'Technology' },
  'TSLA': { company: 'Tesla Inc.', sector: 'Consumer Discretionary' },
  'META': { company: 'Meta Platforms Inc.', sector: 'Communication Services' },
  'AMZN': { company: 'Amazon.com Inc.', sector: 'Consumer Discretionary' },
  'GOOGL': { company: 'Alphabet Inc.', sector: 'Communication Services' },
  'MRNA': { company: 'Moderna Inc.', sector: 'Healthcare' },
  'ADBE': { company: 'Adobe Inc.', sector: 'Technology' },
  'JPM': { company: 'JPMorgan Chase & Co.', sector: 'Financial Services' },
  'PFE': { company: 'Pfizer Inc.', sector: 'Healthcare' },
  'GOOG': { company: 'Alphabet Inc.', sector: 'Communication Services' },
};

class StockAPI {
  // Helper function to add timeout to Supabase queries
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Supabase stock query timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Get company information from company_information table
  private static async getCompanyInfo(symbol: string): Promise<CompanyInformation | null> {
    try {
      // First, let's check what's actually in the table
      const { data: allSymbols, error: countError } = await supabase
        .from(COMPANY_INFO_TABLE)
        .select('symbol')
        .limit(10);
      
      // Now try the specific query
      const { data, error } = await supabase
        .from(COMPANY_INFO_TABLE)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - let's try case-insensitive search
          const { data: caseInsensitive, error: ciError } = await supabase
            .from(COMPANY_INFO_TABLE)
            .select('*')
            .ilike('symbol', symbol)
            .limit(1)
            .single();
            
          if (!ciError && caseInsensitive) {
            return caseInsensitive;
          }
          
          return null;
        }
        return null;
      }

      // Parse JSON data for richer information
      const parsedData = this.parseCompanyJSON(data);
      

      return data;
    } catch (error) {
      return null;
    }
  }

  // Get previous_close from finnhub_quote_snapshots table (most recent snapshot)
  private static async getFinnhubSnapshot(symbol: string): Promise<FinnhubQuoteSnapshot | null> {
    try {
      const { data, error } = await supabase
        .from(FINNHUB_SNAPSHOTS_TABLE)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          console.warn(`⚠️ [StockAPI] No Finnhub snapshot found for ${symbol}`);
          return null;
        }
        console.warn(`❌ [StockAPI] Error fetching Finnhub snapshot for ${symbol}:`, error);
        return null;
      }

      // Debug log to verify we're getting the correct snapshot
      console.log(`✅ [StockAPI] Finnhub snapshot for ${symbol}:`, {
        timestamp: data?.timestamp,
        close: data?.close,
        previous_close: data?.previous_close,
        change: data?.change,
        change_percent: data?.change_percent
      });

      return data;
    } catch (error) {
      console.error(`❌ [StockAPI] Exception in getFinnhubSnapshot for ${symbol}:`, error);
      return null;
    }
  }

  // Get today's total volume by summing all intraday volumes
  private static async getTodayTotalVolume(symbol: string): Promise<number | null> {
    try {
      // Get current time in ET timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      
      // Create today's market open time in ET (9:30 AM)
      const todayDateStr = `${year}-${month}-${day}`;
      const marketOpenTimeET = new Date(`${todayDateStr}T09:30:00-05:00`); // EST/EDT
      
      // Query five_minute_prices and sum all volumes for today
      const { data, error } = await supabase
        .from('five_minute_prices')
        .select('volume, timestamp')
        .eq('symbol', symbol.toUpperCase())
        .gte('timestamp', marketOpenTimeET.toISOString())
        .order('timestamp', { ascending: false });
      
      if (error) {
        return null;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Sum all the volumes
      const totalVolume = data.reduce((sum, row) => {
        return sum + (row.volume || 0);
      }, 0);
      
      return totalVolume;
    } catch (error) {
      console.warn(`Error in getTodayTotalVolume for ${symbol}:`, error);
      return null;
    }
  }

  // Get multiple Finnhub snapshots (batch operation)
  private static async getMultipleFinnhubSnapshots(symbols: string[]): Promise<Record<string, FinnhubQuoteSnapshot>> {
    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      
      // Get the most recent snapshot for each symbol using a window function approach
      // First, get all recent snapshots
      const { data, error } = await supabase
        .from(FINNHUB_SNAPSHOTS_TABLE)
        .select('*')
        .in('symbol', upperSymbols)
        .order('timestamp', { ascending: false });

      if (error) {
        console.warn('Error fetching multiple Finnhub snapshots:', error);
        return {};
      }

      // Group by symbol and keep only the most recent
      const snapshotsRecord: Record<string, FinnhubQuoteSnapshot> = {};
      (data || []).forEach(snapshot => {
        if (!snapshotsRecord[snapshot.symbol]) {
          snapshotsRecord[snapshot.symbol] = snapshot;
        }
      });

      return snapshotsRecord;
    } catch (error) {
      console.warn('Error in getMultipleFinnhubSnapshots:', error);
      return {};
    }
  }

  // Get multiple company information records
  private static async getMultipleCompanyInfo(symbols: string[]): Promise<Record<string, CompanyInformation>> {
    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      
      const { data, error } = await supabase
        .from(COMPANY_INFO_TABLE)
        .select('*')
        .in('symbol', upperSymbols);

      if (error) {
        return {};
      }

      const companyInfoRecord: Record<string, CompanyInformation> = {};
      (data || []).forEach(info => {
        companyInfoRecord[info.symbol] = info;
      });

      return companyInfoRecord;
    } catch (error) {
      return {};
    }
  }

  // Helper function to extract rich company data from JSON field
  private static parseCompanyJSON(companyInfo: CompanyInformation | null): {
    description?: string;
    employeeTotal?: number;
    city?: string;
    state?: string;
    address?: string;
  } {
    if (!companyInfo?.json) {
      return {};
    }

    try {
      const jsonData = typeof companyInfo.json === 'string' 
        ? JSON.parse(companyInfo.json) 
        : companyInfo.json;

      // Extract from profile field (most complete data)
      const profile = jsonData?.profile || {};
      
      return {
        description: profile.description || companyInfo.description,
        employeeTotal: profile.employeeTotal || companyInfo.employeeTotal,
        city: profile.city || companyInfo.city,
        state: profile.state || companyInfo.state,
        address: profile.address
      };
    } catch (error) {
      return {
        description: companyInfo.description,
        employeeTotal: companyInfo.employeeTotal,
        city: companyInfo.city,
        state: companyInfo.state
      };
    }
  }

  // Convert new stock_quote_now to app format (with optional company info and Finnhub snapshot)
  private static convertQuoteToStockData(
    quote: StockQuoteNow, 
    companyInfo?: CompanyInformation | null,
    finnhubSnapshot?: FinnhubQuoteSnapshot | null
  ): StockData {
    const fallbackCompanyInfo = COMPANY_INFO[quote.symbol] || { company: 'Unknown Company', sector: 'Unknown' };
    // Note: No mock data fallback - using only API data and company information
    
    // Parse rich company data from JSON field
    const parsedCompanyData = this.parseCompanyJSON(companyInfo);
    
    // Use real company information if available, otherwise fallback
    const company = companyInfo?.name || fallbackCompanyInfo.company;
    const sector = companyInfo?.gsubind || fallbackCompanyInfo.sector;
    
    // Format market cap - prefer company info, then quote
    const marketCapValue = companyInfo?.marketCapitalization || 0;
    const marketCap = typeof marketCapValue === 'number' 
      ? this.formatMarketCap(marketCapValue)
      : marketCapValue.toString();

    // Determine market period to use correct baseline
    const now = new Date();
    const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const dayOfWeek = todayET.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    const marketOpenTime = new Date(todayET);
    marketOpenTime.setHours(9, 30, 0, 0); // 9:30 AM ET
    // Only consider pre-market on actual trading days, not weekends
    const isPreMarket = !isWeekend && todayET.getTime() < marketOpenTime.getTime();
    
    // CRITICAL: 
    // - During pre-market: use yesterday's close (the 'close' field) as baseline
    // - During regular/after hours: use previous_close as baseline
    // - On weekends/holidays: use previous_close as baseline (Friday's previous_close = Thursday's close)
    let baselinePrice: number | undefined;
    let previousCloseValue: number | undefined;
    
    if (isPreMarket && finnhubSnapshot?.close) {
      // Pre-market: Use yesterday's close (the 'close' field) as baseline
      baselinePrice = finnhubSnapshot.close;
      previousCloseValue = finnhubSnapshot.close; // Pass as previousClose for chart reference line
      console.log(`🌅 [StockAPI] ${quote.symbol} PRE-MARKET: Using close as baseline:`, {
        baseline: baselinePrice,
        previousClose: previousCloseValue,
        currentPrice: quote.close
      });
    } else if (finnhubSnapshot?.previous_close) {
      // Regular/After hours/Weekends: Use previous_close as baseline
      baselinePrice = finnhubSnapshot.previous_close;
      previousCloseValue = finnhubSnapshot.previous_close;
      console.log(`🕐 [StockAPI] ${quote.symbol} REGULAR/AFTER/WEEKEND: Using previous_close as baseline:`, {
        baseline: baselinePrice,
        previousClose: previousCloseValue,
        currentPrice: quote.close
      });
    }
    
    // Calculate real-time change and change_percent using the correct baseline
    let priceChange = quote.close && baselinePrice ? quote.close - baselinePrice : 0;
    let priceChangePercent = quote.close && baselinePrice 
      ? ((quote.close - baselinePrice) / baselinePrice) * 100 
      : 0;
    
    console.log(`📊 [StockAPI] ${quote.symbol} Calculated changes:`, {
      currentPrice: quote.close,
      baselinePrice,
      priceChange,
      priceChangePercent,
      isPositive: priceChange >= 0
    });

    return {
      symbol: quote.symbol,
      company,
      currentPrice: quote.close || 0,
      priceChange,
      priceChangePercent,
      sector,
      marketCap,
      volume: quote.volume || 0,
      avgVolume: 0, // Average volume not available - would need separate API call
      peRatio: 0, // PE ratio not available - would need separate API call
      week52High: finnhubSnapshot?.high || 0,
      week52Low: finnhubSnapshot?.low || 0,
      marketCapValue: typeof marketCapValue === 'number' ? marketCapValue : 0,
      open: finnhubSnapshot?.open || undefined,
      high: finnhubSnapshot?.high || undefined,
      low: finnhubSnapshot?.low || undefined,
      previousClose: previousCloseValue, // Use correct baseline based on market period
      dividendYield: undefined, // Dividend yield not available - would need separate API call
      beta: undefined, // Not available in new table
      eps: undefined, // Not available in new table  
      lastUpdated: quote.ingested_at,
      // Previous session performance (from finnhub_quote_snapshots)
      previousSessionChange: finnhubSnapshot?.previous_close && finnhubSnapshot?.close
        ? finnhubSnapshot.close - finnhubSnapshot.previous_close
        : undefined,
      previousSessionChangePercent: finnhubSnapshot?.previous_close && finnhubSnapshot?.close
        ? ((finnhubSnapshot.close - finnhubSnapshot.previous_close) / finnhubSnapshot.previous_close) * 100
        : undefined,
      // Company information fields - use parsed JSON data for rich fields
      logo: companyInfo?.logo || undefined,
      description: parsedCompanyData.description || undefined,
      city: parsedCompanyData.city || undefined,
      state: parsedCompanyData.state || undefined,
      country: companyInfo?.country || undefined,
      currency: companyInfo?.currency || undefined,
      employeeTotal: parsedCompanyData.employeeTotal || undefined,
      exchange: companyInfo?.exchange || undefined,
      industry: companyInfo?.finnhubIndustry || undefined,
      ipo: companyInfo?.ipo || undefined,
      shareOutstanding: companyInfo?.shareOutstanding || undefined,
      weburl: companyInfo?.weburl || undefined
    };
  }

  // Helper function to format market cap
  private static formatMarketCap(amount: number): string {
    // Amount is already in millions, so multiply by 1,000,000 to get actual dollars
    const actualAmount = amount * 1000000;
    
    if (actualAmount >= 1000000000000) {
      return `${(actualAmount / 1000000000000).toFixed(2)}T`;
    } else if (actualAmount >= 1000000000) {
      return `${(actualAmount / 1000000000).toFixed(1)}B`;
    } else if (actualAmount >= 1000000) {
      return `${(actualAmount / 1000000).toFixed(1)}M`;
    }
    return `${actualAmount.toFixed(2)}`;
  }

  // Convert legacy database stock to app format (for fallback)
  private static convertToStockData(dbStock: CatalystStockData): StockData {
    return {
      symbol: dbStock.symbol,
      company: dbStock.company || 'Unknown Company',
      currentPrice: dbStock.currentPrice || 0,
      priceChange: dbStock.priceChange || 0,
      priceChangePercent: dbStock.priceChangePercent || 0,
      sector: dbStock.sector || 'Unknown',
      marketCap: dbStock.marketCap || '$0',
      volume: dbStock.volume || 0,
      avgVolume: dbStock.avgVolume || 0,
      peRatio: dbStock.peRatio || 0,
      week52High: dbStock.week52High || 0,
      week52Low: dbStock.week52Low || 0,
      marketCapValue: dbStock.marketCapValue || 0,
      dividendYield: dbStock.dividendYield ? parseFloat(dbStock.dividendYield) : undefined,
      beta: dbStock.beta || undefined,
      eps: dbStock.eps || undefined,
      lastUpdated: dbStock.lastUpdated || undefined
    };
  }

  // Get all stocks
  static async getAllStocks(): Promise<Record<string, StockData>> {
    try {
      // Try new stock_quote_now table first
      const query = supabase
        .from(STOCK_QUOTE_TABLE)
        .select('*')
        .order('symbol', { ascending: true });

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        return this.getAllStocksLegacy();
      }

      // Get company information for all symbols
      const symbols = (data || []).map(quote => quote.symbol);
      const companyInfoRecord = await this.getMultipleCompanyInfo(symbols);

      // Get Finnhub snapshots for all symbols
      const finnhubSnapshots = await this.getMultipleFinnhubSnapshots(symbols);

      const stocksRecord: Record<string, StockData> = {};
      (data || []).forEach(quote => {
        const companyInfo = companyInfoRecord[quote.symbol];
        const finnhubSnapshot = finnhubSnapshots[quote.symbol];
        stocksRecord[quote.symbol] = this.convertQuoteToStockData(quote, companyInfo, finnhubSnapshot);
      });


      return stocksRecord;
    } catch (error) {
      console.error('Error in getAllStocks:', error);
      // Fallback to legacy table
      return this.getAllStocksLegacy();
    }
  }

  // Fallback method using legacy table
  private static async getAllStocksLegacy(): Promise<Record<string, StockData>> {
    try {
      const query = supabase
        .from(STOCK_TABLE)
        .select('*')
        .order('symbol', { ascending: true });

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      const stocksRecord: Record<string, StockData> = {};
      (data || []).forEach(dbStock => {
        stocksRecord[dbStock.symbol] = this.convertToStockData(dbStock);
      });


      return stocksRecord;
    } catch (error) {

      throw error;
    }
  }

  // Get specific stock
  static async getStock(symbol: string): Promise<StockData | null> {
    try {
      // Try new stock_quote_now table first
      const { data, error } = await supabase
        .from(STOCK_QUOTE_TABLE)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, try legacy table
          return this.getStockLegacy(symbol);
        }

        return this.getStockLegacy(symbol);
      }

      if (!data) {
        return this.getStockLegacy(symbol);
      }

      // Get company information for this symbol
      const companyInfo = await this.getCompanyInfo(symbol);

      // Get Finnhub snapshot for this symbol
      const finnhubSnapshot = await this.getFinnhubSnapshot(symbol);

      // Get today's total volume from intraday prices
      const totalVolume = await this.getTodayTotalVolume(symbol);

      const result = this.convertQuoteToStockData(data, companyInfo, finnhubSnapshot);
      
      // Override volume with summed intraday volume if available
      if (totalVolume !== null) {
        result.volume = totalVolume;
      }
      
      return result;
    } catch (error) {
      // Fallback to legacy table
      return this.getStockLegacy(symbol);
    }
  }

  // Fallback method using legacy table
  private static async getStockLegacy(symbol: string): Promise<StockData | null> {
    try {
      const { data, error } = await supabase
        .from(STOCK_TABLE)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }

        throw new Error(`Database error: ${error.message}`);
      }

      return data ? this.convertToStockData(data) : null;
    } catch (error) {

      throw error;
    }
  }

  // Get multiple stocks by symbols
  static async getStocks(symbols: string[]): Promise<Record<string, StockData>> {
    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      
      // Try new stock_quote_now table first
      const query = supabase
        .from(STOCK_QUOTE_TABLE)
        .select('*')
        .in('symbol', upperSymbols);

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        return this.getStocksLegacy(symbols);
      }

      // Get company information for all symbols
      const companyInfoRecord = await this.getMultipleCompanyInfo(upperSymbols);

      // Get Finnhub snapshots for all symbols
      const finnhubSnapshots = await this.getMultipleFinnhubSnapshots(upperSymbols);

      const stocksRecord: Record<string, StockData> = {};
      (data || []).forEach(quote => {
        const companyInfo = companyInfoRecord[quote.symbol];
        const finnhubSnapshot = finnhubSnapshots[quote.symbol];
        stocksRecord[quote.symbol] = this.convertQuoteToStockData(quote, companyInfo, finnhubSnapshot);
      });


      return stocksRecord;
    } catch (error) {

      // Fallback to legacy table
      return this.getStocksLegacy(symbols);
    }
  }

  // Fallback method using legacy table
  private static async getStocksLegacy(symbols: string[]): Promise<Record<string, StockData>> {
    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      
      const query = supabase
        .from(STOCK_TABLE)
        .select('*')
        .in('symbol', upperSymbols);

      const { data, error } = await this.withTimeout(query, 8000);

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      const stocksRecord: Record<string, StockData> = {};
      (data || []).forEach(dbStock => {
        stocksRecord[dbStock.symbol] = this.convertToStockData(dbStock);
      });


      return stocksRecord;
    } catch (error) {

      throw error;
    }
  }

  // Get stocks by sector (requires company info mapping since new table doesn't have sector)
  static async getStocksBySector(sector: string): Promise<StockData[]> {
    try {
      // Find symbols that match the sector from our company mapping
      const sectorSymbols = Object.entries(COMPANY_INFO)
        .filter(([, info]) => info.sector === sector)
        .map(([symbol]) => symbol);

      if (sectorSymbols.length === 0) {

        return this.getStocksBySectorLegacy(sector);
      }

      // Get quotes for these symbols
      const stocksRecord = await this.getStocks(sectorSymbols);
      return Object.values(stocksRecord);
    } catch (error) {

      // Fallback to legacy table
      return this.getStocksBySectorLegacy(sector);
    }
  }

  // Fallback method using legacy table
  private static async getStocksBySectorLegacy(sector: string): Promise<StockData[]> {
    try {
      const { data, error } = await supabase
        .from(STOCK_TABLE)
        .select('*')
        .eq('sector', sector)
        .order('symbol', { ascending: true });

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      return (data || []).map(this.convertToStockData);
    } catch (error) {

      throw error;
    }
  }

  // Search stocks (note: searching by company name requires fallback to legacy table or external mapping)
  static async searchStocks(query: string, limit: number = 20): Promise<StockData[]> {
    try {
      const searchTerm = query.toLowerCase();
      
      // Search in company_information table by symbol or name
      const { data: companyData, error: companyError } = await supabase
        .from(COMPANY_INFO_TABLE)
        .select('*')
        .or(`symbol.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .order('symbol', { ascending: true })
        .limit(limit);

      if (!companyError && companyData && companyData.length > 0) {
        // Get stock quotes for these symbols
        const symbols = companyData.map(c => c.symbol);
        const { data: quotes, error: quotesError } = await supabase
          .from(STOCK_QUOTE_TABLE)
          .select('*')
          .in('symbol', symbols);

        if (!quotesError && quotes) {
          // Create a map of quotes by symbol
          const quotesMap: Record<string, StockQuoteNow> = {};
          quotes.forEach(q => {
            quotesMap[q.symbol] = q;
          });

          // Combine company info with quotes
          const results = companyData.map(company => {
            const quote = quotesMap[company.symbol];
            if (quote) {
              return this.convertQuoteToStockData(quote, company);
            } else {
              // Return stock data with company info but no price data
              return {
                symbol: company.symbol,
                company: company.name || 'Unknown Company',
                currentPrice: 0,
                priceChange: 0,
                priceChangePercent: 0,
                sector: company.gsubind || company.gsector || 'Unknown',
                marketCap: this.formatMarketCap(company.marketCapitalization || 0),
                volume: 0,
                avgVolume: 0,
                peRatio: 0,
                week52High: 0,
                week52Low: 0,
                marketCapValue: company.marketCapitalization || 0,
                logo: company.logo || undefined,
                description: company.description || undefined,
              };
            }
          });

          return results.slice(0, limit);
        }
      }

      // Fallback to searching just quotes table
      const { data: quotes, error: quoteError } = await supabase
        .from(STOCK_QUOTE_TABLE)
        .select('*')
        .ilike('symbol', `%${searchTerm}%`)
        .order('symbol', { ascending: true })
        .limit(limit);

      if (!quoteError && quotes) {
        // Get company information for the quote results
        const quoteSymbols = quotes.map(q => q.symbol);
        const companyInfoRecord = await this.getMultipleCompanyInfo(quoteSymbols);
        
        const results = quotes.map(quote => {
          const companyInfo = companyInfoRecord[quote.symbol];
          return this.convertQuoteToStockData(quote, companyInfo);
        });

        return results.slice(0, limit);
      }

      // Last resort: fallback to legacy search
      return this.searchStocksLegacy(query, limit);
    } catch (error) {
      console.error('Error searching stocks:', error);
      // Fallback to legacy search
      return this.searchStocksLegacy(query, limit);
    }
  }

  // Fallback search using legacy table
  private static async searchStocksLegacy(query: string, limit: number = 20): Promise<StockData[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      let dbQuery = supabase
        .from(STOCK_TABLE)
        .select('*')
        .or(`symbol.ilike.${searchTerm},company.ilike.${searchTerm}`)
        .order('symbol', { ascending: true });

      if (limit) {
        dbQuery = dbQuery.limit(limit);
      }

      const { data, error } = await dbQuery;

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      return (data || []).map(this.convertToStockData);
    } catch (error) {

      throw error;
    }
  }

  // Get all sectors (from company mapping since new table doesn't have sector info)
  static async getSectors(): Promise<string[]> {
    try {
      // Get sectors from our company mapping
      const sectors = [...new Set(Object.values(COMPANY_INFO).map(info => info.sector))];
      
      if (sectors.length > 0) {
        return sectors.sort();
      }

      // Fallback to legacy table

      return this.getSectorsLegacy();
    } catch (error) {

      // Fallback to legacy table
      return this.getSectorsLegacy();
    }
  }

  // Fallback method using legacy table
  private static async getSectorsLegacy(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(STOCK_TABLE)
        .select('sector')
        .not('sector', 'is', null);

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      const sectors = [...new Set((data || []).map(item => item.sector).filter(Boolean))];
      return sectors.sort();
    } catch (error) {

      throw error;
    }
  }

  // Update stock prices (Note: stock_quote_now is updated by external process, this is for legacy support)
  static async updateStockPrices(
    updates: Array<{
      symbol: string;
      currentPrice: number;
      priceChange: number;
      priceChangePercent: number;
    }>
  ): Promise<void> {

    
    try {
      // Update legacy table for backward compatibility
      const updatePromises = updates.map(update => 
        supabase
          .from(STOCK_TABLE)
          .update({
            currentPrice: update.currentPrice,
            priceChange: update.priceChange,
            priceChangePercent: update.priceChangePercent,
            lastUpdated: new Date().toISOString()
          })
          .eq('symbol', update.symbol.toUpperCase())
      );

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {

        throw new Error(`Failed to update ${errors.length} stocks in legacy table`);
      }


    } catch (error) {

      throw error;
    }
  }

  // Admin: Add or update stock (Note: price data should go to stock_quote_now via external API)
  static async upsertStock(stockData: StockData): Promise<void> {

    
    try {
      // Update legacy table with full stock information
      const dbStock: Partial<CatalystStockData> = {
        symbol: stockData.symbol.toUpperCase(),
        company: stockData.company,
        currentPrice: stockData.currentPrice,
        priceChange: stockData.priceChange,
        priceChangePercent: stockData.priceChangePercent,
        sector: stockData.sector,
        marketCap: stockData.marketCap,
        volume: stockData.volume,
        avgVolume: stockData.avgVolume,
        peRatio: stockData.peRatio,
        week52High: stockData.week52High,
        week52Low: stockData.week52Low,
        marketCapValue: stockData.marketCapValue,
        dividendYield: stockData.dividendYield?.toString(),
        beta: stockData.beta,
        eps: stockData.eps,
        lastUpdated: new Date().toISOString()
      };

      const { error } = await supabase
        .from(STOCK_TABLE)
        .upsert(dbStock, { onConflict: 'symbol' });

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }


    } catch (error) {

      throw error;
    }
  }

  // Admin: Bulk update stocks (Note: price data should go to stock_quote_now via external API)
  static async bulkUpsertStocks(stocks: StockData[]): Promise<void> {

    
    try {
      const dbStocks: Partial<CatalystStockData>[] = stocks.map(stockData => ({
        symbol: stockData.symbol.toUpperCase(),
        company: stockData.company,
        currentPrice: stockData.currentPrice,
        priceChange: stockData.priceChange,
        priceChangePercent: stockData.priceChangePercent,
        sector: stockData.sector,
        marketCap: stockData.marketCap,
        volume: stockData.volume,
        avgVolume: stockData.avgVolume,
        peRatio: stockData.peRatio,
        week52High: stockData.week52High,
        week52Low: stockData.week52Low,
        marketCapValue: stockData.marketCapValue,
        dividendYield: stockData.dividendYield?.toString(),
        beta: stockData.beta,
        eps: stockData.eps,
        lastUpdated: new Date().toISOString()
      }));

      const { error } = await supabase
        .from(STOCK_TABLE)
        .upsert(dbStocks, { onConflict: 'symbol' });

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }


    } catch (error) {

      throw error;
    }
  }

  // Admin: Delete stock (Note: stock_quote_now managed externally)
  static async deleteStock(symbol: string): Promise<void> {

    
    try {
      const { error } = await supabase
        .from(STOCK_TABLE)
        .delete()
        .eq('symbol', symbol.toUpperCase());

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }


    } catch (error) {

      throw error;
    }
  }

  // Get unique symbols from stock table
  static async getStockSymbols(): Promise<string[]> {
    try {
      // Try new stock_quote_now table first
      const { data, error } = await supabase
        .from(STOCK_QUOTE_TABLE)
        .select('symbol')
        .order('symbol', { ascending: true });

      if (error) {

        return this.getStockSymbolsLegacy();
      }

      return (data || []).map(item => item.symbol);
    } catch (error) {

      // Fallback to legacy table
      return this.getStockSymbolsLegacy();
    }
  }

  // Fallback method using legacy table
  private static async getStockSymbolsLegacy(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(STOCK_TABLE)
        .select('symbol')
        .order('symbol', { ascending: true });

      if (error) {

        throw new Error(`Database error: ${error.message}`);
      }

      return (data || []).map(item => item.symbol);
    } catch (error) {

      throw error;
    }
  }

  // Get daily historical prices from daily_prices table
  static async getDailyPrices(
    symbol: string,
    fromDate: string,
    toDate: string
  ): Promise<Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      // Use exact match with uppercase for better index usage
      const { data, error } = await this.withTimeout(
        supabase
          .from('daily_prices')
          .select('date, open, high, low, close, volume')
          .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: true }),
        5000 // Reduced timeout to fail faster
      );

      if (error) {
        console.error(`❌ Error fetching daily prices for ${symbol}:`, error);
        return [];
      }

      const prices = (data || []).map(row => ({
        date: row.date,
        open: row.open || 0,
        high: row.high || 0,
        low: row.low || 0,
        close: row.close || 0,
        volume: row.volume || 0
      }));

      console.log(`✅ Fetched ${prices.length} daily prices for ${symbol} (case-insensitive) from ${fromDate} to ${toDate}`);
      return prices;
    } catch (error) {
      console.error(`❌ Error in getDailyPrices for ${symbol}:`, error);
      return [];
    }
  }

  // Get daily prices for multiple symbols
  static async getMultipleDailyPrices(
    symbols: string[],
    fromDate: string,
    toDate: string
  ): Promise<Record<string, Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>>> {
    try {
      // To handle mixed case in DB, query with both uppercase and lowercase versions
      const symbolVariants: string[] = [];
      symbols.forEach(s => {
        symbolVariants.push(s.toUpperCase());
        symbolVariants.push(s.toLowerCase());
      });
      
      const { data, error } = await this.withTimeout(
        supabase
          .from('daily_prices')
          .select('symbol, date, open, high, low, close, volume')
          .in('symbol', symbolVariants) // Query both cases
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: true }),
        15000
      );

      if (error) {
        console.error('Error fetching multiple daily prices:', error);
        return {};
      }

      // Group by symbol (normalized to uppercase)
      const result: Record<string, Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>> = {};

      (data || []).forEach(row => {
        const symbol = row.symbol.toUpperCase(); // Normalize to uppercase
        if (!result[symbol]) {
          result[symbol] = [];
        }
        result[symbol].push({
          date: row.date,
          open: row.open || 0,
          high: row.high || 0,
          low: row.low || 0,
          close: row.close || 0,
          volume: row.volume || 0
        });
      });

      console.log(`✅ Fetched daily prices for ${Object.keys(result).length} symbols (case-insensitive)`);
      return result;
    } catch (error) {
      console.error('Error in getMultipleDailyPrices:', error);
      return {};
    }
  }

  // Get the most recent price for a symbol from daily_prices
  static async getMostRecentDailyPrice(symbol: string): Promise<{
    date: string;
    close: number;
  } | null> {
    try {
      const { data, error } = await this.withTimeout(
        supabase
          .from('daily_prices')
          .select('date, close')
          .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
          .order('date', { ascending: false })
          .limit(1)
          .single(),
        3000 // Reduced timeout
      );

      if (error || !data) {
        return null;
      }

      return {
        date: data.date,
        close: data.close || 0
      };
    } catch (error) {
      console.error('Error in getMostRecentDailyPrice:', error);
      return null;
    }
  }

  // Get stock splits for a symbol
  static async getStockSplits(
    symbol: string,
    fromDate?: string,  // Optional: only get splits after this date
    toDate?: string     // Optional: only get splits before this date
  ): Promise<Array<{
    symbol: string;
    split_date: string;
    from_factor: number;
    to_factor: number;
    split_ratio: number;
  }>> {
    try {
      let query = supabase
        .from('stock_splits')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .order('split_date', { ascending: true });

      // Apply date filters if provided
      if (fromDate) {
        query = query.gte('split_date', fromDate);
      }
      if (toDate) {
        query = query.lte('split_date', toDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching stock splits for ${symbol}:`, error);
        return [];
      }

      return (data || []).map(split => ({
        symbol: split.symbol,
        split_date: split.split_date,
        from_factor: parseFloat(split.from_factor),
        to_factor: parseFloat(split.to_factor),
        split_ratio: parseFloat(split.split_ratio)
      }));
    } catch (error) {
      console.error(`Error in getStockSplits for ${symbol}:`, error);
      return [];
    }
  }

  // Get intraday prices (minute-by-minute) from intraday_prices table
  static async getIntradayPrices(
    symbol: string,
    fromTimestamp?: string, // ISO 8601 timestamp
    toTimestamp?: string,    // ISO 8601 timestamp
    limit?: number,          // Max number of rows to return
    sampleRate?: number      // Sample every Nth row (e.g., 30 = every 30 seconds)
  ): Promise<Array<{
    timestamp: string;
    price: number;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    change: number | null;
    change_percent: number | null;
    session?: string; // Session type: pre-market, regular, after-hours
  }>> {
    try {
      // Default limit: 2000 rows (optimized for performance)
      // For 1D view: ~390 5-minute bars (6.5 hours * 12 bars/hour)
      // This limit allows for minute-by-minute data if needed while preventing timeouts
      const effectiveLimit = limit || 2000;
      
      // Build query with optimized order: filter first (symbol + timestamp range), then order, then limit
      // This ensures the database uses indexes efficiently: (symbol, timestamp) composite index
      let query = supabase
        .from(INTRADAY_PRICES_TABLE)
        .select('timestamp, price, volume, session'); // Select fields including session for market hours detection

      // Apply filters first (most selective to least selective)
      query = query.eq('symbol', symbol.toUpperCase()); // Primary filter

      if (fromTimestamp) {
        query = query.gte('timestamp', fromTimestamp);
      }
      if (toTimestamp) {
        query = query.lte('timestamp', toTimestamp);
      }

      // Apply ordering and limit after filters
      query = query
        .order('timestamp', { ascending: true })
        .limit(effectiveLimit); // ✅ EXPLICIT LIMIT

      const { data, error } = await this.withTimeout(query, 10000); // Increased timeout to 10s for large queries

      if (error) {
        // Check if it's a timeout error
        if (error.message?.includes('timed out')) {
          console.error(`❌ Query timeout for ${symbol} intraday prices. This likely indicates missing database index.`);
          console.error(`   Recommended index: CREATE INDEX IF NOT EXISTS idx_intraday_prices_symbol_timestamp ON intraday_prices(symbol, timestamp DESC);`);
          console.error(`   Time range: ${fromTimestamp} to ${toTimestamp}, Limit: ${effectiveLimit}`);
        } else {
          console.error(`❌ Error fetching intraday prices for ${symbol}:`, error);
        }
        return [];
      }

      let prices = (data || []).map(row => ({
        timestamp: row.timestamp,
        price: row.price || 0,
        open: null, // These fields don't exist in intraday_prices table
        high: null,
        low: null,
        volume: row.volume,
        change: null,
        change_percent: null,
        session: row.session // Pass through session field for market hours classification
      }));

      // Apply sampling if specified (client-side sampling for additional control)
      if (sampleRate && sampleRate > 1) {
        prices = prices.filter((_, index) => index % sampleRate === 0);
        console.log(`✅ Sampled ${prices.length} intraday prices for ${symbol} (rate: 1/${sampleRate})`);
      } else {
        console.log(`✅ Fetched ${prices.length} intraday prices for ${symbol} (limit: ${effectiveLimit})`);
      }

      return prices;
    } catch (error) {
      console.error(`❌ Error in getIntradayPrices for ${symbol}:`, error);
      return [];
    }
  }

  // Get intraday prices for multiple symbols
  static async getMultipleIntradayPrices(
    symbols: string[],
    fromTimestamp?: string,
    toTimestamp?: string
  ): Promise<Record<string, Array<{
    timestamp: string;
    price: number;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    change: number | null;
    change_percent: number | null;
  }>>> {
    try {
      const symbolVariants: string[] = [];
      symbols.forEach(s => {
        symbolVariants.push(s.toUpperCase());
        symbolVariants.push(s.toLowerCase());
      });

      let query = supabase
        .from(INTRADAY_PRICES_TABLE)
        .select('symbol, timestamp, price, open, high, low, volume, change, change_percent')
        .in('symbol', symbolVariants)
        .order('timestamp', { ascending: true });

      if (fromTimestamp) {
        query = query.gte('timestamp', fromTimestamp);
      }
      if (toTimestamp) {
        query = query.lte('timestamp', toTimestamp);
      }

      const { data, error } = await this.withTimeout(query, 15000);

      if (error) {
        console.error('Error fetching multiple intraday prices:', error);
        return {};
      }

      // Group by symbol (normalized to uppercase)
      const result: Record<string, Array<{
        timestamp: string;
        price: number;
        open: number | null;
        high: number | null;
        low: number | null;
        volume: number | null;
        change: number | null;
        change_percent: number | null;
      }>> = {};

      (data || []).forEach(row => {
        const symbol = row.symbol.toUpperCase();
        if (!result[symbol]) {
          result[symbol] = [];
        }
        result[symbol].push({
          timestamp: row.timestamp,
          price: row.price || 0,
          open: row.open,
          high: row.high,
          low: row.low,
          volume: row.volume,
          change: row.change,
          change_percent: row.change_percent
        });
      });

      console.log(`✅ Fetched intraday prices for ${Object.keys(result).length} symbols`);
      return result;
    } catch (error) {
      console.error('Error in getMultipleIntradayPrices:', error);
      return {};
    }
  }

  // Get pre-aggregated 1-minute VWAP prices from one_minute_prices table
  static async getOneMinutePrices(
    symbol: string,
    fromTimestamp?: string, // ISO 8601 timestamp
    toTimestamp?: string     // ISO 8601 timestamp
  ): Promise<Array<{
    timestamp: string;
    timestamp_et: string; // ET timezone timestamp (generated column)
    price: number;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number;
    volume: number | null;
  }>> {
    try {
      // console.log(`[${symbol}] getOneMinutePrices called with range: ${fromTimestamp} to ${toTimestamp}`);
      
      let query = supabase
        .from('one_minute_prices')  // Use VWAP one_minute_prices table
        .select('timestamp, timestamp_et, open, high, low, close, volume')  // Select OHLCV + timestamps
        .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
        .order('timestamp', { ascending: true });

      if (fromTimestamp) {
        query = query.gte('timestamp', fromTimestamp);
      }
      if (toTimestamp) {
        query = query.lte('timestamp', toTimestamp);
      }

      const { data, error } = await this.withTimeout(query, 10000);

      if (error) {
        console.error(`❌ Error fetching one_minute_prices for ${symbol}:`, error);
        return [];
      }

      // console.log(`[${symbol}] Query returned ${(data || []).length} rows from one_minute_prices`);

      const prices = (data || []).map(row => ({
        timestamp: row.timestamp,
        timestamp_et: row.timestamp_et, // Pass through ET timestamp (generated column)
        price: row.close || 0,   // Use close as primary price
        open: row.open || 0,
        high: row.high || 0,
        low: row.low || 0,
        close: row.close || 0,
        volume: row.volume
      }));

      // console.log(`✅ Fetched ${prices.length} one_minute_prices for ${symbol}`);
      return prices;
    } catch (error) {
      console.error(`❌ Error in getOneMinutePrices for ${symbol}:`, error);
      return [];
    }
  }

  // Get pre-aggregated 5-minute prices from five_minute_prices table
  static async getFiveMinutePrices(
    symbol: string,
    fromTimestamp?: string, // ISO 8601 timestamp
    toTimestamp?: string     // ISO 8601 timestamp
  ): Promise<Array<{
    timestamp: string;
    timestamp_et: string; // ET timezone timestamp (generated column)
    price: number;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number;
    volume: number | null;
    session?: string; // Session type: pre-market, regular, after-hours
  }>> {
    try {
      // console.log(`[${symbol}] getFiveMinutePrices called with range: ${fromTimestamp} to ${toTimestamp}`);
      
      let query = supabase
        .from('five_minute_prices')  // Use aggregated five_minute_prices table
        .select('timestamp, timestamp_et, open, high, low, close, volume')  // Select OHLCV + timestamps
        .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
        .order('timestamp', { ascending: true });

      if (fromTimestamp) {
        query = query.gte('timestamp', fromTimestamp);
      }
      if (toTimestamp) {
        query = query.lte('timestamp', toTimestamp);
      }

      const { data, error } = await this.withTimeout(query, 10000);

      if (error) {
        console.error(`❌ Error fetching five_minute_prices for ${symbol}:`, error);
        return [];
      }

      const prices = (data || []).map(row => ({
        timestamp: row.timestamp,
        timestamp_et: row.timestamp_et, // Pass through ET timestamp (generated column)
        price: row.close || 0,   // Use close as primary price
        open: row.open || 0,
        high: row.high || 0,
        low: row.low || 0,
        close: row.close || 0,
        volume: row.volume
        // No session field - charts will calculate it from timestamp_et
      }));

      // console.log(`✅ Fetched ${prices.length} five_minute_prices for ${symbol}`);
      return prices;
    } catch (error) {
      console.error(`❌ Error in getFiveMinutePrices for ${symbol}:`, error);
      return [];
    }
  }

  // Get pre-aggregated 10-minute prices from ten_minute_prices table (for candlestick charts)
  static async getTenMinutePrices(
    symbol: string,
    fromTimestamp?: string, // ISO 8601 timestamp
    toTimestamp?: string     // ISO 8601 timestamp
  ): Promise<Array<{
    timestamp: string;
    timestamp_et: string; // ET timezone timestamp (generated column)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
  }>> {
    try {
      // console.log(`[${symbol}] getTenMinutePrices called with range: ${fromTimestamp} to ${toTimestamp}`);
      
      let query = supabase
        .from('ten_minute_prices')  // Use aggregated ten_minute_prices table
        .select('timestamp, timestamp_et, open, high, low, close, volume')  // Select OHLCV + timestamps
        .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
        .order('timestamp', { ascending: true });

      if (fromTimestamp) {
        query = query.gte('timestamp', fromTimestamp);
      }
      if (toTimestamp) {
        query = query.lte('timestamp', toTimestamp);
      }

      const { data, error } = await this.withTimeout(query, 10000);

      if (error) {
        console.error(`❌ Error fetching ten_minute_prices for ${symbol}:`, error);
        return [];
      }

      const prices = (data || []).map(row => ({
        timestamp: row.timestamp,
        timestamp_et: row.timestamp_et,
        open: row.open || 0,
        high: row.high || 0,
        low: row.low || 0,
        close: row.close || 0,
        volume: row.volume
      }));

      // console.log(`✅ Fetched ${prices.length} ten_minute_prices for ${symbol}`);
      return prices;
    } catch (error) {
      console.error(`❌ Error in getTenMinutePrices for ${symbol}:`, error);
      return [];
    }
  }

  // Get hourly prices from hourly_prices table
  static async getHourlyPrices(
    symbol: string,
    fromTimestamp?: string, // ISO 8601 timestamp
    toTimestamp?: string     // ISO 8601 timestamp
  ): Promise<Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      let query = supabase
        .from('hourly_prices')
        .select('timestamp, open, high, low, close, volume')
        .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
        .order('timestamp', { ascending: true });

      if (fromTimestamp) {
        query = query.gte('timestamp', fromTimestamp);
      }
      if (toTimestamp) {
        query = query.lte('timestamp', toTimestamp);
      }

      const { data, error } = await this.withTimeout(query, 10000);

      if (error) {
        console.error(`❌ Error fetching hourly_prices for ${symbol}:`, error);
        return [];
      }

      const prices = (data || []).map(row => ({
        timestamp: row.timestamp,
        open: row.open || 0,
        high: row.high || 0,
        low: row.low || 0,
        close: row.close || 0,
        volume: row.volume || 0
      }));

      console.log(`✅ Fetched ${prices.length} hourly_prices for ${symbol} from ${fromTimestamp} to ${toTimestamp}`);
      return prices;
    } catch (error) {
      console.error(`❌ Error in getHourlyPrices for ${symbol}:`, error);
      return [];
    }
  }

  // Get today's market close price (4 PM ET) for a specific symbol
  // On holidays, this will fetch the most recent trading day's close
  static async getMarketClosePrice(symbol: string): Promise<number | null> {
    try {
      // Get today's date in ET timezone
      const now = new Date();
      const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // CRITICAL: On holidays or weekends, we need the most recent trading day's close
      // Import the helper functions from market-status.ts
      const { isTodayHoliday, getHolidayName } = await import('../market-status');
      
      let targetDate = new Date(todayET);
      
      // Check if today is a full holiday (no trading at all)
      const isHoliday = await isTodayHoliday();
      
      // Check if today is a weekend
      const dayOfWeek = todayET.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (isHoliday || isWeekend) {
        const holidayName = isHoliday ? await getHolidayName() : null;
        
        // Go back one day initially
        targetDate.setDate(targetDate.getDate() - 1);
        
        // Keep going back until we find a non-holiday, non-weekend trading day
        let attempts = 0;
        while (attempts < 7) { // Max 7 days back
          const targetDayOfWeek = targetDate.getDay();
          if (targetDayOfWeek === 0 || targetDayOfWeek === 6) {
            // Weekend, go back another day
            targetDate.setDate(targetDate.getDate() - 1);
            attempts++;
            continue;
          }
          
          // For simplicity, we assume no consecutive holidays - just skip weekends
          break;
        }
      }
      
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // FIRST: Try to get the official close from finnhub_quote_snapshots
      // This is the most accurate source as it contains the official market close price
      
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('finnhub_quote_snapshots')
        .select('close, timestamp, previous_close')
        .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
        .eq('market_date', targetDateStr)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (!snapshotError && snapshotData && snapshotData.length > 0) {
        return snapshotData[0].close;
      }
      
      // FALLBACK: If no quote snapshot, try one_minute_prices
      
      // Set market hours for query
      const marketOpenTime = new Date(targetDate);
      marketOpenTime.setHours(9, 30, 0, 0);
      
      const marketCloseTime = new Date(targetDate);
      marketCloseTime.setHours(16, 0, 0, 0); // Default 4 PM close
      
      const { data, error } = await supabase
        .from('one_minute_prices')
        .select('close, timestamp')
        .eq('symbol', symbol.toUpperCase()) // Use exact match with uppercase for better index usage
        .gte('timestamp', marketOpenTime.toISOString())
        .lte('timestamp', marketCloseTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (error) {
        return null;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return data[0].close;
    } catch (error) {
      console.error(`Error in getMarketClosePrice for ${symbol}:`, error);
      return null;
    }
  }

  // Get company ownership data
  static async getCompanyOwnership(symbol: string, limit: number = 100): Promise<CompanyOwnership[]> {
    try {
      console.log(`👥 [StockAPI] Fetching ownership data for ${symbol} (limit: ${limit})...`);
      
      const { data, error } = await supabase
        .from(COMPANY_OWNERSHIP_TABLE)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .order('share', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.error(`❌ [StockAPI] Error fetching ownership for ${symbol}:`, error);
        return [];
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️ [StockAPI] No ownership data found for ${symbol}`);
        return [];
      }

      console.log(`✅ [StockAPI] Found ${data.length} ownership records for ${symbol}`);
      return data as CompanyOwnership[];
    } catch (error) {
      console.error(`❌ [StockAPI] Error in getCompanyOwnership for ${symbol}:`, error);
      return [];
    }
  }

  // Get company executives data
  static async getCompanyExecutives(symbol: string, limit: number = 100): Promise<CompanyExecutive[]> {
    try {
      console.log(`👥 [StockAPI] Fetching executives data for ${symbol} (limit: ${limit})...`);
      
      const { data, error } = await supabase
        .from(COMPANY_EXECUTIVES_TABLE)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .order('id', { ascending: true })
        .limit(limit);

      if (error) {
        console.error(`❌ [StockAPI] Supabase error in getCompanyExecutives for ${symbol}:`, error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log(`⚠️ [StockAPI] No executives data found for ${symbol}`);
        return [];
      }

      console.log(`✅ [StockAPI] Found ${data.length} executives records for ${symbol}`);
      return data as CompanyExecutive[];
    } catch (error) {
      console.error(`❌ [StockAPI] Error in getCompanyExecutives for ${symbol}:`, error);
      return [];
    }
  }

  // Get company financials data
  static async getCompanyFinancials(symbol: string): Promise<CompanyFinancials | null> {
    try {
      console.log(`💰 [StockAPI] Fetching financials data for ${symbol}...`);
      
      const { data, error } = await supabase
        .from(COMPANY_FINANCIALS_TABLE)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️ [StockAPI] No financials data found for ${symbol}`);
          return null;
        }
        console.error(`❌ [StockAPI] Supabase error in getCompanyFinancials for ${symbol}:`, error);
        return null;
      }

      if (!data) {
        console.log(`⚠️ [StockAPI] No financials data found for ${symbol}`);
        return null;
      }

      console.log(`✅ [StockAPI] Found financials data for ${symbol}`);
      return data as CompanyFinancials;
    } catch (error) {
      console.error(`❌ [StockAPI] Error in getCompanyFinancials for ${symbol}:`, error);
      return null;
    }
  }
}

export default StockAPI;