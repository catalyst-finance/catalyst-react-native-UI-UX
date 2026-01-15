# Calendar Component - Multi-Session Implementation Roadmap

**Date**: January 13, 2026  
**Status**: 📋 Planning Complete - Ready for Session 1

## Overview
Building a pixel-perfect React Native version of the web app's CalendarMonthGrid component across multiple sessions. The web version is 800+ lines with complex features including animations, swipe gestures, expandable timelines, and company logos.

**Current Status**: 📍 Session 4 Complete - Expandable Timeline Implemented

## Architecture

### Files to Create
1. `catalyst-native/src/components/calendar/CalendarMonthGrid.tsx` (main component)
2. `catalyst-native/src/components/calendar/MonthCell.tsx` (month button component)
3. `catalyst-native/src/components/calendar/CompactMonthCell.tsx` (past quarter view)
4. `catalyst-native/src/components/calendar/ExpandedTimeline.tsx` (event timeline)
5. `catalyst-native/src/components/calendar/EventCard.tsx` (individual event)
6. `catalyst-native/src/components/calendar/EventTypeIcon.tsx` (colored icon dots)
7. `catalyst-native/src/utils/event-formatting.ts` (✅ created)
8. `catalyst-native/src/components/calendar/types.ts` (TypeScript interfaces)

### Dependencies to Install
```bash
npm install react-native-reanimated react-native-gesture-handler
```

## Session Breakdown

### SESSION 1: Foundation & Data Structure (CURRENT)
**Goal**: Set up types, data processing, and basic layout

**Tasks**:
- [x] Create event-formatting.ts utility
- [ ] Create types.ts with all interfaces
- [ ] Create basic CalendarMonthGrid skeleton
- [ ] Implement month data processing logic
- [ ] Add year navigation (buttons only, no swipe yet)
- [ ] Create quarter-based layout structure
- [ ] Test with mock data

**Deliverables**:
- Types file with CompanyInfo, MonthData interfaces
- Basic 12-month grid rendering
- Quarter sections (Q1, Q2, Q3, Q4)
- Year navigation working
- Month data correctly processed from events

**Estimated Lines**: ~300 lines

---

### SESSION 2: Month Cells & Visual Design
**Goal**: Implement full and compact month cell layouts

**Tasks**:
- [ ] Create MonthCell.tsx (full layout for current/future quarters)
- [ ] Create CompactMonthCell.tsx (horizontal layout for past quarters)
- [ ] Add ticker badges (black background, white text)
- [ ] Add event type colored dots
- [ ] Implement "+X more" indicator
- [ ] Add current month highlighting
- [ ] Style according to theme (dark/light mode)
- [ ] Add touch feedback

**Deliverables**:
- MonthCell component with ticker badges
- CompactMonthCell component with event dots
- Proper styling matching web app
- Current month border highlighting
- Theme-aware colors

**Estimated Lines**: ~400 lines

---

### SESSION 3: Company Logos & Event Icons (COMPLETE ✅)
**Goal**: Add company logos and event type icons

**Tasks**:
- [x] Create EventTypeIcon.tsx component
- [x] Fetch company logos from StockAPI
- [x] Implement logo caching
- [x] Add logos to month cells
- [x] Stack event type icons (max 3 per company)
- [x] Handle missing logos gracefully
- [x] Optimize image loading

**Deliverables**:
- EventTypeIcon component with all event types
- Company logos displayed in month cells
- Stacked icon layout
- Logo caching working
- Fallback for missing logos

**Completed Lines**: ~150 lines
**Status**: ✅ COMPLETE

---

### SESSION 4: Expandable Timeline (COMPLETE ✅)
**Goal**: Implement month expansion with event timeline

**Tasks**:
- [x] Create ExpandedTimeline.tsx component
- [x] Add expand/collapse state management
- [x] Render vertical timeline line
- [x] Create EventCard.tsx component
- [x] Sort events by date
- [x] Add date/time badges to event cards
- [x] Implement gradient backgrounds
- [x] Add close button

**Deliverables**:
- ExpandedTimeline component
- EventCard component
- Vertical timeline visualization
- Event sorting working
- Smooth expand/collapse

**Completed Lines**: ~290 lines
**Status**: ✅ COMPLETE

---

### SESSION 5: Animations & Gestures
**Goal**: Add swipe gestures and animations

