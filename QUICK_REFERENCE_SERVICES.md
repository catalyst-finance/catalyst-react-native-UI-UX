# Quick Reference - Services & Context

Quick reference guide for all implemented services and context providers.

---

## Services

### DataService
**Location**: `src/services/DataService.ts`

```typescript
import { DataService } from './src/services/DataService';

// Get cached data
const data = await DataService.getCachedData<T>('key');

// Set cached data with TTL (milliseconds)
await DataService.setCachedData('key', data, 5 * 60 * 1000); // 5 min

// Invalidate cache
await DataService.invalidateCache('key');

// Invalidate by pattern
await DataService.invalidateCachePattern('stock_');

// Clear all cache
await DataService.clearAllCache();

// Get stats
const stats = await DataService.getCacheStats();
```

### NetworkService
**Location**: `src/services/NetworkService.ts`

```typescript
import { NetworkService } from './src/services/NetworkService';

// Initialize (call once on app start)
await NetworkService.init();

// Check connection
const isOnline = NetworkService.isConnected();

// Get connection type
const type = NetworkService.getConnectionType(); // 'wifi' | 'cellular' | 'none'

// Listen to changes
const unsubscribe = NetworkService.onConnectionChange((isOnline, type) => {
  console.log('Connection:', isOnline, type);
});

// Queue request
const result = await NetworkService.queueRequest(async () => {
  return await fetchData();
});
```

### BackgroundFetchService
**Location**: `src/services/BackgroundFetchService.ts`

```typescript
import { BackgroundFetchService } from './src/services/BackgroundFetchService';

// Initialize (call once on app start)
await BackgroundFetchService.init();

// Get status
const status = await BackgroundFetchService.getStatus();
// Returns: { isRegistered, lastFetchTime, nextFetchTime }

// Manual trigger (for testing)
await BackgroundFetchService.triggerManualFetch();

// Unregister
await BackgroundFetchService.unregister();
```

---

## Supabase Services

### Supabase Client
**Location**: `src/services/supabase/client.ts`

```typescript
import { supabase } from './src/services/supabase/client';

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Sign out
await supabase.auth.signOut();
```

### EventsAPI
**Location**: `src/services/supabase/EventsAPI.ts`

```typescript
import EventsAPI from './src/services/supabase/EventsAPI';

// Get events by ticker
const events = await EventsAPI.getEventsByTicker('AAPL');

// Get upcoming events
const upcoming = await EventsAPI.getUpcomingEvents('AAPL', 90); // next 90 days

// Get past events
const past = await EventsAPI.getPastEvents('AAPL', 90); // last 90 days

// Filter by type
const earnings = EventsAPI.filterEventsByType(events, ['earnings']);
```

### HistoricalPriceAPI
**Location**: `src/services/supabase/HistoricalPriceAPI.ts`

```typescript
import HistoricalPriceAPI from './src/services/supabase/HistoricalPriceAPI';

// Get historical prices
const data = await HistoricalPriceAPI.getHistoricalPrices('AAPL', '1D');
// Time ranges: '1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'

// Get intraday prices
const intraday = await HistoricalPriceAPI.getIntradayPrices('AAPL');

// Get OHLC data
const ohlc = await HistoricalPriceAPI.getOHLCData('AAPL', '1M');
```

### StockAPI
**Location**: `src/services/supabase/StockAPI.ts`

```typescript
import StockAPI from './src/services/supabase/StockAPI';

// Get stock data
const stock = await StockAPI.getStock('AAPL');

// Get multiple stocks
const stocks = await StockAPI.getStocks(['AAPL', 'GOOGL', 'MSFT']);

// Search stocks
const results = await StockAPI.searchStocks('apple');
```

### RealtimeIntradayAPI
**Location**: `src/services/supabase/RealtimeIntradayAPI.ts`

```typescript
import RealtimeIntradayAPI from './src/services/supabase/RealtimeIntradayAPI';

// Subscribe to ticker updates
const unsubscribe = RealtimeIntradayAPI.subscribe('AAPL', (update) => {
  console.log('Price update:', update);
});

// Unsubscribe
unsubscribe();

// Get connection status
const status = RealtimeIntradayAPI.getConnectionStatus();
```

