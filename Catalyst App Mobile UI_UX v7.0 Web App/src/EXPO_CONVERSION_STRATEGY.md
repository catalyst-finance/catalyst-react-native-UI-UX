# Expo/React Native iOS Conversion Strategy

This document outlines the strategy for converting the Catalyst web app to a native iOS app using Expo and React Native.

## Current Architecture Analysis

### Core Technologies (Web)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts (SVG-based)
- **Backend**: Supabase (Edge Functions, Auth, Storage, Postgres)
- **State Management**: React hooks (useState, useEffect, useContext)
- **Real-time**: WebSocket/SSE for live prices and chat streaming

### Key Dependencies That Need Alternatives

| Web Library | React Native Alternative | Notes |
|------------|-------------------------|-------|
| Recharts | Victory Native / react-native-svg-charts | Complete rewrite of all chart components |
| Tailwind CSS | NativeWind | Requires restructuring stylesheets |
| lucide-react | @expo/vector-icons or react-native-vector-icons | Icon mapping needed |
| motion/react (Framer Motion) | react-native-reanimated | Animation API is different |
| Sonner (toast) | react-native-toast-message | Different API |
| HTML elements (div, span) | React Native primitives (View, Text) | Every component needs conversion |

## Recommended Approach: Preparation Phase

### Phase 1: Separate Business Logic from UI (Do This Now)

#### 1.1 Create Platform-Agnostic Service Layer

All data fetching and business logic should be extracted into standalone services:

```
/shared/
  /services/
    - portfolio.service.ts      (portfolio calculations)
    - stocks.service.ts          (stock data fetching)
    - events.service.ts          (catalyst events)
    - auth.service.ts            (authentication logic)
    - realtime.service.ts        (WebSocket/price updates)
  /hooks/
    - usePortfolio.ts            (portfolio state management)
    - useStockData.ts            (stock data hooks)
    - useMarketStatus.ts         (market status logic)
  /utils/
    - calculations.ts            (math utilities)
    - formatting.ts              (already exists - good!)
    - validators.ts              (input validation)
  /types/
    - index.ts                   (all TypeScript types)
```

**Action Items:**
1. Move all API calls from components into service files
2. Extract hooks that don't depend on DOM APIs
3. Consolidate all TypeScript types into `/shared/types/`

#### 1.2 Create Design System Abstraction

Create a platform-agnostic design system that can be implemented differently for web and native:

```
/shared/
  /design-system/
    - tokens.ts                  (colors, spacing, typography)
    - primitives.ts              (abstract Button, Card, Text components)
```

Example:
```typescript
// tokens.ts
export const colors = {
  primary: '#030213',
  background: '#ffffff',
  // ... all design tokens
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};
```

#### 1.3 Document All External Dependencies

**Already using (compatible with React Native):**
- ✅ Supabase (works with React Native)
- ✅ React hooks
- ✅ TypeScript

**Need replacement:**
- ❌ Recharts → Victory Native or custom SVG
- ❌ Tailwind CSS → NativeWind
- ❌ Framer Motion → Reanimated 2
- ❌ DOM APIs (document, window) → React Native APIs

### Phase 2: Chart Abstraction (Critical)

Charts are the most complex part of this app. Create an abstraction layer:

```
/shared/
  /charts/
    - types.ts                   (ChartData, ChartConfig interfaces)
    - transformers.ts            (data transformation logic)
    - calculators.ts             (chart calculations - already have some)
    
/components/charts/
  /web/
    - WebLineChart.tsx           (current Recharts implementation)
    - WebCandlestickChart.tsx
  /native/  (create later)
    - NativeLineChart.tsx        (Victory Native implementation)
    - NativeCandlestickChart.tsx
  - ChartFactory.tsx             (returns platform-specific chart)
```

**Action Items:**
1. Extract all chart data transformation logic into pure functions
2. Separate rendering logic from calculation logic
3. Create interfaces for chart props that work across platforms

### Phase 3: Component Structure

Organize components by platform:

```
/components/
  /shared/                       (components with no DOM deps)
    - StockCard.tsx
    - EventBadge.tsx
  /web/                          (web-specific implementations)
    - PortfolioScreen.web.tsx
    - ChartScreen.web.tsx
  /native/                       (create during conversion)
    - PortfolioScreen.native.tsx
    - ChartScreen.native.tsx
  - PortfolioScreen.tsx          (exports platform-specific version)
```

Use platform extensions:
```typescript
// PortfolioScreen.tsx
export { default } from './PortfolioScreen.web'; // or .native during build
```

## Phase 4: Conversion Execution Plan

### Step 1: Setup Expo Project (Separate from web app initially)

```bash
npx create-expo-app catalyst-native --template blank-typescript
cd catalyst-native
```

Install dependencies:
```bash
npx expo install @supabase/supabase-js
npx expo install react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage
npx expo install nativewind
npx expo install react-native-reanimated
npx expo install victory-native react-native-svg
```

### Step 2: Copy Shared Code

1. Copy `/shared/` directory (business logic)
2. Copy `/utils/` directory (non-DOM utilities)
3. Copy `/types/` directory
4. Adapt Supabase client for React Native

### Step 3: Rebuild UI with React Native Components

