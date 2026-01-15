# MiniChart Event Dots Updated - Matching StockLineChart Styling

## Overview
Updated MiniChart event dots to use the same colors and styling as StockLineChart, providing visual consistency across all chart components.

## Changes Made

### MiniChart Component
**File**: `src/components/charts/MiniChart.tsx`

**Added Import**:
```typescript
import { getEventTypeHexColor } from '../../utils/event-formatting';
```

**Updated Event Dot Rendering**:

**Before**:
```typescript
{
  backgroundColor: '#3b82f6', // Hardcoded blue
}
```

**After**:
```typescript
const eventColor = getEventTypeHexColor(catalyst.catalyst.type);
const dotBorderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';

{
  backgroundColor: eventColor,
  borderWidth: 1.5,
  borderColor: dotBorderColor,
}
```

## Visual Changes

### Before
- All event dots were blue (#3b82f6)
- No borders on dots
- No differentiation between event types

### After
- Event dots use actual event type colors:
  - Earnings: Blue (#3b82f6)
  - Product: Rose (#f43f5e)
  - FDA: Green (#22c55e)
  - Regulatory: Amber (#f59e0b)
  - Conference: Orange (#f97316)
  - And all other event types...
- Dots have subtle borders for better visibility:
  - Light theme: `rgba(0,0,0,0.3)` (dark border)
  - Dark theme: `rgba(255,255,255,0.5)` (light border)
- Matches StockLineChart styling exactly

## Design Decisions

### Why No Icons?
MiniChart dots remain icon-free because:
1. **Size**: MiniChart dots are smaller (10px) than StockLineChart dots (9-30px)
2. **Simplicity**: MiniChart is meant to be a simplified overview
3. **Performance**: Fewer components to render in list views
4. **Clarity**: At small sizes, icons would be hard to see

### Consistent Styling
- Same border styling as StockLineChart
- Same color source (`getEventTypeHexColor`)
- Same theme-aware borders (light/dark)

## Components Comparison

| Component | Event Dots | Icons | Borders | Colors |
|-----------|-----------|-------|---------|--------|
| **StockLineChart** | ✅ | ✅ | ✅ | ✅ Actual |
| **MiniChart** | ✅ | ❌ | ✅ | ✅ Actual |
| **PortfolioChart** | ✅ | ❌ | ✅ | ✅ Actual |
| **UpcomingEventsTimeline** | ✅ | ✅ | ❌ | ✅ Actual |

## Benefits

1. **Visual Consistency**: All charts use the same event colors
2. **Better UX**: Users can identify event types by color across all views
3. **Maintainability**: Single source of truth for event colors
4. **Theme Support**: Borders adapt to light/dark themes
5. **Scalability**: Easy to add new event types

## Status
✅ **COMPLETE** - MiniChart now uses actual event type colors with matching borders
