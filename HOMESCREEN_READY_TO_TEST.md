# HomeScreen Ready to Test! 🚀

**Quick Setup**: 2 minutes to see your stocks on HomeScreen

---

## Step 1: Add Test Data to App.tsx

Open `catalyst-native/App.tsx` and add this import at the top:

```typescript
import { populateTestData } from './src/utils/test-data-helper';
```

Then add this in the `prepare()` function, **after** the "All services initialized" log:

```typescript
// Add test data for development
if (__DEV__) {
  console.log('🧪 Populating test data for HomeScreen...');
  await populateTestData();
}
```

## Step 2: Reload the App

- Press `r` in the terminal, or
- Shake your device and tap "Reload"

## Step 3: Navigate to Home Tab

Tap the "Home" tab in the bottom navigation.

---

## What You'll See

### Holdings Section:
- **TMC** - The Metals Company
- **MNMD** - Mind Medicine
- **TSLA** - Tesla, Inc.

### Watchlist Section:
- **AAPL** - Apple Inc.

Each stock shows:
- Current price
- Percentage change (green/red)
- Mini chart with real intraday data

---

## Test Features

1. **Pull to Refresh**: Swipe down to reload all data
2. **Dark Mode**: Go to Profile → Toggle dark mode → Return to Home
3. **Tap Cards**: Tap any stock card (logs ticker to console)

---

## Troubleshooting

### "No Stocks Yet" message?
- Check console for "🧪 Populating test data" log
- Verify code was added to App.tsx correctly
- Try restarting the app completely

### Cards show loading spinner?
- Wait a few seconds for API calls
- Check network connection
- Check console for errors

### Charts not showing?
- Verify IntradayPriceAPI is working
- Check console for chart errors
- Try pull-to-refresh

---

## Next Steps

Once working:
1. Test pull-to-refresh
2. Test dark mode
3. Try different tickers
4. Move to next screen (Profile, Discover, or Copilot)

---

**That's it!** Your HomeScreen should now display real stock data with charts. 📈
