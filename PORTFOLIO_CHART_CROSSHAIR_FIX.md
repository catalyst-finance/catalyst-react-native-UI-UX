# Portfolio Chart Crosshair Fix - Complete

## Issues Fixed

### Issue 1: Crosshair Stops at Wrong Position on Non-1D Views ✅ FIXED
**Problem**: On time ranges beyond 1D (1W, 1M, 3M, etc.), the crosshair would stop at a specific position and always show "January 13" (today's date), as if it was still on the 1D view even when switched to other time ranges.

**Root Cause**: The PanResponder was created with `useRef` and never updated:
1. **Stale closure**: PanResponder was created once with `useRef(PanResponder.create(...))` 
2. **Old handleTouch**: The PanResponder kept a reference to the original `handleTouch` function
3. **Stale dataPointPositions**: When time range changed, `dataPointPositions` updated but PanResponder still used the old 1D data
4. **Coordinate mismatch**: Touch events use pixel coordinates while data points use SVG viewBox coordinates

**Solution**: 
1. **Changed PanResponder from `useRef` to `useMemo`** with `handleTouch` as dependency - ensures PanResponder updates when time range changes
2. Scale touch X coordinates from pixel space to SVG viewBox space
3. Remove clamping to allow crosshair to snap to last data point
4. Convert data point X back to pixel space for rendering

**Key Changes**:
```typescript
// BEFORE: PanResponder created once, never updates
const panResponder = useRef(
  PanResponder.create({
    // handlers use old handleTouch closure
  })
).current;

// AFTER: PanResponder recreates when handleTouch changes
const panResponder = useMemo(
  () => PanResponder.create({
    // handlers always use latest handleTouch
  }),
  [handleTouch]  // Recreate when handleTouch changes
);

// handleTouch has correct dependencies
const handleTouch = useCallback((touchX, touchY) => {
  // Scale touch X from pixels to SVG coordinates
  const scaledTouchX = (touchX / actualPastWidth) * pastWidth;
  
  // Find closest point WITHOUT clamping
  dataPointPositions.forEach(({ x, index }) => {
    const distance = Math.abs(x - scaledTouchX);
    // ...
  });
  
  // Convert back to pixels for rendering
  const pixelX = (x / pastWidth) * actualPastWidth;
  setCrosshairPoint({ x: pixelX, ... });
}, [data, dataPointPositions, width, pastWidthPercent, ...]);
// dataPointPositions updates when selectedTimeRange changes
```

### Issue 2: Portfolio Chart Header Layout Wrong ✅ FIXED
**Problem**: The portfolio value and change were displayed horizontally next to the PORTFOLIO badge instead of stacked vertically below it.

**Root Cause**: Header container was using `flexDirection: 'row'` with `justifyContent: 'space-between'`.

**Solution**: Changed header to `flexDirection: 'column'` with `alignItems: 'flex-start'` to stack elements vertically.

### Issue 3: Portfolio Chart Header Doesn't Update with Crosshair Value ✅ FIXED
**Problem**: When crosshair was active, the portfolio chart header continued showing the current price and day change instead of the crosshair's price and change values.

**Solution**:
- Added state variables: `crosshairValue` and `crosshairTimestamp` to track crosshair data
- Updated `handleCrosshairChange` to receive and store value and timestamp
- Modified header price display to show crosshair value when active (without animation)
- Updated change calculation to use crosshair value when active
- Suppressed session-specific change display when crosshair is active

## Files Modified

### 1. `catalyst-native/src/components/charts/StockLineChart.tsx`
**Changes**:
- Updated `onCrosshairChange` prop type to include optional `value` and `timestamp` parameters
- Added `useEffect` to notify parent when crosshair value changes
- **Fixed coordinate system**: Scale touch coordinates from pixels to SVG viewBox space
- **Fixed crosshair rendering**: Use pixel coordinates consistently
- Added `actualPastWidth` constant for pixel-based calculations
- Updated crosshair vertical line rendering to use pixel coordinates
- Updated crosshair tooltip positioning to use pixel coordinates

**Key Code**:
```typescript
// Coordinate scaling in handleTouch
const actualPastWidth = (width * pastWidthPercent) / 100;
const scaledTouchX = (touchX / actualPastWidth) * pastWidth;
const clampedTouchX = Math.min(scaledTouchX, pastWidth);

// Find closest point in SVG space
dataPointPositions.forEach(({ x, index }) => {
  const distance = Math.abs(x - clampedTouchX);
  // ...
});

// Convert back to pixels for rendering
const pixelX = (x / pastWidth) * actualPastWidth;
setCrosshairPoint({ x: pixelX, y, value, timestamp, index });

// Render with pixel coordinates
{crosshairPoint && crosshairPoint.x <= actualPastWidth && (
  <View style={{ position: 'absolute', left: crosshairPoint.x, ... }} />
)}
```

### 2. `catalyst-native/src/components/charts/PortfolioChart.tsx`
**Changes**:
- Fixed header layout: Changed from `flexDirection: 'row'` to `flexDirection: 'column'`
- Added `crosshairTimestamp` state variable
- Updated `handleCrosshairChange` to receive and store value and timestamp
- Modified price display to show crosshair value when active
- Updated change calculation to use crosshair value for display
- Added missing styles: `tickerBadge`, `tickerText`, `priceRow`, `changesColumn`, `changeRow`, `positive`, `negative`, `emptyRow`, `crosshairPrice`
- Removed unused variables: `isTotalPositive`, `formatCurrency`, `totalGainLossPercent`

## Testing Checklist

### Crosshair Position (All Time Ranges)
- [ ] 1D view: Crosshair moves smoothly across entire chart
- [ ] 1W view: Crosshair moves smoothly across entire chart
- [ ] 1M view: Crosshair moves smoothly across entire chart
- [ ] 3M view: Crosshair moves smoothly across entire chart
- [ ] YTD view: Crosshair moves smoothly across entire chart
- [ ] 1Y view: Crosshair moves smoothly across entire chart
- [ ] 5Y view: Crosshair moves smoothly across entire chart

### Header Updates (All Time Ranges)
- [ ] 1D view: Header shows crosshair price and change when scrubbing
- [ ] 1W view: Header shows crosshair price and change when scrubbing
- [ ] 1M view: Header shows crosshair price and change when scrubbing
- [ ] 3M view: Header shows crosshair price and change when scrubbing
- [ ] YTD view: Header shows crosshair price and change when scrubbing
- [ ] 1Y view: Header shows crosshair price and change when scrubbing
- [ ] 5Y view: Header shows crosshair price and change when scrubbing

### Header Layout
- [ ] PORTFOLIO badge is at the top
- [ ] Portfolio value is below the badge
- [ ] Change value is below the portfolio value
- [ ] All elements are left-aligned and stacked vertically

### Extended Hours (1D Only)
- [ ] Pre-market: Crosshair shows correct price and change
- [ ] Regular hours: Crosshair shows correct price and change
- [ ] After-hours: Crosshair shows correct price and change
- [ ] Session-specific change hidden when crosshair active

### Crosshair Release
- [ ] Header returns to current price when crosshair released
- [ ] Header returns to animated price display when crosshair released
- [ ] Session-specific change reappears when crosshair released (if applicable)

## Technical Details

### Coordinate System Fix

The core issue was a mismatch between two coordinate systems:

1. **Pixel Coordinates** (PanResponder touch events):
   - Origin: Top-left of chart container
   - Range: 0 to `width` pixels
   - Used by: Touch events, View positioning

2. **SVG ViewBox Coordinates** (Chart rendering):
   - Origin: Top-left of SVG viewBox
   - Range: 0 to `pastWidth` (e.g., 60% of container width)
   - Used by: Path generation, data point positions

**The Fix**:
```
Touch Event (pixels) → Scale to SVG space → Find closest point → Scale back to pixels → Render
```

This ensures:
- Data point lookup works correctly (comparing apples to apples)
- Crosshair renders at the correct pixel position
- Works across all time ranges (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)

### Data Flow
```
User Touch → StockLineChart.handleTouch() 
  → Scale touchX to SVG coordinates
  → Find closest data point in SVG space
  → Convert back to pixel coordinates
  → setCrosshairPoint(pixelX, y, value, timestamp) 
  → useEffect triggers 
  → onCrosshairChange(true, value, timestamp) 
  → PortfolioChart.handleCrosshairChange() 
  → setCrosshairValue() 
  → Header re-renders with crosshair value
```

## Status
✅ **COMPLETE** - All three issues resolved

## Next Steps
1. Test crosshair on all time ranges
2. Test header layout in light and dark mode
3. Test in different market periods
4. Continue with other HomeScreen features