**Tasks**:
- [ ] Install and configure react-native-reanimated
- [ ] Install and configure react-native-gesture-handler
- [ ] Implement swipe left/right for year navigation
- [ ] Add carousel animation for year changes
- [ ] Implement pulsing animation for next upcoming event
- [ ] Add smooth transitions for expand/collapse
- [ ] Add touch feedback animations
- [ ] Optimize animation performance

**Deliverables**:
- Swipe gestures working
- Year carousel animation
- Pulsing dot for upcoming events
- Smooth transitions
- Performance optimized

**Estimated Lines**: ~300 lines

---

### SESSION 6: Polish & Integration
**Goal**: Final touches and HomeScreen integration

**Tasks**:
- [ ] Add event click handlers
- [ ] Add ticker click handlers
- [ ] Implement event filtering (if needed)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Optimize re-renders
- [ ] Test on different screen sizes
- [ ] Test dark mode thoroughly
- [ ] Update HomeScreen integration
- [ ] Create comprehensive documentation

**Deliverables**:
- All click handlers working
- Loading and error states
- Performance optimized
- Fully integrated with HomeScreen
- Complete documentation

**Estimated Lines**: ~200 lines

---

## Total Estimated Code
- **Total Lines**: ~1,800 lines across 8 files
- **Total Sessions**: 6 sessions
- **Estimated Time**: 6-8 hours of development

## Feature Checklist

### Core Features
- [ ] 12-month grid layout (3x4)
- [ ] Quarter-based organization (Q1-Q4)
- [ ] Event counting per month
- [ ] Company logos in cells
- [ ] Event type colored icons
- [ ] Current month highlighting
- [ ] Year navigation with buttons
- [ ] Year navigation with swipe
- [ ] Expandable month details
- [ ] Event timeline with vertical line
- [ ] Pulsing animation for next event
- [ ] Compact view for past quarters
- [ ] Full view for current/future quarters

### Visual Elements
- [ ] Ticker badges (black bg, white text)
- [ ] Event type icons with colors
- [ ] Stacked icons (max 3 per company)
- [ ] "+X more" indicator
- [ ] Vertical timeline line
- [ ] Event cards with gradients
- [ ] Date/time badges
- [ ] Pulsing dot animation

### Interactions
- [ ] Swipe left/right for years
- [ ] Tap month to expand/collapse
- [ ] Tap event card for details
- [ ] Tap ticker badge to filter
- [ ] Smooth animations
- [ ] Touch feedback

## Technical Decisions

### Animation Library
**Choice**: React Native Reanimated
**Reason**: Best performance, smooth 60fps animations, gesture support

### Gesture Library
**Choice**: React Native Gesture Handler
**Reason**: Native gesture recognition, works with Reanimated

### Image Caching
**Choice**: React Native Fast Image (if needed)
**Reason**: Better caching, faster loading

### Layout Strategy
**Choice**: Flexbox with percentage widths
**Reason**: Responsive, works on all screen sizes

## Testing Strategy

### Unit Tests
- Month data processing
- Event sorting
- Date calculations
- Logo caching

### Integration Tests
- Year navigation
- Month expansion
- Event filtering
- Theme switching

### Visual Tests
- Screenshot comparisons
- Dark mode
- Different screen sizes
- Edge cases (no events, many events)

## Performance Targets
- Initial render: < 500ms
- Year navigation: < 300ms animation
- Month expansion: < 200ms animation
- Swipe gesture: 60fps
- Logo loading: Progressive, non-blocking

## Next Steps for Session 1

1. Create types.ts file
2. Create CalendarMonthGrid skeleton
3. Implement month data processing
4. Add year navigation buttons
5. Create quarter layout structure
6. Test with portfolio events

## Session 1 Success Criteria
- [ ] Types file created with all interfaces
- [ ] CalendarMonthGrid renders 12 months
- [ ] Quarters are properly organized
- [ ] Year navigation works
- [ ] Month data shows correct event counts
- [ ] Current month is identified
- [ ] Component integrates with HomeScreen
- [ ] No TypeScript errors
- [ ] Dark mode works

## Notes
- Keep web app open for reference
- Match pixel-perfect styling
- Use existing design tokens
- Follow React Native best practices
- Optimize for performance from the start
- Document as we build
