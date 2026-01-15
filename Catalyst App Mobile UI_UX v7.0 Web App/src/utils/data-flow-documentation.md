# Catalyst App Data Flow Documentation

## Historical Stock Price Data

### Overview
The Catalyst app uses a multi-tier data architecture for historical stock prices to ensure optimal performance and data availability.

### Data Sources (in order of priority)

#### 1. Memory Cache
- **Location**: `HistoricalPriceService` class (in-memory Map)
- **Purpose**: Fast access to recently fetched data
- **TTL**: 10 minutes
- **Usage**: Automatic for all chart requests

#### 2. Supabase `daily_prices` Table (Primary Source)
- **Table**: `public.daily_prices`
- **Schema**:
  ```sql
  symbol text (lowercase)
  date date
  open double precision
  high double precision
  low double precision
  close double precision
  volume double precision
  adjusted boolean (default: true)
  source text (default: 'finnhub')
  Primary Key: (symbol, date)
  ```
- **Data Range**: Up to 3 years of historical daily prices
- **Usage**: Primary source for daily timeframe charts
- **Access**: Via `StockAPI.getDailyPrices()` or `StockAPI.getMultipleDailyPrices()`

#### 3. Finnhub API (via Server)
- **Endpoint**: `/functions/v1/make-server-d2b7a00e/historical-prices`
- **Purpose**: Real-time data and intraday timeframes (hourly, 5min)
- **Usage**: Fallback when daily_prices table doesn't have data
- **Caching**: Results are cached to the database when possible

#### 4. Mock Data (Fallback)
- **Purpose**: Development and error recovery
- **Generation**: Algorithmic price simulation based on stock symbol
- **Usage**: Only when all other sources fail

### Component Usage

#### Stock Chart (`/components/stock-chart.tsx`)
- Uses `HistoricalPriceService.getHistoricalPrices()` for single stock
- Automatically selects best data source based on timeframe
- Displays data source indicator (cached/api/mock)

#### Mini Stock Chart
- Same as Stock Chart but optimized for smaller datasets
- Loads fewer historical days for performance

#### Portfolio Chart (`/components/portfolio-chart.tsx`)
- Currently uses mock data for portfolio value simulation
- Could be enhanced to use real holdings × daily_prices in the future

### API Methods

#### `StockAPI.getDailyPrices(symbol, fromDate, toDate)`
Fetches daily prices for a single symbol from the `daily_prices` table.

**Parameters:**
- `symbol`: Stock ticker (will be converted to lowercase)
- `fromDate`: Start date (YYYY-MM-DD format)
- `toDate`: End date (YYYY-MM-DD format)

**Returns:**
```typescript
Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>
```

#### `StockAPI.getMultipleDailyPrices(symbols, fromDate, toDate)`
Batch fetch daily prices for multiple symbols (optimized single query).

**Parameters:**
- `symbols`: Array of stock tickers
- `fromDate`: Start date (YYYY-MM-DD format)
- `toDate`: End date (YYYY-MM-DD format)

**Returns:**
```typescript
Record<string, Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>>
```

#### `HistoricalPriceService.getHistoricalPrices(symbol, timeframe, days)`
High-level method that automatically selects the best data source.

**Parameters:**
- `symbol`: Stock ticker
- `timeframe`: 'daily' | 'hourly' | '5min'
- `days`: Number of days to fetch

**Returns:**
```typescript
{
  symbol: string;
  prices: HistoricalPrice[];
  timeframe: 'daily' | 'hourly' | '5min';
  fromDate: string;
  toDate: string;
  cached: boolean;
  source: 'database' | 'api' | 'mock';
}
```

#### `HistoricalPriceService.getMultipleHistoricalPrices(symbols, timeframe, days)`
Batch fetch with automatic optimization for daily timeframe.

### Performance Optimizations

1. **Batch Fetching**: Multiple symbols fetched in single query when possible
2. **Memory Caching**: 10-minute cache prevents redundant database queries
3. **Lazy Loading**: Charts can load placeholder data first, then fetch real data
4. **Preloading**: App.tsx preloads event data for selected tickers on startup

### Data Freshness

- **daily_prices table**: Updated via external ingestion process
- **Finnhub API**: Real-time market data (15-minute delay for free tier)
- **Memory Cache**: 10-minute TTL

### Error Handling

All methods gracefully degrade through the data source hierarchy:
1. Try primary source
2. On error, try next source
3. Continue until mock data (always succeeds)

Errors are logged but don't crash the application.

### Future Enhancements

- [ ] Portfolio chart integration with daily_prices
- [ ] Intraday data caching in separate table
- [ ] Real-time WebSocket integration
- [ ] Automatic data backfilling for missing dates
- [ ] Advanced caching strategies (stale-while-revalidate)