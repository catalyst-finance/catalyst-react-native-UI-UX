# Deep Analysis: Future Event Hover vs Past Event Hover

## Summary
Future event hover uses a **proximity-based snapping mechanism** within the chart's mouse move handler, NOT individual event dot mouse handlers. This is fundamentally different from what we attempted with past events.

---

## LINE CHART - Future Event Hover Implementation

### 1. Future Event Dots Rendering
**Location:** Lines ~2124-2154
```tsx
{futureCatalysts.map((catalyst, index) => {
  const leftPercent = Math.min(100, Math.max(0, (timeFromNow / futureWindowMs) * 100));
  return (
    <div className="absolute" style={{ left: `${leftPercent}%`, zIndex: 10 }}>
      <div className="catalyst-dot" style={{ width: '10px', height: '10px', ... }} />
    </div>
  );
})}
```

**KEY OBSERVATION:** These dots have **NO MOUSE HANDLERS** - they are purely visual indicators!

### 2. Hover Detection Mechanism
**Location:** Lines ~400-480 in `handleInteraction()`

When mouse moves in the **FUTURE SECTION**:

```tsx
// Step 1: Clear past section hover states
setHoverEvent(null);
setHoverPoint(null);

// Step 2: Calculate continuous hover position
const xPercentInFuture = Math.min(1, Math.max(0, xInFuture / futureWidth));
const xPercentInFullFuture = pastWidthPercent + xPercentInFuture * futureWidthPercent;

// Step 3: Set continuous crosshair state
setFutureHoverPoint({
  xPercent: xPercentInFuture,
  timestamp: now + (xPercentInFuture * futureWindowMs)
});

// Step 4: PROXIMITY SNAP TO EVENTS
if (futureCatalysts && futureCatalysts.length > 0) {
  // Calculate distance to each event
  let minDistance = Infinity;
  let closestEvent = null;
  
  futureCatalysts.forEach(catalyst => {
    const eventXPercent = (catalyst.timestamp - now) / futureWindowMs;
    const distance = Math.abs(eventXPercent - xPercentInFuture);
    if (distance < minDistance) {
      minDistance = distance;
      closestEvent = catalyst;
    }
  });
  
  // Snap threshold: 5% of future section width
  const snapThreshold = 0.05;
  
  if (minDistance < snapThreshold && closestEvent) {
    setHoverEvent(closestEvent); // ✅ This triggers event-specific UI
  } else {
    setHoverEvent(null);
  }
}
```

### 3. State Variables Used
- **`hoverEvent`**: When set to a FutureCatalyst, triggers event-specific UI (colored crosshair)
- **`futureHoverPoint`**: Always set when in future section, shows continuous crosshair

### 4. Crosshair Rendering
**Location:** Lines ~1920-2001

```tsx
{(futureHoverPoint || hoverEvent) && (
  <g>
    {/* Vertical crosshair line */}
    <line 
      stroke={hoverEvent ? getEventTypeHexColor(hoverEvent.catalyst.type) : 'currentColor'}
      opacity={hoverEvent ? 0.5 : 0.3}
    />
    
    {/* Crosshair dot - only show when snapped to event */}
    {hoverEvent && (
      <circle fill={getEventTypeHexColor(hoverEvent.catalyst.type)} />
    )}
  </g>
)}
```

**KEY:** The crosshair color and visibility are controlled by `hoverEvent` presence!

### 5. Date Label Rendering
**Location:** Lines ~2004-2044

```tsx
{(futureHoverPoint || hoverEvent) && (() => {
  let labelTimestamp: number;
  
  if (hoverEvent) {
    labelTimestamp = hoverEvent.timestamp; // Use event's exact timestamp
  } else if (futureHoverPoint) {
    labelTimestamp = futureHoverPoint.timestamp; // Use continuous hover timestamp
  }
  
  return (
    <div className={hoverEvent ? 'text-foreground' : 'text-foreground/60'}>
      {new Date(labelTimestamp).toLocaleDateString(...)}
    </div>
  );
})()}
```

---

## LINE CHART - Current Past Event Implementation (BROKEN)

### 1. Past Event Dots Rendering
**Location:** Lines ~1869-1917

```tsx
{pastEvents.map((event) => {
  return (
    <div
      className="absolute cursor-pointer"
      style={{ zIndex: 15 }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        setHoverPoint({ x, y, value, timestamp, catalyst: event });
        setHoverPastEvent({ event, x, y });
      }}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseLeave={(e) => {
        e.stopPropagation();
        setHoverPoint(null);
        setHoverPastEvent(null);
      }}
    >
      <div className="catalyst-dot" />
    </div>
  );
})}
```

### 2. Why This Doesn't Work

**Problem 1: Event Propagation Conflict**
- The past event dots are **HTML div elements** positioned absolutely OVER the SVG
- The chart has a `<rect>` overlay at line ~1528 with `onMouseMove={handleMouseMove}`
- Even with `stopPropagation()`, the HTML div and SVG are in different layers

**Problem 2: Z-Index Layering**
```
Layer Stack (bottom to top):
├─ SVG Chart (z-index: varies)
├─ Overlay rect (handles mouse events)
├─ Past event dots container (absolute positioning)
│  └─ Individual dots (z-index: 15)
└─ Future section overlays (z-index: 10-30)
```

The overlay rect sits BETWEEN the chart and the dots, intercepting mouse events!

**Problem 3: Mouse Enter/Leave Instability**
- When mouse moves FROM chart TO dot:
  - Chart's `handleMouseMove` fires → clears `hoverPoint`
  - Then dot's `onMouseEnter` fires → sets `hoverPoint`
  - This creates a race condition and flicker

