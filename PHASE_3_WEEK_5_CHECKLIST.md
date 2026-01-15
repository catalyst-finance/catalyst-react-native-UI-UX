# Phase 3 Week 5: Data Layer - Services & API Integration

## ⚠️ MANDATORY READING BEFORE STARTING
1. **READ**: `QUALITY_CONTROL_MANDATE.md` - ZERO SIMPLIFICATIONS POLICY
2. **READ**: `.kiro/specs/expo-native-conversion/05-data-services-conversion.md`
3. **READ**: Web app service files (listed below)

---

## Overview

Phase 3 focuses on porting all data services from the web app to React Native, replacing web-specific APIs (localStorage, fetch) with React Native equivalents (AsyncStorage, native networking).

**Critical Requirements**:
1. **NO SIMPLIFICATIONS** - All services must match web app exactly
2. **Offline Support** - Data must be cached and available offline
3. **Background Updates** - Services must work when app is backgrounded
4. **Secure Storage** - Sensitive data (tokens) must use expo-secure-store
5. **Network Resilience** - Handle poor connections gracefully

---

## Pre-Implementation Requirements

### ✅ Step 0: Preparation (MUST COMPLETE FIRST)
- [ ] Read `QUALITY_CONTROL_MANDATE.md` in full
- [ ] Read all web app service files
- [ ] Read Supabase client setup documentation
- [ ] Understand AsyncStorage API
- [ ] Understand expo-secure-store API
- [ ] Understand React Native NetInfo API
- [ ] Understand expo-background-fetch API
- [ ] Document understanding in notes
- [ ] Create implementation plan for review

**DO NOT PROCEED until all boxes are checked.**

---

## Step 1: Install Required Dependencies

```bash
cd catalyst-native
npm install @react-native-async-storage/async-storage
npm install expo-secure-store
npm install @react-native-community/netinfo
npm install expo-background-fetch
npm install expo-task-manager
npm install @supabase/supabase-js
```

**Verification**:
- [ ] All packages installed successfully
- [ ] No version conflicts
- [ ] TypeScript types available
- [ ] Test imports work

---

## Step 2: Port Supabase Client

**Web App Source**: `src/utils/supabase/*`
**Native Target**: `catalyst-native/src/services/supabase/`

### 2.1: Supabase Client Setup

**Files to Create**:
1. `src/services/supabase/client.ts` - Main Supabase client
2. `src/services/supabase/auth.ts` - Authentication helpers
3. `src/services/supabase/storage.ts` - Secure token storage

**Implementation Checklist**:
- [ ] Read web app Supabase setup
- [ ] Create Supabase client with React Native config
- [ ] Replace localStorage with expo-secure-store for tokens
- [ ] Add AsyncStorage for non-sensitive data
- [ ] Implement auth state persistence
- [ ] Add network state detection
- [ ] Test connection on device

**Key Differences from Web**:
```typescript
// Web: localStorage
localStorage.setItem('supabase.auth.token', token);

// Native: expo-secure-store
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('supabase.auth.token', token);
```

**Security Requirements**:
- [ ] Auth tokens stored in SecureStore (NOT AsyncStorage)
- [ ] Refresh tokens stored in SecureStore
- [ ] User preferences in AsyncStorage (non-sensitive)
- [ ] API keys never hardcoded
- [ ] Environment variables for sensitive config

---

## Step 3: Port Data Service

**Web App Source**: `src/utils/data-service.ts`
**Native Target**: `catalyst-native/src/services/DataService.ts`

### 3.1: Pre-Implementation Analysis

**Read and Document**:
- [ ] All exported functions
- [ ] localStorage usage patterns
- [ ] Caching strategies
- [ ] Data expiration logic
- [ ] Error handling patterns

**Key Features to Preserve**:
- [ ] Data caching with expiration
- [ ] Offline data access
- [ ] Cache invalidation
- [ ] Data synchronization
- [ ] Error recovery

### 3.2: Implementation Checklist

**Core Functions to Port**:
- [ ] `getCachedData(key)` - Get data from cache
- [ ] `setCachedData(key, data, ttl)` - Store data with TTL
- [ ] `invalidateCache(key)` - Clear specific cache
- [ ] `clearAllCache()` - Clear all cached data
- [ ] `isCacheValid(key)` - Check if cache is still valid
- [ ] `syncData()` - Sync local data with server

**Platform Adaptations**:
```typescript
// Web: localStorage
const data = localStorage.getItem(key);

// Native: AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
const data = await AsyncStorage.getItem(key);
```

**Caching Strategy**:
- [ ] Stock prices: 5 minute TTL
- [ ] Historical data: 1 hour TTL
- [ ] Events data: 15 minute TTL
- [ ] User preferences: No expiration
- [ ] Portfolio data: 1 minute TTL

