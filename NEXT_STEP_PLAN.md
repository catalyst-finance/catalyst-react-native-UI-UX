# Next Step: Historical Price Service

**Priority**: HIGH
**Estimated Time**: 3-4 hours

---

## 🎯 Goal

Port HistoricalPriceService to fetch real intraday price data for MiniChart, replacing the test data with actual 5-minute intervals from Supabase.

---

## 📊 What MiniChart Currently Needs

### Data Requirements:
1. **Intraday 5-minute price data** for today
   - Pre-market: 4:00 AM - 9:30 AM ET
   - Regular hours: 9:30 AM - 4:00 PM ET
   - After-hours: 4:00 PM - 8:00 PM ET

2. **Data Points**:
   - Timestamp
   - Price (close)
   - Session marker (pre-market/regular/after-hours)

3. **Source**: `intraday_prices` table in Supabase

---

## 🔄 Implementation Approach

### Simplified for Mobile:
Instead of porting the full 1000+ line service, create a focused version:

1. **IntradayPriceAPI.ts** - Fetch 5-minute intraday data
   - Query `intraday_prices` table
   - Filter by symbol and today's date
   - Add session markers
   - Cache with AsyncStorage (5-minute TTL)

2. **Integration**:
   - Update ComponentShowcaseScreen to fetch real intraday data
   - Pass to MiniChart instead of test data
   - Chart line will show actual price movements

---

## 📁 Files to Create

### 1. `src/services/supabase/IntradayPriceAPI.ts`
```typescript
- getIntradayPrices(symbol: string): Promise<IntradayPrice[]>
- Cache with AsyncStorage
- Network state handling
- Session marker logic
```

### 2. Update `ComponentShowcaseScreen.tsx`
```typescript
- Fetch intraday prices for AAPL and TSLA
- Pass real data to MiniChart
- Remove test data generation
```

---

## 🗄️ Database Schema

### intraday_prices table:
```sql
- symbol: text
- timestamp: timestamptz
- close: numeric
- volume: integer
- session: text (pre-market/regular/after-hours)
```

---

## ✅ Success Criteria

- [ ] IntradayPriceAPI service created
- [ ] Fetches real 5-minute data from Supabase
- [ ] Caching works (5-minute TTL)
- [ ] MiniChart displays real price movements
- [ ] Chart line shows actual intraday data
- [ ] Session markers work correctly
- [ ] No performance issues

---

## ⏭️ After This Step

Once intraday prices are working:
1. Port EventsAPI for catalyst dots
2. Test MiniChart with real data + real events
3. Consider porting full HistoricalPriceService for other time ranges
4. Continue with remaining chart components

---

## 📝 Notes

- Start simple: just 5-minute intraday data
- Can expand later for other timeframes (1D, 1W, 1M, etc.)
- Focus on MiniChart needs first
- Full service can wait until StockLineChart implementation

---

**Ready to implement?** This will complete the MiniChart's data layer and make it fully functional with real Supabase data!
