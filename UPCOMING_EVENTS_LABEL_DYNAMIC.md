# Dynamic Upcoming Events Label

**Date**: January 13, 2026  
**Status**: ✅ Complete

## Overview
Made the "Upcoming Events" label on the HomeScreen dynamically adapt to the portfolio chart's selected time range, showing the appropriate time window and event count.

## Changes Made

### 1. Added Time Range Tracking
Added `portfolioTimeRange` state to HomeScreen to track the currently selected time range on the portfolio chart:

```typescript
const [portfolioTimeRange, setPortfolioTimeRange] = useState<TimeRange>('1D');
```

### 2. Created Dynamic Label Calculator
Replaced the static "3 Months" calculation with a dynamic `upcomingEventsLabel` that adapts based on time range:

```typescript
const upcomingEventsLabel = useMemo(() => {
  const now = Date.now();
  let endTime: number;
  let label: string;

  switch (portfolioTimeRange) {
    case '1D':
    case '1W':
    case '1M':
    case '3M':
      endTime = now + (90 * 24 * 60 * 60 * 1000); // 3 months
      label = 'Next 3 Months';
      break;
    case 'YTD':
      // YTD uses same logic as chart
      const yearStart = new Date(now).setMonth(0, 1);
      const pastDuration = now - yearStart;
      endTime = now + Math.max(pastDuration, 90 * 24 * 60 * 60 * 1000);
      label = 'Next 3 Months';
      break;
    case '1Y':
      endTime = now + (365 * 24 * 60 * 60 * 1000); // 1 year
      label = 'Next Year';
      break;
    case '5Y':
      endTime = now + (5 * 365 * 24 * 60 * 60 * 1000); // 5 years
      label = 'Next 5 Years';
      break;
    default:
      endTime = now + (90 * 24 * 60 * 60 * 1000);
      label = 'Next 3 Months';
  }

  const count = portfolioEvents.filter(event => {
    const eventTime = new Date(event.actualDateTime || 0).getTime();
    return eventTime >= now && eventTime <= endTime;
  }).length;

  return { count, label };
}, [portfolioEvents, portfolioTimeRange]);
```

### 3. Added Time Range Change Handler
Created `handlePortfolioTimeRangeChange` to update state when user changes time range:

```typescript
const handlePortfolioTimeRangeChange = useCallback((range: TimeRange) => {
  setPortfolioTimeRange(range);
}, []);
```

### 4. Connected Handler to PortfolioChart
Passed the handler to PortfolioChart via `onTimeRangeChange` prop:

```typescript
<PortfolioChart
  holdings={holdings}
  width={SCREEN_WIDTH}
  height={312}
  futureCatalysts={portfolioCatalysts}
  onCrosshairChange={handleCrosshairChange}
  onTimeRangeChange={handlePortfolioTimeRangeChange}
/>
```

### 5. Updated Label Rendering
Changed the label to use the dynamic values:

```typescript
<Text style={[styles.upcomingEventsText, { color: themeColors.mutedForeground }]}>
  {upcomingEventsLabel.count} Upcoming Events in {upcomingEventsLabel.label}
</Text>
```

## Label Behavior by Time Range

| Time Range | Label Text | Time Window |
|------------|-----------|-------------|
| 1D | "Next 3 Months" | 90 days |
| 1W | "Next 3 Months" | 90 days |
| 1M | "Next 3 Months" | 90 days |
| 3M | "Next 3 Months" | 90 days |
| YTD | "Next 3 Months" | 90 days (minimum) |
| 1Y | "Next Year" | 365 days |
| 5Y | "Next 5 Years" | 1,825 days |

## Technical Details

### Synchronization with Chart
The label's time window calculation matches exactly with the chart's `futureWindowMs` calculation in StockLineChart, ensuring consistency between:
- The visual future section width on the chart
- The event count displayed in the label
- The positioning of catalyst dots

### Event Counting
Events are filtered based on their `actualDateTime` falling within the calculated time window from now. The count updates automatically when:
- User changes the time range
- Events data is refreshed
- Component re-renders with new data

### Performance
Uses `useMemo` to avoid recalculating the label on every render, only recomputing when `portfolioEvents` or `portfolioTimeRange` changes.

## Testing
1. Navigate to Home screen with portfolio chart
2. Verify label shows "X Upcoming Events in Next 3 Months" on 1D view
3. Switch to 1Y view
4. Verify label updates to "X Upcoming Events in Next Year"
5. Switch to 5Y view
6. Verify label updates to "X Upcoming Events in Next 5 Years"
7. Verify event count changes appropriately for each time range

## Files Modified
- `catalyst-native/src/screens/HomeScreen.tsx`
