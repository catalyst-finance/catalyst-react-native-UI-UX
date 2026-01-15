# Test Checklist ✅

**Use this checklist while testing the Data Test screen**

---

## 🚀 Pre-Test Setup

- [ ] Navigate to `catalyst-native` directory
- [ ] Run `npm start`
- [ ] App starts without errors
- [ ] QR code appears (or press `i` for simulator)
- [ ] Open app on iPhone/simulator
- [ ] App loads successfully

---

## 📱 Navigation Test

- [ ] See 6 tabs at bottom of screen
- [ ] See "Data Test" tab with flask icon (🧪)
- [ ] Tap "Data Test" tab
- [ ] Screen loads with title "StockAPI Test"
- [ ] See 4 test buttons
- [ ] See instructions at bottom

---

## 🧪 Test 1: Single Stock Fetch

- [ ] Tap "Test Get Single Stock (AAPL)"
- [ ] Loading indicator appears
- [ ] Wait 2-3 seconds
- [ ] Success message appears: "✅ Success! Got data for AAPL"
- [ ] Stock data section appears
- [ ] Symbol shows: AAPL
- [ ] Company shows: Apple Inc.
- [ ] Current Price shows: $XXX.XX (reasonable number)
- [ ] Change shows: +/- X.XX (+/- X.XX%)
- [ ] Change color is green (positive) or red (negative)
- [ ] Previous Close shows: XXX.XX
- [ ] Volume shows: XX,XXX,XXX (formatted with commas)
- [ ] Market Cap shows: X.XT or X.XB
- [ ] Sector shows: Technology
- [ ] Last Updated shows: date and time
- [ ] Console shows: "💾 [StockAPI] Cached stock_AAPL"

---

## 🧪 Test 2: Cache Verification

- [ ] Tap "Test Get Single Stock (AAPL)" again (immediately)
- [ ] Response is instant (< 100ms)
- [ ] Same data appears
- [ ] Console shows: "✅ [StockAPI] Cache hit for stock_AAPL"

---

## 🧪 Test 3: Multiple Stocks

- [ ] Tap "Test Get Multiple Stocks"
- [ ] Loading indicator appears
- [ ] Wait 3-4 seconds
- [ ] Success message: "✅ Success! Got 3 stocks: AAPL, MSFT, TSLA"
- [ ] Stock data shows AAPL (from cache)
- [ ] Console shows: "✅ [StockAPI] Fetched X stocks from API"

---

## 🧪 Test 4: Search Stocks

- [ ] Tap "Test Search Stocks"
- [ ] Loading indicator appears
- [ ] Wait 2-3 seconds
- [ ] Success message: "✅ Success! Found X stocks: ..."
- [ ] Stock data shows first result
- [ ] Result is related to "apple"

---

## 🧪 Test 5: Clear Cache

- [ ] Tap "Clear Cache"
- [ ] Success message: "✅ Cache cleared successfully"
- [ ] Stock data disappears
- [ ] Console shows: "🗑️ [StockAPI] Cleared X cached items"

---

## 🧪 Test 6: Fetch After Clear

- [ ] Tap "Test Get Single Stock (AAPL)" again
- [ ] Loading indicator appears (not instant)
- [ ] Wait 2-3 seconds
- [ ] Success message appears
- [ ] Stock data appears
- [ ] Console shows: "💾 [StockAPI] Cached stock_AAPL" (not cache hit)

---

## 🌐 Test 7: Offline Mode (Optional)

- [ ] Enable Airplane Mode on device
- [ ] Tap "Test Get Single Stock (AAPL)"
- [ ] See warning: "⚠️ Offline, no cached data"
- [ ] Console shows: "⚠️ [StockAPI] Offline..."
- [ ] Disable Airplane Mode
- [ ] Tap button again
- [ ] Works normally

---

## 📊 Console Logs Verification

Check console for these logs:

### During Tests:
- [ ] See "💾 [StockAPI] Cached stock_AAPL"
- [ ] See "✅ [StockAPI] Cache hit for stock_AAPL"
- [ ] See "✅ [StockAPI] Fetched X stocks from API"
- [ ] See "🗑️ [StockAPI] Cleared X cached items"

### No Errors:
- [ ] No "❌ [StockAPI] Error..." messages
- [ ] No "Network request failed" errors
- [ ] No "Cannot read property..." errors
- [ ] No red error messages

---

## ✅ Success Criteria

All tests pass when:
- [ ] All 7 tests completed successfully
- [ ] All checkboxes above are checked
- [ ] No errors in console
- [ ] Stock data displays correctly
- [ ] Caching works (instant second fetch)
- [ ] Prices are reasonable numbers
- [ ] Colors are correct (green/red)
- [ ] Console logs match expected output

---

## 🐛 If Any Test Fails

### Troubleshooting Steps:

1. **Check Internet Connection**
   - [ ] Device is connected to WiFi
   - [ ] Can browse web on device
   - [ ] Try different network

2. **Check Supabase**
   - [ ] Verify credentials in `src/services/supabase/info.ts`
   - [ ] Check Supabase dashboard is accessible
   - [ ] Verify database has data

3. **Restart App**
   - [ ] Stop Metro bundler (Ctrl+C)
   - [ ] Run `npm start -- --reset-cache`
   - [ ] Reload app on device

4. **Check Dependencies**
   - [ ] Run `npm install`
   - [ ] Verify all packages installed
   - [ ] Check for version conflicts

5. **Check Console**
   - [ ] Read error messages carefully
   - [ ] Look for specific error details
   - [ ] Search error message online

---

## 📝 Notes Section

Use this space to note any issues or observations:

```
Issue 1:
________________________________________

Issue 2:
________________________________________

Issue 3:
________________________________________
```

---

## 🎉 After All Tests Pass

Once all tests pass:
- [ ] Mark this checklist as complete
- [ ] Document any issues found
- [ ] Proceed to next step: Connect MiniChart to real data
- [ ] Update `PHASE_3_DATA_LAYER.md` with test results

---

## ⏭️ Next Steps

After successful testing:
1. Connect MiniChart to use StockAPI
2. Remove test data from ComponentShowcaseScreen
3. Verify MiniChart displays real prices
4. Port EventsAPI service
5. Port HistoricalPriceService
6. Continue with remaining chart components

---

**Date Tested**: _______________
**Tested By**: _______________
**Result**: ⬜ PASS  ⬜ FAIL
**Notes**: _______________
