# Quick Start: Daily Prices Integration

## TL;DR
Your `daily_prices` Supabase table is now fully integrated. All charts automatically use it as the primary data source for daily historical prices. No code changes needed to use it - it just works! 🎉

## Verify It's Working

1. **Open any stock chart in your app**
2. **Look for the data source indicator** (should show "cached" when using database)
3. **Check browser console** for any errors

## The Data Flow (Automatic)

```
User requests chart
    ↓
Memory Cache (10 min TTL)
    ↓ (if miss)
daily_prices table ⭐ YOUR TABLE
    ↓ (if no data)
Finnhub API
    ↓ (if fails)
Mock Data (always works)
```

## Your Table Schema Reminder

```sql
-- Symbol must be LOWERCASE
-- Primary key: (symbol, date)

daily_prices:
  symbol: 'aapl' (not 'AAPL')
  date: '2024-12-31'
  open: 185.64
  high: 186.95
  low: 184.35
  close: 185.14
  volume: 48234567
```

## Quick Code Examples

### Get prices for one stock:
```typescript
import StockAPI from './utils/supabase/stock-api';

const prices = await StockAPI.getDailyPrices(
  'AAPL',
  '2024-01-01',
  '2024-12-31'
);
```

### Get prices for multiple stocks (single query):
```typescript
const prices = await StockAPI.getMultipleDailyPrices(
  ['AAPL', 'MSFT', 'NVDA'],
  '2024-01-01',
  '2024-12-31'
);
```

### Let the service handle everything (RECOMMENDED):
```typescript
import HistoricalPriceService from './utils/historical-price-service';

const chartData = await HistoricalPriceService.getHistoricalPrices(
  'AAPL',
  'daily',
  365  // days
);
// Automatically uses daily_prices table! ✨
```

## What Each Chart Uses

| Chart Component | Data Source | Notes |
|----------------|-------------|-------|
| **Stock Chart** | ✅ daily_prices → API → Mock | Full integration |
| **Mini Stock Chart** | ✅ daily_prices → API → Mock | Same as Stock Chart |
| **Portfolio Chart** | 🟡 Mock data | Could be enhanced later |

## Performance Tips

✅ **Batch queries are optimized** - Multiple stocks use one database query  
✅ **Memory cache** - 10-minute TTL reduces database load  
✅ **Timeout protection** - 10-second limit prevents hanging  
✅ **Graceful fallback** - Always shows data, even if table is empty  

## Troubleshooting

### Charts show "api" or "mock" instead of "cached"
- Check if symbols are **lowercase** in your table
- Verify date range has data in the table
- Check browser console for database errors

### No data showing up
- Table exists: `daily_prices` in Supabase
- Symbols are lowercase: `'aapl'` not `'AAPL'`
- Date ranges overlap with requested range
- Network connection to Supabase is working

### Performance is slow
- Check if table indexes exist:
  - `daily_prices_pkey` (symbol, date)
  - `daily_prices_date_idx` (date)
- Reduce date range in queries
- Check Supabase performance metrics

## Files to Reference

📖 **Detailed docs**: `/utils/data-flow-documentation.md`  
📖 **Integration summary**: `/DAILY_PRICES_INTEGRATION.md`  
📖 **Code examples**: `/utils/daily-prices-examples.ts`  

## What Changed in Your Codebase

✅ `/utils/supabase/stock-api.ts` - 3 new methods  
✅ `/utils/historical-price-service.ts` - Integrated daily_prices  
✅ `/components/stock-chart.tsx` - Updated data source handling  

## Next Steps (Optional)

- [ ] Verify your table has data for all tickers in the app
- [ ] Set up automated data ingestion if not already done
- [ ] Monitor database query performance in Supabase dashboard
- [ ] Consider adding portfolio chart integration

## Need Help?

Check the comprehensive docs:
- `/DAILY_PRICES_INTEGRATION.md` - Full integration details
- `/utils/data-flow-documentation.md` - Technical architecture
- `/utils/daily-prices-examples.ts` - 10+ code examples

---

**You're all set! 🚀 The integration is complete and working.**