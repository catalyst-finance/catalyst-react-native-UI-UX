/**
 * BackgroundFetchService - Background data updates for iOS and Android
 * 
 * Handles background price updates for watchlist stocks when app is not active.
 * Uses expo-background-fetch for iOS and Android background tasks.
 * 
 * Features:
 * - Background price updates every 15 minutes
 * - Watchlist stock price caching
 * - Battery-efficient updates
 * - Respects system background refresh settings
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { DataService } from './DataService';
import { NetworkService } from './NetworkService';

const BACKGROUND_FETCH_TASK = 'background-price-update';

interface BackgroundFetchStatus {
  isRegistered: boolean;
  lastFetchTime: number | null;
  nextFetchTime: number | null;
}

class BackgroundFetchServiceClass {
  private isRegistered: boolean = false;
  private lastFetchTime: number | null = null;

  /**
   * Initialize background fetch service
   * Call this once when the app starts
   */
  async init(): Promise<boolean> {
    try {
      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        console.warn('⚠️ [BackgroundFetch] Background fetch is restricted');
        return false;
      }

      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('⚠️ [BackgroundFetch] Background fetch is denied');
        return false;
      }

      // Define the background task
      this.defineBackgroundTask();

      // Register the background task
      await this.registerBackgroundTask();

      console.log('✅ [BackgroundFetch] Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [BackgroundFetch] Initialization error:', error);
      return false;
    }
  }

  /**
   * Define the background fetch task
   */
  private defineBackgroundTask(): void {
    TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
      try {
        console.log('🔄 [BackgroundFetch] Starting background update...');
        
        // Check network connectivity
        if (!NetworkService.isConnected()) {
          console.log('⚠️ [BackgroundFetch] No network connection, skipping update');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Get watchlist from cache
        const watchlist = await this.getWatchlist();
        
        if (!watchlist || watchlist.length === 0) {
          console.log('⚠️ [BackgroundFetch] No watchlist found');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Update prices for watchlist stocks
        const updatePromises = watchlist.map(ticker => 
          this.updateStockPrice(ticker)
        );

        const results = await Promise.allSettled(updatePromises);
        
        // Count successful updates
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        console.log(`✅ [BackgroundFetch] Updated ${successCount}/${watchlist.length} stocks`);
        
        // Update last fetch time
        this.lastFetchTime = Date.now();
        await DataService.setCachedData('last_background_fetch', this.lastFetchTime, Infinity);

        return successCount > 0 
          ? BackgroundFetch.BackgroundFetchResult.NewData 
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error('❌ [BackgroundFetch] Task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Register the background fetch task
   */
  private async registerBackgroundTask(): Promise<void> {
    try {
      // Check if already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      if (isRegistered) {
        console.log('ℹ️ [BackgroundFetch] Task already registered');
        this.isRegistered = true;
        return;
      }

      // Register the task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (minimum allowed by iOS)
        stopOnTerminate: false, // Continue after app is terminated
        startOnBoot: true, // Start on device boot
      });

      this.isRegistered = true;
      console.log('✅ [BackgroundFetch] Task registered successfully');
    } catch (error) {
      console.error('❌ [BackgroundFetch] Registration error:', error);
      throw error;
    }
  }

  /**
   * Unregister the background fetch task
   */
  async unregister(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      this.isRegistered = false;
      console.log('✅ [BackgroundFetch] Task unregistered');
    } catch (error) {
      console.error('❌ [BackgroundFetch] Unregister error:', error);
    }
  }

  /**
   * Get background fetch status
   */
  async getStatus(): Promise<BackgroundFetchStatus> {
    try {
      const systemStatus = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      const lastFetchTime = await DataService.getCachedData<number>('last_background_fetch');

      return {
        isRegistered,
        lastFetchTime,
        nextFetchTime: lastFetchTime ? lastFetchTime + (15 * 60 * 1000) : null,
      };
    } catch (error) {
      console.error('❌ [BackgroundFetch] Status error:', error);
      return {
        isRegistered: false,
        lastFetchTime: null,
        nextFetchTime: null,
      };
    }
  }

  /**
   * Get watchlist from cache
   * Returns array of ticker symbols
   */
  private async getWatchlist(): Promise<string[]> {
    try {
      const watchlist = await DataService.getCachedData<string[]>('watchlist');
      return watchlist || [];
    } catch (error) {
      console.error('❌ [BackgroundFetch] Error getting watchlist:', error);
      return [];
    }
  }

  /**
   * Update price for a single stock
   */
  private async updateStockPrice(ticker: string): Promise<void> {
    try {
      // Import dynamically to avoid circular dependencies
      const StockAPIModule = await import('./supabase/StockAPI');
      const StockAPI = StockAPIModule.default;
      
      // Fetch latest price
      const stockData = await StockAPI.getStock(ticker);
      
      if (stockData) {
        // Cache the updated price
        await DataService.setCachedData(
          `stock_${ticker}`,
          stockData,
          5 * 60 * 1000 // 5 minute TTL
        );
        
        console.log(`✅ [BackgroundFetch] Updated ${ticker}: $${stockData.currentPrice}`);
      }
    } catch (error) {
      console.error(`❌ [BackgroundFetch] Error updating ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger a background fetch (for testing)
   */
  async triggerManualFetch(): Promise<void> {
    try {
      console.log('🔄 [BackgroundFetch] Manual fetch triggered');
      
      const watchlist = await this.getWatchlist();
      
      if (!watchlist || watchlist.length === 0) {
        console.log('⚠️ [BackgroundFetch] No watchlist found');
        return;
      }

      const updatePromises = watchlist.map(ticker => 
        this.updateStockPrice(ticker)
      );

      await Promise.allSettled(updatePromises);
      
      this.lastFetchTime = Date.now();
      await DataService.setCachedData('last_background_fetch', this.lastFetchTime, Infinity);
      
      console.log('✅ [BackgroundFetch] Manual fetch complete');
    } catch (error) {
      console.error('❌ [BackgroundFetch] Manual fetch error:', error);
    }
  }

  /**
   * Check if background fetch is registered
   */
  isTaskRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * Get last fetch time
   */
  getLastFetchTime(): number | null {
    return this.lastFetchTime;
  }
}

// Export singleton instance
export const BackgroundFetchService = new BackgroundFetchServiceClass();
export default BackgroundFetchService;
