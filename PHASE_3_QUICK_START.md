# Phase 3 Quick Start Guide
**Data Layer Implementation**

---

## 🎯 Goal

Port all data services from the web app to React Native, enabling:
- Real-time price updates via WebSocket
- Historical price data with caching
- Catalyst events fetching and filtering
- Offline support with AsyncStorage
- Background updates
- Secure token storage

---

## 📋 Prerequisites

Before starting Phase 3, ensure:
- ✅ Phase 2 Week 4 charts are functional (MiniChart, StockLineChart)
- ✅ You have read `QUALITY_CONTROL_MANDATE.md`
- ✅ You have read `PHASE_3_WEEK_5_CHECKLIST.md`
- ✅ You have access to the web app source code
- ✅ You have Supabase credentials (API URL, anon key)

---

## 🚀 Getting Started

### Step 1: Install Dependencies (15 minutes)

```bash
cd catalyst-native

# Storage and security
npm install @react-native-async-storage/async-storage
npm install expo-secure-store

# Network and background
npm install @react-native-community/netinfo
npm install expo-background-fetch
npm install expo-task-manager

# Supabase
npm install @supabase/supabase-js

# Verify installation
npm list @react-native-async-storage/async-storage expo-secure-store @supabase/supabase-js
```

### Step 2: Set Up Environment Variables

Create `.env` file in `catalyst-native/`:
```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Add to `.gitignore`:
```
.env
```

### Step 3: Create Supabase Client (2-3 hours)

Create `src/services/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Secure storage adapter for auth tokens
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Helper to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
```

**Test it**:
```typescript
// In your App.tsx or a test screen
import { supabase, isAuthenticated } from './src/services/supabase/client';

useEffect(() => {
  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    console.log('Authenticated:', authenticated);
  };
  checkAuth();
}, []);
```

### Step 4: Create Data Service (3-4 hours)

Create `src/services/DataService.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataService {
  private memoryCache: Map<string, any> = new Map();

  /**
   * Get cached data if valid, otherwise return null
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key) as CacheEntry<T>;
        if (this.isCacheValid(entry)) {
          return entry.data;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Check AsyncStorage
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        if (this.isCacheValid(entry)) {
          // Populate memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Expired, remove it
          await AsyncStorage.removeItem(key);
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Store data in cache with TTL (time to live in milliseconds)
   */
  async setCachedData<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      // Store in memory cache
      this.memoryCache.set(key, entry);

      // Store in AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidateCache(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    try {
      this.memoryCache.clear();
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Get cache size (for debugging)
   */
  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.length;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }
}

export default new DataService();
```

**Test it**:
```typescript
import DataService from './src/services/DataService';

// Store data with 5 minute TTL
await DataService.setCachedData('test_key', { value: 123 }, 5 * 60 * 1000);

// Retrieve data
const data = await DataService.getCachedData('test_key');
console.log('Cached data:', data); // { value: 123 }

// Check cache size
const size = await DataService.getCacheSize();
console.log('Cache size:', size);
```

### Step 5: Create Events Service (2-3 hours)

Create `src/services/EventsService.ts`:

```typescript
import { supabase } from './supabase/client';
import DataService from './DataService';

interface MarketEvent {
  id: string;
  ticker: string;
  type: string;
  title: string;
  description: string;
  actualDateTime: string;
  estimatedDateTime?: string;
  importance: number;
  [key: string]: any;
}

class EventsService {
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  /**
   * Get all events for a ticker
   */
  async getEventsByTicker(ticker: string): Promise<MarketEvent[]> {
    const cacheKey = `events_${ticker}`;
    
    // Try cache first
    const cached = await DataService.getCachedData<MarketEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('ticker', ticker)
      .order('actualDateTime', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    // Cache the result
    await DataService.setCachedData(cacheKey, data, this.CACHE_TTL);

    return data;
  }

  /**
   * Get upcoming events for a ticker
   */
  async getUpcomingEvents(ticker: string, days: number = 90): Promise<MarketEvent[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('ticker', ticker)
      .gte('actualDateTime', now.toISOString())
      .lte('actualDateTime', futureDate.toISOString())
      .order('actualDateTime', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }

    return data;
  }

  /**
   * Get past events for a ticker
   */
  async getPastEvents(ticker: string, days: number = 90): Promise<MarketEvent[]> {
    const now = new Date();
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('ticker', ticker)
      .gte('actualDateTime', pastDate.toISOString())
      .lte('actualDateTime', now.toISOString())
      .order('actualDateTime', { ascending: false });

    if (error) {
      console.error('Error fetching past events:', error);
      return [];
    }

    return data;
  }

  /**
   * Filter events by type
   */
  filterEventsByType(events: MarketEvent[], types: string[]): MarketEvent[] {
    return events.filter(event => types.includes(event.type));
  }

  /**
   * Sort events by date
   */
  sortEventsByDate(events: MarketEvent[], ascending: boolean = true): MarketEvent[] {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.actualDateTime).getTime();
      const dateB = new Date(b.actualDateTime).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Invalidate events cache for a ticker
   */
  async invalidateEventsCache(ticker: string): Promise<void> {
    await DataService.invalidateCache(`events_${ticker}`);
  }
}

export default new EventsService();
```

**Test it**:
```typescript
import EventsService from './src/services/EventsService';

// Get events for AAPL
const events = await EventsService.getEventsByTicker('AAPL');
console.log('Events:', events);

// Get upcoming events
const upcoming = await EventsService.getUpcomingEvents('AAPL', 30);
console.log('Upcoming events:', upcoming);

// Filter by type
const earnings = EventsService.filterEventsByType(events, ['earnings']);
console.log('Earnings events:', earnings);
```

---

## 📚 Next Steps

After completing Steps 1-5 (estimated 8-11 hours):

1. **Implement RealtimePriceService** (4-5 hours)
   - WebSocket connection for live prices
   - Automatic reconnection logic
   - Subscription management

2. **Implement HistoricalPriceService** (3-4 hours)
   - Fetch historical prices by time range
   - Support all time ranges (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
   - Aggressive caching strategy

3. **Network State Management** (2-3 hours)
   - Detect online/offline state
   - Queue requests when offline
   - Sync when back online

4. **Background Fetch Setup** (2-3 hours)
   - iOS background fetch
   - Android foreground service
   - Update prices in background

5. **Integration Testing** (2-3 hours)
   - Test all services together
   - Test offline mode
   - Test background updates

6. **Documentation** (1-2 hours)
   - Service architecture
   - API documentation
   - Migration notes

---

## ✅ Success Criteria

Phase 3 Week 5 is complete when:
- ✅ All services ported exactly from web app
- ✅ Offline mode works perfectly
- ✅ Background updates functional
- ✅ Caching works correctly
- ✅ Network resilience verified
- ✅ Secure storage for sensitive data
- ✅ All tests passing
- ✅ Documentation complete

---

## 🆘 Getting Help

If you get stuck:
1. Check `PHASE_3_WEEK_5_CHECKLIST.md` for detailed instructions
2. Review web app implementation for reference
3. Check Expo documentation for React Native APIs
4. Check Supabase documentation for client setup
5. Ask for help with specific error messages

---

## 📊 Progress Tracking

Update these files as you progress:
- `PROGRESS.md` - Overall project progress
- `PHASE_3_WEEK_5_CHECKLIST.md` - Check off completed items
- `CURRENT_STATUS_AND_NEXT_STEPS.md` - Update current status

---

**Ready to start? Begin with Step 1: Install Dependencies!**

Good luck! 🚀
