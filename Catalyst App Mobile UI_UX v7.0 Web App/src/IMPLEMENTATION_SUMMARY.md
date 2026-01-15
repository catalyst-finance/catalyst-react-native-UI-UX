# Past Event Hover Implementation Summary

## Problem Identified
The previous implementation used individual mouse event handlers on past event dots, which caused conflicts with the chart's main interaction handlers. This resulted in:
- Hover state flickering
- Race conditions between dot handlers and chart handlers
- Inconsistent behavior across chart types

## Root Cause Analysis
Through deep analysis, I discovered that **future event hover doesn't use individual mouse handlers**. Instead, it uses a **proximity-based snapping mechanism** within the chart's main mouse handler (`handleInteraction`).

## Solution Applied

### Architecture Pattern
- Remove all mouse event handlers from past event dots (make them `pointer-events-none`)
- Detect proximity to past events within the existing `handleInteraction()` function
- Use the same state variables that drive crosshair/tooltip rendering
- Apply catalyst color when snapped to an event

### Changes to Line Chart (`stock-line-chart.tsx`)

#### 1. Enhanced HoverPoint Interface
```typescript
interface HoverPoint {
  x: number;
  y: number;
  value: number;
  timestamp: number;
  catalyst?: MarketEvent; // NEW: Optional catalyst field
}
```

#### 2. Made Past Event Dots Non-Interactive
- Changed `className` from `"absolute cursor-pointer"` to `"absolute pointer-events-none"`
- Removed all mouse event handlers: `onMouseEnter`, `onMouseMove`, `onMouseLeave`, `onClick`

#### 3. Added Proximity Snap Logic in handleInteraction()
In the past section handler (lines ~382-460), after finding the closest data point:
- Iterate through all past events
- Calculate distance from hover point to each event's position
- Use 30px snap threshold (same as data point snap)
- If within threshold, set `hoverPoint.catalyst` and `setHoverPastEvent()`

#### 4. Updated Crosshair Rendering
- Crosshair line uses catalyst color when available:
  ```typescript
  stroke={hoverPoint.catalyst ? getEventTypeHexColor(hoverPoint.catalyst.type) : defaultColor}
  ```
- Hover dot uses catalyst color when available
- Date label shows darker text (`text-foreground` vs `text-foreground/60`) when catalyst present

### Changes to Candlestick Chart (`candlestick-chart.tsx`)

#### 1. Added Hover Catalyst State
```typescript
const [hoverCatalyst, setHoverCatalyst] = useState<MarketEvent | null>(null);
```

#### 2. Made Past Event Dots Non-Interactive
- Same changes as line chart: removed all mouse handlers

#### 3. Added Proximity Snap Logic in handleInteraction()
In the past section handler (lines ~327-385), after finding the closest candle:
- Iterate through all past events
- Find which candle each event is closest to
- Calculate index distance from hovered candle to event's candle
- Use threshold of 1 (event must be on same or adjacent candle)
- If within threshold, set `hoverCatalyst` and `setHoverPastEvent()`

#### 4. Updated Crosshair Rendering
- Calculate color using:
  ```typescript
  const defaultColor = isGreen ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
  const color = hoverCatalyst ? getEventTypeHexColor(hoverCatalyst.type) : defaultColor;
  ```
- Crosshair line, dot, and label all use this color
- Date label shows darker text when catalyst present

## Key Principles

1. **Single Source of Truth**: All hover detection happens in `handleInteraction()`, not in individual UI elements
2. **Proximity-Based**: Events are detected by spatial proximity, not by hovering directly on dots
3. **Consistent with Future Events**: Uses the exact same pattern as existing future event hover
4. **State-Driven UI**: State variables (`hoverPoint.catalyst`, `hoverCatalyst`) drive all UI changes
5. **Visual-Only Dots**: Event dots are purely visual indicators with `pointer-events-none`

## Benefits

✅ No race conditions or flickering
✅ Smooth, predictable hover behavior
✅ Consistent with future event interaction pattern
✅ Works seamlessly with existing crosshair infrastructure
✅ Minimal code duplication
✅ Maintainable and extensible

## Testing Checklist

- [x] Hover near past event dot → crosshair snaps and shows event color
- [x] Hover between events → normal crosshair color
- [x] Transition from event to non-event → smooth color change
- [x] Date label shows darker text for events
- [x] Works on both line chart and candlestick chart
- [x] Works across all time ranges (1D, 1W, 1M, 3M, etc.)

## Technical Details

### Snap Thresholds
- **Line Chart**: 30 pixels (same as data point snap)
- **Candlestick Chart**: 1 candle index (same or adjacent candle)

### Color System
- Uses `getEventTypeHexColor()` to get consistent event type colors
- Falls back to green/red based on price direction when no catalyst
- Crosshair opacity: 0.5 for past events (matches future events)

### Performance
- Event proximity calculation only runs when:
  - `showPastEvents` is enabled
  - `pastEvents` array has items
  - Hover point is already set (after data point snap)
- Minimal performance impact since it's part of existing hover logic
