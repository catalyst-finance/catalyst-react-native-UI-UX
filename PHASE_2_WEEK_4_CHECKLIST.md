# Phase 2 Week 4: Charts & Data Visualization - Detailed Checklist

## ⚠️ MANDATORY READING BEFORE STARTING
1. **READ**: `QUALITY_CONTROL_MANDATE.md` - ZERO SIMPLIFICATIONS POLICY
2. **READ**: `.kiro/specs/expo-native-conversion/11-chart-component-detailed-spec.md`
3. **READ**: Web app chart files (listed below)

---

## Pre-Implementation Requirements

### ✅ Step 0: Preparation (MUST COMPLETE FIRST)
- [ ] Read `QUALITY_CONTROL_MANDATE.md` in full
- [ ] Read all web app chart component files
- [ ] Read all web app utility files
- [ ] Understand dual-section layout concept
- [ ] Understand event dot positioning
- [ ] Understand Bezier smoothing algorithm
- [ ] Understand session-based coloring
- [ ] Understand time range positioning logic
- [ ] Document understanding in notes
- [ ] Create implementation plan for review

**DO NOT PROCEED until all boxes are checked.**

---

## Step 1: Port Utility Files (EXACT COPIES) ✅ COMPLETE

### 1.1: chart-time-utils.ts (800+ lines) ✅ COMPLETE

**Web App Source**: `src/utils/chart-time-utils.ts`
**Native Target**: `catalyst-native/src/utils/chart-time-utils.ts`

**Pre-Implementation Checklist**:
- [x] Read entire web app file (all 800+ lines)
- [x] List all exported functions (should be 20+)
- [x] List all constants (EXTENDED_MARKET_HOURS, MS, etc.)
- [x] Understand market hours calculation logic
- [x] Understand session detection logic
- [x] Understand X position calculation logic
- [x] Understand time label generation logic
- [x] Note any web-specific code that needs adaptation

**Implementation Checklist**:
- [x] Copy file header comment exactly
- [x] Copy all constants exactly
- [x] Copy all type definitions exactly
- [x] Copy all functions exactly (preserve function signatures)
- [x] Copy all comments exactly
- [x] Adapt any web-specific code (document changes) - NO CHANGES NEEDED
- [x] Add React Native-specific imports if needed - NONE NEEDED
- [x] Verify no logic was simplified - VERIFIED
- [x] Verify no edge cases were removed - VERIFIED

**Post-Implementation Checklist**:
- [x] TypeScript compiles without errors
- [x] All functions have correct types
- [x] All exports match web app
- [x] Side-by-side code comparison done
- [x] No simplifications made
- [x] All comments preserved
- [x] Documentation updated

**Functions to Port** (verify all are present):
- [x] getMarketHoursBounds
- [x] getTradingDayFromData
- [x] createTradingDayContext
- [x] determineMarketPeriod
- [x] getSessionForTimestamp
- [x] isCurrentlyPreMarket
- [x] isCurrentlyWeekend
- [x] getEffectivePreviousClose
- [x] calculateIntradayXPosition
- [x] calculateIndexBasedXPosition
- [x] calculate5YXPosition
- [x] calculateXPosition
- [x] calculateFutureWindowMs
- [x] generateIntradayLabels
- [x] generateIndexBasedLabels
- [x] generateYearLabels
- [x] generateTimeLabels
- [x] filterOverlappingLabels
- [x] snapTimestampToInterval
- [x] isWithinTimeWindow
- [x] formatTimestampForRange

### 1.2: chart-math-utils.ts (600+ lines) ✅ COMPLETE

**Web App Source**: `src/utils/chart-math-utils.ts`
**Native Target**: `catalyst-native/src/utils/chart-math-utils.ts`

**Pre-Implementation Checklist**:
- [x] Read entire web app file (all 600+ lines)
- [x] List all exported functions
- [x] Understand price range calculation
- [x] Understand volume scaling
- [x] Understand candlestick geometry
- [x] Understand data aggregation logic
- [x] Note any web-specific code

**Implementation Checklist**:
- [x] Copy file header comment exactly
- [x] Copy all type definitions exactly
- [x] Copy all functions exactly
- [x] Copy all comments exactly
- [x] Adapt any web-specific code (document changes) - NO CHANGES NEEDED
- [x] Verify no logic was simplified - VERIFIED
- [x] Verify no edge cases were removed - VERIFIED

**Post-Implementation Checklist**:
- [x] TypeScript compiles without errors
- [x] All functions have correct types
- [x] All exports match web app
- [x] Side-by-side code comparison done
- [x] No simplifications made
- [x] Documentation updated

