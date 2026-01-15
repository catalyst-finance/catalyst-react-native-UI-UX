# Data Test Guide

**Status**: Ready for Testing
**Created**: January 12, 2026

---

## 🎯 What We're Testing

The DataTestScreen verifies that:
1. Supabase client connects successfully
2. StockAPI can fetch real stock data
3. Caching works correctly
4. Network state detection works
5. Offline mode handles gracefully

---

## 📱 How to Test

### 1. Start the App
```bash
cd catalyst-native
npm start
```

### 2. Open on iPhone
- Scan QR code with Camera app
- Or press `i` to open in iOS Simulator

### 3. Navigate to Data Test Tab
- Look for the flask icon (🧪) in the bottom tab bar
- Tap "Data Test"

### 4. Run Tests

#### Test 1: Single Stock Fetch
- Tap "Test Get Single Stock (AAPL)"
- Should see:
  - Loading indicator
  - Success message
  - Stock data displayed (price, change, volume, etc.)
- Check console for detailed logs

#### Test 2: Multiple Stocks
- Tap "Test Get Multiple Stocks"
- Should fetch AAPL, MSFT, TSLA
- Should see count and symbols

#### Test 3: Search
- Tap "Test Search Stocks"
- Searches for "apple"
- Should return matching stocks

#### Test 4: Cache
- Tap any test button twice
- First time: slow (fetches from API)
- Second time: instant (from cache)
- Check console for "Cache hit" messages

#### Test 5: Clear Cache
- Tap "Clear Cache"
- Then run any test again
- Should be slow again (cache cleared)

#### Test 6: Offline Mode
- Enable Airplane Mode on device
- Tap any test button
- Should show offline warning
- Disable Airplane Mode
- Test should work again

---

## ✅ Expected Results

### Success Indicators:
- ✅ Green checkmark messages
- ✅ Stock data displays correctly
- ✅ Prices are reasonable (not 0 or null)
- ✅ Changes show positive/negative correctly
- ✅ Second fetch is instant (cache working)
- ✅ Console shows detailed logs

### Console Logs to Look For:
```
✅ [StockAPI] Cache hit for stock_AAPL
💾 [StockAPI] Cached stock_AAPL
✅ [StockAPI] Fetched 3 stocks from API
🗑️ [StockAPI] Cleared 5 cached items
⚠️ [StockAPI] Offline, no cached data for AAPL
```

---

## 🐛 Troubleshooting

### Issue: "Error fetching stock"
**Cause**: Network issue or Supabase credentials
**Fix**: 
- Check internet connection
- Verify `src/services/supabase/info.ts` has correct credentials
- Check Supabase dashboard for API status

### Issue: "Offline" warning when online
**Cause**: Network state detection issue
**Fix**:
- Check device network settings
- Restart app
- Check NetInfo package installation

### Issue: Cache not working
**Cause**: AsyncStorage issue
**Fix**:
- Clear app data
- Reinstall app
- Check AsyncStorage package installation

### Issue: Data shows as 0 or null
**Cause**: Database has no data for that symbol
**Fix**:
- Try different symbol (AAPL, MSFT, GOOGL)
- Check Supabase database has data
- Verify table names match

---

## 📊 What Data Should Look Like

### Example AAPL Data:
```
Symbol: AAPL
Company: Apple Inc.
Current Price: $185.23
Change: +2.45 (+1.34%)
Previous Close: 182.78
Volume: 52,345,678
Market Cap: 2.8T
Sector: Technology
Last Updated: 2026-01-12T14:30:00Z
```

---

## ⏭️ Next Steps After Testing

Once all tests pass:
1. ✅ Verify Supabase connection works
2. ✅ Verify caching works
3. ✅ Verify offline mode works
4. Connect MiniChart to use real StockAPI data
5. Remove test data from ComponentShowcaseScreen
6. Test MiniChart with real data
7. Continue with remaining API services (Events, Historical Prices)

---

## 🔗 Related Files

- `src/screens/DataTestScreen.tsx` - Test screen UI
- `src/services/supabase/StockAPI.ts` - API service being tested
- `src/services/supabase/client.ts` - Supabase client
- `src/services/supabase/info.ts` - Credentials
- `PHASE_3_DATA_LAYER.md` - Overall data layer plan

---

## 📝 Notes

- First API call will be slow (fetching from Supabase)
- Subsequent calls within 5 minutes use cache (instant)
- Cache automatically expires after 5 minutes
- Network state is checked before each API call
- All errors are logged to console for debugging
