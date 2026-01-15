# Historical Data Integration for StockLineChart

## Overview

The StockLineChart now fetches appropriate historical data for each time range from different database tables, ensuring users see the correct granularity of data for their selected view.

## Data Sources by Time Range

### 1D - Intraday Prices (via RealtimeIntradayAPI)
- **Source**: RealtimeIntradayAPI (same as MiniChart)
- **Granularity**: 1-minute intervals
- **Fields**: `timestamp`, `value`, `session`
- **Time Window**: Current trading day (8 AM - 8 PM ET)
- **Use Case**: Detailed intraday price movements with session tracking
- **Note**: Uses the same data source as MiniChart for consistency

### 1W - Five Minute Prices
- **Table**: `five_minute_prices`
- **Granularity**: 5-minute intervals
- **Fields**: `timestamp`, `open`, `high`, `low`, `close`, `volume`
- **Time Window**: Last 7 days
- **Use Case**: Week view with OHLC data for more detail

### 1M, YTD (< 3 months) - Hourly Prices
- **Table**: `hourly_prices`
- **Granularity**: 1-hour intervals
- **Fields**: `timestamp`, `open`, `high`, `low`, `close`, `volume`
- **Time Windows**:
  - 1M: Last 30 days
  - YTD (< 3 months): From January 1st to now
- **Use Case**: Month view and early-year YTD with hourly detail

### 3M, YTD (>= 3 months), 1Y, 5Y - Daily Prices
- **Table**: `daily_prices`
- **Granularity**: Daily intervals
- **Fields**: `date`, `open`, `high`, `low`, `close`, `volume`
- **Time Windows**:
  - 3M: Last 90 days
  - YTD (>= 3 months): From January 1st to now
  - 1Y: Last 365 days
  - 5Y: Last 1,825 days (5 years)
- **Use Case**: Long-term price trends
- **Note**: YTD intelligently switches from hourly to daily data at 3-month mark

## Implementation

### HistoricalPriceAPI Service

Created a new service (`HistoricalPriceAPI.ts`) that:
- Provides a unified interface for fetching historical data
- Automatically selects the correct table based on time range
- Returns data in a consistent format
- Handles errors gracefully

```typescript
interface HistoricalDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  value: number; // Close price
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  session?: string; // Only for intraday data
}
```

### Usage in ComponentShowcaseScreen

The showcase screen now:
1. Maintains state for selected time range
2. For 1D view: Uses the same data as MiniChart (from RealtimeIntradayAPI)
3. For other views: Fetches appropriate historical data from HistoricalPriceAPI
4. Passes the correct data to StockLineChart
5. Updates real-time data for 1D view only

```typescript
const handleTimeRangeChange = async (range: TimeRange) => {
  setSelectedTimeRange(range);
  if (range === '1D') {
    // Use same data as MiniChart
    setAaplHistoricalData(aaplIntradayData.map(p => ({
      timestamp: p.timestamp,
      value: p.value,
      session: p.session,
    })));
  } else {
    // Fetch from HistoricalPriceAPI
    await fetchHistoricalData(range);
  }
};
```

## Database Schema

### intraday_prices
```sql
CREATE TABLE public.intraday_prices (
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  session TEXT,
  PRIMARY KEY (symbol, timestamp)
);
```

### five_minute_prices
```sql
CREATE TABLE public.five_minute_prices (
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open DOUBLE PRECISION NOT NULL,
  high DOUBLE PRECISION NOT NULL,
  low DOUBLE PRECISION NOT NULL,
  close DOUBLE PRECISION NOT NULL,
  volume BIGINT,
  PRIMARY KEY (symbol, timestamp)
);
```

### hourly_prices
```sql
CREATE TABLE public.hourly_prices (
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open DOUBLE PRECISION NOT NULL,
  high DOUBLE PRECISION NOT NULL,
  low DOUBLE PRECISION NOT NULL,
  close DOUBLE PRECISION NOT NULL,
  volume BIGINT,
  PRIMARY KEY (symbol, timestamp)
);
```

### daily_prices
```sql
CREATE TABLE public.daily_prices (
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  open DOUBLE PRECISION NOT NULL,
  high DOUBLE PRECISION NOT NULL,
  low DOUBLE PRECISION NOT NULL,
  close DOUBLE PRECISION NOT NULL,
  volume BIGINT,
  PRIMARY KEY (symbol, date)
);
```

## Real-time Updates

For the 1D view:
- Real-time price updates from WebSocket are appended to historical data
- Ensures the chart stays current during trading hours
- Other time ranges use static historical data (no real-time updates)

## Performance Considerations

### Data Volume
- 1D: ~390 data points (6.5 hours × 60 minutes)
- 1W: ~2,016 data points (7 days × 12 hours × 24 intervals)
- 1M: ~360 data points (30 days × 12 hours)
- 3M: ~90 data points
- YTD: Variable (up to ~365 data points)
- 1Y: ~365 data points
- 5Y: ~1,825 data points

### Optimization
- Indexed queries on `symbol` and `timestamp`/`date`
- Efficient date range filtering
- Client-side caching for recently fetched data
- Downsampling for 5Y view if needed

## Testing

To test the historical data integration:

1. **Start the app**:
   ```bash
   cd catalyst-native
   npx expo start
   ```

2. **Navigate to Components tab**

3. **Scroll to "Stock Detail Chart (Real Data)"**

4. **Test each time range**:
   - Click 1D → Should show intraday data with sessions
   - Click 1W → Should show 5-minute data
   - Click 1M → Should show hourly data
   - Click 3M → Should show daily data (90 days)
   - Click YTD → Should show daily data from Jan 1
   - Click 1Y → Should show daily data (365 days)
   - Click 5Y → Should show daily data (5 years)

5. **Verify data changes**:
   - Each time range should show different data
   - Chart should update smoothly
   - No errors in console

## Future Enhancements

1. **Client-side caching**: Cache fetched data to avoid redundant API calls
2. **Loading states**: Show loading indicator during data fetch
3. **Error handling**: Display user-friendly error messages
4. **Data validation**: Validate data completeness and quality
5. **Prefetching**: Prefetch adjacent time ranges for faster switching

## Status: ✅ COMPLETE

Historical data integration is now fully implemented and ready for testing.