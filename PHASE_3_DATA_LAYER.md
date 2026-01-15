# Phase 3: Data Layer Implementation

**Status**: IN PROGRESS
**Started**: January 12, 2026
**Priority**: HIGH (Required for chart testing)

---

## 🎯 Goal

Set up the complete data layer so charts can use real Supabase data instead of test data.

---

## 📦 Dependencies Installed

- ✅ `@react-native-async-storage/async-storage` - Local storage
- ✅ `@react-native-community/netinfo` - Network state detection
- ✅ `expo-secure-store` - Secure storage for auth tokens
- ✅ `@supabase/supabase-js` - Supabase client

---

## 🔄 Implementation Order

### 1. Supabase Client Setup
**File**: `src/services/supabase/client.ts`
**Status**: ✅ COMPLETE
**Completed**:
- ✅ Custom storage adapter (AsyncStorage + SecureStore)
- ✅ Auth configuration
- ✅ Environment variables configured in `info.ts`

### 2. Stock API Service
**File**: `src/services/supabase/StockAPI.ts`
**Status**: ✅ COMPLETE - READY FOR TESTING
**Completed**:
- ✅ Ported core stock data fetching functions
- ✅ AsyncStorage caching with 5-minute TTL
- ✅ Network state handling with offline support
- ✅ Functions: getStock(), getStocks(), getAllStocks(), searchStocks(), clearCache()

### 2.1. Data Test Screen
**File**: `src/screens/DataTestScreen.tsx`
**Status**: ✅ COMPLETE - INTEGRATED
**Completed**:
- ✅ Test screen created with UI for testing all StockAPI functions
- ✅ Added to navigation as "Data Test" tab
- ✅ Ready to run and verify Supabase connection

### 3. Events API Service
**Web Source**: `src/utils/supabase/events-api.ts`
**Native Target**: `src/services/supabase/EventsAPI.ts`
**Status**: Not started
**Needs**:
- Port catalyst events fetching
- Add caching
- Background sync

### 4. Historical Price Service
**Web Source**: `src/utils/historical-price-service.ts`
**Native Target**: `src/services/HistoricalPriceService.ts`
**Status**: Not started
**Needs**:
- Port price data fetching for all time ranges
- Add caching strategy
- Optimize for mobile

### 5. Realtime Price Service
**Web Source**: `src/utils/realtime-price-service.ts`
**Native Target**: `src/services/RealtimePriceService.ts`
**Status**: Not started
**Needs**:
- WebSocket connection
- App state handling (background/foreground)
- Reconnection logic
- Battery optimization

### 6. Data Service (Main)
**Web Source**: `src/utils/data-service.ts`
**Native Target**: `src/services/DataService.ts`
**Status**: Not started
**Needs**:
- Orchestrate all data fetching
- AsyncStorage caching
- Network state detection
- Offline queue

---

## 🔌 Integration Points

### Charts Need:
1. **MiniChart**:
   - Intraday price data (5-min intervals)
   - Previous close
   - Current price (real-time)
   - Session markers
   - Future catalysts

2. **StockLineChart**:
   - All time ranges (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
   - Past events
   - Future catalysts
   - Real-time updates
   - Volume data

3. **CandlestickChart**:
   - OHLCV data
   - 5-minute candles
   - Volume data

4. **PortfolioChart**:
   - Multiple ticker data
   - Portfolio calculations
   - Aggregated catalysts

### Screens Need:
1. **HomeScreen**:
   - Watchlist data
   - Portfolio data
   - Event timeline

2. **Stock Detail**:
   - Full stock data
   - Historical prices
   - Events
   - Real-time updates

---

## 📝 Implementation Notes

### Storage Strategy
- **AsyncStorage**: Cache non-sensitive data (stock prices, events)
- **SecureStore**: Auth tokens, sensitive user data
- **Cache TTL**: 5 minutes for prices, 1 hour for events

### Network Handling
- Check connectivity before API calls
- Return cached data when offline
- Queue mutations for when online
- Show offline indicator to user

### Performance
- Lazy load data as needed
- Implement pagination for large datasets
- Use React Query or SWR for data fetching
- Optimize re-renders with useMemo/useCallback

### Error Handling
- Graceful degradation when offline
- Retry logic for failed requests
- User-friendly error messages
- Log errors for debugging

---

## ✅ Success Criteria

Phase 3 is complete when:
- ✅ Supabase client configured
- ✅ All API services ported
- ✅ Caching working with AsyncStorage
- ✅ Network state detection working
- ✅ Real-time updates working
- ✅ Charts display real data
- ✅ Offline mode works
- ✅ No memory leaks
- ✅ Performance is good (< 100ms API calls)

---

## 🔗 Related Documents

- `.kiro/specs/expo-native-conversion/05-data-services-conversion.md` - Detailed spec
- `PHASE_2_REMAINING_WORK.md` - Chart work to resume after this
- `COMPLETION_ROADMAP.md` - Overall project plan

---

## ⏭️ Next Steps

1. Create Supabase client with custom storage
2. Port StockAPI service
3. Port EventsAPI service
4. Test with MiniChart
5. Continue with remaining services
6. Return to Phase 2 chart work

**Estimated Time**: 20-24 hours
