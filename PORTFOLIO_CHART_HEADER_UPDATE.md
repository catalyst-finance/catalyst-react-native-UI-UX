# Portfolio Chart Header Update - January 13, 2026

## Changes Made

Updated PortfolioChart header to match StockLineChart styling exactly.

## New Header Structure

The header now follows the exact same layout as StockLineChart:

```
┌─────────────────────────────────────────┐
│ [PORTFOLIO]                             │
│ Your Portfolio                          │
│ $X,XXX.XX                               │
│ ▲ $XXX.XX (+X.XX%)                      │
│ ▲ $XX.XX (+X.XX%) Pre-Market            │
└─────────────────────────────────────────┘
```

### Header Components (Top to Bottom):

1. **Ticker Badge**: "PORTFOLIO" in primary color badge
2. **Company Name**: "Your Portfolio" in muted text
3. **Current Value**: Animated price display ($X,XXX.XX)
4. **Day Change**: Arrow + dollar change + percentage (always visible)
5. **Session Change**: Arrow + dollar change + percentage + label (only in extended hours)

## Extended Hours Support

### When to Show Session-Specific Data:
- **1D view only** (not shown on 1W, 1M, etc.)
- **Pre-Market hours** (4:00 AM - 9:30 AM ET)
- **After Hours** (4:00 PM - 8:00 PM ET)

### Session Labels:
- **Pre-Market**: Shows change from previous close
  - Row 1: "Prev Close" (yesterday's close to current)
  - Row 2: "Pre-Market" (pre-market session change)
  
- **After Hours**: Shows change from today's regular session close
  - Row 1: "Today" (full day change)
  - Row 2: "After Hours" (after-hours session change)

- **Regular Hours**: Shows only full day change
  - Row 1: Day change (no label)
  - Row 2: Empty (maintains consistent height)

## Styling Details

### Matches StockLineChart Exactly:
- Ticker badge: 12px font, 700 weight, primary background
- Company name: 14px font, 500 weight, muted color
- Price: 28px font, 600 weight, animated
- Change arrows: 10px font, 600 weight
- Change values: 14px font, 600 weight
- Change labels: 12px font, muted color
- Row spacing: 4px gap between rows
- Min height: 20px per row (prevents jumping)

### Colors:
- Positive: `rgb(0, 200, 5)` (green)
- Negative: `rgb(255, 80, 0)` (red)
- Muted text: Theme-based
- Primary badge: Theme-based

## Market Period Detection

Uses time-based calculation to determine current market period:
- Converts UTC to ET (UTC-5)
- Checks day of week (closed on weekends)
- Determines period based on ET time:
  - Pre-Market: 4:00 AM - 9:30 AM
  - Regular: 9:30 AM - 4:00 PM
  - After Hours: 4:00 PM - 8:00 PM
  - Closed: All other times

## Session Change Calculation

### Pre-Market:
```typescript
dollarChange = currentValue - previousClose
percentChange = (dollarChange / previousClose) * 100
```

### After Hours:
```typescript
regularSessionClose = currentValue - dayChange
dollarChange = currentValue - regularSessionClose
percentChange = (dollarChange / regularSessionClose) * 100
```

## Files Modified

1. `catalyst-native/src/components/charts/PortfolioChart.tsx`
   - Added AnimatedPrice import
   - Added currentPeriod calculation
   - Added sessionSpecificChange calculation
   - Restructured header to match StockLineChart
   - Updated styles to match StockLineChart exactly

## Testing

To test the extended hours display:
1. View portfolio on 1D timeframe
2. During pre-market (4:00-9:30 AM ET): Should show "Prev Close" and "Pre-Market" rows
3. During regular hours (9:30 AM-4:00 PM ET): Should show only day change
4. During after hours (4:00-8:00 PM ET): Should show "Today" and "After Hours" rows
5. On other timeframes (1W, 1M, etc.): Should show only period change

## Benefits

1. **Consistency**: Portfolio chart header now matches stock chart header exactly
2. **Extended Hours**: Shows pre-market and after-hours changes when applicable
3. **Clarity**: Clear labels indicate which session the change represents
4. **Responsive**: Automatically adjusts based on time and timeframe
5. **Professional**: Matches industry-standard portfolio displays
