# Data Source Standardization - Complete

## Issue
HomeScreen and ComponentShowcaseScreen were using different data sources for chart data, causing inconsistent chart displays between the two screens.

## Root Cause
**HomeScreen:**
- Used `IntradayPriceAPI.getIntradayPrices()`
- Queried `intraday_prices` table
- 5-minute aggregated data

**ComponentShowcaseScreen:**
- Used `HistoricalPriceAPI.fetchHistoricalData('1D')`
- Queried `five_minute_prices` table
- 5-minute aggregated data

Both used 5-minute intervals, but from **different database tables** with potentially different data or update schedules.

## Solution
Standardized HomeScreen to use the same data source as ComponentShowcaseScreen:
- Changed from `IntradayPriceAPI` to `HistoricalPriceAPI`
- Now queries `five_minute_prices` table for 1D data
- Consistent data across both screens

## Files Modified

### 1. `catalyst-native/src/screens/HomeScreen.tsx`
**Changes:**
- Removed import: `IntradayPriceAPI`
- Added import: `HistoricalPriceAPI`
- Updated data fetching: `IntradayPriceAPI.getIntradayPrices(ticker)` → `HistoricalPriceAPI.fetchHistoricalData(ticker, '1D')`

**Before:**
```typescript
import IntradayPriceAPI from '../services/supabase/IntradayPriceAPI';

const intradayPrices = await IntradayPriceAPI.getIntradayPrices(ticker);
```

**After:**
```typescript
import HistoricalPriceAPI from '../services/supabase/HistoricalPriceAPI';

const intradayPrices = await HistoricalPriceAPI.fetchHistoricalData(ticker, '1D');
```

### 2. `catalyst-native/src/components/charts/PortfolioChart.tsx`
**Changes:**
- Removed import: `IntradayPriceAPI`
- Updated `loadIntradayPortfolioData()` to use `HistoricalPriceAPI.fetchHistoricalData(holding.ticker, '1D')`

**Before:**
```typescript
import IntradayPriceAPI from '../../services/supabase/IntradayPriceAPI';

const intradayPrices = await IntradayPriceAPI.getIntradayPrices(holding.ticker);
```

**After:**
```typescript
// IntradayPriceAPI import removed

const intradayPrices = await HistoricalPriceAPI.fetchHistoricalData(holding.ticker, '1D');
```

## Data Source Hierarchy

`HistoricalPriceAPI.fetchHistoricalData()` now handles all time ranges consistently:

| Time Range | Data Source | Interval | Table |
|------------|-------------|----------|-------|
| 1D | `fetchFiveMinuteData()` | 5 minutes | `five_minute_prices` |
| 1W | `fetchWeeklyHourlyData()` | 1 hour | `hourly_prices` |
| 1M | `fetchMonthlyHourlyData()` | 1 hour | `hourly_prices` |
| 3M | `fetchThreeMonthDailyData()` | 1 day | `daily_prices` |
| YTD | `fetchYTDDailyData()` | 1 day | `daily_prices` |
| 1Y | `fetchYearlyDailyData()` | 1 day | `daily_prices` |
| 5Y | `fetchFiveYearWeeklyData()` | 1 week | `weekly_prices` |

## Benefits

1. **Consistency**: Both HomeScreen and ComponentShowcaseScreen now show identical chart data
2. **Maintainability**: Single API (`HistoricalPriceAPI`) handles all time ranges
3. **Reliability**: One source of truth for historical price data
4. **Scalability**: Easy to add new time ranges or modify data sources

## Testing Checklist

- [ ] HomeScreen mini charts display correctly
- [ ] HomeScreen portfolio chart displays correctly on 1D view
- [ ] Charts match ComponentShowcaseScreen display
- [ ] All time ranges work correctly (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
- [ ] Data updates properly during market hours
- [ ] Cache works correctly

## Notes

- `IntradayPriceAPI` is still used by other parts of the app (e.g., real-time updates)
- This change only affects chart data display, not real-time price updates
- The `intraday_prices` table is still used for real-time streaming data
- The `five_minute_prices` table is used for historical chart rendering

## Status
✅ **COMPLETE** - HomeScreen now uses same data source as ComponentShowcaseScreen
