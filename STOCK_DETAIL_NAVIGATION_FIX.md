# StockDetailScreen Navigation Fix

## Problem
App was crashing on startup with error:
```
TypeError: expected dynamic type 'boolean', but had type 'string'
```

The error was coming from `RNSScreen` component in `react-native-screens`.

## Root Cause
Bug in `react-native-screens@4.19.0` when used with Expo Go's new architecture (Fabric). The library was passing a string value where a boolean was expected in the native layer.

## Solution Applied

### 1. Removed Problematic Android Flags
Removed from `app.json`:
- `edgeToEdgeEnabled: true`
- `predictiveBackGestureEnabled: false`

These flags were causing additional compatibility issues with the new architecture.

### 2. Downgraded Packages to Expo SDK 54-Compatible Versions
Updated `package.json`:
- `react-native-screens`: `4.19.0` → `~4.16.0` ✅
- `react-native-gesture-handler`: `2.30.0` → `~2.28.0` ✅
- `react-native-reanimated`: `4.2.1` → `~4.1.1` ✅
- `react-native-svg`: `15.15.1` → `15.12.1` ✅
- `@react-native-community/slider`: `5.1.1` → `5.0.1` ✅

### 3. Changed Navigation Architecture
Instead of using a stack navigator (which uses `react-native-screens`), we now use:
- **Tab Navigator** for main navigation
- **React Native Modal** for StockDetailScreen

This approach:
- Avoids the `react-native-screens` bug entirely for the detail screen
- Uses React Native's built-in Modal component
- Provides full-screen presentation
- Works reliably with Expo Go's new architecture

## Implementation Details

### RootNavigator.tsx
- Removed `createStackNavigator` 
- Now uses only `createBottomTabNavigator`
- StockDetailScreen is no longer in the navigation tree

### HomeScreen.tsx
- Added Modal state: `selectedTicker`, `showStockDetail`
- Added `handleStockClick` to open modal
- Added `handleCloseStockDetail` to close modal
- Renders `<Modal>` with `StockDetailScreen` inside

### StockDetailScreen.tsx
- Changed from navigation-based to prop-based
- Now accepts `ticker: string` and `onClose: () => void` props
- Uses `onClose()` instead of `navigation.goBack()`

## Files Modified
1. `catalyst-native/app.json` - Removed Android flags, enabled new architecture
2. `catalyst-native/package.json` - Downgraded packages
3. `catalyst-native/src/navigation/RootNavigator.tsx` - Removed stack navigator
4. `catalyst-native/src/screens/HomeScreen.tsx` - Added modal for stock detail
5. `catalyst-native/src/screens/StockDetailScreen.tsx` - Changed to prop-based component

## Testing
After applying these changes:
1. Stop the Expo server
2. Clear cache: `npx expo start --clear`
3. Reload the app in Expo Go
4. App should load without crashing
5. Tapping a stock card should open StockDetailScreen as a full-screen modal

## Next Steps
Once navigation is working:
- **Session 2**: Integrate StockLineChart into StockDetailScreen
- **Session 3**: Add price display and key statistics
- **Session 4**: Add events timeline
- **Session 5**: Add company information
- **Session 6**: Add ownership and executives
- **Session 7**: Add financials section
- **Session 8**: Polish and integration

## Credits
Fix identified by GitHub Copilot - the issue was a known bug in `react-native-screens@4.19.0` with Expo Go's new architecture.
