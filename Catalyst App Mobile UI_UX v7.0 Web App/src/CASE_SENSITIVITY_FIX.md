# Daily Prices Case Sensitivity Fix

## Problem
The `daily_prices` table had mixed case symbols:
- **Tens of thousands** of rows with lowercase symbols (e.g., 'tsla', 'aapl') up until 8/29
- **~1,000 rows** with uppercase symbols (e.g., 'TSLA', 'AAPL') from 8/29 onwards

This caused chart queries to fail because they were using case-sensitive matching with `.eq()` and `.in()`.

## Solution Applied

Made all database queries **case-insensitive** so the app works with BOTH uppercase and lowercase symbols in the database.

### Changes Made to `/utils/supabase/stock-api.ts`:

#### 1. `getDailyPrices()` - Single symbol query
**Before:**
```typescript
.eq('symbol', symbol.toUpperCase())  // Case-sensitive
```

**After:**
```typescript
.ilike('symbol', symbol)  // Case-insensitive exact match
```

#### 2. `getMultipleDailyPrices()` - Multiple symbols query
**Before:**
```typescript
const upperSymbols = symbols.map(s => s.toUpperCase());
.in('symbol', upperSymbols)  // Only matches uppercase in DB
```

**After:**
```typescript
// Query with both uppercase and lowercase versions
const symbolVariants: string[] = [];
symbols.forEach(s => {
  symbolVariants.push(s.toUpperCase());
  symbolVariants.push(s.toLowerCase());
});
.in('symbol', symbolVariants)  // Matches both cases
```

Then normalize results to uppercase:
```typescript
const symbol = row.symbol.toUpperCase(); // Normalize to uppercase
```

#### 3. `getMostRecentDailyPrice()` - Most recent price
**Before:**
```typescript
.eq('symbol', symbol.toLowerCase())  // Case-sensitive lowercase
```

**After:**
```typescript
.ilike('symbol', symbol)  // Case-insensitive match
```

## Result

✅ Charts now work with **both uppercase and lowercase** symbols in the database
✅ No data migration required
✅ App displays all symbols as uppercase (industry standard)
✅ Queries handle mixed-case data transparently

## Data Standardization Recommendation

While the app now handles mixed case gracefully, you should **standardize on UPPERCASE** for consistency:

### Why Uppercase?
1. **Industry standard** - All financial APIs use uppercase (TSLA, AAPL, MSFT)
2. **User expectations** - Investors expect to see "TSLA" not "tsla"
3. **Consistency** - Your `stock_quote_now` table already uses uppercase
4. **API compatibility** - Finnhub, Alpha Vantage, etc. all use uppercase

### How to Standardize (Optional)

**If you want to migrate old data to uppercase**, run this SQL in Supabase:

```sql
-- Backup first!
CREATE TABLE daily_prices_backup AS SELECT * FROM daily_prices;

-- Update lowercase symbols to uppercase
UPDATE daily_prices
SET symbol = UPPER(symbol)
WHERE symbol != UPPER(symbol);

-- Verify
SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol;
```

### Future Data Writes

If you have an external process writing to `daily_prices`, ensure it writes symbols in **UPPERCASE**:

```typescript
// Good ✅
symbol: 'TSLA'

// Bad ❌  
symbol: 'tsla'
```

## Testing

Test that charts load correctly for various time ranges:
- 3M chart should show 3 months of historical data
- 6M chart should show 6 months of historical data
- 1Y chart should show 1 year of historical data
- 5Y chart should show 5 years of historical data

All queries will now match symbols regardless of case in the database.

## Notes

- The app always loads 5 years of data (1825 days) to ensure sufficient historical coverage
- The `TIME_RANGE_CONFIG` in `RobinhoodStyleChart` controls what portion is **displayed**
- The fix maintains the symmetrical split (historical on left, future catalysts on right)
