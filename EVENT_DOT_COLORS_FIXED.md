# Event Dot Colors Fixed - All Charts Now Use Actual Event Type Colors

## Overview
Updated all chart components to use the actual event type colors from the centralized `event-formatting.ts` utility instead of hardcoded color mappings.

## Changes Made

### 1. StockLineChart Component
**File**: `src/components/charts/StockLineChart.tsx`

**Before**:
- Had its own hardcoded `getEventTypeColor` function with incorrect color mappings
- Example: `earnings: '#f59e0b'` (amber) instead of actual `'#3b82f6'` (blue)

**After**:
- Removed hardcoded color function
- Added import: `import { getEventTypeHexColor } from '../../utils/event-formatting'`
- Now uses `getEventTypeHexColor(catalyst.catalyst.type)` for all event dots

### 2. StockDetailScreen Component
**File**: `src/screens/StockDetailScreen.tsx`

**Before**:
- Had unused hardcoded `getEventTypeColor` function with incorrect mappings

**After**:
- Removed unused hardcoded color function
- Added import: `import { getEventTypeHexColor } from '../utils/event-formatting'`
- Ready to use correct colors if needed in future

### 3. Centralized Color Source
**File**: `src/utils/event-formatting.ts`

This is the single source of truth for all event type colors:
```typescript
export const eventTypeConfig = {
  product: { color: '#f43f5e', label: 'Product' },
  earnings: { color: '#3b82f6', label: 'Earnings' },
  investor_day: { color: '#64748b', label: 'Investor Day' },
  regulatory: { color: '#f59e0b', label: 'Regulatory' },
  guidance_update: { color: '#06b6d4', label: 'Guidance Update' },
  conference: { color: '#f97316', label: 'Conference' },
  commerce_event: { color: '#14b8a6', label: 'Commerce Event' },
  partnership: { color: '#8b5cf6', label: 'Partnership' },
  merger: { color: '#a855f7', label: 'M&A' },
  legal: { color: '#ef4444', label: 'Legal' },
  corporate: { color: '#6b7280', label: 'Corporate Action' },
  pricing: { color: '#84cc16', label: 'Pricing' },
  capital_markets: { color: '#6366f1', label: 'Capital Markets' },
  defense_contract: { color: '#78716c', label: 'Defense Contract' },
  guidance: { color: '#0ea5e9', label: 'Guidance' },
  launch: { color: '#ec4899', label: 'Product Launch' },
  fda: { color: '#22c55e', label: 'FDA Approval' },
  split: { color: '#10b981', label: 'Stock Split' },
  dividend: { color: '#059669', label: 'Dividend' },
};
```

## Components Already Using Correct Colors

These components were already using `getEventTypeHexColor`:
- ✅ `UpcomingEventsTimeline` - Event timeline dots
- ✅ `EventTypeIcon` - Calendar event icons
- ✅ `CalendarMonthGrid` - Calendar event dots

## Impact

All event dots across the entire app now display consistent, accurate colors:
- Stock chart catalyst dots match event timeline dots
- Calendar event icons match chart event dots
- All components reference the same color configuration

## Benefits

1. **Consistency**: All event dots use the same colors across the app
2. **Maintainability**: Single source of truth for event colors
3. **Accuracy**: Colors now match the actual event types correctly
4. **Scalability**: Adding new event types only requires updating one file

## Status
✅ **COMPLETE** - All charts now use actual event type colors from centralized utility
