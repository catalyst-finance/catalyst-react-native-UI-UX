# Event Crosshair Feature Implementation

## Overview
When users long-press and drag the crosshair over an event dot in the future section, the chart header should display event information instead of price data.

## Requirements

### Display Behavior
**When crosshair is over an event dot:**
- Replace price/value display with event title
- Replace change display with event type badge and date
- Maintain same header layout and styling

**When crosshair is NOT over an event:**
- Show normal price/value and change information

### Event Detection
- Check if crosshair X position is within threshold of any catalyst dot
- Threshold: ±20 pixels from dot center
- Only detect events in the future section (after current price dot)

### Header Display Format
```
[Event Type Badge] Event Title
Date: Jan 19, 2026
```

## Implementation Steps

### 1. StockLineChart Changes
- Add `hoveredCatalyst` state to track which event is being hovered
- Update `handleTouch` to detect catalyst proximity
- Modify header to conditionally show event info or price info
- Add event type color mapping

### 2. PortfolioChart Changes
- Pass through catalyst hover state from StockLineChart
- Update header to show event info when hovering over catalyst
- Maintain portfolio-specific styling

### 3. Event Type Badges
- Use same colors as catalyst dots
- Display event type in uppercase
- Match web app styling

## Event Type Colors
```typescript
earnings: '#f59e0b'    // amber
fda: '#ef4444'         // red
merger: '#8b5cf6'      // purple
split: '#06b6d4'       // cyan
dividend: '#22c55e'    // green
launch: '#ec4899'      // pink
product: '#3b82f6'     // blue
conference: '#6366f1'  // indigo
regulatory: '#f97316'  // orange
guidance: '#14b8a6'    // teal
partnership: '#a855f7' // violet
corporate: '#64748b'   // slate
```

## Technical Details

### Catalyst Position Calculation
```typescript
// For each catalyst dot
const futureWidth = (width * futureWidthPercent) / 100;
const timeFromNow = catalyst.timestamp - now;
const timeBufferMs = 14 * 24 * 60 * 60 * 1000; // 2 week buffer
const adjustedTime = timeFromNow + timeBufferMs;
const leftPercent = (adjustedTime / futureWindowMs) * 100;
const dotX = pastWidth + (leftPercent / 100) * futureWidth;
```

### Detection Logic
```typescript
const CATALYST_THRESHOLD = 20; // pixels

futureCatalysts.forEach(catalyst => {
  const dotX = calculateCatalystX(catalyst);
  if (Math.abs(touchX - dotX) < CATALYST_THRESHOLD) {
    setHoveredCatalyst(catalyst);
  }
});
```

### Header Conditional Rendering
```typescript
{hoveredCatalyst ? (
  <EventHeader catalyst={hoveredCatalyst} />
) : (
  <PriceHeader price={price} change={change} />
)}
```

## Files to Modify
1. `src/components/charts/StockLineChart.tsx` - Main implementation
2. `src/components/charts/PortfolioChart.tsx` - Portfolio-specific handling
3. `src/components/charts/MiniChart.tsx` - Optional: add to mini charts

## Testing Checklist
- [ ] Crosshair detects event dots correctly
- [ ] Header switches to event info when over dot
- [ ] Header returns to price info when leaving dot
- [ ] Event type badge displays correct color
- [ ] Date formats correctly
- [ ] Works on both StockLineChart and PortfolioChart
- [ ] Works in dark mode
- [ ] Multiple events can be detected
- [ ] Threshold distance feels natural

## Edge Cases
- Multiple events at same position: Show closest one
- Event at edge of chart: Ensure header doesn't overflow
- Very long event titles: Truncate with ellipsis
- Missing event data: Show fallback text
