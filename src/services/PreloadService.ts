/**
 * PreloadService
 * 
 * Handles preloading of all app data and images on startup.
 * This includes stock data, events, and company logos.
 */

import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StockAPI from './supabase/StockAPI';
import EventsAPI from './supabase/EventsAPI';

const PRELOAD_CACHE_KEY = 'preload_cache_v1';

export interface PreloadProgress {
  progress: number; // 0-100
  message: string;
  stage: 'init' | 'stocks' | 'events' | 'logos' | 'complete';
}

type ProgressCallback = (progress: PreloadProgress) => void;

class PreloadService {
  private static logoCache: Map<string, string> = new Map();
  private static isInitialized = false;

  /**
   * Main preload function - call this on app startup
   */
  static async preloadAll(
    tickers: string[],
    onProgress?: ProgressCallback
  ): Promise<void> {
    try {
      // Stage 1: Initialize (10%)
      onProgress?.({ progress: 5, message: 'Initializing...', stage: 'init' });

      // Stage 2: Load stock data (30%)
      onProgress?.({ progress: 15, message: 'Loading stock data...', stage: 'stocks' });
      const stockData = await this.preloadStockData(tickers);
      onProgress?.({ progress: 30, message: 'Stock data loaded', stage: 'stocks' });

      // Stage 3: Load events (50%)
      onProgress?.({ progress: 35, message: 'Loading events...', stage: 'events' });
      await this.preloadEvents(tickers);
      onProgress?.({ progress: 50, message: 'Events loaded', stage: 'events' });

      // Stage 4: Preload company logos (90%)
      onProgress?.({ progress: 55, message: 'Loading company logos...', stage: 'logos' });
      const logos = stockData
        .filter(s => s?.logo)
        .map(s => ({ ticker: s.symbol, url: s.logo! }));
      
      await this.preloadLogos(logos, (logoProgress) => {
        const overallProgress = 55 + (logoProgress * 0.35); // 55-90%
        onProgress?.({ 
          progress: Math.round(overallProgress), 
          message: `Loading logos (${Math.round(logoProgress * 100)}%)...`, 
          stage: 'logos' 
        });
      });

      // Stage 5: Complete (100%)
      onProgress?.({ progress: 100, message: 'Ready!', stage: 'complete' });
      this.isInitialized = true;

      // Save preload timestamp
      await AsyncStorage.setItem(PRELOAD_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        tickers,
      }));

    } catch (error) {
      console.error('PreloadService error:', error);
      // Don't throw - allow app to continue even if preload fails
      onProgress?.({ progress: 100, message: 'Ready', stage: 'complete' });
    }
  }

  /**
   * Preload stock data for given tickers
   */
  private static async preloadStockData(tickers: string[]): Promise<any[]> {
    try {
      const results = await Promise.all(
        tickers.map(async (ticker) => {
          try {
            return await StockAPI.getStock(ticker);
          } catch (e) {
            console.warn(`Failed to preload stock ${ticker}:`, e);
            return null;
          }
        })
      );
      return results.filter(Boolean);
    } catch (error) {
      console.error('Error preloading stock data:', error);
      return [];
    }
  }

  /**
   * Preload events for given tickers
   */
  private static async preloadEvents(tickers: string[]): Promise<void> {
    try {
      // Fetch all events for the tickers
      await EventsAPI.getEventsByTickers(tickers);
    } catch (error) {
      console.error('Error preloading events:', error);
    }
  }

  /**
   * Preload and cache company logos using Image.prefetch
   */
  private static async preloadLogos(
    logos: Array<{ ticker: string; url: string }>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (logos.length === 0) {
      onProgress?.(1);
      return;
    }

    let completed = 0;
    const total = logos.length;

    // Process logos in batches to avoid overwhelming the network
    const batchSize = 5;
    for (let i = 0; i < logos.length; i += batchSize) {
      const batch = logos.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async ({ ticker, url }) => {
          try {
            // Use React Native's Image.prefetch to cache the image
            await Image.prefetch(url);
            this.logoCache.set(ticker, url);
          } catch (e) {
            console.warn(`Failed to prefetch logo for ${ticker}:`, e);
          } finally {
            completed++;
            onProgress?.(completed / total);
          }
        })
      );
    }
  }

  /**
   * Get cached logo URL for a ticker
   */
  static getCachedLogoUrl(ticker: string): string | null {
    return this.logoCache.get(ticker) || null;
  }

  /**
   * Preload all unique company logos from events
   */
  static async preloadEventLogos(events: any[]): Promise<void> {
    // Extract unique tickers from events
    const tickers = [...new Set(events.map(e => e.ticker).filter(Boolean))] as string[];
    
    // Get company info for each ticker to get logo URLs
    const logoPromises = tickers.map(async (ticker) => {
      try {
        const companyInfo = await StockAPI.getCompanyInfo(ticker);
        if (companyInfo?.logo) {
          await Image.prefetch(companyInfo.logo);
          this.logoCache.set(ticker, companyInfo.logo);
        }
      } catch (e) {
        // Ignore errors for individual logos
      }
    });

    await Promise.all(logoPromises);
  }

  /**
   * Get all tickers that need to be preloaded
   * This includes holdings, watchlist, and any tickers from events
   */
  static async getAllTickersToPreload(): Promise<string[]> {
    const tickers = new Set<string>();

    try {
      // Get holdings from cache
      const holdingsStr = await AsyncStorage.getItem('holdings');
      if (holdingsStr) {
        const holdings = JSON.parse(holdingsStr);
        holdings.forEach((t: string) => tickers.add(t));
      }

      // Get watchlist from cache
      const watchlistStr = await AsyncStorage.getItem('watchlist');
      if (watchlistStr) {
        const watchlist = JSON.parse(watchlistStr);
        watchlist.forEach((t: string) => tickers.add(t));
      }

      // Add default tickers if none found
      if (tickers.size === 0) {
        ['TSLA', 'DFTX', 'TMC', 'AAPL'].forEach(t => tickers.add(t));
      }

    } catch (error) {
      console.error('Error getting tickers to preload:', error);
      // Return defaults
      return ['TSLA', 'DFTX', 'TMC', 'AAPL'];
    }

    return Array.from(tickers);
  }

  /**
   * Check if preload is needed (e.g., cache is stale)
   */
  static async needsPreload(): Promise<boolean> {
    try {
      const cacheStr = await AsyncStorage.getItem(PRELOAD_CACHE_KEY);
      if (!cacheStr) return true;

      const cache = JSON.parse(cacheStr);
      const age = Date.now() - cache.timestamp;
      
      // Preload if cache is older than 1 hour
      return age > 60 * 60 * 1000;
    } catch {
      return true;
    }
  }
}

export default PreloadService;
