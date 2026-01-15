# Event Icons Added to Chart Dots

## Overview
Added event type icons inside the event dots on stock charts, matching the design from the event timeline component.

## Changes Made

### 1. Created Shared Event Icon Utility
**File**: `src/utils/event-icons.ts`

Created a centralized utility for mapping event types to Ionicons:
```typescript
export const getEventIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    earnings: 'bar-chart',
    product: 'rocket',
    launch: 'rocket',
    fda: 'medkit',
    regulatory: 'shield-checkmark',
    conference: 'people',
    partnership: 'hand-left',
    merger: 'git-merge',
    legal: 'document-text',
    corporate: 'business',
    guidance: 'trending-up',
    guidance_update: 'trending-up',
    pricing: 'pricetag',
    dividend: 'cash',
    split: 'git-branch',
    defense_contract: 'shield',
    commerce_event: 'cart',
    capital_markets: 'stats-chart',
    investor_day: 'calendar',
  };
  return iconMap[type] || 'calendar';
};
```

### 2. Updated UpcomingEventsTimeline
**File**: `src/components/events/UpcomingEventsTimeline.tsx`

- Removed local `getEventIcon` function
- Now imports from shared utility: `import { getEventIcon } from '../../utils/event-icons'`
- Maintains same functionality with centralized code

### 3. Updated StockLineChart
**File**: `src/components/charts/StockLineChart.tsx`

**Added imports**:
```typescript
import { getEventIcon } from '../../utils/event-icons';
import { Ionicons } from '@expo/vector-icons';
```

**Updated event dots** (both portfolio and stock chart views):
- Added `justifyContent: 'center'` and `alignItems: 'center'` to dot styles
- Added `<Ionicons>` component inside each dot:
  - Icon name from `getEventIcon(catalyst.catalyst.type)`
  - Size: `dotSize * 0.5` (scales with dot size)
  - Color: `#FFFFFF` (white for visibility on colored backgrounds)

## Visual Changes

### Before
- Event dots were solid colored circles
- No indication of event type except color

### After
- Event dots show white icons inside
- Icons match event type (rocket for product, bar-chart for earnings, etc.)
- Icons scale proportionally with dot size based on time range
- Consistent with event timeline design

## Icon Sizing

Icons scale with dot size based on future time range:
- **1W to 3M**: Largest dots (18-30px) → Icons (9-15px)
- **3M to 6M**: Large dots (15-27px) → Icons (7.5-13.5px)
- **6M to 1Y**: Medium dots (12-24px) → Icons (6-12px)
- **1Y to 2Y**: Small dots (10.5-19.5px) → Icons (5.25-9.75px)
- **2Y to 3Y**: Smallest dots (9-15px) → Icons (4.5-7.5px)

## Benefits

1. **Visual Clarity**: Users can identify event types at a glance
2. **Consistency**: Icons match those used in event timeline
3. **Maintainability**: Single source of truth for event icons
4. **Scalability**: Icons automatically scale with dot size
5. **Accessibility**: Visual indicators beyond just color

## Components Using Event Icons

- ✅ `StockLineChart` - Chart event dots
- ✅ `UpcomingEventsTimeline` - Timeline event dots
- ✅ `EventTypeIcon` - Calendar event icons (uses different approach)

## Status
✅ **COMPLETE** - Event icons now display inside all chart event dots