---

## Context Providers

### AuthContext
**Location**: `src/contexts/AuthContext.tsx`

```typescript
import { useAuth } from './src/contexts/AuthContext';

function MyComponent() {
  const {
    user,              // Current user
    session,           // Current session
    loading,           // Loading state
    biometricEnabled,  // Biometric enabled
    biometricAvailable, // Biometric available
    signIn,            // Sign in function
    signUp,            // Sign up function
    signOut,           // Sign out function
    authenticateWithBiometric, // Biometric auth
    enableBiometric,   // Enable biometric
    disableBiometric,  // Disable biometric
  } = useAuth();

  // Sign in
  const { error } = await signIn('user@example.com', 'password');

  // Sign up
  const { error } = await signUp('user@example.com', 'password');

  // Sign out
  await signOut();

  // Biometric auth
  if (biometricAvailable) {
    const success = await authenticateWithBiometric();
  }

  // Enable biometric
  await enableBiometric();

  return <View>...</View>;
}
```

### ThemeContext
**Location**: `src/contexts/ThemeContext.tsx`

```typescript
import { useTheme } from './src/contexts/ThemeContext';

function MyComponent() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
      <Button onPress={toggleTheme}>Toggle Theme</Button>
    </View>
  );
}
```

---

## App Initialization

### App.tsx
**Location**: `App.tsx`

Services are initialized in this order:
1. NetworkService.init()
2. Font.loadAsync()
3. DataService.preloadCache()
4. BackgroundFetchService.init()

Context providers are wrapped:
```typescript
<AuthProvider>
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
</AuthProvider>
```

---

## Common Patterns

### Fetching Data with Caching
```typescript
// Check cache first
const cached = await DataService.getCachedData<T>('key');
if (cached) return cached;

// Fetch from API
const data = await fetchFromAPI();

// Cache the result
await DataService.setCachedData('key', data, 5 * 60 * 1000);

return data;
```

### Network-Aware Requests
```typescript
// Queue request (executes immediately if online, queues if offline)
const result = await NetworkService.queueRequest(async () => {
  return await fetchData();
});
```

### Authentication Check
```typescript
const { user, loading } = useAuth();

if (loading) return <LoadingScreen />;
if (!user) return <LoginScreen />;

return <HomeScreen />;
```

### Biometric Authentication
```typescript
const { biometricAvailable, authenticateWithBiometric } = useAuth();

if (biometricAvailable) {
  const success = await authenticateWithBiometric();
  if (success) {
    // Proceed with sensitive operation
  }
}
```

---

## Cache TTL Guidelines

- **Stock prices**: 5 minutes
- **Historical data**: 1 hour
- **Events data**: 15 minutes
- **User preferences**: No expiration (Infinity)
- **Portfolio data**: 1 minute
- **Market status**: 5 minutes

---

## Error Handling

All services include comprehensive error handling:
- Network errors: Return cached data or queue request
- Parse errors: Log and return null
- Storage errors: Fallback to memory cache
- Auth errors: Clear session and redirect to login

---

## Debugging

### Enable Verbose Logging
All services log with prefixes:
- `[DataService]` - Cache operations
- `[NetworkService]` - Network state
- `[BackgroundFetch]` - Background updates
- `[Auth]` - Authentication events

### Check Cache Stats
```typescript
const stats = await DataService.getCacheStats();
console.log('Cache stats:', stats);
// { totalKeys, memoryKeys, storageKeys, totalSize }
```

### Export Cache (for debugging)
```typescript
const cache = await DataService.exportCache();
console.log('Cache contents:', cache);
```

---

## Performance Tips

1. **Preload cache on app start** for common data
2. **Use memory cache** for frequently accessed data
3. **Invalidate cache** when data changes
4. **Queue requests** when offline
5. **Use background fetch** for watchlist updates
6. **Enable biometric auth** for faster login

---

## Security Best Practices

1. **Always use SecureStore** for auth tokens
2. **Never hardcode** API keys or credentials
3. **Use environment variables** for sensitive config
4. **Validate user input** before API calls
5. **Clear sensitive data** on sign out
6. **Use HTTPS** for all API calls

---

**Last Updated**: January 12, 2026
