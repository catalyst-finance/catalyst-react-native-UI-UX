# Test Data Updated

**Date**: January 13, 2026  
**Change**: Updated test tickers to user-specified stocks

---

## Updated Test Data

### Holdings (Portfolio):
- **TMC** - The Metals Company
- **MNMD** - Mind Medicine (MindMed)
- **TSLA** - Tesla, Inc.

### Watchlist:
- **AAPL** - Apple Inc.

---

## How to Use

### Method 1: Add to App.tsx (Recommended)

Add this to `App.tsx` after service initialization:

```typescript
import { populateTestData } from './src/utils/test-data-helper';

// In the prepare() function, after "All services initialized":
if (__DEV__) {
  console.log('🧪 Populating test data for HomeScreen...');
  await populateTestData();
}
```

### Method 2: Manual Population

Use the DataService directly:

```typescript
import { DataService } from './src/services/DataService';

// Set holdings
await DataService.setCachedData('holdings', ['TMC', 'MNMD', 'TSLA'], Infinity);

// Set watchlist
await DataService.setCachedData('watchlist', ['AAPL'], Infinity);
```

---

## What You'll See

When you navigate to the Home screen, you should see:

### Holdings Section:
1. **TMC** - The Metals Company
   - Current price
   - Percentage change
   - Intraday mini chart

2. **MNMD** - Mind Medicine
   - Current price
   - Percentage change
   - Intraday mini chart

3. **TSLA** - Tesla, Inc.
   - Current price
   - Percentage change
   - Intraday mini chart

### Watchlist Section:
1. **AAPL** - Apple Inc.
   - Current price
   - Percentage change
   - Intraday mini chart

---

## Testing

1. **Reload the app** after adding the code to App.tsx
2. **Navigate to Home tab** in the bottom navigation
3. **Pull down to refresh** to reload data
4. **Toggle dark mode** in Profile tab to test theme
5. **Tap any card** to see ticker logged (navigation coming soon)

---

## Notes

- All data is fetched from real APIs (StockAPI + IntradayPriceAPI)
- Charts show real intraday price data
- Prices update on pull-to-refresh
- Data is cached for offline access
- Test data persists until cleared

---

## Clear Test Data

To clear the test data:

```typescript
import { clearTestData } from './src/utils/test-data-helper';

await clearTestData();
```

Or manually:

```typescript
await DataService.invalidateCache('holdings');
await DataService.invalidateCache('watchlist');
```

---

**Ready to test!** 🚀