**Error Handling**:
- [ ] Network errors: Return cached data
- [ ] Parse errors: Log and return null
- [ ] Storage errors: Fallback to memory cache
- [ ] Quota errors: Clear old cache entries

### 3.3: Post-Implementation Verification

**Functional Testing**:
- [ ] Test cache read/write
- [ ] Test cache expiration
- [ ] Test cache invalidation
- [ ] Test offline access
- [ ] Test storage quota handling
- [ ] Test concurrent access
- [ ] Test data migration

**Performance Testing**:
- [ ] Cache read < 10ms
- [ ] Cache write < 50ms
- [ ] No blocking on main thread
- [ ] Memory usage acceptable

---

## Step 4: Port Events Service

**Web App Source**: `src/utils/events-service.ts`
**Native Target**: `catalyst-native/src/services/EventsService.ts`

### 4.1: Pre-Implementation Analysis

**Read and Document**:
- [ ] Event fetching logic
- [ ] Event filtering logic
- [ ] Event sorting logic
- [ ] Event caching strategy
- [ ] Event type definitions

**Key Features to Preserve**:
- [ ] Fetch events by ticker
- [ ] Fetch events by date range
- [ ] Filter by event type
- [ ] Sort by date/importance
- [ ] Cache event data
- [ ] Real-time event updates

### 4.2: Implementation Checklist

**Core Functions to Port**:
- [ ] `getEventsByTicker(ticker)` - Get all events for a stock
- [ ] `getEventsByDateRange(start, end)` - Get events in date range
- [ ] `getUpcomingEvents(ticker, days)` - Get future events
- [ ] `getPastEvents(ticker, days)` - Get historical events
- [ ] `filterEventsByType(events, types)` - Filter by event type
- [ ] `sortEventsByDate(events)` - Sort chronologically
- [ ] `subscribeToEventUpdates(ticker, callback)` - Real-time updates

**Event Types to Support**:
- [ ] Earnings
- [ ] FDA approvals
- [ ] Mergers & acquisitions
- [ ] Stock splits
- [ ] Dividends
- [ ] Product launches
- [ ] Conferences
- [ ] Regulatory filings
- [ ] Guidance updates
- [ ] Partnerships

**Caching Strategy**:
- [ ] Cache events by ticker
- [ ] 15 minute TTL for upcoming events
- [ ] 1 hour TTL for past events
- [ ] Invalidate on real-time update

### 4.3: Post-Implementation Verification

**Functional Testing**:
- [ ] Test event fetching
- [ ] Test event filtering
- [ ] Test event sorting
- [ ] Test date range queries
- [ ] Test real-time updates
- [ ] Test offline access

---

## Step 5: Port Realtime Price Service

**Web App Source**: `src/utils/realtime-price-service.ts`
**Native Target**: `catalyst-native/src/services/RealtimePriceService.ts`

### 5.1: Pre-Implementation Analysis

**Read and Document**:
- [ ] WebSocket connection logic
- [ ] Reconnection strategy
- [ ] Message parsing
- [ ] Price update throttling
- [ ] Subscription management

**Key Features to Preserve**:
- [ ] WebSocket connection to price feed
- [ ] Automatic reconnection on disconnect
- [ ] Subscribe/unsubscribe to tickers
- [ ] Throttle price updates (max 1/sec per ticker)
- [ ] Handle connection errors gracefully
- [ ] Work in background (iOS/Android)

### 5.2: Implementation Checklist

**Core Functions to Port**:
- [ ] `connect()` - Establish WebSocket connection
- [ ] `disconnect()` - Close connection
- [ ] `subscribe(ticker)` - Subscribe to ticker updates
- [ ] `unsubscribe(ticker)` - Unsubscribe from ticker
- [ ] `onPriceUpdate(ticker, callback)` - Register update callback
- [ ] `getConnectionStatus()` - Check connection state

**WebSocket Implementation**:
```typescript
import { WebSocket } from 'react-native';

class RealtimePriceService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect() {
    this.ws = new WebSocket('wss://your-price-feed-url');
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.resubscribeAll();
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handlePriceUpdate(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.attemptReconnect();
    };
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    }
  }
  
  subscribe(ticker: string, callback: Function) {
    if (!this.subscriptions.has(ticker)) {
      this.subscriptions.set(ticker, new Set());
      this.sendSubscribeMessage(ticker);
    }
    this.subscriptions.get(ticker)!.add(callback);
  }
  
  unsubscribe(ticker: string, callback: Function) {
    const callbacks = this.subscriptions.get(ticker);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(ticker);
        this.sendUnsubscribeMessage(ticker);
      }
    }
  }
  
  private handlePriceUpdate(data: any) {
    const { ticker, price, timestamp } = data;
    const callbacks = this.subscriptions.get(ticker);
    if (callbacks) {
      callbacks.forEach(callback => callback({ ticker, price, timestamp }));
    }
  }
}
```

