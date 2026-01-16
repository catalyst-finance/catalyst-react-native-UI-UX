# Calendar Timeline Fixes - Complete

## Issues Fixed

### 1. Company Logo Vertical Alignment ✓
**Problem:** Logo was not vertically centered with the event card.

**Solution:** Moved logo inside the horizontal ScrollView:
- Logo is now the first item in the scrollable content
- Uses `marginTop: 56px` to align with the vertical center of event cards
- Logo scrolls with the timeline, maintaining alignment with visible cards

### 2. Timeline Line Position ✓
**Problem:** Horizontal timeline line was too low and underneath the event cards.

**Solution:** Updated `timelineLine` top position from `52px` to `20px`:
- Timeline line is now centered with the event dots
- Line appears behind the dots as intended, creating the proper timeline visual

### 3. Gesture Conflict Resolution ✓
**Problem:** Horizontal scroll gesture of the timeline was competing with the year swipe gesture.

**Solution:** Implemented multiple fixes:

#### A. Disabled Year Swipe When Month Expanded
- Added `expandedMonthRef` to track current expanded month state
- Updated `PanResponder.onStartShouldSetPanResponder` to return `false` when a month is expanded
- Updated `PanResponder.onMoveShouldSetPanResponder` to check `expandedMonthRef.current !== null`
- This prevents the year swipe gesture from capturing touches when viewing timelines

#### B. Enabled Nested Scrolling
- Added `nestedScrollEnabled={true}` to the horizontal ScrollView in TickerTimeline
- Added `onScrollBeginDrag` handler to stop event propagation
- This allows the horizontal scroll to work independently of parent scrolling

### 4. Logo Included in Scroll Gesture ✓
**Problem:** Logo was fixed outside the scroll area, not scrolling with the timeline.

**Solution:** Restructured component layout:
- Moved logo inside the horizontal ScrollView as the first item
- Logo now scrolls with the timeline
- Added `flexShrink: 0` to prevent logo from shrinking
- Logo maintains vertical alignment with event cards during scroll

## Technical Details

### TickerTimeline.tsx Changes
```typescript
// New structure - logo inside ScrollView
<ScrollView horizontal>
  {/* Logo as first item */}
  <View style={styles.tickerContainer}>
    <ExpoImage ... />
  </View>
  
  {/* Event cards follow */}
  {sortedEvents.map(...)}
</ScrollView>

// Logo alignment
tickerContainer: {
  marginTop: 56, // Align with center of event card
  flexShrink: 0, // Prevent shrinking
}

// Timeline line position
timelineLine: {
  top: 20, // Aligned with dot center
}

// Scroll gesture handling
<ScrollView
  nestedScrollEnabled={true}
  onScrollBeginDrag={(e) => {
    e.stopPropagation();
  }}
/>
```

### CalendarMonthGrid.tsx Changes
```typescript
// Track expanded month with ref
const expandedMonthRef = useRef(expandedMonth);

useEffect(() => {
  expandedMonthRef.current = expandedMonth;
}, [expandedMonth]);

// PanResponder checks ref
onStartShouldSetPanResponder: () => 
  !isAnimating && expandedMonthRef.current === null,

onMoveShouldSetPanResponder: (_evt, gestureState) => {
  if (isAnimating || expandedMonthRef.current !== null) return false;
  // ... rest of logic
}
```

## Visual Result

### Before
- Logo fixed outside scroll area
- Logo misaligned with cards
- Timeline line hidden under cards
- Horizontal scroll conflicts with year swipe

### After
- Logo scrolls with timeline
- Logo perfectly centered with event cards
- Timeline line visible behind dots at correct height
- Smooth horizontal scrolling without gesture conflicts
- Year swipe disabled when viewing timelines

## Testing Checklist
- [x] Company logo scrolls with timeline
- [x] Logo aligns with center of event cards
- [x] Timeline line is visible and centered with dots
- [x] Horizontal scrolling works smoothly
- [x] Year swipe gesture disabled when month expanded
- [x] Year swipe gesture works when no month expanded
- [x] No gesture conflicts or janky behavior

## Files Modified
- `src/components/calendar/TickerTimeline.tsx` - Logo in scroll, alignment, line position, scroll handling
- `src/components/calendar/CalendarMonthGrid.tsx` - Gesture conflict resolution
