# Calendar Session 3 - Testing Guide

**Date**: January 13, 2026  
**Feature**: Company Logos & Event Type Icons

## What to Test

### 1. Company Logos Display

**Expected Behavior**:
- Company logos should appear in month cells (20x20px, rounded corners)
- Logos should load for all companies with events
- Ticker badges (black bg, white text) should show when logo is missing
- Logos should be crisp and clear

**Test Steps**:
1. Open the app and navigate to HomeScreen
2. Switch to "Calendar" tab
3. Look at months with events
4. Verify logos appear for companies like TSLA, AAPL, etc.
5. Check that ticker badges show for companies without logos

**What You Should See**:
```
┌─────────────────┐
│ Jan             │
│                 │
│ [TSLA LOGO] ●●● │  ← Tesla logo + 3 colored dots
│ [AAPL LOGO] ●●  │  ← Apple logo + 2 colored dots
│ [MNMD] ●        │  ← Ticker badge + 1 dot (no logo)
└─────────────────┘
```

### 2. Event Type Icons

**Expected Behavior**:
- Colored circular icons appear next to each company
- Icons stack horizontally with slight overlap
- Max 3 icons per company in full month view
- Icons use correct colors for event types:
  - Earnings: Blue (#3b82f6)
  - Product: Red (#f43f5e)
  - FDA: Green (#22c55e)
  - Regulatory: Orange (#f59e0b)
  - etc.

**Test Steps**:
1. Look at a month with multiple events
2. Verify icons are colored circles
3. Check that icons overlap slightly (stacked effect)
4. Verify max 3 icons show per company
5. Tap a month to expand and see event details

**What You Should See**:
- Smooth circular icons with white borders
- Overlapping layout (each icon slightly behind the previous)
- Consistent colors matching event types

### 3. Compact Month View

**Expected Behavior**:
- Past quarters show compact horizontal layout
- Month name on left, event icons on right
- Icons are smaller (12px instead of 16px)
- Max 10 icons total per month

**Test Steps**:
1. Navigate to a past year (use year navigation buttons)
2. Look at past quarters (Q1, Q2, Q3, Q4)
3. Verify compact horizontal layout
4. Check that icons are smaller
5. Verify month name and icons are on same line

**What You Should See**:
```
┌──────────────────────────┐
│ Jan          ●●●●●●●●●●  │  ← Compact layout
└──────────────────────────┘
```

### 4. Logo Caching

**Expected Behavior**:
- Logos load once and are cached
- Switching between years should be instant (no re-fetching)
- Logos persist when expanding/collapsing months

**Test Steps**:
1. Navigate to current year
2. Wait for logos to load
3. Switch to next year
4. Switch back to current year
5. Verify logos appear instantly (no loading delay)

### 5. Dark Mode

**Expected Behavior**:
- Logos remain visible in dark mode
- Event icons maintain colors
- Ticker badges remain black with white text
- White borders on icons remain visible

**Test Steps**:
1. Toggle dark mode (if available)
2. Verify logos are still visible
3. Check that icon colors are vibrant
4. Verify ticker badges are readable

## Performance Checks

### Logo Loading
- [ ] Logos load within 1-2 seconds
- [ ] No UI blocking during logo fetch
- [ ] Batch fetching (single API call for all tickers)
- [ ] Smooth scrolling while logos load

### Memory Usage
- [ ] No memory leaks when switching years
- [ ] Logo cache doesn't grow indefinitely
- [ ] Images are properly released when unmounted

### Rendering Performance
- [ ] Smooth 60fps scrolling
- [ ] No lag when expanding/collapsing months
- [ ] Year navigation is instant

## Edge Cases to Test

### No Logos Available
- [ ] Ticker badges show correctly
- [ ] Layout doesn't break
- [ ] Icons still display properly

### Many Events
- [ ] "+X more" indicator shows correctly
- [ ] Max 3 companies displayed per month
- [ ] Remaining count is accurate

### Network Issues
- [ ] Graceful handling of failed logo fetches
- [ ] Ticker badges show as fallback
- [ ] No crashes or errors

### Empty States
- [ ] Months with no events show correctly
- [ ] No logos or icons displayed
- [ ] Proper opacity/disabled state

## Visual Regression Checks

Compare with web app:
- [ ] Logo sizes match (20x20px)
- [ ] Icon sizes match (16px full, 12px compact)
- [ ] Spacing and gaps match
- [ ] Colors match exactly
- [ ] Border radius matches
- [ ] Overlap effect matches

## Known Issues

None currently - all features working as expected!

## Debugging Tips

### Logos Not Loading
1. Check network connection
2. Verify Supabase connection
3. Check console for API errors
4. Verify `company_information` table has logo URLs

### Icons Wrong Color
1. Check `event-formatting.ts` color mappings
2. Verify event type strings match config keys
3. Check for typos in event type names

### Layout Issues
1. Verify styles in CalendarMonthGrid.tsx
2. Check flexbox properties
3. Verify negative margins for overlap effect

## Success Criteria

✅ All logos load successfully  
✅ Event icons display with correct colors  
✅ Stacked layout works properly  
✅ Compact view renders correctly  
✅ Dark mode works  
✅ Performance is smooth  
✅ No TypeScript errors  
✅ Matches web app design  

## Next Session Preview

Session 4 will add:
- Expandable timeline view
- Event cards with details
- Vertical timeline line
- Date/time badges
- Gradient backgrounds
- Close button

Stay tuned!