Priority order:
1. **Authentication screens** (simplest)
2. **Portfolio list view** (no charts)
3. **Stock detail screen** (with simplified chart)
4. **Full chart implementation** (most complex)
5. **Catalyst Copilot** (chat interface)

### Step 4: Chart Migration Strategy

**Option A: Victory Native** (Recommended)
- Similar API to Recharts
- Good performance
- Requires rewriting chart components

**Option B: react-native-svg + custom**
- More control
- More work
- Better performance potential

**Option C: WebView fallback** (temporary)
- Quick solution
- Not native feeling
- Use during transition

## Immediate Action Items (Do Today)

### 1. Refactor Data Services

Move all API calls out of components:

**Before:**
```typescript
// In component
const fetchStockData = async () => {
  const response = await fetch(`/api/stocks/${ticker}`);
  const data = await response.json();
  setStockData(data);
};
```

**After:**
```typescript
// services/stocks.service.ts
export async function fetchStockData(ticker: string) {
  const response = await fetch(`/api/stocks/${ticker}`);
  return response.json();
}

// In component
import { fetchStockData } from '@/services/stocks.service';
const data = await fetchStockData(ticker);
```

### 2. Extract Chart Calculations

Move calculation logic out of chart components:

**Create:** `/utils/chart-calculations.ts`
```typescript
export function calculateMovingAverage(data: PricePoint[], period: number) {
  // Pure function, no DOM dependencies
}

export function calculateCandlesticks(data: PricePoint[]) {
  // Pure function
}

export function formatChartData(rawData: any[]) {
  // Pure function
}
```

### 3. Create Design Tokens File

**Create:** `/shared/design-system/tokens.ts`
```typescript
export const designTokens = {
  colors: {
    primary: '#030213',
    background: '#ffffff',
    // ... extract from globals.css
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    // ...
  },
  typography: {
    fontFamily: 'Gotham',
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      // ...
    }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  }
};
```

### 4. Document Component Dependencies

Create a component inventory:

**Create:** `/COMPONENT_INVENTORY.md`

List every component and its dependencies:
- DOM APIs used
- Third-party libraries
- Animation requirements
- Chart usage
- Complex interactions

## Long-term Strategy

### Monorepo Approach (Best Practice)

Use a monorepo to share code between web and native:

```
/packages/
  /mobile/           (Expo app)
  /web/              (Current web app)
  /shared/           (Shared business logic)
```

Tools: Yarn workspaces, npm workspaces, or Turborepo

### Code Sharing Estimate

**Reusable (~40%):**
- Business logic
- Data services
- Utilities (non-DOM)
- Type definitions
- Supabase integration

**Needs adaptation (~20%):**
- Hooks (some DOM-dependent)
- Context providers
- Navigation

**Must rewrite (~40%):**
- All UI components
- All charts
- Animations
- Layout components

## Critical Considerations

### 1. Charts Are Your Biggest Challenge

The app is heavily chart-focused. Budget significant time for:
- Learning Victory Native or similar
- Recreating all chart interactions
- Touch gesture handling (different from mouse)
- Performance optimization for real-time updates

### 2. Real-time Data

React Native handles WebSockets well, but test thoroughly:
- Background app state
- Network changes
- Memory management

### 3. Performance

Native apps require different optimization strategies:
- FlatList instead of map() for long lists
- Memoization is critical
- Image optimization
- Reduce re-renders

### 4. Platform-Specific Features

Take advantage of iOS-specific features:
- Face ID / Touch ID for auth
- Native navigation (react-navigation)
- Haptic feedback
- Share sheet
- Deep linking

## Recommended Timeline

**Phase 1: Preparation** (1-2 weeks)
- Refactor business logic
- Extract services
- Create design tokens
- Document dependencies

**Phase 2: Expo Setup** (1 week)
- Set up Expo project
- Configure Supabase for React Native
- Test basic authentication

**Phase 3: Core UI** (2-3 weeks)
- Auth screens
- Portfolio list
- Stock detail (without charts)
- Navigation

**Phase 4: Charts** (3-4 weeks)
- Learn Victory Native
- Implement line chart
- Implement candlestick chart
- Add interactions

**Phase 5: Advanced Features** (2-3 weeks)
- Catalyst Copilot
- Real-time updates
- Animations
- Polish

**Total: 9-13 weeks** for full-featured native app

## Resources

### Learning
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Victory Native Docs](https://commerce.nearform.com/open-source/victory-native/)
- [NativeWind Docs](https://www.nativewind.dev/)

### Tools
- [Expo Snack](https://snack.expo.dev/) - Test components in browser
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/) - Debugging tool

## Next Steps

1. **Today**: Create `/shared/services/` directory and start moving API calls
2. **This week**: Extract chart calculations into pure functions
3. **Next week**: Set up proof-of-concept Expo project
4. **Month 1**: Complete preparation phase with refactored web app
5. **Month 2-3**: Execute conversion

## Questions to Answer

- [ ] Do you want a monorepo or separate repos?
- [ ] Will you maintain both web and native versions?
- [ ] What's the minimum viable feature set for v1 native app?
- [ ] Which chart library feels best after testing?
- [ ] Do you need Android support or iOS only?

---

**Status**: Preparation phase recommended before starting Expo conversion
**Last Updated**: January 2025