**Background Updates**:
- [ ] Use expo-background-fetch for iOS
- [ ] Use Android foreground service for Android
- [ ] Throttle updates when app is backgrounded
- [ ] Resume full updates when app is foregrounded

**Error Handling**:
- [ ] Network errors: Attempt reconnection
- [ ] Parse errors: Log and skip message
- [ ] Connection timeout: Reconnect with backoff
- [ ] Max reconnect attempts: Notify user

### 5.3: Post-Implementation Verification

**Functional Testing**:
- [ ] Test WebSocket connection
- [ ] Test subscription/unsubscription
- [ ] Test price updates
- [ ] Test reconnection logic
- [ ] Test background updates
- [ ] Test error handling

**Performance Testing**:
- [ ] Price updates < 100ms latency
- [ ] No memory leaks
- [ ] Battery usage acceptable
- [ ] Network usage acceptable

---

## Step 6: Port Historical Price Service

**Web App Source**: `src/utils/historical-price-service.ts`
**Native Target**: `catalyst-native/src/services/HistoricalPriceService.ts`

### 6.1: Pre-Implementation Analysis

**Read and Document**:
- [ ] Historical data fetching logic
- [ ] Time range handling
- [ ] Data aggregation logic
- [ ] Caching strategy
- [ ] Data format

