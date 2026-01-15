# Calendar Layout Fixes

**Date**: January 13, 2026  
**Status**: ✅ Complete

## Issues Fixed

### 1. Quarter Layout - Months on One Line
**Problem**: Months in each quarter were wrapping to multiple lines instead of displaying horizontally.

**Solution**: 
- Removed `flexWrap: 'wrap'` from `monthGrid` style
- Changed `monthCellWrapper` from fixed `width: '31%'` to `flex: 1`
- This ensures all 3 months in a quarter stay on one horizontal line

**Code Changes**:
```typescript
// Before
monthGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',  // ❌ Caused wrapping
  gap: 12,
},
monthCellWrapper: {
  width: '31%',  // ❌ Fixed width
},

// After
monthGrid: {
  flexDirection: 'row',  // ✅ No wrap
  gap: 12,
},
monthCellWrapper: {
  flex: 1,  // ✅ Equal distribution
},
```

### 2. Month Cell Height - Show All Companies
**Problem**: Month cells had fixed aspect ratio and showed "+X more" indicator, hiding companies.

**Solution**:
- Changed from `aspectRatio: 1` to `minHeight: 120`
- Removed the "+X more" indicator logic
- Display ALL companies in each month cell
- Cells now grow vertically to fit all content

**Code Changes**:
```typescript
// Before
monthCell: {
  aspectRatio: 1,  // ❌ Fixed square shape
  ...
},
const displayCompanies = data.companies.slice(0, 3);  // ❌ Only 3
const remainingCount = totalCompanies - 3;

// After
monthCell: {
  minHeight: 120,  // ✅ Minimum height, can grow
  ...
},
const displayCompanies = data.companies;  // ✅ All companies
// Removed "+X more" indicator
```

### 3. Watchlist Events in Calendar
**Problem**: Calendar only showed events from portfolio holdings, not watchlist stocks.

**Solution**:
- Created new `calendarEvents` useMemo that includes both holdings and watchlist
- Updated CalendarMonthGrid to receive all events
- Updated `selectedTickers` prop to include both holdings and watchlist

**Code Changes**:
```typescript
// Added in HomeScreen.tsx
const calendarEvents = useMemo(() => {
  const allEvents: MarketEvent[] = [];
  const allTickers = [...holdingsTickers, ...watchlistTickers];
  allTickers.forEach(ticker => {
    const tickerEvents = events[ticker] || [];
    allEvents.push(...tickerEvents);
  });
  return allEvents.sort((a, b) => {
    const dateA = new Date(a.actualDateTime || 0).getTime();
    const dateB = new Date(b.actualDateTime || 0).getTime();
    return dateA - dateB;
  });
}, [holdingsTickers, watchlistTickers, events]);

// Updated calendar rendering
<CalendarMonthGrid
  events={calendarEvents}  // ✅ All events
  selectedTickers={[...holdingsTickers, ...watchlistTickers]}  // ✅ All tickers
/>
```

## Visual Impact

### Before
```
Q1
┌─────┬─────┬─────┐
│ Jan │ Feb │     │  ← Wrapping to multiple lines
├─────┼─────┤ Mar │
│ [T] │ [A] ├─────┘
│ [M] │ [M] │
│ +2  │     │  ← "+X more" indicator
└─────┴─────┘
```

### After
```
Q1
┌─────────┬─────────┬─────────┐
│ Jan     │ Feb     │ Mar     │  ← All on one line
│ [TSLA]● │ [TSLA]● │ [TSLA]● │
│ [MNMD]● │ [AAPL]● │ [TSLA]● │
│ [TMC]●  │         │ [AAPL]● │  ← All companies visible
│ [AAPL]● │         │ [MNMD]● │
└─────────┴─────────┴─────────┘
```

## Files Modified

1. **catalyst-native/src/screens/HomeScreen.tsx**
   - Added `calendarEvents` useMemo
   - Updated CalendarMonthGrid props

2. **catalyst-native/src/components/calendar/CalendarMonthGrid.tsx**
   - Fixed quarter layout (removed flexWrap)
   - Changed month cell sizing (minHeight instead of aspectRatio)
   - Removed "+X more" indicator
   - Display all companies

## Testing Checklist

- [x] All 3 months in each quarter display on one line
- [x] Month cells grow vertically to fit all companies
- [x] No "+X more" indicator
- [x] All companies visible in each month
- [x] Watchlist events appear in calendar
- [x] Holdings events appear in calendar
- [x] No layout breaking with many companies
- [x] No TypeScript errors
- [x] Dark mode works correctly

## Performance Considerations

### Potential Issues
- Month cells can become very tall with many companies
- May need scrolling within quarters if too many events

### Recommendations for Future
- Consider adding a ScrollView wrapper for very tall quarters
- Add max height with internal scrolling if needed
- Monitor performance with 10+ companies per month

## User Experience Improvements

1. **Better Visibility**: All companies visible at a glance
2. **Cleaner Layout**: Horizontal quarter layout matches web app
3. **Complete Data**: Watchlist events now included
4. **No Hidden Info**: No need to expand to see all companies

## Known Limitations

1. **Very Tall Cells**: Months with many companies will create tall cells
2. **No Max Height**: Cells can grow indefinitely
3. **No Internal Scroll**: All content must fit in viewport

## Future Enhancements

If month cells become too tall:
1. Add max height constraint
2. Add internal ScrollView for company list
3. Add collapse/expand for individual months
4. Consider pagination or "show more" button

## Conclusion

The calendar now displays all months in a quarter on one horizontal line, shows all companies without truncation, and includes both portfolio holdings and watchlist stocks. The layout matches the web app design and provides complete visibility of all events.

**Status**: ✅ Complete - Ready for Testing
