# Crosshair Future Section Fix

## Problem
The crosshair was not working in the upcoming events (future) section of the StockLineChart. It would stop at the end of the past price area and not respond to touches in the future section.

## Root Cause
The `handleTouch` function was clamping the touch X coordinate to the past section width (`actualPastWidth`), preventing any interaction with the future section.

## Solution

### 1. Extended Touch Handling
- Modified `handleTouch` to detect if the touch is in the past or future section
- Added logic to handle touches in the future section separately
- When in future section, the crosshair shows at the touch X position with the last price's Y position

### 2. Crosshair Rendering Across Sections
- Updated past section crosshair to only render when `crosshairPoint.x <= pastWidth`
- Added new crosshair rendering in the future section SVG
- Calculated relative position within future section for proper line placement

### 3. Tooltip Positioning
- Updated crosshair tooltip to position correctly across both sections
- Shows "Upcoming" label when in future section
- Maintains time/date formatting for past section

### 4. Dynamic Price Display
- When crosshair is active, the header price changes to show the crosshair point's exact price
- Price change and percentage are calculated relative to the first data point in the selected time range
- Removes animation from price display during crosshair to show instant updates
- Returns to animated current price when crosshair is released

## Implementation Details

### Touch Detection
```typescript
const isInFutureSection = touchX > actualPastWidth;

if (isInFutureSection && showUpcomingRange) {
  // Handle future section - show catalyst information
  // Use actual touch X, last point's Y position
}
```

### Dynamic Price Calculation
```typescript
const displayPrice = crosshairPoint ? crosshairPoint.value : currentPrice;
const firstDataPointPrice = data && data.length > 0 ? data[0].value : currentPrice;
const displayPriceChange = crosshairPoint 
  ? crosshairPoint.value - firstDataPointPrice
  : priceChange;
const displayPriceChangePercent = crosshairPoint
  ? ((crosshairPoint.value - firstDataPointPrice) / firstDataPointPrice) * 100
  : priceChangePercent;
```

### Future Section Crosshair
```typescript
{crosshairPoint && crosshairPoint.x > pastWidth && (
  <Svg>
    {/* Calculate position relative to future section */}
    {(() => {
      const futureWidth = (width * futureWidthPercent) / 100;
      const xInFutureSection = crosshairPoint.x - pastWidth;
      const xPercent = (xInFutureSection / futureWidth) * 100;
      
      return (
        <Line
          x1={xPercent}
          y1={0}
          x2={xPercent}
          y2={height}
          stroke={chartColor}
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.5}
        />
      );
    })()}
  </Svg>
)}
```

## Features
- ✅ Crosshair works continuously from past section into future section
- ✅ Long-press activation (200ms) with haptic feedback
- ✅ Prevents scrolling during crosshair interaction
- ✅ Smooth diagonal movement without ending crosshair
- ✅ Proper tooltip positioning across both sections
- ✅ Shows "Upcoming" label in future section
- ✅ Dynamic price display updates to crosshair point's exact price
- ✅ Price change calculated relative to first data point in range
- ✅ Instant price updates without animation during crosshair

## Future Enhancements
- Find and display closest catalyst event information when crosshair is in future section
- Show event type, date, and details in tooltip
- Snap to catalyst dots when nearby

## Files Modified
- `catalyst-native/src/components/charts/StockLineChart.tsx`

## Testing
Test the crosshair by:
1. Long-pressing on the chart (200ms)
2. Moving finger across past price section
3. Verify header price changes to crosshair point's exact price
4. Verify price change is relative to first data point in range
5. Continuing to drag into future events section
6. Verify crosshair line appears in both sections
7. Verify tooltip shows "Upcoming" in future section
8. Release finger and verify price returns to current price with animation
9. Verify scrolling is disabled during crosshair interaction