**Functions to Port** (verify all are present):
- [x] calculatePriceRange
- [x] createPriceScale
- [x] getEffectivePreviousClose
- [x] createVolumeScale
- [x] aggregateVolume
- [x] findClosestDataPoint
- [x] findPriceY
- [x] generateLinePath
- [x] generateSessionPaths
- [x] calculateCandlestickGeometry
- [x] calculateCandleWidth
- [x] isChartPositive
- [x] getChartColor
- [x] getVolumeBarColor
- [x] normalizeToUnifiedPoints
- [x] downsampleData
- [x] aggregateIntradayTo5MinCandles
- [x] aggregate5MinTo10MinCandles

---

## Step 2: Install Required Dependencies

```bash
cd catalyst-native
npm install react-native-svg
npm install react-native-gesture-handler
npm install react-native-reanimated
```

**Verification**:
- [ ] All packages installed successfully
- [ ] No version conflicts
- [ ] TypeScript types available
- [ ] Test imports work

---

## Step 3: Implement MiniChart Component

**Web App Source**: `src/components/charts/mini-chart.tsx`
**Native Target**: `catalyst-native/src/components/charts/MiniChart.tsx`

### 3.1: Pre-Implementation Analysis

**Read and Document**:
- [ ] Component props interface (SimpleMiniChartProps)
- [ ] All state variables
- [ ] All useMemo calculations
- [ ] Path generation logic
- [ ] Session segmentation logic
- [ ] Event dot rendering
- [ ] Previous close line
- [ ] Current price indicator
- [ ] Color logic (green/red)

**Key Features to Preserve**:
- [ ] Session-based path generation (pre-market, regular, after-hours)
- [ ] Bezier smoothing with tension 0.4
- [ ] Catalyst dots on timeline
- [ ] Previous close reference line
- [ ] Current price dot
- [ ] Shortened trading hours support
- [ ] Global min/max value support
- [ ] Animation support (can be disabled)

### 3.2: Implementation

**Structure**:
```typescript
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { generateContinuousSmoothPath, Point } from '../../utils/bezier-path-utils';
import { getTradingDayFromData, createTradingDayContext } from '../../utils/chart-time-utils';
import { calculatePriceRange } from '../../utils/chart-math-utils';
import { colors } from '../../constants/design-tokens';

interface DataPoint {
  timestamp: number;
  value: number;
  session?: string;
}

interface MiniChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  ticker?: string;
  futureCatalysts?: FutureCatalyst[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  centeredEventId?: string | null;
  disableAnimation?: boolean;
  previousDayData?: { close: number; previousClose: number } | null;
  shortenedTradingHours?: { open: string; close: string } | null;
  globalMinValue?: number;
  globalMaxValue?: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  previousClose,
  currentPrice,
  ticker,
  futureCatalysts = [],
  width = 300,
  height = 60,
  strokeWidth = 1.5,
  centeredEventId = null,
  disableAnimation = false,
  previousDayData = null,
  shortenedTradingHours = null,
  globalMinValue,
  globalMaxValue,
}) => {
  // Implementation here - MUST match web app logic exactly
};
```

**Implementation Checklist**:
- [ ] All props from web app present
- [ ] All default values match web app
- [ ] Price range calculation matches web app
- [ ] Session segmentation matches web app
- [ ] Path generation uses same Bezier smoothing
- [ ] Event dots positioned correctly
- [ ] Previous close line rendered
- [ ] Current price indicator rendered
- [ ] Colors match web app exactly
- [ ] All edge cases handled (empty data, single point, etc.)

### 3.3: Post-Implementation Verification

**Visual Comparison**:
- [ ] Screenshot web app MiniChart
- [ ] Screenshot native MiniChart
- [ ] Compare side-by-side
- [ ] Verify colors match exactly
- [ ] Verify line thickness matches
- [ ] Verify dot sizes match
- [ ] Verify spacing matches

**Functional Testing**:
- [ ] Test with empty data
- [ ] Test with single data point
- [ ] Test with pre-market data
- [ ] Test with after-hours data
- [ ] Test with weekend data
- [ ] Test with holiday data
- [ ] Test with shortened trading hours
- [ ] Test with future catalysts
- [ ] Test with global min/max values

**Performance Testing**:
- [ ] Renders in < 16ms (60fps)
- [ ] No jank on scroll
- [ ] Memory usage acceptable
- [ ] Re-renders optimized with useMemo

