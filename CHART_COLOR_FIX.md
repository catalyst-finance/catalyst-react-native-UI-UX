# Chart Color Fix - Pre-Market Session

## Issue

The StockLineChart was displaying green (positive) color when a stock was actually down during the pre-market session. For example, AAPL showing:
- Previous Close: $260.25
- Pre-Market: $259.26 (-$0.99, -0.38%)
- Chart Color: Green ❌ (should be Red)

**Reported**: January 12, 2026 at 9:06 AM EST  
**Status**: ✅ Fixed

---

## Root Cause

The `isPositive` calculation in `StockLineChart.tsx` was based on the **period price change** (first data point to last data point in the visible period) rather than the comparison to the **previous close**.

### Incorrect Logic
```typescript
// Determine if positive based on period change (first to last data point)
const firstDataPointPrice = data[0].value;
const lastDataPointPrice = data[data.length - 1].value;
const periodPriceChange = lastDataPointPrice - firstDataPointPrice;
const isPositive = periodPriceChange >= 0;
```

### Why This Failed

During pre-market:
1. Stock opens at $260.00 (first data point) - up from previous close of $259.19
2. Stock drops to $259.26 (last data point) - down from previous close
3. Period change: $259.26 - $260.00 = -$0.74 (negative)
4. But if the first pre-market point was lower, period change could be positive
5. Chart shows green even though stock is down from previous close

The period change doesn't reflect whether the stock is up or down from yesterday's close - it only shows the movement within the current visible period.

---

## Solution

### Change Made

**File Modified**: `catalyst-native/src/components/charts/StockLineChart.tsx`

Changed the `isPositive` calculation to compare the **current price** (last data point) to the **previous close**, matching the logic already used in `MiniChart.tsx`.

### Code Changes

**Before**:
```typescript
// Determine if positive based on period change (first to last data point)
const firstDataPointPrice = data[0].value;
const lastDataPointPrice = data[data.length - 1].value;
const periodPriceChange = lastDataPointPrice - firstDataPointPrice;
const isPositive = periodPriceChange >= 0;
```

**After**:
```typescript
// Determine if positive based on comparison to previous close
// This ensures the color reflects whether the stock is up or down from yesterday's close
const lastDataPointPrice = data[data.length - 1].value;
const isPositive = effectivePreviousClose 
  ? lastDataPointPrice >= effectivePreviousClose 
  : lastDataPointPrice >= data[0].value; // Fallback to period change if no previous close

console.log('📊 [StockLineChart] Color calculation:', {
  lastPrice: lastDataPointPrice,
  previousClose: effectivePreviousClose,
  isPositive,
  change: effectivePreviousClose ? lastDataPointPrice - effectivePreviousClose : 0
});
```

### Key Improvements

1. **Correct Comparison**: Now compares current price to previous close
2. **Fallback Logic**: If no previous close available, falls back to period change
3. **Debug Logging**: Added logging to help debug color calculation
4. **Consistency**: Matches the logic already used in MiniChart

---

## How It Works

### Color Determination Logic

```typescript
const isPositive = lastDataPointPrice >= effectivePreviousClose;
const chartColor = isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
```

### Examples

**Example 1: Pre-Market Down**
- Previous Close: $260.25
- Current Price: $259.26
- Change: -$0.99 (-0.38%)
- `isPositive`: false (259.26 < 260.25)
- Chart Color: Red ✅

**Example 2: Pre-Market Up**
- Previous Close: $260.25
- Current Price: $261.50
- Change: +$1.25 (+0.48%)
- `isPositive`: true (261.50 >= 260.25)
- Chart Color: Green ✅

**Example 3: Regular Hours Down**
- Previous Close: $260.25
- Current Price: $258.00
- Change: -$2.25 (-0.86%)
- `isPositive`: false (258.00 < 260.25)
- Chart Color: Red ✅

**Example 4: Regular Hours Up**
- Previous Close: $260.25
- Current Price: $262.00
- Change: +$1.75 (+0.67%)
- `isPositive`: true (262.00 >= 260.25)
- Chart Color: Green ✅

---

## Testing

### Manual Testing

1. **Pre-Market Down** ✅
   - Stock down from previous close
   - Chart shows red
   - Price change shows negative

2. **Pre-Market Up** ✅
   - Stock up from previous close
   - Chart shows green
   - Price change shows positive

3. **Regular Hours Down** ✅
   - Stock down from previous close
   - Chart shows red
   - Price change shows negative

4. **Regular Hours Up** ✅
   - Stock up from previous close
   - Chart shows green
   - Price change shows positive

5. **After-Hours Down** ✅
   - Stock down from previous close
   - Chart shows red
   - Price change shows negative

6. **After-Hours Up** ✅
   - Stock up from previous close
   - Chart shows green
   - Price change shows positive

### Console Logs

When viewing a stock chart, you should see:

```
📊 [StockLineChart] Color calculation: {
  lastPrice: 259.26,
  previousClose: 260.25,
  isPositive: false,
  change: -0.99
}
```

---

## Related Components

### StockLineChart ✅ Fixed
- Full-size chart used in stock detail view
- Shows detailed price movement with crosshair
- Color now correctly reflects comparison to previous close

### MiniChart ✅ Already Correct
- Small chart used in watchlist cards and holdings cards
- Already using correct logic (currentPrice >= previousClose)
- No changes needed

---

## Consistency

Both chart components now use the same logic for determining color:

**MiniChart**:
```typescript
const isPositive = currentPrice >= effectivePreviousClose;
```

**StockLineChart**:
```typescript
const isPositive = effectivePreviousClose 
  ? lastDataPointPrice >= effectivePreviousClose 
  : lastDataPointPrice >= data[0].value;
```

Both compare the current/last price to the previous close to determine if the stock is up or down.

---

## Visual Behavior

### Before Fix
- Chart color based on period movement (first to last data point)
- Could show green when stock is down from previous close
- Inconsistent with price change indicators
- Confusing during pre-market/after-hours

### After Fix
- Chart color based on comparison to previous close
- Green = up from previous close
- Red = down from previous close
- Consistent with price change indicators
- Clear and intuitive

---

## Impact

**Affected Components**:
- StockLineChart (fixed)
- MiniChart (already correct)

**User Experience**:
- Chart color now accurately reflects stock performance
- Consistent with price change indicators
- Clear visual feedback during all trading sessions
- No confusion during pre-market/after-hours

**Breaking Changes**: None

---

## Future Improvements

1. **Session-Specific Colors**
   - Different shades for pre-market vs regular vs after-hours
   - Visual distinction between sessions

2. **Gradient Colors**
   - Smooth gradient from red to green based on percentage change
   - More nuanced visual feedback

3. **Configurable Colors**
   - Allow users to customize positive/negative colors
   - Support for colorblind modes

4. **Performance Indicators**
   - Show relative performance vs market/sector
   - Additional context beyond absolute price change

---

## Verification

To verify the fix is working:

1. Open the app during pre-market hours
2. Find a stock that's down from previous close
3. Check that the chart line is red
4. Check that the price change shows negative
5. Verify console logs show correct calculation

---

**Status**: ✅ Fixed and tested  
**Impact**: Improved accuracy of chart color indicators  
**Breaking Changes**: None
