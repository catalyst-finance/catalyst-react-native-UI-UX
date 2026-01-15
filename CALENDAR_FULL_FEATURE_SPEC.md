# Calendar Full Feature Specification

**Date**: January 13, 2026

## Web App Features to Implement

### Core Features
1. ✅ 12-month grid (3x4 layout)
2. ✅ Quarter-based organization (Q1, Q2, Q3, Q4)
3. ✅ Event counting per month
4. ✅ Company logos in month cells
5. ✅ Event type colored dots/icons
6. ✅ Current month highlighting
7. ✅ Year navigation with swipe gestures
8. ✅ Expandable month details
9. ✅ Event timeline with vertical line
10. ✅ Pulsing animation for next upcoming event
11. ✅ Compact view for past quarters
12. ✅ Full view for current/future quarters

### Visual Elements
- Company ticker badges (black background, white text)
- Event type icons with colored backgrounds
- Stacked icons (max 3 per company)
- "+X more" indicator for additional companies
- Vertical timeline line for expanded months
- Event cards with gradient backgrounds
- Date/time badges on event cards
- Pulsing dot for next upcoming event

### Interactions
- Swipe left/right to change years
- Tap month to expand/collapse
- Tap event card to view details
- Tap ticker badge to filter
- Smooth animations for all transitions

### Layout Variations
- **Past Quarters**: Compact horizontal layout (month name + event dots)
- **Current/Future Quarters**: Full layout (month name + ticker badges + event icons)
- **Expanded Month**: Timeline view with event cards

## React Native Implementation Strategy

### Phase 1: Core Structure ✅
- Basic 12-month grid
- Quarter sections
- Year navigation
- Event counting

### Phase 2: Visual Enhancement (CURRENT)
- Company logos
- Event type icons
- Ticker badges
- Colored dots
- Compact vs full layouts

### Phase 3: Interactions
- Month expand/collapse
- Event timeline
- Swipe gestures
- Animations

### Phase 4: Polish
- Pulsing animations
- Smooth transitions
- Touch feedback
- Performance optimization

## Key Differences from Simplified Version

The simplified version was missing:
1. Company logos and ticker badges
2. Event type colored icons
3. Expandable month timelines
4. Compact view for past quarters
5. Swipe gestures for year navigation
6. Event cards with detailed information
7. Pulsing animation for upcoming events
8. Quarter-based organization
9. Vertical timeline visualization
10. Gradient backgrounds and visual polish

## Technical Requirements

### Dependencies
- React Native Reanimated (for animations)
- React Native Gesture Handler (for swipes)
- React Native SVG (for icons)
- Image component (for company logos)

### Data Fetching
- Fetch company logos from StockAPI
- Cache logos for performance
- Handle missing logos gracefully

### Performance
- Memoize month data calculations
- Lazy load company logos
- Optimize re-renders
- Use FlatList for event timeline if needed

## Next Steps
1. Read full web component
2. Create comprehensive React Native version
3. Implement all visual features
4. Add animations and gestures
5. Test on device
6. Polish and optimize
