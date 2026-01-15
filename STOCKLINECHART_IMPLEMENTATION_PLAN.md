# StockLineChart Implementation Plan

## Overview

The web app's StockLineChart is 3232 lines - a massive, feature-rich component. For React Native, we've created a focused implementation that:

1. **Reuses MiniChart patterns** - Proven session-based rendering, time calculations, Bezier smoothing
2. **Implements core features** - Dual-section layout, time ranges, session-based opacity
3. **Stays maintainable** - Clean, modular code that can be extended

## Implementation Status

### Phase 1 - Core Features ✅ COMPLETE

#### 1. Dual-Section Layout ✅
- 60% past (price chart)
- 40% future (catalyst timeline)
- Vertical divider line
- Configurable via `showUpcomingRange` prop

#### 2. Past Section (Price Chart) ✅
- Session-based line rendering with clip paths
- Pre-market, regular, after-hours opacity based on current period
- Previous close reference line (1D view only)
- Current price indicator with pulsing animation
- Time-based X positioning for 1D
- Index-based X positioning for multi-day
- 5Y timestamp-based positioning

#### 3. Future Section (Catalyst Timeline) ✅
- Future catalyst dots with event type colors
- Gradient background (horizontal + top/bottom fades)
- Dotted line from current price
- Dynamic future window based on time range

#### 4. Time Range Selector ✅
- 1D, 1W, 1M, 3M, YTD, 1Y, 5Y
- Active state highlighting
- Triggers `onTimeRangeChange` callback

#### 5. Price Display Header ✅
- Current price (AnimatedPrice component)
- Price change with arrow indicator
- Percentage change
- Color-coded (green/red)

## Advanced Features (Phase 2 - Next Steps)

### 6. Crosshair Interaction
- Touch/pan gesture with `PanGestureHandler`
- Snap to data points
- Show price and timestamp tooltip
- Snap to events when close
- Robinhood-style session highlighting on hover

### 7. Settings Popover
- Chart type toggle (line/candlestick)
- Show/hide upcoming events
- Show/hide past events
- Event type filters

### 8. Past Event Dots
- Show historical events on the price line
- Event type colors
- Clickable for event details

### 9. Price Targets
- Analyst price target lines
- High/Low/Avg/Median targets
- Sloped dashed lines to future

### 10. Real-time Updates
- WebSocket price updates (already supported via parent)
- Smooth price transitions
- Current price dot animation (✅ implemented)

## Implementation Strategy

### Completed ✅

1. **Core Layout** - Dual-section with configurable split
2. **Past Section Rendering** - Session-based paths with clip paths
3. **Future Section Rendering** - Gradient background, catalyst dots
4. **Time Range Integration** - All 7 time ranges supported
5. **Price Header** - AnimatedPrice with change indicators
6. **Pulsing Animation** - Live session indicator

### Next Steps

1. Add crosshair interaction with gesture handlers
2. Add past event dots on price line
3. Add settings popover
4. Add candlestick mode toggle
5. Add price targets visualization

## Code Reuse from MiniChart

### Shared Logic ✅
- Session-based opacity
- Time-based X positioning
- Bezier curve generation
- Price scaling
- Market hours calculation
- Current period detection
- Pulsing animation

### Shared Utilities ✅
- `chart-time-utils.ts` - All time calculations
- `chart-math-utils.ts` - All math operations
- `bezier-path-utils.ts` - Path generation
- `design-tokens.ts` - Colors and styling

## Key Differences from Web App

### Simplified (Phase 1)
- ✅ No candlestick mode (Phase 2)
- ✅ No crosshair (Phase 2)
- ✅ No settings popover (Phase 2)
- ✅ No price targets (Phase 2)
- ✅ No past event dots (Phase 2)

### React Native Specific
- Use `react-native-svg` instead of web SVG
- Use `PanGestureHandler` for interactions (Phase 2)
- Use `Animated` for animations
- Use `ScrollView` for time range selector
- Mobile-optimized touch targets

## Success Criteria

### Phase 1 Complete ✅
- ✅ Dual-section layout renders correctly
- ✅ Past section shows price line with sessions
- ✅ Future section shows catalyst dots
- ✅ Time range selector works
- ✅ Matches MiniChart visual style
- ✅ Works with real data
- ⏳ Performance testing (60fps target)

## Testing

The StockLineChart is now available in ComponentShowcaseScreen:
1. Run `npx expo start` in catalyst-native
2. Navigate to Components tab
3. Scroll down to "Stock Detail Chart (Real Data)"
4. Test time range selector
5. Verify session-based opacity
6. Check catalyst dots in future section
