# Expo Native Conversion - Completion Roadmap

## ⚠️ CRITICAL: READ FIRST
**BEFORE STARTING ANY WORK, READ: `QUALITY_CONTROL_MANDATE.md`**

**ZERO SIMPLIFICATIONS POLICY IN EFFECT**
- Every element must match web app EXACTLY
- Design must be pixel-perfect
- Functionality must be identical
- Performance must be 60fps
- All edge cases must be handled

---

## Current Status: 25% Complete
**Last Updated**: Phase 2 Week 4 in progress

## ✅ COMPLETED WORK

### Phase 1: Foundation (100% Complete)
- ✅ Expo project initialized with TypeScript
- ✅ All dependencies installed (React Navigation, Victory Native, Supabase, etc.)
- ✅ Folder structure created
- ✅ Metro bundler, Babel, Tailwind configured
- ✅ Design tokens ported (ALL colors, spacing, typography from web app)
- ✅ ThemeContext with light/dark mode + AsyncStorage persistence
- ✅ Gotham fonts installed and configured
- ✅ Navigation structure (bottom tabs) with 5 screens
- ✅ Base UI components (Button, Card, Input, Text, Badge, Switch)

### Phase 2 Week 3: UI Component Library (100% Complete)
- ✅ Modal component
- ✅ Dropdown component
- ✅ ScrollArea component
- ✅ Select component
- ✅ Slider component (@react-native-community/slider)
- ✅ Tabs component (TabsList, TabsTrigger, TabsContent)
- ✅ Tooltip component
- ✅ Accordion component (AccordionItem)
- ✅ Checkbox component
- ✅ Progress component
- ✅ Avatar component
- ✅ Switch component
- ✅ Separator component
- ✅ Component showcase screen for testing
- ✅ All components use StyleSheet (no className)
- ✅ All components reference design-tokens.ts

### Phase 2 Week 4: Charts (IN PROGRESS - 10% Complete)
- ✅ bezier-path-utils.ts ported (exact copy from web)
- ⏳ chart-time-utils.ts (needs porting)
- ⏳ chart-math-utils.ts (needs porting)
- ⏳ MiniChart component (simplified version created, needs full implementation)
- ⏳ StockLineChart component (simplified version created, needs full implementation)
- ❌ CandlestickChart component (not started)
- ❌ PortfolioChart component (not started)
- ❌ Dual-section layout (60/40 split past/future)
- ❌ Event dots rendering
- ❌ Crosshair interaction
- ❌ Session-based coloring (pre-market, regular, after-hours)
- ❌ Time range selector (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)

## 🔄 REMAINING WORK

### Phase 2 Week 4: Charts & Data Visualization (PRIORITY)

**Critical Requirements**:
1. **NO SIMPLIFICATIONS** - Must match web app exactly
2. **Dual-section design** - 60% past, 40% future with divider line
3. **Victory Native + react-native-svg** hybrid approach
4. **Full touch interactions** with gesture handlers

**Files to Port** (in order):
1. `src/utils/chart-time-utils.ts` → `catalyst-native/src/utils/chart-time-utils.ts`
   - 800+ lines of time calculation logic
   - Market hours bounds
   - Session detection (pre-market, regular, after-hours)
   - X position calculations (intraday vs multi-day)
   - Time label generation

2. `src/utils/chart-math-utils.ts` → `catalyst-native/src/utils/chart-math-utils.ts`
   - 600+ lines of math utilities
   - Price range calculations
   - Volume scaling
   - Candlestick geometry
   - Data aggregation (5min candles)

3. `src/components/charts/mini-chart.tsx` → `catalyst-native/src/components/charts/MiniChart.tsx`
   - Replace simplified version with full implementation
   - Session-based path generation
   - Catalyst dots rendering
   - Previous close reference line
   - Current price indicator

