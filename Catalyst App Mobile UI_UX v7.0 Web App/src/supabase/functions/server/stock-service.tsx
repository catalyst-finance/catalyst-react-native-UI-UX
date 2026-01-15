import * as kv from './kv_store.tsx';

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
  dividendYield?: number;
  beta?: number;
  eps?: number;
  lastUpdated: string;
}

// Stock data keys
const STOCK_PREFIX = 'stock:';
const STOCKS_LIST_KEY = 'stocks:list';
const STOCKS_BY_SECTOR_PREFIX = 'stocks:sector:';

export class StockService {
  // Get all stock symbols
  static async getAllStockSymbols(): Promise<string[]> {
    try {
      const symbols = await kv.get(STOCKS_LIST_KEY);
      return symbols ? JSON.parse(symbols) : [];
    } catch (error) {
      console.error('Error getting stock symbols:', error);
      return [];
    }
  }

  // Get stock data by symbol
  static async getStock(symbol: string): Promise<StockData | null> {
    try {
      const stockData = await kv.get(`${STOCK_PREFIX}${symbol.toUpperCase()}`);
      return stockData ? JSON.parse(stockData) : null;
    } catch (error) {
      console.error(`Error getting stock ${symbol}:`, error);
      return null;
    }
  }

  // Get multiple stocks by symbols
  static async getStocks(symbols: string[]): Promise<Record<string, StockData>> {
    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      const keys = upperSymbols.map(symbol => `${STOCK_PREFIX}${symbol}`);
      const stocksData = await kv.mget(keys);
      
      const result: Record<string, StockData> = {};
      stocksData.forEach((data, index) => {
        if (data) {
          const stock = JSON.parse(data);
          result[upperSymbols[index]] = stock;
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error getting multiple stocks:', error);
      return {};
    }
  }

  // Get all stocks
  static async getAllStocks(): Promise<Record<string, StockData>> {
    try {
      const symbols = await this.getAllStockSymbols();
      return await this.getStocks(symbols);
    } catch (error) {
      console.error('Error getting all stocks:', error);
      return {};
    }
  }

  // Get stocks by sector
  static async getStocksBySector(sector: string): Promise<StockData[]> {
    try {
      const sectorSymbols = await kv.get(`${STOCKS_BY_SECTOR_PREFIX}${sector.toLowerCase()}`);
      if (!sectorSymbols) return [];
      
      const symbols = JSON.parse(sectorSymbols);
      const stocksData = await this.getStocks(symbols);
      
      return Object.values(stocksData);
    } catch (error) {
      console.error(`Error getting stocks for sector ${sector}:`, error);
      return [];
    }
  }

  // Add or update a stock
  static async upsertStock(stockData: StockData): Promise<boolean> {
    try {
      const symbol = stockData.symbol.toUpperCase();
      const stockKey = `${STOCK_PREFIX}${symbol}`;
      
      // Add timestamp
      stockData.lastUpdated = new Date().toISOString();
      
      // Store the stock data
      await kv.set(stockKey, JSON.stringify(stockData));
      
      // Update the symbols list
      const symbols = await this.getAllStockSymbols();
      if (!symbols.includes(symbol)) {
        symbols.push(symbol);
        await kv.set(STOCKS_LIST_KEY, JSON.stringify(symbols));
      }
      
      // Update sector index
      await this.updateSectorIndex(symbol, stockData.sector);
      
      return true;
    } catch (error) {
      console.error(`Error upserting stock ${stockData.symbol}:`, error);
      return false;
    }
  }

  // Bulk upsert stocks
  static async bulkUpsertStocks(stocks: StockData[]): Promise<boolean> {
    try {
      const operations: Array<{key: string, value: string}> = [];
      const symbols: string[] = [];
      const sectorMap: Record<string, string[]> = {};
      
      // Prepare all operations
      for (const stock of stocks) {
        const symbol = stock.symbol.toUpperCase();
        stock.lastUpdated = new Date().toISOString();
        
        operations.push({
          key: `${STOCK_PREFIX}${symbol}`,
          value: JSON.stringify(stock)
        });
        
        symbols.push(symbol);
        
        // Group by sector
        const sector = stock.sector.toLowerCase();
        if (!sectorMap[sector]) sectorMap[sector] = [];
        sectorMap[sector].push(symbol);
      }
      
      // Bulk set stock data
      const keys = operations.map(op => op.key);
      const values = operations.map(op => op.value);
      await kv.mset(keys, values);
      
      // Update symbols list
      const existingSymbols = await this.getAllStockSymbols();
      const allSymbols = [...new Set([...existingSymbols, ...symbols])];
      await kv.set(STOCKS_LIST_KEY, JSON.stringify(allSymbols));
      
      // Update sector indices
      const sectorOperations: Array<{key: string, value: string}> = [];
      for (const [sector, sectorSymbols] of Object.entries(sectorMap)) {
        const existingSectorSymbols = await kv.get(`${STOCKS_BY_SECTOR_PREFIX}${sector}`);
        const existing = existingSectorSymbols ? JSON.parse(existingSectorSymbols) : [];
        const combined = [...new Set([...existing, ...sectorSymbols])];
        
        sectorOperations.push({
          key: `${STOCKS_BY_SECTOR_PREFIX}${sector}`,
          value: JSON.stringify(combined)
        });
      }
      
      if (sectorOperations.length > 0) {
        await kv.mset(
          sectorOperations.map(op => op.key),
          sectorOperations.map(op => op.value)
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error bulk upserting stocks:', error);
      return false;
    }
  }

  // Update sector index
  private static async updateSectorIndex(symbol: string, sector: string): Promise<void> {
    try {
      const sectorKey = `${STOCKS_BY_SECTOR_PREFIX}${sector.toLowerCase()}`;
      const existingSymbols = await kv.get(sectorKey);
      const symbols = existingSymbols ? JSON.parse(existingSymbols) : [];
      
      if (!symbols.includes(symbol)) {
        symbols.push(symbol);
        await kv.set(sectorKey, JSON.stringify(symbols));
      }
    } catch (error) {
      console.error(`Error updating sector index for ${symbol}:`, error);
    }
  }

  // Delete a stock
  static async deleteStock(symbol: string): Promise<boolean> {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Get stock data to know the sector
      const stockData = await this.getStock(upperSymbol);
      
      // Delete the stock
      await kv.del(`${STOCK_PREFIX}${upperSymbol}`);
      
      // Remove from symbols list
      const symbols = await this.getAllStockSymbols();
      const updatedSymbols = symbols.filter(s => s !== upperSymbol);
      await kv.set(STOCKS_LIST_KEY, JSON.stringify(updatedSymbols));
      
      // Remove from sector index
      if (stockData) {
        const sectorKey = `${STOCKS_BY_SECTOR_PREFIX}${stockData.sector.toLowerCase()}`;
        const sectorSymbols = await kv.get(sectorKey);
        if (sectorSymbols) {
          const symbols = JSON.parse(sectorSymbols);
          const updatedSectorSymbols = symbols.filter((s: string) => s !== upperSymbol);
          await kv.set(sectorKey, JSON.stringify(updatedSectorSymbols));
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting stock ${symbol}:`, error);
      return false;
    }
  }

  // Get all available sectors
  static async getSectors(): Promise<string[]> {
    try {
      const keys = await kv.getByPrefix(STOCKS_BY_SECTOR_PREFIX);
      return keys.map(key => {
        const sector = key.replace(STOCKS_BY_SECTOR_PREFIX, '');
        return sector.charAt(0).toUpperCase() + sector.slice(1);
      }).sort();
    } catch (error) {
      console.error('Error getting sectors:', error);
      return [];
    }
  }

  // Search stocks by name or symbol
  static async searchStocks(query: string, limit: number = 20): Promise<StockData[]> {
    try {
      const allStocks = await this.getAllStocks();
      const searchTerm = query.toLowerCase();
      
      const results = Object.values(allStocks).filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm) ||
        stock.company.toLowerCase().includes(searchTerm)
      );
      
      return results.slice(0, limit);
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }

  // Update stock prices (for real-time price updates)
  static async updateStockPrices(priceUpdates: Array<{symbol: string, currentPrice: number, priceChange: number, priceChangePercent: number}>): Promise<boolean> {
    try {
      const operations: Array<{key: string, value: string}> = [];
      
      for (const update of priceUpdates) {
        const symbol = update.symbol.toUpperCase();
        const existingStock = await this.getStock(symbol);
        
        if (existingStock) {
          existingStock.currentPrice = update.currentPrice;
          existingStock.priceChange = update.priceChange;
          existingStock.priceChangePercent = update.priceChangePercent;
          existingStock.lastUpdated = new Date().toISOString();
          
          operations.push({
            key: `${STOCK_PREFIX}${symbol}`,
            value: JSON.stringify(existingStock)
          });
        }
      }
      
      if (operations.length > 0) {
        await kv.mset(
          operations.map(op => op.key),
          operations.map(op => op.value)
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error updating stock prices:', error);
      return false;
    }
  }
}