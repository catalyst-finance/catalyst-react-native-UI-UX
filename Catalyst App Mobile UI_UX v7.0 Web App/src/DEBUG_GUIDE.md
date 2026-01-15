# Debugging Guide for Timeline Scroll and Chart Alignment Issues

This document explains the debugging that has been added to track down two critical issues:

## Issue 1: Timeline Loading Scrolled Down

**Problem**: The timeline page loads with the scroll bar almost at the bottom instead of at the top.

**Debugging Added**:

### Location: `/components/main-app.tsx`
- **🔴 [TIMELINE SCROLL DEBUG]** markers track:
  - When the initial mount effect runs
  - Current scroll position at various checkpoints
  - Whether saved scroll positions exist in localStorage
  - When scroll positions are cleared
  - When `scrollTo(0)` is called and the resulting position
  - When `hasInitiallyMounted` is set to true

### Location: `/App.tsx`
- **🔴 [APP SCROLL DEBUG]** markers track:
  - When onboarding is completed
  - When scroll positions are cleared from localStorage
  - When `scrollTo(0)` is called from App.tsx
  - Resulting scroll positions after each operation

- **🔴 [SCROLL EVENT]** global scroll listener:
  - Tracks all significant scroll events (>50px changes)
  - Logs the before/after positions and delta
  - Includes a stack trace to identify what code triggered the scroll

**What to Look For**:
1. Check if saved scroll positions exist on initial load
2. Verify that `scrollTo(0)` is actually being called
3. Check if scroll position changes AFTER `scrollTo(0)` is called
4. Look for any scroll events triggered by other code (stack trace will show the source)

---

## Issue 2: Upcoming Events Line Not Connecting to Chart

**Problem**: The horizontal dotted line for upcoming events appears higher than where the price chart line ends at the "now" vertical line.

**Debugging Added**:

### Location: `/components/stock-chart.tsx`
- **🟢 [PRICE DATA DEBUG]** markers track:
  - Today's date at midnight vs current time
  - The last price data point's original timestamp
  - The last price data point's value
  - Current price from `stock_quote_now` table
  - Whether we're UPDATING an existing point or ADDING a new point
  - The new timestamp being assigned
  - The final updated data point

### Location: `/components/robinhood-style-chart.tsx`
- **🔵 [CHART ALIGNMENT DEBUG]** markers track:
  - Current time ("now")
  - Last historical data point details
  - Last data point's timestamp
  - Last data point's value (lastPrice)
  - Current price from props
  - Time gap between last data point and "now" (in ms and hours)
  - Y-axis min and max values
  - Normalized last value (0-1 scale)
  - Clamped normalized last value
  - "Now" position as a percentage
  - Filtered data count and endpoints
  - Start/end times for the display range
  - Filter cutoff time

**What to Look For**:
1. **Time Gap**: Check if there's a significant time gap between the last data point's timestamp and "now"
   - If the gap is large (e.g., several hours), the last data point won't be at "now"
   - The connector line starts at "now" position, but the chart line ends earlier
   
2. **Timestamp Assignment**: Verify that the last data point's timestamp is being set to `getCurrentTime()` not midnight
   
3. **Value Mismatch**: Check if the last data point's value differs from the current price
   - This could cause the chart line to end at a different height than expected
   
4. **Normalization**: Verify that the normalized value calculation is correct
   - Formula: `(lastPrice - yAxisMin) / (yAxisMax - yAxisMin)`
   - This should produce a value between 0 and 1
   
5. **Position Calculation**: Check that the "now" position percentage matches where we expect it to be

---

## How to Use This Debugging

1. **Open the browser console** (F12 or Cmd+Option+I)

2. **Filter the console** by searching for:
   - `🔴` for timeline scroll debugging
   - `🟢` for price data debugging
   - `🔵` for chart alignment debugging

3. **Look for patterns**:
   - Are scroll events happening when they shouldn't?
   - Is the time gap too large?
   - Are timestamps being set incorrectly?
   - Are there calculation errors?

4. **Share the console output** when reporting issues - the emoji prefixes make it easy to copy relevant sections

---

## Expected Behavior

### Timeline Scroll
- Initial mount should scroll to top (0)
- No restoration should occur on first load
- Scroll position should stay at 0 unless user scrolls

### Chart Alignment
- Last data point timestamp should be very close to "now" (within seconds)
- Time gap should be minimal (< 1 minute ideally)
- The normalized value should correctly position the dotted line at the same height as the chart line endpoint
- "Now" position should match the visual position of the vertical line

---

## Removing Debugging

Once issues are fixed, search for these markers and remove the console.log statements:
- `🔴 [TIMELINE SCROLL DEBUG]`
- `🔴 [APP SCROLL DEBUG]`
- `🔴 [SCROLL EVENT]`
- `🟢 [PRICE DATA DEBUG]`
- `🔵 [CHART ALIGNMENT DEBUG]`