**Key Features to Preserve**:
- [ ] Fetch historical prices by time range
- [ ] Support multiple time ranges (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
- [ ] Aggregate intraday data to 5-minute candles
- [ ] Cache historical data aggressively
- [ ] Handle market hours correctly
- [ ] Support OHLC data format

### 6.2: Implementation Checklist

**Core Functions to Port**:
- [ ] `getHistoricalPrices(ticker, range)` - Get prices for time range
- [ ] `getIntradayPrices(ticker)` - Get today's intraday data
- [ ] `getOHLCData(ticker, range)` - Get OHLC candle data
- [ ] `aggregateToCandles(data, interval)` - Aggregate to candles
- [ ] `fillGaps(data)` - Fill missing data points
- [ ] `normalizeData(data)` - Normalize data format

**Time Range Support**:
- [ ] 1D: 5-minute intervals, intraday only
- [ ] 1W: 5-minute intervals, last 5 trading days
- [ ] 1M: 30-minute intervals, last ~20 trading days
- [ ] 3M: Daily intervals, last ~60 trading days
- [ ] YTD: Daily intervals, from Jan 1 to now
- [ ] 1Y: Daily intervals, last 252 trading days
- [ ] 5Y: Weekly intervals, last 5 years

**Caching Strategy**:
- [ ] 1D data: 5 minute TTL (during market hours)
- [ ] 1W data: 15 minute TTL
- [ ] 1M+ data: 1 hour TTL
- [ ] After-hours: 1 hour TTL for all ranges
- [ ] Weekends: 4 hour TTL for all ranges

**Data Format**:
```typescript
interface HistoricalDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session?: 'pre-market' | 'regular' | 'after-hours';
}
```

### 6.3: Post-Implementation Verification

**Functional Testing**:
- [ ] Test all time ranges
- [ ] Test data aggregation
- [ ] Test gap filling
- [ ] Test caching
- [ ] Test market hours handling
- [ ] Test OHLC data

**Data Quality Testing**:
- [ ] No missing data points
- [ ] Correct session labels
- [ ] Accurate OHLC values
- [ ] Proper volume aggregation

---

## Step 7: Network State Management

### 7.1: Network Detection

**Implementation**:
```typescript
import NetInfo from '@react-native-community/netinfo';

class NetworkService {
  private isOnline = true;
  private listeners: Set<Function> = new Set();
  
  init() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (wasOnline !== this.isOnline) {
        this.notifyListeners(this.isOnline);
      }
    });
  }
  
  isConnected(): boolean {
    return this.isOnline;
  }
  
  onConnectionChange(callback: Function) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }
}
```

**Integration**:
- [ ] Initialize on app start
- [ ] Show offline indicator in UI
- [ ] Queue requests when offline
- [ ] Sync when back online
- [ ] Notify services of connection changes

### 7.2: Offline Queue

**Implementation**:
```typescript
class OfflineQueue {
  private queue: Array<() => Promise<any>> = [];
  
  async add(request: () => Promise<any>) {
    if (NetworkService.isConnected()) {
      return await request();
    } else {
      this.queue.push(request);
      await this.saveQueue();
    }
  }
  
  async processQueue() {
    if (!NetworkService.isConnected()) return;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      try {
        await request();
      } catch (error) {
        console.error('Failed to process queued request:', error);
        // Re-queue if it's a network error
        if (error.message.includes('network')) {
          this.queue.unshift(request);
          break;
        }
      }
    }
    
    await this.saveQueue();
  }
  
  private async saveQueue() {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
  
  private async loadQueue() {
    const data = await AsyncStorage.getItem('offline_queue');
    if (data) {
      this.queue = JSON.parse(data);
    }
  }
}
```

---

## Step 8: Background Fetch Setup

### 8.1: iOS Background Fetch

**Implementation**:
```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_FETCH_TASK = 'background-price-update';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Fetch latest prices for watchlist
    const watchlist = await getWatchlist();
    await Promise.all(
      watchlist.map(ticker => updatePriceCache(ticker))
    );
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function registerBackgroundFetch() {
  await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

### 8.2: Android Foreground Service

**Implementation**:
```typescript
// For Android, use a foreground service for real-time updates
// when app is in background

import { AppState } from 'react-native';

class BackgroundUpdateService {
  private appState = AppState.currentState;
  
  init() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }
  
  private handleAppStateChange = (nextAppState: string) => {
    if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App went to background
      this.startBackgroundUpdates();
    } else if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      this.stopBackgroundUpdates();
      this.refreshAllData();
    }
    
    this.appState = nextAppState;
  };
  
  private startBackgroundUpdates() {
    // Reduce update frequency
    RealtimePriceService.setUpdateInterval(60000); // 1 minute
  }
  
  private stopBackgroundUpdates() {
    // Resume normal update frequency
    RealtimePriceService.setUpdateInterval(1000); // 1 second
  }
  
  private async refreshAllData() {
    // Refresh all data when app comes to foreground
    await Promise.all([
      DataService.syncData(),
      EventsService.refreshEvents(),
      HistoricalPriceService.refreshCache(),
    ]);
  }
}
```

---

## Step 9: Integration Testing

### 9.1: Service Integration

- [ ] All services work together
- [ ] Data flows correctly between services
- [ ] Caching works across services
- [ ] Network state affects all services
- [ ] Background updates work

### 9.2: Offline Testing

- [ ] App works offline
- [ ] Cached data accessible
- [ ] Requests queued when offline
- [ ] Queue processed when online
- [ ] No crashes in offline mode

### 9.3: Performance Testing

- [ ] Service calls < 100ms (cached)
- [ ] Service calls < 2s (network)
- [ ] No memory leaks
- [ ] Battery usage acceptable
- [ ] Network usage acceptable

---

## Step 10: Documentation

### 10.1: Service Documentation

Create `DATA_SERVICES_DOCUMENTATION.md` with:
- [ ] Service architecture overview
- [ ] API documentation for each service
- [ ] Caching strategy explanation
- [ ] Offline behavior documentation
- [ ] Background update documentation
- [ ] Error handling patterns
- [ ] Testing guide

### 10.2: Migration Notes

Create `DATA_SERVICES_MIGRATION_NOTES.md` with:
- [ ] Web app references
- [ ] Platform differences
- [ ] Exact matches confirmed
- [ ] Known issues (should be none)
- [ ] Testing results
- [ ] Performance metrics

---

## Final Verification

### ✅ Quality Control Checklist

Reference `QUALITY_CONTROL_MANDATE.md` and verify:

- [ ] NO simplifications made
- [ ] ALL features from web app present
- [ ] ALL edge cases handled
- [ ] Offline mode works perfectly
- [ ] Background updates work
- [ ] Caching works correctly
- [ ] Network resilience verified
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Documentation complete
- [ ] Tests passing

### ✅ Sign-Off

- [ ] Self-review complete
- [ ] Code review complete
- [ ] Functional review complete
- [ ] Performance review complete
- [ ] Ready for Phase 3 Week 6

---

## Estimated Time

- **Step 1 (Dependencies)**: 15 minutes
- **Step 2 (Supabase Client)**: 2-3 hours
- **Step 3 (Data Service)**: 3-4 hours
- **Step 4 (Events Service)**: 2-3 hours
- **Step 5 (Realtime Price Service)**: 4-5 hours
- **Step 6 (Historical Price Service)**: 3-4 hours
- **Step 7 (Network State)**: 2-3 hours
- **Step 8 (Background Fetch)**: 2-3 hours
- **Step 9 (Integration Testing)**: 2-3 hours
- **Step 10 (Documentation)**: 1-2 hours

**Total**: 22-30 hours of focused work

---

## Success Criteria

Phase 3 Week 5 is complete when:
- ✅ All services ported exactly
- ✅ Offline mode works perfectly
- ✅ Background updates functional
- ✅ Caching works correctly
- ✅ Network resilience verified
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Ready for Phase 3 Week 6 (Context & State Management)

**DO NOT PROCEED TO WEEK 6 UNTIL ALL CRITERIA MET**
