# 5-Minute Chart Data Update

## Changes Made

### 1. Updated Data Source for 1D View
Changed the StockLineChart 1D view to use `five_minute_prices` table instead of `one_minute_prices`:

**Benefits:**
- Fewer data points (~192 vs ~480) = better performance
- Cleaner chart visualization with 5-minute intervals
- Still captures all price movements accurately
- Matches the crosshair time display (5-minute intervals)

### 2. Updated HistoricalPriceAPI

**Added `fetchFiveMinuteData` method:**
- Queries `five_minute_prices` table
- Fetches today's trading session (4:00 AM - 8:00 PM ET)
- Automatically determines session (pre-market, regular, after-hours)
- Returns ~192 data points for a full trading day

**Updated data source mapping:**
- **1D**: `five_minute_prices` (5-minute intervals)
- **1W**: `hourly_prices` (1-hour intervals)
- **1M**: `hourly_prices` (1-hour intervals)
- **3M, YTD, 1Y, 5Y**: `daily_prices` (daily intervals)

### 3. Updated ComponentShowcaseScreen

**Changed 1D data fetching:**
- Now uses `HistoricalPriceAPI.fetchHistoricalData('AAPL', '1D')`
- Previously used `RealtimeIntradayAPI` (1-minute data)
- Simplified the code by using consistent API for all time ranges

**Removed real-time sync for 1D historical data:**
- StockLineChart 1D view now uses static 5-minute data
- MiniChart still uses real-time 1-minute data from `RealtimeIntradayAPI`
- This separation is intentional: MiniChart needs real-time updates, StockLineChart shows cleaner 5-minute intervals

### 4. Updated Crosshair Time Display

**1D View (Intraday):**
- Times are now rounded to 5-minute intervals
- Example: If you touch at 2:33 PM, it shows "2:35 PM"
- Matches the 5-minute data granularity

**1W and 1M Views:**
- Shows both date and time
- Example: "Jan 10, 2:30 PM"

**Other Views (3M, YTD, 1Y, 5Y):**
- Shows date only
- Example: "Jan 10, 2025"

## Data Flow

### MiniChart (WatchlistCard, HoldingsCard)
```
RealtimeIntradayAPI → one_minute_prices → Real-time updates
```

### StockLineChart 1D View
```
HistoricalPriceAPI → five_minute_prices → 5-minute intervals
```

### StockLineChart Other Views
```
HistoricalPriceAPI → hourly_prices/daily_prices → Hourly/Daily intervals
```

## Testing

Test the following:
1. ✅ **1D view**: Should show ~192 data points with 5-minute intervals
2. ✅ **Crosshair on 1D**: Times should be rounded to 5-minute intervals (e.g., 9:30, 9:35, 9:40)
3. ✅ **1W view**: Should show hourly data with date + time in crosshair
4. ✅ **1M view**: Should show hourly data with date + time in crosshair
5. ✅ **MiniChart**: Should still show real-time 1-minute updates
6. ✅ **Session rendering**: Pre-market, regular, and after-hours sections should render correctly

## Performance Impact

**Before (1-minute data):**
- ~480 data points for 1D view
- More processing for path generation
- Noisier chart line

**After (5-minute data):**
- ~192 data points for 1D view (60% reduction)
- Faster rendering
- Smoother, cleaner chart line
- Better user experience
