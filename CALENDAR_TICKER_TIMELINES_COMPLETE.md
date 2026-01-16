# Calendar Ticker Timelines - Complete

## Overview
Reorganized the calendar's expanded month view to show a vertical stack of horizontal timelines, one per ticker, matching the design from the stock detail page.

## Changes Made

### 1. New Component: TickerTimeline.tsx
Created `src/components/calendar/TickerTimeline.tsx` - a horizontal timeline component for a single ticker:
- **Company logo/badge** on the left (48x48px)
- **Horizontal timeline** with events displayed as cards
- **Timeline dots** with event type icons and colors
- **Pulsing animation** for next upcoming event
- **Event cards** matching the stock detail page design (280px width)
- **Horizontal scrolling** with snap-to-interval for smooth navigation

### 2. Updated CalendarMonthGrid.tsx
Replaced the vertical `ExpandedTimeline` with the new per-ticker layout:
- **Groups events by ticker** when a month is expanded
- **Sorts tickers** by earliest event date
- **Renders TickerTimeline** for each ticker with its events
- **Shows company logos** from preloaded stocksData
- **Header with month name** and close button
- **Empty state** when no events exist

### 3. Layout Structure
When a month is selected:
```
┌─────────────────────────────────────────┐
│ [Month Year]              [Close ✕]     │
├─────────────────────────────────────────┤
│ [Logo] ─●─────●─────●─────              │ ← Ticker 1
│        [Card] [Card] [Card]             │
├─────────────────────────────────────────┤
│ [Logo] ─●─────●─────                    │ ← Ticker 2
│        [Card] [Card]                    │
├─────────────────────────────────────────┤
│ [Logo] ─●─────●─────●─────●─────        │ ← Ticker 3
│        [Card] [Card] [Card] [Card]      │
└─────────────────────────────────────────┘
```

## Design Features

### Timeline Dots
- **Event type icons** (Ionicons) inside colored dots
- **Event type colors** matching the app's color scheme
- **Pulsing animation** for next upcoming event (ripple effect)
- **Background circle** to block the timeline line behind the dot

### Event Cards
- **280px width** (same as stock detail page)
- **Event type badge** with color
- **Event title** (2 lines max)
- **Date/time** formatted
- **Impact rating** badge (bullish/bearish)
- **AI insight preview** (2 lines max)
- **Horizontal scrolling** with snap-to-interval

### Company Logos
- **48x48px** rounded squares
- **Cached with expo-image** for instant loading
- **Fallback to ticker badge** if no logo available
- **Aligned with timeline** (32px top margin)

## Benefits

1. **Better organization** - Events grouped by company
2. **Consistent design** - Matches stock detail page exactly
3. **More information** - Shows company logos prominently
4. **Better UX** - Horizontal scrolling per ticker is more intuitive
5. **Scalable** - Works well with many events per ticker

## Files Modified
- `src/components/calendar/CalendarMonthGrid.tsx` - Updated to use new layout
- `src/components/calendar/TickerTimeline.tsx` - New component (created)

## Files Unchanged
- `src/components/calendar/ExpandedTimeline.tsx` - Old component (can be removed if not used elsewhere)
- `src/components/events/UpcomingEventsTimeline.tsx` - Stock detail page timeline (unchanged)

## Testing
To test the new layout:
1. Navigate to the Discover screen (calendar view)
2. Click on any month with events
3. Verify:
   - Events are grouped by ticker
   - Each ticker has its own horizontal timeline
   - Company logos appear on the left
   - Timeline dots have correct colors and icons
   - Next upcoming event pulses
   - Event cards match stock detail page design
   - Horizontal scrolling works smoothly

## Next Steps
- Consider removing the old `ExpandedTimeline.tsx` component if not used elsewhere
- Add loading states for company logos if needed
- Consider adding ticker click navigation to stock detail page
