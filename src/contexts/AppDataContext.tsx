/**
 * AppDataContext
 * 
 * Global data context that preloads and caches all app data on startup.
 * Components consume this context instead of fetching data individually.
 * This ensures data is loaded once and shared across the app.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StockAPI, { StockData } from '../services/supabase/StockAPI';
import HistoricalPriceAPI from '../services/supabase/HistoricalPriceAPI';
import EventsAPI, { MarketEvent } from '../services/supabase/EventsAPI';

// Default tickers
const DEFAULT_HOLDINGS = ['TSLA', 'MNMD', 'TMC'];
const DEFAULT_WATCHLIST = ['AAPL'];

export interface PortfolioHolding {
  ticker: string;
  shares: number;
  avgCost: number;
  purchaseDate?: string;
}

interface AppDataState {
  // Loading state
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  isReady: boolean;
  
  // Tickers
  holdingsTickers: string[];
  watchlistTickers: string[];
  portfolioHoldings: PortfolioHolding[];
  
  // Data
  stocksData: Record<string, StockData>;
  intradayData: Record<string, any[]>;
  events: Record<string, MarketEvent[]>;
  
  // Actions
  refreshData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataState | null>(null);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};

interface AppDataProviderProps {
  children: ReactNode;
  onLoadingProgress?: (progress: number, message: string) => void;
  onReady?: () => void;
}

export const AppDataProvider: React.FC<AppDataProviderProps> = ({
  children,
  onLoadingProgress,
  onReady,
}) => {
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isReady, setIsReady] = useState(false);
  
  // Tickers
  const [holdingsTickers, setHoldingsTickers] = useState<string[]>([]);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  
  // Data
  const [stocksData, setStocksData] = useState<Record<string, StockData>>({});
  const [intradayData, setIntradayData] = useState<Record<string, any[]>>({});
  const [events, setEvents] = useState<Record<string, MarketEvent[]>>({});

  const updateProgress = useCallback((progress: number, message: string) => {
    setLoadingProgress(progress);
    setLoadingMessage(message);
    onLoadingProgress?.(progress, message);
  }, [onLoadingProgress]);

  // Load tickers from storage
  const loadTickers = useCallback(async (): Promise<{
    holdings: string[];
    watchlist: string[];
    portfolioHoldings: PortfolioHolding[];
  }> => {
    try {
      const [holdingsStr, watchlistStr, portfolioStr] = await Promise.all([
        AsyncStorage.getItem('holdings'),
        AsyncStorage.getItem('watchlist'),
        AsyncStorage.getItem('portfolio_holdings'),
      ]);

      const holdings = holdingsStr ? JSON.parse(holdingsStr) : DEFAULT_HOLDINGS;
      const watchlist = watchlistStr ? JSON.parse(watchlistStr) : DEFAULT_WATCHLIST;
      const portfolio = portfolioStr ? JSON.parse(portfolioStr) : [
        { ticker: 'TSLA', shares: 10, avgCost: 453.14 },
        { ticker: 'MNMD', shares: 200, avgCost: 13.45 },
        { ticker: 'TMC', shares: 500, avgCost: 6.42 },
      ];

      return { holdings, watchlist, portfolioHoldings: portfolio };
    } catch (error) {
      console.error('Error loading tickers:', error);
      return {
        holdings: DEFAULT_HOLDINGS,
        watchlist: DEFAULT_WATCHLIST,
        portfolioHoldings: [
          { ticker: 'TSLA', shares: 10, avgCost: 453.14 },
          { ticker: 'MNMD', shares: 200, avgCost: 13.45 },
          { ticker: 'TMC', shares: 500, avgCost: 6.42 },
        ],
      };
    }
  }, []);

  // Load stock data for all tickers
  const loadStockData = useCallback(async (tickers: string[]): Promise<Record<string, StockData>> => {
    const data: Record<string, StockData> = {};
    
    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const stockData = await StockAPI.getStock(ticker);
          if (stockData) {
            data[ticker] = stockData;
          }
        } catch (error) {
          console.warn(`Failed to load stock data for ${ticker}:`, error);
        }
      })
    );

    return data;
  }, []);

  // Load intraday data for all tickers
  const loadIntradayData = useCallback(async (tickers: string[]): Promise<Record<string, any[]>> => {
    const data: Record<string, any[]> = {};
    
    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const intradayPrices = await HistoricalPriceAPI.fetchHistoricalData(ticker, '1D');
          data[ticker] = intradayPrices || [];
        } catch (error) {
          console.warn(`Failed to load intraday data for ${ticker}:`, error);
          data[ticker] = [];
        }
      })
    );

    return data;
  }, []);

  // Load events for all tickers
  const loadEvents = useCallback(async (tickers: string[]): Promise<Record<string, MarketEvent[]>> => {
    const eventsData: Record<string, MarketEvent[]> = {};
    
    try {
      const allEvents = await EventsAPI.getEventsByTickers(tickers);
      
      // Group by ticker
      allEvents.forEach(event => {
        const ticker = event.ticker || event.symbol || 'N/A';
        if (!eventsData[ticker]) {
          eventsData[ticker] = [];
        }
        eventsData[ticker].push(event);
      });
    } catch (error) {
      console.error('Error loading events:', error);
    }

    return eventsData;
  }, []);

  // Prefetch company logos using expo-image for better caching
  const prefetchLogos = useCallback(async (stocks: Record<string, StockData>): Promise<void> => {
    const logoUrls = Object.values(stocks)
      .filter(s => s.logo)
      .map(s => s.logo!);

    // Use expo-image's prefetch which has better caching
    await Promise.all(
      logoUrls.map(async (url) => {
        try {
          await ExpoImage.prefetch(url);
        } catch (error) {
          // Ignore individual logo failures
        }
      })
    );
  }, []);

  // Preload all historical time ranges for smooth slider experience
  const preloadAllHistoricalRanges = useCallback(async (tickers: string[]): Promise<void> => {
    // Preload all time ranges for all tickers in parallel
    await Promise.all(
      tickers.map(ticker => HistoricalPriceAPI.preloadAllTimeRanges(ticker))
    );
    console.log(`✅ [AppDataContext] Preloaded all historical ranges for ${tickers.length} tickers`);
  }, []);

  // Main preload function
  const preloadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Load tickers (10%)
      updateProgress(10, 'Loading your portfolio...');
      const { holdings, watchlist, portfolioHoldings: portfolio } = await loadTickers();
      setHoldingsTickers(holdings);
      setWatchlistTickers(watchlist);
      setPortfolioHoldings(portfolio);
      
      const allTickers = [...new Set([...holdings, ...watchlist])];
      
      // Step 2: Load stock data (25%)
      updateProgress(25, 'Fetching stock prices...');
      const stocks = await loadStockData(allTickers);
      setStocksData(stocks);
      
      // Step 3: Load intraday data (40%)
      updateProgress(40, 'Loading chart data...');
      const intraday = await loadIntradayData(allTickers);
      setIntradayData(intraday);
      
      // Step 4: Preload all historical ranges for smooth slider (55%)
      updateProgress(55, 'Caching historical data...');
      await preloadAllHistoricalRanges(allTickers);
      
      // Step 5: Load events (70%)
      updateProgress(70, 'Loading events...');
      const eventsData = await loadEvents(allTickers);
      setEvents(eventsData);
      
      // Step 6: Prefetch logos (90%)
      updateProgress(85, 'Loading company logos...');
      await prefetchLogos(stocks);
      
      // Complete
      updateProgress(100, 'Ready!');
      
      // Small delay to show "Ready!" message
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsReady(true);
      setIsLoading(false);
      onReady?.();
      
    } catch (error) {
      console.error('Error preloading data:', error);
      setIsReady(true);
      setIsLoading(false);
      onReady?.();
    }
  }, [loadTickers, loadStockData, loadIntradayData, preloadAllHistoricalRanges, loadEvents, prefetchLogos, updateProgress, onReady]);

  // Refresh data (for pull-to-refresh)
  const refreshData = useCallback(async () => {
    const allTickers = [...new Set([...holdingsTickers, ...watchlistTickers])];
    
    // Clear cache for all tickers to get fresh data
    allTickers.forEach(ticker => HistoricalPriceAPI.clearCache(ticker));
    
    const [stocks, intraday, eventsData] = await Promise.all([
      loadStockData(allTickers),
      loadIntradayData(allTickers),
      loadEvents(allTickers),
    ]);
    
    setStocksData(stocks);
    setIntradayData(intraday);
    setEvents(eventsData);
    
    // Re-preload all historical ranges in background
    preloadAllHistoricalRanges(allTickers).catch(err => {
      console.warn('Failed to re-preload historical ranges after refresh:', err);
    });
  }, [holdingsTickers, watchlistTickers, loadStockData, loadIntradayData, loadEvents, preloadAllHistoricalRanges]);

  // Initial load
  useEffect(() => {
    preloadAllData();
  }, []);

  const value: AppDataState = {
    isLoading,
    loadingProgress,
    loadingMessage,
    isReady,
    holdingsTickers,
    watchlistTickers,
    portfolioHoldings,
    stocksData,
    intradayData,
    events,
    refreshData,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;
