# Portfolio Chart Scroll Disable Implementation

**Date**: January 13, 2026  
**Status**: ✅ Complete

## Overview
Implemented scroll disable functionality for the portfolio chart crosshair on HomeScreen, matching the behavior already present in ComponentShowcaseScreen.

## Problem
When users interacted with the portfolio chart crosshair on the HomeScreen, the screen would still scroll, making it difficult to precisely position the crosshair and view historical data.

## Solution
Added the same scroll disable pattern used in ComponentShowcaseScreen:

### Changes Made

#### 1. HomeScreen.tsx
- Added `scrollViewRef` using `useRef<ScrollView>(null)`
- Added `isCrosshairActive` state to track crosshair status
- Created `handleCrosshairChange` function that:
  - Updates `isCrosshairActive` state
  - Uses `setNativeProps` for instant scroll disable/enable
- Passed `handleCrosshairChange` to PortfolioChart's `onCrosshairChange` prop
- Added `ref={scrollViewRef}` to both ScrollView instances (empty state and main content)
- Added `scrollEnabled={!isCrosshairActive}` to both ScrollView instances

#### 2. PortfolioChart.tsx
- Added `onCrosshairChange?: (isActive: boolean) => void` to `PortfolioChartProps` interface
- Added `onCrosshairChange` to component props destructuring
- Updated `handleCrosshairChange` callback to notify parent component when crosshair state changes
- Added `onCrosshairChange` to the dependency array of the callback

## Technical Details

### Scroll Disable Pattern
```typescript
const handleCrosshairChange = (isActive: boolean) => {
  setIsCrosshairActive(isActive);
  // Immediately disable/enable scrolling using native props for instant response
  if (scrollViewRef.current) {
    scrollViewRef.current.setNativeProps({ scrollEnabled: !isActive });
  }
};
```

### Prop Flow
1. User touches portfolio chart → StockLineChart detects touch
2. StockLineChart calls `onCrosshairChange(true)` → PortfolioChart's `handleCrosshairChange`
3. PortfolioChart updates internal state and calls parent's `onCrosshairChange(true)`
4. HomeScreen's `handleCrosshairChange` disables scroll via `setNativeProps`
5. User releases touch → Same flow with `false` to re-enable scroll

## Benefits
- **Consistent UX**: Portfolio chart now behaves the same as stock detail charts
- **Better Precision**: Users can accurately position crosshair without accidental scrolling
- **Instant Response**: Using `setNativeProps` provides immediate scroll disable without waiting for React re-render
- **Clean Implementation**: Reuses existing callback pattern from StockLineChart

## Testing
Test on mobile device:
1. Navigate to Home screen
2. Touch and drag on portfolio chart
3. Verify screen does not scroll while crosshair is active
4. Release touch
5. Verify screen scrolling is re-enabled

## Files Modified
- `catalyst-native/src/screens/HomeScreen.tsx`
- `catalyst-native/src/components/charts/PortfolioChart.tsx`