**Problem 4: Continuous Mouse Movement**
- User moves mouse WHILE hovering on dot
- Dot's `onMouseMove` stops propagation
- But any pixel-level movement might trigger chart's handler first
- Result: hover state constantly toggles

---

## CORRECT SOLUTION: Apply Proximity Snap to Past Events

### Architecture Changes Needed

#### 1. Remove Mouse Handlers from Past Event Dots
Make them purely visual, like future event dots:

```tsx
{pastEvents.map((event) => {
  return (
    <div
      className="absolute pointer-events-none" // ✅ No interaction!
      style={{ zIndex: 15 }}
    >
      <div className="catalyst-dot" />
    </div>
  );
})}
```

#### 2. Modify `handleInteraction()` for Past Section

Add proximity snap logic in the PAST section handler:

```tsx
if (x < splitPosition) {
  // PAST SECTION
  
  // Existing logic: find closest data point
  const closestPoint = /* ... existing snap logic ... */;
  
  if (closestPoint && minDistance < 30) {
    setHoverPoint(closestPoint);
    
    // NEW: Check proximity to past events
    if (pastEvents && pastEvents.length > 0) {
      let minEventDistance = Infinity;
      let closestPastEvent = null;
      
      pastEvents.forEach(event => {
        if (event.timestamp > now) return; // Skip future events
        
        // Find the data point closest to this event
        const eventDataPoint = data.reduce((closest, point) => {
          const dist = Math.abs(point.timestamp - event.timestamp);
          const closestDist = Math.abs(closest.timestamp - event.timestamp);
          return dist < closestDist ? point : closest;
        });
        
        // Calculate pixel distance from hover point to event point
        const eventX = /* calculate X position for eventDataPoint */;
        const eventY = /* calculate Y position for eventDataPoint */;
        const distance = Math.sqrt(
          Math.pow(eventX - closestPoint.x, 2) + 
          Math.pow(eventY - closestPoint.y, 2)
        );
        
        if (distance < minEventDistance) {
          minEventDistance = distance;
          closestPastEvent = {
            event,
            dataPoint: eventDataPoint,
            x: eventX,
            y: eventY
          };
        }
      });
      
      // Snap threshold: 30 pixels (same as data point snap)
      const snapThreshold = 30;
      
      if (minEventDistance < snapThreshold && closestPastEvent) {
        // Update hoverPoint to include catalyst
        setHoverPoint({
          ...closestPoint,
          catalyst: closestPastEvent.event
        });
        setHoverPastEvent(closestPastEvent);
      } else {
        setHoverPastEvent(null);
      }
    }
  } else {
    setHoverPoint(null);
    setHoverPastEvent(null);
  }
}
```

#### 3. Update Crosshair to Use Catalyst Color

In the crosshair rendering section (~lines 1650-1700):

```tsx
{hoverPoint && (
  <g>
    <line
      stroke={hoverPoint.catalyst 
        ? getEventTypeHexColor(hoverPoint.catalyst.type) 
        : 'currentColor'}
      opacity={hoverPoint.catalyst ? 0.5 : 0.3}
    />
    <circle
      fill={hoverPoint.catalyst 
        ? getEventTypeHexColor(hoverPoint.catalyst.type) 
        : (isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)')}
    />
  </g>
)}
```

#### 4. Update Date Label to Use Catalyst Color

In the date label rendering section (~lines 1680-1748):

```tsx
{hoverPoint && (
  <div className={hoverPoint.catalyst ? 'text-foreground' : 'text-foreground/60'}>
    {/* formatted date */}
  </div>
)}
```

---

## CANDLESTICK CHART - Similar Implementation

The candlestick chart follows a nearly identical pattern:

### Future Events
- Uses **proximity snap** in `handleCandleHover()` around lines ~520-620
- Sets `hoverIndex` for the candle + `hoverEvent` for the catalyst
- Crosshair uses event color when `hoverEvent` is set

### Past Events Fix
Apply the same solution:
1. Remove mouse handlers from past event dots
2. Add proximity detection in the existing hover handler
3. Enhance `hoverIndex` to include catalyst information
4. Update crosshair/tooltip colors based on catalyst presence

---

## Implementation Plan

### Phase 1: Line Chart
1. ✅ **Remove all mouse handlers** from past event dots (make them `pointer-events-none`)
2. ✅ **Add proximity snap logic** in `handleInteraction()` for past section
3. ✅ **Update HoverPoint type** to include optional `catalyst` field
4. ✅ **Update crosshair rendering** to use catalyst color
5. ✅ **Update date label styling** to show darker text for catalysts

### Phase 2: Candlestick Chart
1. ✅ Remove mouse handlers from past event dots
2. ✅ Add proximity snap logic in `handleCandleHover()`
3. ✅ Create similar catalyst integration
4. ✅ Update crosshair and tooltip rendering

### Phase 3: Testing
1. ✅ Test hover near past events (should snap within 30px)
2. ✅ Test hover between events (should show normal crosshair)
3. ✅ Test transition from event to non-event
4. ✅ Verify colors match event types
5. ✅ Test on both 1D and longer timeframes

---

## Key Takeaways

1. **DON'T use individual hover handlers** - they conflict with the chart's interaction model
2. **DO use proximity detection** - it's more robust and matches existing behavior
3. **The chart overlay handles ALL mouse events** - everything else is visual-only
4. **State variables drive the UI** - set the right state in the interaction handler
5. **Color coding is consistent** - use `getEventTypeHexColor()` everywhere

This approach ensures:
- ✅ No race conditions
- ✅ Smooth hover experience
- ✅ Consistent with future event behavior
- ✅ Works with existing crosshair infrastructure
- ✅ No code duplication