4. `src/components/charts/stock-line-chart.tsx` → `catalyst-native/src/components/charts/StockLineChart.tsx`
   - 2000+ lines - most complex component
   - Dual-section layout with viewport split
   - Past section: price line with event dots
   - Future section: timeline with upcoming catalysts
   - Crosshair with snap-to-event
   - Time range selector
   - Settings popover
   - Real-time price updates

5. `src/components/charts/candlestick-chart.tsx` → `catalyst-native/src/components/charts/CandlestickChart.tsx`
   - OHLC candle rendering
   - Volume bars
   - Session coloring
   - Touch interactions

6. `src/components/portfolio-chart.tsx` → `catalyst-native/src/components/charts/PortfolioChart.tsx`
   - Portfolio value calculation
   - Multiple ticker aggregation
   - Future catalyst timeline

**Implementation Strategy**:
```typescript
// Use Victory Native for base chart
import { VictoryChart, VictoryLine, VictoryAxis, VictoryArea } from 'victory-native';

// Use react-native-svg for custom elements
import Svg, { Path, Circle, Line, G, Text as SvgText, Rect } from 'react-native-svg';

// Use gesture handlers for interactions
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler } from 'react-native-reanimated';

// Structure:
<View>
  <Svg>
    {/* Past section (0 to splitPosition) */}
    <VictoryChart domain={{ x: [0, splitPosition] }}>
      <VictoryArea data={pastData} />
    </VictoryChart>
    
    {/* Past event dots */}
    {pastEvents.map(event => (
      <Circle cx={eventX} cy={eventY} r={6} fill={eventColor} />
    ))}
    
    {/* Divider line */}
    <Line x1={splitPosition} y1={0} x2={splitPosition} y2={height} />
    
    {/* Future section (splitPosition to width) */}
    {futureCatalysts.map(catalyst => (
      <G>
        <Line x1={eventX} y1={0} x2={eventX} y2={height} strokeDasharray="4,4" />
        <Circle cx={eventX} cy={height/2} r={8} fill={eventColor} />
      </G>
    ))}
    
    {/* Crosshair overlay */}
    <PanGestureHandler onGestureEvent={handleGesture}>
      <Animated.View style={StyleSheet.absoluteFill} />
    </PanGestureHandler>
  </Svg>
</View>
```

### Phase 3: Data Layer (Weeks 5-6) - NOT STARTED

**Week 5: Services & API Integration**
Files to port:
1. `src/utils/data-service.ts` → `catalyst-native/src/services/DataService.ts`
   - Replace localStorage with AsyncStorage
   - Add offline caching
   - Network state detection

2. `src/utils/events-service.ts` → `catalyst-native/src/services/EventsService.ts`
   - Catalyst events fetching
   - Event filtering and sorting

3. `src/utils/realtime-price-service.ts` → `catalyst-native/src/services/RealtimePriceService.ts`
   - WebSocket connection for live prices
   - Reconnection logic
   - Background updates

4. `src/utils/historical-price-service.ts` → `catalyst-native/src/services/HistoricalPriceService.ts`
   - Historical price data fetching
   - Caching strategy
   - Time range handling

5. `src/utils/supabase/*` → `catalyst-native/src/services/supabase/*`
   - Supabase client setup
   - Secure storage for tokens (not AsyncStorage - use expo-secure-store)
   - Auth integration

**Week 6: Context & State Management**
Files to port:
1. Update `src/contexts/ThemeContext.tsx`
   - Integrate with React Native Appearance API
   - System theme detection

2. Create `src/contexts/AuthContext.tsx`
   - Port from web app
   - Add biometric authentication (expo-local-authentication)
   - Secure token storage

3. Create `src/contexts/DataContext.tsx`
   - Global state for stock data
   - Real-time updates
   - Offline support

4. App state handling
   - Foreground/background transitions
   - Background fetch setup
   - Push notification handling

### Phase 4: Screens (Weeks 7-8) - NOT STARTED

**Week 7: Main Screens**
1. `src/screens/HomeScreen.tsx` (Timeline)
   - Stock list with drag-to-reorder (react-native-draggable-flatlist)
   - Event timeline
   - Portfolio chart integration
   - Pull-to-refresh
   - Real-time price updates

