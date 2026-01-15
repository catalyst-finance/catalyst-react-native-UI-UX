# Quick Test: HomeScreen

**5-Minute Setup to See HomeScreen Working**

---

## Step 1: Add Test Data to App.tsx

Open `catalyst-native/App.tsx` and add this import at the top:

```typescript
import { populateTestData } from './src/utils/test-data-helper';
```

Then in the `prepare()` function, add this AFTER the services are initialized (after the "All services initialized" log):

```typescript
// Add test data for development
if (__DEV__) {
  console.log('🧪 Populating test data for HomeScreen...');
  await populateTestData();
}
```

## Step 2: Reload the App

```bash
# If using Expo Go:
Press 'r' in the terminal to reload

# Or shake your device and tap "Reload"
```

## Step 3: Navigate to Home Tab

- Tap the "Home" tab in the bottom navigation
- You should see:
  - **Holdings** section with 3 stocks (TMC, MNMD, TSLA)
  - **Watchlist** section with 1 stock (AAPL)
  - Each stock shows a mini chart with real data

## Step 4: Test Features

1. **Pull to Refresh**: Swipe down to refresh data
2. **Dark Mode**: Go to Profile tab, toggle dark mode, return to Home
3. **Tap Cards**: Tap any stock card (logs ticker to console)

---

## What You Should See

### Light Mode:
- White background
- Black text
- Grey section headers
- Colorful charts
- Green/red price changes

### Dark Mode:
- Dark background (#030213)
- White text
- Light grey section headers
- Inverted chart colors
- Green/red price changes

---

## Troubleshooting

### "No Stocks Yet" message:
- Check console for errors
- Verify test data was populated (look for "🧪 Populating test data" log)
- Try restarting the app

### Cards show loading spinner:
- Check network connection
- Verify Supabase is configured
- Check console for API errors

### Charts not showing:
- Wait a few seconds for data to load
- Check console for errors
- Verify IntradayPriceAPI is working

---

## Next Steps

Once HomeScreen is working:
1. Test pull-to-refresh
2. Test dark mode switching
3. Try adding more tickers to test data
4. Move on to ProfileScreen, DiscoverScreen, or CopilotScreen

---

**That's it!** You should now see a fully functional HomeScreen with real data and charts. 🚀