---

## Step 4: Implement StockLineChart Component

**Web App Source**: `src/components/charts/stock-line-chart.tsx` (2000+ lines!)
**Native Target**: `catalyst-native/src/components/charts/StockLineChart.tsx`

### 4.1: Pre-Implementation Analysis (CRITICAL)

**This is the most complex component. Take time to understand it fully.**

**Read and Document** (spend 2-3 hours on this):
- [ ] Component props interface (LargeSVGChartProps)
- [ ] All state variables (10+)
- [ ] All refs
- [ ] All useMemo calculations (20+)
- [ ] All useCallback functions (15+)
- [ ] All useEffect hooks (10+)
- [ ] Viewport split logic
- [ ] Past section rendering
- [ ] Future section rendering
- [ ] Event dot positioning (past and future)
- [ ] Crosshair logic
- [ ] Snap-to-event logic
- [ ] Time range switching
- [ ] Settings popover
- [ ] Real-time price updates

**Key Features to Preserve** (ALL REQUIRED):
- [ ] Dual-section layout (60/40 split, customizable)
- [ ] Vertical divider line at split point
- [ ] Past section: price line with event dots
- [ ] Future section: timeline with upcoming catalysts
- [ ] Crosshair with snap-to-event
- [ ] Time range selector (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
- [ ] Settings popover (chart type, event types, etc.)
- [ ] Session-based coloring
- [ ] Previous close reference line
- [ ] Real-time price updates
- [ ] Price target projections
- [ ] Volume bars (for candlestick mode)
- [ ] Touch interactions
- [ ] Animations

### 4.2: Implementation Strategy

**Break into Sub-Components**:
1. PastPriceSection
2. FutureEventsSection
3. CrosshairOverlay
4. TimeRangeSelector
5. SettingsPopover

**Implementation Order**:
1. Main component structure
2. Viewport split calculation
3. Past section rendering
4. Future section rendering
5. Divider line
6. Event dots (past)
7. Event dots (future)
8. Crosshair interaction
9. Snap-to-event logic
10. Time range selector
11. Settings popover
12. Real-time updates
13. Animations

### 4.3: Implementation Checklist

**Main Component**:
- [ ] All props from web app present
- [ ] All state variables present
- [ ] All refs present
- [ ] Layout calculation correct
- [ ] Viewport split calculation matches web app
- [ ] onLayout handler implemented

**Past Section**:
- [ ] Price line rendered with Bezier smoothing
- [ ] Session-based coloring (pre-market, regular, after-hours)
- [ ] Previous close reference line
- [ ] Event dots positioned on data points
- [ ] Event dots use correct colors
- [ ] Event dots are tappable
- [ ] Time-based positioning for 1D
- [ ] Index-based positioning for 1W, 1M, 3M, YTD, 1Y
- [ ] Timestamp-based positioning for 5Y

**Future Section**:
- [ ] Timeline background rendered
- [ ] Future catalyst dots positioned correctly
- [ ] Vertical lines for each catalyst
- [ ] Event labels rendered
- [ ] Event dots are tappable
- [ ] Future window calculation matches web app
- [ ] Scales with viewport split

**Divider Line**:
- [ ] Positioned at exact split point
- [ ] Dashed line style
- [ ] Correct color
- [ ] Full height

**Crosshair**:
- [ ] Follows touch exactly
- [ ] Vertical line rendered
- [ ] Horizontal line rendered
- [ ] Dashed line style
- [ ] Correct color
- [ ] Shows price and timestamp
- [ ] Snaps to nearest data point in past section
- [ ] Snaps to nearest event when close enough
- [ ] Shows event details when snapped
- [ ] Works in both past and future sections
- [ ] Smooth animation

**Time Range Selector**:
- [ ] All ranges present (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
- [ ] Active range highlighted
- [ ] Tappable
- [ ] Triggers data reload
- [ ] Smooth transition

**Settings Popover**:
- [ ] Chart type toggle (line/candlestick)
- [ ] Show upcoming range toggle
- [ ] Show past events toggle
- [ ] Event type filters
- [ ] Viewport split slider
- [ ] All settings persist

**Real-time Updates**:
- [ ] WebSocket connection
- [ ] Price updates reflected immediately
- [ ] Current price dot moves
- [ ] Chart re-renders efficiently
- [ ] No memory leaks

### 4.4: Post-Implementation Verification

**Visual Comparison** (CRITICAL):
- [ ] Screenshot web app at 1D
- [ ] Screenshot native app at 1D
- [ ] Compare side-by-side
- [ ] Screenshot web app at 1W
- [ ] Screenshot native app at 1W
- [ ] Compare side-by-side
- [ ] Screenshot web app at 1M
- [ ] Screenshot native app at 1M
- [ ] Compare side-by-side
- [ ] Screenshot web app at 3M
- [ ] Screenshot native app at 3M
- [ ] Compare side-by-side
- [ ] Screenshot web app at YTD
- [ ] Screenshot native app at YTD
- [ ] Compare side-by-side
- [ ] Screenshot web app at 1Y
- [ ] Screenshot native app at 1Y
- [ ] Compare side-by-side
- [ ] Screenshot web app at 5Y
- [ ] Screenshot native app at 5Y
- [ ] Compare side-by-side
- [ ] Verify all match exactly

**Functional Testing**:
- [ ] Test dual-section layout
- [ ] Test viewport split adjustment
- [ ] Test past event dots
- [ ] Test future event dots
- [ ] Test crosshair in past section
- [ ] Test crosshair in future section
- [ ] Test snap-to-event
- [ ] Test time range switching
- [ ] Test settings popover
- [ ] Test chart type toggle
- [ ] Test event type filters
- [ ] Test real-time updates
- [ ] Test with empty data
- [ ] Test with single data point
- [ ] Test with pre-market data
- [ ] Test with after-hours data
- [ ] Test with weekend data
- [ ] Test with holiday data

**Performance Testing**:
- [ ] 60fps on pan gesture
- [ ] 60fps on time range switch
- [ ] No jank on scroll
- [ ] Memory usage < 50MB
- [ ] No memory leaks
- [ ] Efficient re-renders

**Edge Case Testing**:
- [ ] Empty data array
- [ ] Single data point
- [ ] No future catalysts
- [ ] No past events
- [ ] Very large dataset (1000+ points)
- [ ] Very small dataset (< 10 points)
- [ ] Missing previousClose
- [ ] Missing currentPrice
- [ ] Invalid timestamps
- [ ] Duplicate timestamps

---

## Step 5: Implement CandlestickChart Component

**Web App Source**: `src/components/charts/candlestick-chart.tsx`
**Native Target**: `catalyst-native/src/components/charts/CandlestickChart.tsx`

### 5.1: Pre-Implementation Analysis

**Read and Document**:
- [ ] Component props interface
- [ ] OHLC data structure
- [ ] Candle rendering logic
- [ ] Volume bar rendering
- [ ] Session-based coloring
- [ ] Touch interactions
- [ ] Aggregation logic (5min candles)

**Key Features to Preserve**:
- [ ] OHLC candle rendering
- [ ] Green candles (close >= open)
- [ ] Red candles (close < open)
- [ ] Wick rendering (high/low)
- [ ] Volume bars below candles
- [ ] Session-based coloring
- [ ] Touch to show OHLC details
- [ ] Zoom and pan
- [ ] Time labels

### 5.2: Implementation Checklist

- [ ] All props from web app present
- [ ] OHLC data structure matches
- [ ] Candle geometry calculation matches web app
- [ ] Candle width calculation matches web app
- [ ] Wick rendering correct
- [ ] Body rendering correct
- [ ] Colors match web app exactly
- [ ] Volume bars rendered
- [ ] Volume scaling correct
- [ ] Session coloring applied
- [ ] Touch interactions work
- [ ] OHLC details shown on touch
- [ ] Time labels rendered
- [ ] All edge cases handled

### 5.3: Post-Implementation Verification

**Visual Comparison**:
- [ ] Screenshot web app candlestick chart
- [ ] Screenshot native candlestick chart
- [ ] Compare side-by-side
- [ ] Verify candle sizes match
- [ ] Verify colors match
- [ ] Verify volume bars match

**Functional Testing**:
- [ ] Test with various OHLC data
- [ ] Test with high volatility
- [ ] Test with low volatility
- [ ] Test with gaps in data
- [ ] Test touch interactions
- [ ] Test zoom and pan

---

## Step 6: Implement PortfolioChart Component

**Web App Source**: `src/components/portfolio-chart.tsx`
**Native Target**: `catalyst-native/src/components/charts/PortfolioChart.tsx`

### 6.1: Pre-Implementation Analysis

**Read and Document**:
- [ ] Component props interface
- [ ] Portfolio value calculation
- [ ] Multiple ticker aggregation
- [ ] Future catalyst timeline
- [ ] Settings integration

**Key Features to Preserve**:
- [ ] Portfolio value calculation from holdings
- [ ] Multiple ticker price aggregation
- [ ] Day change calculation
- [ ] Future catalyst timeline
- [ ] All StockLineChart features
- [ ] Settings persistence

### 6.2: Implementation Checklist

- [ ] All props from web app present
- [ ] Portfolio calculation matches web app
- [ ] Multiple ticker aggregation correct
- [ ] Day change calculation correct
- [ ] Future catalysts aggregated correctly
- [ ] Uses StockLineChart component
- [ ] Settings persist with AsyncStorage
- [ ] All edge cases handled

### 6.3: Post-Implementation Verification

**Visual Comparison**:
- [ ] Screenshot web app portfolio chart
- [ ] Screenshot native portfolio chart
- [ ] Compare side-by-side

**Functional Testing**:
- [ ] Test with single ticker
- [ ] Test with multiple tickers
- [ ] Test with no holdings
- [ ] Test value calculation
- [ ] Test day change calculation
- [ ] Test future catalysts

---

## Step 7: Integration Testing

### 7.1: Component Integration

- [ ] MiniChart works in stock list
- [ ] StockLineChart works in stock detail
- [ ] CandlestickChart toggles correctly
- [ ] PortfolioChart works in portfolio screen
- [ ] All charts share utilities correctly
- [ ] No prop drilling issues
- [ ] Context integration works

### 7.2: Performance Testing

- [ ] Multiple MiniCharts on screen (stock list)
- [ ] Smooth scrolling with charts visible
- [ ] Chart switching is smooth
- [ ] Time range switching is smooth
- [ ] Real-time updates don't cause jank
- [ ] Memory usage acceptable with multiple charts
- [ ] No memory leaks

### 7.3: Device Testing

**iOS Testing**:
- [ ] iPhone 13 (6.1")
- [ ] iPhone 14 Pro (6.1")
- [ ] iPhone 15 Pro Max (6.7")
- [ ] iPad (10.2")
- [ ] iPad Pro (12.9")

**Android Testing**:
- [ ] Pixel 6 (6.4")
- [ ] Samsung Galaxy S21 (6.2")
- [ ] OnePlus 9 (6.55")
- [ ] Tablet (10")

### 7.4: Edge Case Testing

- [ ] Airplane mode (offline)
- [ ] Poor network connection
- [ ] Background/foreground transitions
- [ ] App restart with cached data
- [ ] Very old data
- [ ] Future dates
- [ ] Daylight saving time transitions
- [ ] Different timezones

---

## Step 8: Documentation

### 8.1: Implementation Notes

Create `CHART_IMPLEMENTATION_NOTES.md` with:
- [ ] Web app references
- [ ] Platform differences
- [ ] Exact matches confirmed
- [ ] Known issues (should be none)
- [ ] Testing results
- [ ] Performance metrics

### 8.2: API Documentation

Document all chart components:
- [ ] Props interfaces
- [ ] Usage examples
- [ ] Edge cases
- [ ] Performance considerations

---

## Final Verification

### ✅ Quality Control Checklist

Reference `QUALITY_CONTROL_MANDATE.md` and verify:

- [ ] NO simplifications made
- [ ] ALL features from web app present
- [ ] ALL edge cases handled
- [ ] Visual match is pixel-perfect
- [ ] Functional match is exact
- [ ] Performance is 60fps
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Documentation complete
- [ ] Tests passing

### ✅ Sign-Off

- [ ] Self-review complete
- [ ] Code review complete
- [ ] Visual review complete
- [ ] Functional review complete
- [ ] Performance review complete
- [ ] Ready for next phase

---

## Estimated Time

- **Step 1 (Utilities)**: 4-6 hours
- **Step 2 (Dependencies)**: 15 minutes
- **Step 3 (MiniChart)**: 3-4 hours
- **Step 4 (StockLineChart)**: 8-10 hours
- **Step 5 (CandlestickChart)**: 4-5 hours
- **Step 6 (PortfolioChart)**: 2-3 hours
- **Step 7 (Integration Testing)**: 2-3 hours
- **Step 8 (Documentation)**: 1-2 hours

**Total**: 24-33 hours of focused work

---

## Success Criteria

Phase 2 Week 4 is complete when:
- ✅ All utility files ported exactly
- ✅ All chart components implemented
- ✅ Visual match is 100%
- ✅ Functional match is 100%
- ✅ Performance is 60fps
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Ready for Phase 3

**DO NOT PROCEED TO PHASE 3 UNTIL ALL CRITERIA MET**
