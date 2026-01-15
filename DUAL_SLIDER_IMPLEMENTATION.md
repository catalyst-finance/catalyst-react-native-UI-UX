# Dual Slider Time Range Implementation

## Summary
Replaced button-based time range selectors with continuous sliders for both past and future sections of the chart. Each section now has its own independent slider control positioned directly underneath it.

## Changes Made

### 1. StockLineChart Component (`src/components/charts/StockLineChart.tsx`)

#### New Types
- Added `FutureRange` type: `'3M' | '6M' | '1Y' | '2Y' | '3Y'`
- Exported both `TimeRange` and `FutureRange` for use in other components

#### New Props
- `defaultFutureRange?: FutureRange` - Initial future range selection (default: '3M')
- `onFutureRangeChange?: (range: FutureRange) => void` - Callback for future range changes

#### New State
- `selectedFutureRange` - Tracks the currently selected future time range

#### Updated Logic
- Separated future window calculation from past time range
- Future window now independently controlled by `selectedFutureRange`
- Added `handleFutureRangeChange` handler

#### UI Changes
- Replaced horizontal ScrollView with button grid
- Implemented two `@react-native-community/slider` components
- Each slider shows:
  - Section label ("Past" or "Upcoming")
  - Current selected value (e.g., "1D", "3M")
  - Continuous slider control
  - Min/max labels at ends

### 2. PortfolioChart Component (`src/components/charts/PortfolioChart.tsx`)

#### New Imports
- Added `FutureRange` type import

#### New State
- `selectedFutureRange` - Tracks future range selection (default: '3M')

#### New Handler
- `handleFutureRangeChange` - Updates future range state

#### Updated Props
- Passes `defaultFutureRange` to StockLineChart
- Passes `onFutureRangeChange` callback to StockLineChart

## Slider Configuration

### Past Range Slider
- **Range**: 1D → 1W → 1M → 3M → YTD → 1Y → 5Y (7 steps)
- **Position**: Left side, spans 60% of width
- **Labels**: "1D" (left) to "5Y" (right)

### Future Range Slider
- **Range**: 3M → 6M → 1Y → 2Y → 3Y (5 steps)
- **Position**: Right side, spans 40% of width
- **Labels**: "3M" (left) to "3Y" (right)

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│                     Chart Area                          │
│  [Past 60%]                    [Future 40%]            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────┬───────────────────────────┐
│ Past              1D        │ Upcoming          3M      │
│ ●━━━━━━━━━━━━━━━━━○         │ ●━━━━━━━━━━━━━━━━━○       │
│ 1D              5Y          │ 3M              3Y        │
└─────────────────────────────┴───────────────────────────┘
```

## User Experience

### Interaction
- Drag slider thumb to change time range
- Smooth continuous movement
- Discrete steps (snaps to predefined ranges)
- Real-time chart updates as slider moves

### Visual Feedback
- Current value displayed above slider
- Colored track shows selected portion
- Thumb color matches theme primary color
- Min/max labels provide context

### Independent Control
- Past and future ranges are completely independent
- Changing past range doesn't affect future range
- Each section maintains its own state

## Technical Details

### Slider Component
- Uses `@react-native-community/slider` (already installed)
- Step-based discrete values (not continuous)
- Maps slider position to array index
- Rounds value to nearest step

### Theme Integration
- `minimumTrackTintColor`: Primary theme color
- `maximumTrackTintColor`: Muted theme color
- `thumbTintColor`: Primary theme color
- Labels use theme foreground/muted colors

### Performance
- No performance impact from slider vs buttons
- State updates trigger chart re-render (same as before)
- Slider is lightweight native component

## Future Enhancements

### Potential Improvements
1. Add haptic feedback on slider value change
2. Show intermediate values while dragging
3. Add animation when chart updates
4. Display more granular labels (all steps)
5. Add preset quick-select buttons above sliders

### Accessibility
- Consider adding accessibility labels
- Ensure slider is keyboard navigable
- Add voice-over support for screen readers

## Testing

To test the implementation:
1. Navigate to Home Screen
2. Scroll to Portfolio Chart
3. Drag the "Past" slider left/right
4. Verify chart updates to show different time ranges
5. Drag the "Upcoming" slider left/right
6. Verify future section adjusts independently
7. Test on both light and dark themes

## Migration Notes

### Breaking Changes
- None - all changes are additive
- Existing components continue to work
- Default behavior unchanged

### Backward Compatibility
- `defaultTimeRange` still works as before
- `onTimeRangeChange` callback unchanged
- Components without `showUpcomingRange` unaffected
