# What You Will See 👀

**Quick visual guide to the Data Test screen**

---

## 📱 Navigation

When you open the app, you'll see **6 tabs** at the bottom:

```
┌─────────────────────────────────────────────┐
│                                             │
│              App Content                    │
│                                             │
└─────────────────────────────────────────────┘
┌─────┬─────┬─────┬─────┬─────┬─────────────┐
│ 🏠  │ ✨  │ 🔍  │ 👤  │ ⊞   │ 🧪          │
│Home │Copi │Disc │Prof │Comp │ Data Test   │
│     │lot  │over │ile  │     │             │
└─────┴─────┴─────┴─────┴─────┴─────────────┘
```

**Tap the flask icon (🧪) "Data Test" tab**

---

## 🧪 Data Test Screen

You'll see this layout:

```
┌─────────────────────────────────────────────┐
│ ← Data Test                                 │
├─────────────────────────────────────────────┤
│                                             │
│  StockAPI Test                              │
│  Test Supabase connection and data fetching │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Test Get Single Stock (AAPL)        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Test Get Multiple Stocks            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Test Search Stocks                  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Clear Cache                         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Instructions:                              │
│  1. Make sure you're connected to the       │
│     internet                                │
│  2. Click any test button to fetch data     │
│     from Supabase                           │
│  3. First fetch will be slow, subsequent    │
│     fetches use cache                       │
│  4. Check console logs for detailed info    │
│  5. Clear cache to force fresh data fetch   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ After Tapping "Test Get Single Stock (AAPL)"

### Step 1: Loading
```
┌─────────────────────────────────────────────┐
│                                             │
│  ⏳ Loading...                              │
│                                             │
└─────────────────────────────────────────────┘
```

### Step 2: Success!
```
┌─────────────────────────────────────────────┐
│  Result:                                    │
│  ✅ Success! Got data for AAPL              │
│                                             │
│  Stock Data:                                │
│  ┌─────────────────────────────────────┐   │
│  │ Symbol:          AAPL               │   │
│  │ Company:         Apple Inc.         │   │
│  │ Current Price:   $185.23            │   │
│  │ Change:          +2.45 (+1.34%)     │   │
│  │ Previous Close:  182.78             │   │
│  │ Volume:          52,345,678         │   │
│  │ Market Cap:      2.8T               │   │
│  │ Sector:          Technology         │   │
│  │ Last Updated:    1/12/26, 2:30 PM   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 📊 Console Logs

While testing, check the console for detailed logs:

### First Fetch (from API):
```
[StockAPI] Fetching AAPL from Supabase...
💾 [StockAPI] Cached stock_AAPL
✅ [StockAPI] Fetched 1 stock from API
```

### Second Fetch (from cache):
```
✅ [StockAPI] Cache hit for stock_AAPL
```

### Clear Cache:
```
🗑️ [StockAPI] Cleared 5 cached items
```

### Offline:
```
⚠️ [StockAPI] Offline, no cached data for AAPL
```

---

## 🎨 Color Coding

### Positive Change (Green):
```
Change: +2.45 (+1.34%)  ← Green text
```

### Negative Change (Red):
```
Change: -1.23 (-0.67%)  ← Red text
```

---

## 🧪 Test Sequence

### Recommended Testing Order:

1. **Test Single Stock**
   - Tap "Test Get Single Stock (AAPL)"
   - Wait for loading (2-3 seconds)
   - See success message and AAPL data
   - Check console for "Cached stock_AAPL"

2. **Test Cache**
   - Tap "Test Get Single Stock (AAPL)" again
   - Should be instant (< 100ms)
   - Check console for "Cache hit"

3. **Test Multiple Stocks**
   - Tap "Test Get Multiple Stocks"
   - Wait for loading (3-4 seconds)
   - See "Got 3 stocks: AAPL, MSFT, TSLA"
   - AAPL data displays (from cache)

4. **Test Search**
   - Tap "Test Search Stocks"
   - Wait for loading (2-3 seconds)
   - See "Found X stocks: AAPL, ..."
   - First result displays

5. **Test Clear Cache**
   - Tap "Clear Cache"
   - See "Cache cleared successfully"
   - Check console for "Cleared X cached items"

6. **Test After Clear**
   - Tap "Test Get Single Stock (AAPL)" again
   - Should be slow again (fetching from API)
   - Check console for "Cached stock_AAPL"

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Buttons respond to taps
- ✅ Loading indicator appears
- ✅ Success messages show green checkmarks
- ✅ Stock data displays with real prices
- ✅ Prices are reasonable (not 0 or null)
- ✅ Changes show correct colors (green/red)
- ✅ Second fetch is instant
- ✅ Console shows expected logs

---

## 🐛 Error Indicators

If something's wrong, you'll see:
- ❌ Red X in result message
- ❌ "Error: ..." message
- ❌ No stock data displayed
- ❌ Console shows error logs

Common errors:
- "Network request failed" → Check internet
- "Offline" → Check device network settings
- "No data returned" → Check Supabase database

---

## 🎉 What Success Looks Like

When everything works, you should see:
1. App loads without crashes
2. Data Test tab appears
3. Buttons work and show loading
4. Stock data displays correctly
5. Caching works (instant second fetch)
6. Console shows clean logs
7. No errors or warnings

**This means Supabase connection is working and StockAPI is ready to use with charts!**

---

## ⏭️ After Testing

Once you see success:
1. ✅ Supabase connection verified
2. ✅ StockAPI working
3. ✅ Caching working
4. ✅ Ready to connect MiniChart to real data

Next step: Connect MiniChart to use StockAPI instead of test data!