2. `src/screens/CopilotScreen.tsx`
   - Chat interface with FlatList
   - Markdown rendering (react-native-markdown-display)
   - Streaming messages
   - Keyboard handling (KeyboardAvoidingView)
   - Message input with auto-grow

3. `src/screens/DiscoverScreen.tsx`
   - Search with autocomplete
   - Trending catalysts
   - Sector trends
   - Horizontal scrolling sections

4. `src/screens/ProfileScreen.tsx`
   - Settings list
   - Theme toggle
   - Account management
   - Logout functionality

**Week 8: Sub-Screens**
1. Stock Info Screen (modal/stack navigator)
   - Stock chart with timeframes
   - Company info
   - Events timeline
   - Financials tabs

2. Portfolio Screen
   - Portfolio chart
   - Position list
   - Plaid integration (react-native-plaid-link-sdk)
   - Manual entry form

3. Event Analysis Screen
   - Event details
   - Related stocks
   - Historical impact

4. Onboarding Screen
   - Welcome slides (react-native-swiper)
   - Feature highlights
   - Account setup

5. Settings screens
   - Notifications
   - Appearance
   - Data & Privacy
   - About

### Phase 5: Features (Weeks 9-10) - NOT STARTED

**Week 9: Advanced Features**
1. Drag-and-drop stock reordering
   - react-native-draggable-flatlist
   - Haptic feedback on drag

2. Haptic feedback throughout app
   - expo-haptics
   - Feedback on button presses, swipes, etc.

3. Share functionality
   - expo-sharing
   - Share charts, events, stocks

4. Push notifications
   - expo-notifications
   - Price alerts
   - Event notifications
   - Background notification handling

5. Biometric authentication
   - expo-local-authentication
   - Face ID / Touch ID
   - Fallback to PIN

6. App shortcuts (iOS/Android)
   - Quick actions from home screen
   - Deep linking

7. Widgets (iOS/Android)
   - Portfolio widget
   - Watchlist widget
   - Event timeline widget

**Week 10: Polish & Optimization**
1. Performance profiling
   - React DevTools Profiler
   - Flipper integration
   - Identify bottlenecks

2. Memory leak detection
   - Flipper memory profiler
   - Fix leaks in subscriptions, timers

3. Image optimization
   - expo-image for caching
   - Optimize asset sizes

4. Bundle size optimization
   - Analyze bundle with metro-visualizer
   - Code splitting where possible

5. Accessibility improvements
   - Screen reader support
   - Proper labels and hints
   - Color contrast checks

6. Error handling & logging
   - Sentry integration
   - Error boundaries
   - Crash reporting

7. Analytics integration
   - expo-firebase-analytics or similar
   - Track user flows
   - Performance metrics

### Phase 6: Testing & Launch (Weeks 11-12) - NOT STARTED

**Week 11: Testing**
1. Unit tests
   - Jest for services
   - Test utilities
   - Mock data

2. Integration tests
   - Testing Library for React Native
   - Screen interactions
   - Navigation flows

3. E2E tests
   - Detox setup
   - Critical user flows
   - Regression tests

4. Device testing
   - iOS: iPhone 13, 14, 15 (various sizes)
   - Android: Pixel, Samsung (various sizes)
   - Tablets: iPad, Android tablets

5. Offline mode testing
   - Airplane mode
   - Poor network conditions
   - Data persistence

6. Push notification testing
   - Foreground notifications
   - Background notifications
   - Notification actions

**Week 12: App Store Preparation**
1. App icons
   - iOS: All required sizes
   - Android: All required sizes
   - Adaptive icons for Android

2. Splash screens
   - iOS launch screens
   - Android splash screen

3. App store listings
   - Description (App Store & Play Store)
   - Keywords
   - Screenshots (all device sizes)
   - Preview video

4. App signing
   - iOS: Certificates, provisioning profiles
   - Android: Keystore setup

