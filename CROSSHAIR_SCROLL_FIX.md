# Crosshair Scroll Re-enable Fix

**Date**: January 13, 2026  
**Status**: ✅ Complete

## Problem
After using the crosshair on the portfolio chart and releasing touch, the screen would remain locked and not allow scrolling. The scroll disable was working correctly, but scroll wasn't being re-enabled when the crosshair was deactivated.

## Root Cause
The `useEffect` in StockLineChart that notifies the parent component of crosshair changes only handled the `true` case (when crosshair becomes active). It didn't explicitly handle the `false` case when the crosshair was deactivated and `crosshairPoint` became `null`.

While the PanResponder handlers (`onPanResponderRelease` and `onPanResponderTerminate`) did call `onCrosshairChange?.(false)`, there was a timing issue where the state updates and callback weren't synchronized properly.

## Solution
Updated the `useEffect` in StockLineChart to explicitly handle both activation and deactivation:

```typescript
useEffect(() => {
  if (crosshairPoint) {
    onCrosshairChange?.(true, crosshairPoint.value, crosshairPoint.timestamp);
  } else if (isCrosshairEnabled === false) {
    // Crosshair was disabled, notify parent
    onCrosshairChange?.(false);
  }
}, [crosshairPoint, isCrosshairEnabled, onCrosshairChange]);
```

## Additional Improvements

### 1. Made handleCrosshairChange a useCallback in HomeScreen
Changed from a regular function to `useCallback` to prevent unnecessary re-renders and ensure stable reference:

```typescript
const handleCrosshairChange = useCallback((isActive: boolean) => {
  console.log('[HomeScreen] Crosshair change:', isActive);
  setIsCrosshairActive(isActive);
  if (scrollViewRef.current) {
    scrollViewRef.current.setNativeProps({ scrollEnabled: !isActive });
  }
}, []);
```

### 2. Added Debug Logging
Added console logs to trace the callback chain:
- `[HomeScreen] Crosshair change:` - When HomeScreen receives the callback
- `[PortfolioChart] Crosshair change:` - When PortfolioChart receives from StockLineChart
- `[PortfolioChart] Calling parent onCrosshairChange:` - When PortfolioChart forwards to parent

These logs help debug any future issues with the callback chain.

## Technical Details

### Callback Flow
1. User touches chart → PanResponder activates → `setCrosshairPoint(point)`
2. `useEffect` detects `crosshairPoint` change → calls `onCrosshairChange(true, value, timestamp)`
3. PortfolioChart receives → updates internal state → forwards to HomeScreen
4. HomeScreen receives → sets `isCrosshairActive = true` → disables scroll

5. User releases touch → PanResponder deactivates → `setCrosshairPoint(null)` + `setIsCrosshairEnabled(false)`
6. `useEffect` detects `isCrosshairEnabled = false` → calls `onCrosshairChange(false)`
7. PortfolioChart receives → updates internal state → forwards to HomeScreen
8. HomeScreen receives → sets `isCrosshairActive = false` → enables scroll

### Why This Works
- The `useEffect` now watches both `crosshairPoint` and `isCrosshairEnabled`
- When crosshair is disabled, both become falsy, triggering the else-if branch
- This ensures the `false` callback is always sent when crosshair deactivates
- The dual approach (PanResponder + useEffect) provides redundancy

## Testing
1. Navigate to Home screen with portfolio chart
2. Touch and drag on portfolio chart to activate crosshair
3. Verify screen doesn't scroll while crosshair is active
4. Release touch
5. **Verify screen scrolling is immediately re-enabled**
6. Check console logs to confirm callback chain

## Files Modified
- `catalyst-native/src/components/charts/StockLineChart.tsx`
- `catalyst-native/src/components/charts/PortfolioChart.tsx`
- `catalyst-native/src/screens/HomeScreen.tsx`
