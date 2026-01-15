/**
 * DataService - Centralized data caching and management
 * 
 * Provides a unified interface for caching data with TTL (time-to-live).
 * Uses AsyncStorage for persistence and in-memory cache for performance.
 * 
 * Features:
 * - Two-tier caching (memory + AsyncStorage)
 * - TTL-based expiration
 * - Offline support
 * - Cache invalidation
 * - Storage quota management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  totalKeys: number;
  memoryKeys: number;
  storageKeys: number;
  totalSize: number;
}

class DataServiceClass {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_PREFIX = 'cache_';
  private readonly MAX_MEMORY_ENTRIES = 100; // Limit memory cache size

  /**
   * Get cached data if valid, otherwise return null
   * Checks memory cache first, then AsyncStorage
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first (fastest)
      if (this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key) as CacheEntry<T>;
        if (this.isCacheValid(entry)) {
          return entry.data;
        } else {
          // Expired, remove from memory
          this.memoryCache.delete(key);
        }
      }

      // Check AsyncStorage (slower but persistent)
      const storageKey = this.CACHE_PREFIX + key;
      const cached = await AsyncStorage.getItem(storageKey);
      
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        
        if (this.isCacheValid(entry)) {
          // Valid cache - populate memory cache for faster future access
          this.setMemoryCache(key, entry);
          return entry.data;
        } else {
          // Expired - remove from storage
          await AsyncStorage.removeItem(storageKey);
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ [DataService] Error getting cached data for ${key}:`, error);
      return null;
    }
  }

  /**
   * Store data in cache with TTL (time to live in milliseconds)
   * Stores in both memory cache and AsyncStorage
   */
  async setCachedData<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      // Store in memory cache
      this.setMemoryCache(key, entry);

      // Store in AsyncStorage for persistence
      const storageKey = this.CACHE_PREFIX + key;
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.error(`❌ [DataService] Error setting cached data for ${key}:`, error);
      
      // If storage is full, try to clear old entries
      if (error instanceof Error && error.message.includes('quota')) {
        await this.clearExpiredCache();
        // Retry once
        try {
          const retryEntry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
          };
          const storageKey = this.CACHE_PREFIX + key;
          await AsyncStorage.setItem(storageKey, JSON.stringify(retryEntry));
        } catch (retryError) {
          console.error(`❌ [DataService] Retry failed for ${key}:`, retryError);
        }
      }
    }
  }

  /**
   * Invalidate specific cache entry
   * Removes from both memory and storage
   */
  async invalidateCache(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);

      // Remove from AsyncStorage
      const storageKey = this.CACHE_PREFIX + key;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`❌ [DataService] Error invalidating cache for ${key}:`, error);
    }
  }

  /**
   * Invalidate multiple cache entries by pattern
   * Example: invalidateCachePattern('stock_') removes all stock-related cache
   */
  async invalidateCachePattern(pattern: string): Promise<number> {
    try {
      let count = 0;

      // Remove from memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      for (const key of memoryKeys) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
          count++;
        }
      }

      // Remove from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const matchingKeys = allKeys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) && key.includes(pattern)
      );
      
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
        count += matchingKeys.length;
      }

      console.log(`🗑️ [DataService] Invalidated ${count} cache entries matching '${pattern}'`);
      return count;
    } catch (error) {
      console.error(`❌ [DataService] Error invalidating cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cached data
   * Removes everything from both memory and storage
   */
  async clearAllCache(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear AsyncStorage cache entries
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      console.log(`🗑️ [DataService] Cleared all cache (${cacheKeys.length} entries)`);
    } catch (error) {
      console.error('❌ [DataService] Error clearing all cache:', error);
    }
  }

  /**
   * Clear expired cache entries
   * Useful for freeing up storage space
   */
  async clearExpiredCache(): Promise<number> {
    try {
      let count = 0;

      // Clear expired entries from memory
      const memoryKeys = Array.from(this.memoryCache.keys());
      for (const key of memoryKeys) {
        const entry = this.memoryCache.get(key);
        if (entry && !this.isCacheValid(entry)) {
          this.memoryCache.delete(key);
          count++;
        }
      }

      // Clear expired entries from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      const expiredKeys: string[] = [];
      
      for (const storageKey of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(storageKey);
          if (cached) {
            const entry: CacheEntry<any> = JSON.parse(cached);
            if (!this.isCacheValid(entry)) {
              expiredKeys.push(storageKey);
            }
          }
        } catch (error) {
          // If we can't parse it, it's corrupted - remove it
          expiredKeys.push(storageKey);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        count += expiredKeys.length;
      }

      console.log(`🗑️ [DataService] Cleared ${count} expired cache entries`);
      return count;
    } catch (error) {
      console.error('❌ [DataService] Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * Useful for debugging and monitoring
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      // Estimate total size (rough approximation)
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return {
        totalKeys: cacheKeys.length,
        memoryKeys: this.memoryCache.size,
        storageKeys: cacheKeys.length,
        totalSize, // in bytes
      };
    } catch (error) {
      console.error('❌ [DataService] Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryKeys: this.memoryCache.size,
        storageKeys: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Check if cache entry is still valid based on TTL
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < entry.ttl;
  }

  /**
   * Set memory cache with size limit
   * Uses LRU (Least Recently Used) eviction when limit is reached
   */
  private setMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    // If at capacity, remove oldest entry
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, entry);
  }

  /**
   * Preload cache entries into memory
   * Useful for warming up cache on app start
   */
  async preloadCache(keys: string[]): Promise<number> {
    try {
      let loaded = 0;

      for (const key of keys) {
        const storageKey = this.CACHE_PREFIX + key;
        const cached = await AsyncStorage.getItem(storageKey);
        
        if (cached) {
          try {
            const entry: CacheEntry<any> = JSON.parse(cached);
            if (this.isCacheValid(entry)) {
              this.setMemoryCache(key, entry);
              loaded++;
            }
          } catch (error) {
            // Skip invalid entries
          }
        }
      }

      console.log(`📦 [DataService] Preloaded ${loaded}/${keys.length} cache entries`);
      return loaded;
    } catch (error) {
      console.error('❌ [DataService] Error preloading cache:', error);
      return 0;
    }
  }

  /**
   * Export cache for debugging
   * Returns all cache entries (be careful with large caches)
   */
  async exportCache(): Promise<Record<string, any>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      const cache: Record<string, any> = {};
      
      for (const storageKey of cacheKeys) {
        const value = await AsyncStorage.getItem(storageKey);
        if (value) {
          try {
            const entry: CacheEntry<any> = JSON.parse(value);
            const key = storageKey.replace(this.CACHE_PREFIX, '');
            cache[key] = {
              data: entry.data,
              age: Date.now() - entry.timestamp,
              ttl: entry.ttl,
              valid: this.isCacheValid(entry),
            };
          } catch (error) {
            // Skip invalid entries
          }
        }
      }

      return cache;
    } catch (error) {
      console.error('❌ [DataService] Error exporting cache:', error);
      return {};
    }
  }
}

// Export singleton instance
export const DataService = new DataServiceClass();
export default DataService;
