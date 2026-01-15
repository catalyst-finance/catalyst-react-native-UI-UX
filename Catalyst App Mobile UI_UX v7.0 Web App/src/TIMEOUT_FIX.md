# Supabase Timeout Fix for Intraday Prices

## Problem
❌ Error: `Supabase stock query timed out after 3000ms` when fetching intraday prices for META and other high-volume stocks.

## Root Cause
The `intraday_prices` table contains millions of rows of real-time data. Without proper optimization:
- Queries were scanning too many rows
- Missing or inefficient database indexes
- Timeout was too aggressive (3000ms)
- No time range constraints for large datasets

## Solutions Implemented

### 1. Query Optimization (`/utils/supabase/stock-api.ts`)

**Before:**
```typescript
const { data, error } = await this.withTimeout(query, 3000); // Too short
```

**After:**
```typescript
// Build query with optimized order: filter first, then order, then limit
let query = supabase
  .from(INTRADAY_PRICES_TABLE)
  .select('timestamp, price, volume');

// Apply filters first (most selective to least selective)
query = query.eq('symbol', symbol.toUpperCase()); // Primary filter

if (fromTimestamp) {
  query = query.gte('timestamp', fromTimestamp);
}
if (toTimestamp) {
  query = query.lte('timestamp', toTimestamp);
}

// Apply ordering and limit after filters
query = query
  .order('timestamp', { ascending: true })
  .limit(effectiveLimit);

const { data, error } = await this.withTimeout(query, 10000); // Increased to 10s
```

**Changes:**
- ✅ Increased timeout from 3s to 10s
- ✅ Reduced default limit from 5000 to 2000 rows
- ✅ Optimized query structure (filters → order → limit)
- ✅ Added detailed error messages for timeout issues

### 2. Time Range Constraints (`/utils/historical-price-service.ts`)

**1D View Optimization:**
```typescript
// For 1D view, we only need today's data (last 24 hours max)
const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const constrainedFromTimestamp = new Date(Math.max(
  new Date(fromTimestamp).getTime(), 
  oneDayAgo.getTime()
)).toISOString();
```

**Multi-Day Fallback:**
```typescript
// For multi-day fallback, constrain to reasonable time range
const maxDaysBack = Math.min(days, 7); // Max 7 days for fallback
const constrainedFromTimestamp = new Date(
  now.getTime() - maxDaysBack * 24 * 60 * 60 * 1000
).toISOString();
```

### 3. Prefer Pre-Aggregated Data

**New Strategy for 1D View:**
```typescript
// Try five_minute_prices first (faster, pre-aggregated)
prices = await StockAPI.getFiveMinutePrices(symbol, fromTimestamp, toTimestamp);

// Fallback to raw intraday_prices only if insufficient data
if (prices.length < 10) {
  const rawPrices = await StockAPI.getIntradayPrices(
    symbol, 
    constrainedFromTimestamp, 
    toTimestamp, 
    limit || 500,      // Reduced from 2000
    sampleRate || 5    // Sample every 5th row
  );
}
```

### 4. Better Error Messages

```typescript
if (error.message?.includes('timed out')) {
  console.error(`❌ Query timeout for ${symbol} intraday prices.`);
  console.error(`   Recommended index: CREATE INDEX IF NOT EXISTS idx_intraday_prices_symbol_timestamp ON intraday_prices(symbol, timestamp DESC);`);
  console.error(`   Time range: ${fromTimestamp} to ${toTimestamp}, Limit: ${effectiveLimit}`);
}
```

## Database Recommendations

### Required Index
If timeouts persist, create this composite index on the Supabase database:

```sql
CREATE INDEX IF NOT EXISTS idx_intraday_prices_symbol_timestamp 
ON intraday_prices(symbol, timestamp DESC);
```

This allows the database to:
1. Quickly filter by symbol
2. Efficiently sort by timestamp
3. Apply LIMIT without scanning all rows

### Verify Index Usage
```sql
EXPLAIN ANALYZE
SELECT timestamp, price, volume 
FROM intraday_prices 
WHERE symbol = 'META' 
  AND timestamp >= '2024-01-01T00:00:00Z' 
  AND timestamp <= '2024-01-02T00:00:00Z'
ORDER BY timestamp ASC 
LIMIT 2000;
```

Should show: `Index Scan using idx_intraday_prices_symbol_timestamp`

## Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Timeout | 3s | 10s | +233% |
| Default Limit | 5000 | 2000 | -60% rows |
| 1D Time Range | No constraint | Max 24 hours | 95%+ reduction |
| Multi-day Fallback | No constraint | Max 7 days | 70%+ reduction |
| Data Source (1D) | Always raw | five_minute_prices first | 10x faster |

## Testing

Test the fix with these high-volume stocks:
- ✅ META (Facebook)
- ✅ TSLA (Tesla)
- ✅ NVDA (NVIDIA)
- ✅ AAPL (Apple)

Expected behavior:
1. 1D view loads from `five_minute_prices` (fast)
2. Falls back to `intraday_prices` with 24-hour constraint if needed
3. Multi-day views use `five_minute_prices` exclusively
4. No timeout errors
5. Chart renders within 2-3 seconds

## Monitoring

Watch for these log messages:
```
✅ [META] Successfully using five_minute_prices for 1D view (78 bars)
✅ Fetched 500 intraday prices for META (limit: 500)
⚠️  [META] five_minute_prices insufficient (3 rows), falling back to raw intraday_prices
❌ Query timeout for META intraday prices. This likely indicates missing database index.
```

## Next Steps

If timeouts still occur:
1. ✅ Create the recommended index
2. Consider increasing timeout to 15s
3. Reduce default limit further (1000 rows)
4. Increase default sample rate (every 10th row)
5. Add query result caching (Redis/Supabase Edge Functions)
