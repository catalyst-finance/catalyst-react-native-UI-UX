# Chart Alignment Fix - September 30, 2025

## Problem Identified

The "upcoming events" dotted line was not aligning with the chart line endpoint. Debugging revealed:

- **Recharts rendered Y position**: 37.99px from top (12.18%)
- **Our calculated Y position**: 67.98px from top (21.79%)
- **Misalignment**: ~30 pixels (the dotted line was too low)

## Root Cause

We were trying to manually replicate Recharts' internal coordinate calculation using:
```javascript
calc(10px + ${(1 - normalizedValue)} * (100% - 20px))
```

However, this formula didn't account for Recharts' internal rendering logic, which includes:
- Internal padding/margin handling
- Coordinate system transformations
- The inverted Y-axis domain `[yAxisMax, yAxisMin]`

## Solution

Instead of trying to replicate Recharts' math, we now **capture the actual rendered position directly from Recharts**:

1. **Added state** to track the last data point's rendered Y position:
   ```typescript
   const [lastPointRenderedY, setLastPointRenderedY] = useState<number | null>(null);
   ```

2. **Captured the position** in the `dot` render function:
   ```typescript
   if (index === filteredData.length - 1) {
     setLastPointRenderedY(cy); // cy is Recharts' calculated Y position
   }
   ```

3. **Used the captured position** for the connector line, dotted line, AND catalyst dots:
   ```typescript
   // Connector line
   y1={`${lastPointRenderedY}px`}
   y2={`${lastPointRenderedY}px`}
   
   // Dotted horizontal line
   top: `${lastPointRenderedY}px`
   
   // Future catalyst dots
   cy={`${lastPointRenderedY}px`}
   ```

4. **Added null check** to only render elements when position is captured:
   ```typescript
   {lastPointRenderedY !== null && (
     // Render connector line, dotted line, and catalyst dots
   )}
   ```

5. **Dynamic label positioning** to prevent cutoff for declining stocks:
   ```typescript
   // Calculate if label should appear above the line (when line is near bottom)
   const chartHeight = chartRef.current?.clientHeight || (miniMode ? 100 : 320);
   const isNearBottom = lastPointRenderedY !== null && lastPointRenderedY > (chartHeight * 0.7);
   const labelTransform = miniMode 
     ? (isNearBottom ? 'translateY(-24px)' : 'translateY(4px)')
     : (isNearBottom ? 'translateY(-28px)' : 'translateY(7px)');
   ```
   
   When the chart line ends in the bottom 30% of the chart (declining stocks), the "upcoming events" label flips to appear **above** the line instead of below, preventing it from being cut off by x-axis labels.

## Benefits

- ✅ **Perfect alignment** - Uses Recharts' exact rendered position
- ✅ **No manual calculation** - Eliminates coordinate system mismatches
- ✅ **Automatically adapts** - Works with any chart height, margin, or zoom level
- ✅ **Reliable** - Won't break if Recharts updates its rendering logic

## Additional Fix

Fixed React warning about non-boolean JSX attribute in `horizontal-timeline.tsx`:
- Changed `<style jsx>` to `<style>` (standard JSX doesn't support the `jsx` attribute)

## Verification

After the fix, the console will show:
```
🔵 [CHART RENDER DEBUG] Recharts rendered cy: 37.99
🔵 [CHART RENDER DEBUG] Stored in state for line alignment
🔵 [CHART ALIGNMENT DEBUG] Last point rendered Y (from state): 37.99px
```

And visually, the dotted line will be perfectly aligned with where the chart line ends at the "now" vertical line.

## Files Modified

- `/components/robinhood-style-chart.tsx` - Added state tracking and updated line positioning
- `/components/horizontal-timeline.tsx` - Fixed JSX style tag warning