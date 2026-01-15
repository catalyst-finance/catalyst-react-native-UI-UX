# Calendar Implementation Plan

**Date**: January 13, 2026  
**Status**: 🚧 In Progress

## Overview
Implementing the calendar feature for the HomeScreen's "Calendar" tab, based on the web app's calendar components.

## Components to Build

### 1. CalendarMonthGrid (Priority: HIGH)
**Purpose**: 12-month grid showing event counts and company logos

**Features**:
- 3x4 grid layout (12 months)
- Event count per month
- Company logos for stocks with events
- Event type indicators (colored dots)
- Current month highlighting
- Year navigation (prev/next)
- Month click to expand details

**Simplified for Mobile**:
- Remove expand/collapse animation (use navigation instead)
- Simpler touch interactions
- Optimized for smaller screens
- No drag-to-swipe (use buttons)

### 2. UpcomingEventsTimeline (Priority: MEDIUM)
**Purpose**: Chronological list of upcoming events

**Features**:
- Events grouped by quarters
- Event cards with type, date, company
- Collapsible quarter sections
- Event type badges with colors
- Company logos
- Past/Upcoming toggle

**Simplified for Mobile**:
- Use React Native Accordion/Collapsible
- Simpler card layout
- Touch-optimized spacing

## Implementation Phases

### Phase 1: Basic Calendar Grid ✅ CURRENT
1. Create CalendarMonthGrid component
2. Display 12-month grid
3. Show event counts per month
4. Add year navigation
5. Highlight current month
6. Integrate with HomeScreen calendar tab

### Phase 2: Event Details
1. Add company logos to month cells
2. Show event type dots
3. Add month click handler
4. Create month detail view

### Phase 3: Events Timeline
1. Create UpcomingEventsTimeline component
2. Group events by quarters
3. Add collapsible sections
4. Style event cards
5. Add past/upcoming toggle

### Phase 4: Integration
1. Connect calendar to events data
2. Add filtering by tickers
3. Sync with portfolio holdings
4. Add event click handlers

## Data Structure

### MonthData
```typescript
interface MonthData {
  month: number;
  year: number;
  eventCount: number;
  companies: CompanyInfo[];
}
```

### CompanyInfo
```typescript
interface CompanyInfo {
  ticker: string;
  logo: string;
  earliestEventDate: Date;
  eventTypes: string[];
}
```

## Design Specifications

### Colors (Black/White/Grey Theme)
- Background: theme background
- Month cells: theme card
- Current month: subtle border
- Event dots: event type colors (from eventTypeConfig)
- Text: theme foreground/mutedForeground

### Layout
- Grid: 3 columns x 4 rows
- Cell padding: 12px
- Cell gap: 8px
- Border radius: 8px
- Event count: Large, bold
- Month name: Small, muted

### Typography
- Month name: 12px, medium weight
- Event count: 24px, bold
- Year: 18px, semibold

## Files to Create

1. `catalyst-native/src/components/calendar/CalendarMonthGrid.tsx`
2. `catalyst-native/src/components/calendar/UpcomingEventsTimeline.tsx`
3. `catalyst-native/src/components/calendar/EventCard.tsx`
4. `catalyst-native/src/components/calendar/index.ts`

## Dependencies

- MarketEvent type from EventsAPI
- Event type colors from design-tokens
- Company logos (to be fetched)
- Date utilities

## Testing Plan

1. Display calendar grid with mock data
2. Verify month highlighting
3. Test year navigation
4. Verify event counts
5. Test on different screen sizes
6. Verify dark mode support

## Next Steps

1. Create CalendarMonthGrid component skeleton
2. Implement 12-month grid layout
3. Add event count display
4. Add year navigation
5. Integrate with HomeScreen