5. Build production releases
   - iOS: ipa file
   - Android: aab file

6. Submit to stores
   - TestFlight (iOS beta)
   - Google Play Beta
   - App Store review
   - Play Store review

## CRITICAL NOTES

### DO NOT SIMPLIFY
- Every utility function must be ported exactly
- Every calculation must match web app
- Every interaction must feel identical
- Visual appearance must be 100% match

### Key Dependencies Still Needed
```bash
# Charts
npm install react-native-svg
npm install react-native-gesture-handler
npm install react-native-reanimated

# Services
npm install @react-native-async-storage/async-storage
npm install expo-secure-store
npm install @supabase/supabase-js

# Features
npm install react-native-draggable-flatlist
npm install expo-haptics
npm install expo-notifications
npm install expo-local-authentication
npm install expo-sharing
npm install react-native-markdown-display
npm install react-native-plaid-link-sdk

# Testing
npm install --save-dev @testing-library/react-native
npm install --save-dev detox
```

### File Structure Reference
```
catalyst-native/
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   ├── MiniChart.tsx (needs full implementation)
│   │   │   ├── StockLineChart.tsx (needs full implementation)
│   │   │   ├── CandlestickChart.tsx (not started)
│   │   │   ├── PortfolioChart.tsx (not started)
│   │   │   └── index.ts
│   │   └── ui/ (✅ complete)
│   ├── contexts/
│   │   ├── ThemeContext.tsx (✅ complete, needs Appearance API)
│   │   ├── AuthContext.tsx (not started)
│   │   └── DataContext.tsx (not started)
│   ├── navigation/
│   │   └── RootNavigator.tsx (✅ complete)
│   ├── screens/
│   │   ├── HomeScreen.tsx (scaffold only)
│   │   ├── CopilotScreen.tsx (scaffold only)
│   │   ├── DiscoverScreen.tsx (scaffold only)
│   │   ├── ProfileScreen.tsx (scaffold only)
│   │   └── ComponentShowcaseScreen.tsx (✅ complete)
│   ├── services/
│   │   ├── DataService.ts (not started)
│   │   ├── EventsService.ts (not started)
│   │   ├── RealtimePriceService.ts (not started)
│   │   ├── HistoricalPriceService.ts (not started)
│   │   └── supabase/ (not started)
│   ├── utils/
│   │   ├── bezier-path-utils.ts (✅ complete)
│   │   ├── chart-time-utils.ts (not started)
│   │   ├── chart-math-utils.ts (not started)
│   │   └── fonts.ts (✅ complete)
│   └── constants/
│       └── design-tokens.ts (✅ complete)
```

## NEXT STEPS (When You Wake Up)

1. **Complete Phase 2 Week 4 Charts** (HIGHEST PRIORITY)
   - Port chart-time-utils.ts (copy entire file)
   - Port chart-math-utils.ts (copy entire file)
   - Rewrite MiniChart.tsx with full implementation
   - Rewrite StockLineChart.tsx with dual-section layout
   - Create CandlestickChart.tsx
   - Create PortfolioChart.tsx
   - Test all charts on device

2. **Start Phase 3 Data Layer**
   - Port all services
   - Set up Supabase client
   - Implement offline caching
   - Add real-time updates

3. **Continue with Phases 4, 5, 6**
   - Follow roadmap systematically
   - Test continuously
   - No shortcuts

## ESTIMATED TIME REMAINING
- Phase 2 Week 4: 16-20 hours
- Phase 3: 20-24 hours
- Phase 4: 24-30 hours
- Phase 5: 16-20 hours
- Phase 6: 12-16 hours

**Total**: 88-110 hours of focused development

## SUCCESS CRITERIA
✅ 100% feature parity with web app
✅ 100% visual match with web app
✅ 60fps performance on all interactions
✅ Works offline
✅ Real-time updates functional
✅ All charts render correctly
✅ Touch interactions feel native
✅ No crashes or memory leaks
✅ Passes all tests
✅ Ready for App Store submission
