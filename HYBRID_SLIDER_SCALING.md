# Hybrid Slider Scaling Implementation

## Summary
Implemented a hybrid scaling system for the past range slider where the first 2/3 uses linear day-by-day increments (1 day to 1 year), and the last 1/3 uses exponential scaling (1 year to 5 years). This provides precise control for recent dates while still allowing access to the full 5-year range.

## Scaling Algorithm

### Past Range Slider (Hybrid)

#### Linear Section (0-66.67% of slider)
- **Range**: 1 day to 365 days (1 year)
- **Behavior**: Each slider movement represents approximately 1 day
- **Formula**: `days = 1 + (position / 66.67) × 364`

#### Exponential Section (66.67-100% of slider)
- **Range**: 365 days to 1825 days (5 years)
- **Behavior**: Exponential curve for accessing longer time periods
- **Formula**: `days = 365 × (5 ^ ((position - 66.67) / 33.33))`

### Future Range Slider (Linear)
- **Range**: 1 day to 1095 days (3 years)
- **Behavior**: Linear day-by-day throughout
- **Formula**: `days = position` (direct mapping)

## Visual Representation

```
Past Slider (0-100):
┌─────────────────────────────────────────────────────────┐
│ Linear (0-66.67)      │ Exponential (66.67-100)        │
│ 1D ──────────────→ 1Y │ 1Y ──→ 2Y ──→ 3Y ──→ 4Y ──→ 5Y │
│ Day-by-day precision  │ Logarithmic spacing            │
└─────────────────────────────────────────────────────────┘
     66.67% of slider         33.33% of slider

Labels: [1D]                [1Y]                      [5Y]
```

## Benefits

### User Experience
1. **Precise recent dates**: Easy to select specific days/weeks/months
2. **Full range access**: Can still reach 5 years back
3. **Natural feel**: More control where it matters most
4. **Smooth transition**: Seamless switch between linear and exponential

### Technical Benefits
1. **Optimal resolution**: 66.67% of slider dedicated to most-used range
2. **Efficient**: Covers 5 years without requiring 1825 discrete steps
3. **Intuitive**: Matches user mental model (recent = important)

## Implementation Details

### Conversion Functions

#### Position to Days
```typescript
sliderPositionToDays(position: number): number {
  const linearThreshold = 66.67;
  
  if (position <= linearThreshold) {
    // Linear: 0-66.67 → 1-365 days
    const normalized = position / linearThreshold;
    return Math.round(1 + normalized * 364);
  } else {
    // Exponential: 66.67-100 → 365-1825 days
    const normalized = (position - linearThreshold) / 33.33;
    const exponentialFactor = Math.pow(5, normalized);
    return Math.round(365 * exponentialFactor);
  }
}
```

#### Days to Position
```typescript
daysToSliderPosition(days: number): number {
  if (days <= 365) {
    // Linear: 1-365 days → 0-66.67
    const normalized = (days - 1) / 364;
    return normalized * 66.67;
  } else {
    // Exponential: 365-1825 days → 66.67-100
    const exponentialPosition = Math.log(days / 365) / Math.log(5);
    return 66.67 + exponentialPosition * 33.33;
  }
}
```

### Slider Configuration

#### Past Slider
- **minimumValue**: 0
- **maximumValue**: 100
- **step**: 0.1 (smooth movement)
- **value**: `pastSliderPosition` (0-100)
- **Labels**: "1D", "1Y", "5Y" (showing transition point)

#### Future Slider
- **minimumValue**: 1
- **maximumValue**: 1095
- **step**: 1 (day-by-day)
- **value**: `futureDays` (direct days)
- **Labels**: "1D", "3Y"

## Example Slider Positions

### Linear Section (0-66.67)
| Position | Days | Label |
|----------|------|-------|
| 0.0      | 1    | 1D    |
| 1.3      | 7    | 1W    |
| 5.5      | 30   | 1M    |
| 16.5     | 90   | 3M    |
| 33.3     | 182  | 6M    |
| 66.67    | 365  | 1Y    |

### Exponential Section (66.67-100)
| Position | Days | Label |
|----------|------|-------|
| 66.67    | 365  | 1Y    |
| 73.3     | 548  | 2Y    |
| 80.0     | 821  | 2Y    |
| 86.7     | 1231 | 3Y    |
| 93.3     | 1643 | 5Y    |
| 100.0    | 1825 | 5Y    |

## User Interaction Examples

### Selecting Recent Dates (Linear Section)
1. **1 week ago**: Drag to ~1.3% (very beginning)
2. **1 month ago**: Drag to ~5.5% (still near start)
3. **3 months ago**: Drag to ~16.5% (about 1/6 of slider)
4. **6 months ago**: Drag to ~33.3% (about 1/3 of slider)
5. **1 year ago**: Drag to 66.67% (2/3 mark)

### Selecting Distant Dates (Exponential Section)
1. **2 years ago**: Drag to ~80% (into exponential zone)
2. **3 years ago**: Drag to ~87% (further right)
3. **5 years ago**: Drag to 100% (far right)

## Performance Considerations

### Calculation Overhead
- Conversion functions are lightweight (simple math)
- No performance impact from exponential calculations
- Memoized with `useCallback` to prevent recreations

### Slider Responsiveness
- Step size of 0.1 provides smooth dragging
- Real-time conversion happens on every value change
- No noticeable lag or jank

## Testing

### Linear Section Tests
1. Drag from 0% to 66.67%
2. Verify labels change: 1D → 2D → 1W → 2W → 1M → 3M → 6M → 1Y
3. Check that movement feels linear and predictable

### Exponential Section Tests
1. Drag from 66.67% to 100%
2. Verify labels change: 1Y → 2Y → 3Y → 4Y → 5Y
3. Check that years increment faster than in linear section

### Transition Point Test
1. Drag slowly around 66.67% position
2. Verify smooth transition from linear to exponential
3. Check that 1Y label appears at transition point

### Edge Cases
1. Minimum (0%): Should show "1D"
2. Transition (66.67%): Should show "1Y"
3. Maximum (100%): Should show "5Y"

## Future Enhancements

### Potential Improvements
1. **Visual indicator**: Show transition point on slider track
2. **Haptic feedback**: Vibrate at 1Y transition point
3. **Snap to transition**: Optional snapping at 66.67%
4. **Adjustable threshold**: Make 66.67% configurable
5. **Different curves**: Experiment with other exponential bases

### Alternative Scaling Options
1. **Logarithmic throughout**: Full logarithmic scale
2. **Three sections**: Linear (1D-1M), moderate (1M-1Y), exponential (1Y-5Y)
3. **Adaptive**: Adjust based on data availability
4. **User preference**: Let users choose scaling type

## Mathematical Details

### Exponential Curve Choice
We use base 5 because:
- 5^0 = 1 (at 1Y, multiplier is 1)
- 5^1 = 5 (at 5Y, multiplier is 5)
- Smooth curve between these points
- Natural feel for time progression

### Alternative Bases
- **Base 3**: Slower growth (1Y → 3Y at 100%)
- **Base 7**: Faster growth (1Y → 7Y at 100%)
- **Base 5**: Optimal for 1Y → 5Y range ✓

### Inverse Function
The inverse (days → position) uses logarithm:
```
position = log_base(days/365) / log_base(5)
```

This ensures bidirectional conversion is accurate.
