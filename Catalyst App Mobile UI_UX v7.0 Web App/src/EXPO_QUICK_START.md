# React Native / Expo Conversion - Quick Start

This document provides immediate action items to prepare the codebase for native conversion.

## ✅ What We've Done

### 1. Created Shared Infrastructure
- **`/shared/design-system/tokens.ts`** - Platform-agnostic design tokens
- **`/shared/types/chart.types.ts`** - Universal chart type definitions  
- **`/shared/utils/chart-calculations.ts`** - Pure calculation functions

### 2. Documented Strategy
- **`/EXPO_CONVERSION_STRATEGY.md`** - Complete conversion roadmap

## 🚀 Immediate Next Steps (Priority Order)

### Step 1: Create Services Directory (Do First)
Move all API calls and data fetching out of components:

```bash
mkdir -p shared/services
```

Create these service files:

#### `shared/services/stocks.service.ts`
```typescript
/**
 * All stock data fetching logic
 * Platform-agnostic - works in web and native
 */

export async function fetchStockPrice(ticker: string) {
  // Move logic from components here
}

export async function fetchHistoricalData(ticker: string, range: string) {
  // Move logic from components here
}

export async function fetchIntradayData(ticker: string) {
  // Move logic from components here  
}
```

#### `shared/services/portfolio.service.ts`
```typescript
/**
 * Portfolio calculations and data management
 */

export function calculatePortfolioValue(positions: Position[]) {
  // Pure calculation logic
}

export function calculatePortfolioChange(/* ... */) {
  // Pure calculation logic
}
```

#### `shared/services/events.service.ts`
```typescript
/**
 * Catalyst events fetching and filtering
 */

export async function fetchUpcomingEvents(ticker: string) {
  // Move from components
}

export async function fetchPastEvents(ticker: string) {
  // Move from components
}

export function filterEventsByType(events: Event[], types: string[]) {
  // Pure filtering logic
}
```

### Step 2: Refactor Components to Use Services

**Before:**
```typescript
// components/stock-chart.tsx
const fetchData = async () => {
  const response = await fetch(`/api/stocks/${ticker}`);
  const data = await response.json();
  setStockData(data);
};
```

**After:**
```typescript
// components/stock-chart.tsx
import { fetchStockPrice } from '@/shared/services/stocks.service';

const fetchData = async () => {
  const data = await fetchStockPrice(ticker);
  setStockData(data);
};
```

### Step 3: Extract More Chart Logic

Move logic from `/components/charts/stock-line-chart.tsx` and `/components/charts/candlestick-chart.tsx`:

- Data transformation functions → `/shared/utils/chart-calculations.ts`
- Type definitions → `/shared/types/chart.types.ts`
- Keep only rendering logic in components

### Step 4: Create Platform-Agnostic Hooks

Create `/shared/hooks/` directory:

```typescript
// shared/hooks/useStockData.ts
export function useStockData(ticker: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Use service
    fetchStockPrice(ticker).then(setData);
  }, [ticker]);
  
  return { data, loading };
}
```

## 📋 Refactoring Checklist

- [ ] Create `/shared/services/` directory
- [ ] Move stock API calls to `stocks.service.ts`
- [ ] Move portfolio logic to `portfolio.service.ts`  
- [ ] Move events logic to `events.service.ts`
- [ ] Extract Supabase calls to dedicated service
- [ ] Create platform-agnostic hooks in `/shared/hooks/`
- [ ] Move all chart calculations to `/shared/utils/`
- [ ] Extract event type configuration to `/shared/config/`
- [ ] Document all components' dependencies in `/COMPONENT_INVENTORY.md`

## 🎯 Goal

**40-50% of code should be reusable** between web and native after refactoring.

## 🔍 What Stays Web-Specific

These will need native rewrites:
- All JSX/HTML (div, span → View, Text)
- Recharts components
- Tailwind classes (use NativeWind later)
- Framer Motion animations
- DOM event handlers

## 📦 File Organization Target

```
/
├── web/                          # Web-specific code (after refactor)
│   ├── components/
│   └── pages/
├── shared/                       # ✅ Platform-agnostic (NEW)
│   ├── services/                 # ✅ Data fetching
│   ├── hooks/                    # ✅ Business logic hooks
│   ├── utils/                    # ✅ Pure functions
│   ├── types/                    # ✅ TypeScript types
│   ├── config/                   # ✅ Configuration
│   └── design-system/            # ✅ Design tokens
├── native/                       # Native code (create later)
│   └── (Expo project)
└── components/                   # Current components (refactor gradually)
```

## 🛠️ Tools You'll Need (Later)

When ready for native development:

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Create new Expo project
npx create-expo-app catalyst-native --template blank-typescript

# Install dependencies
cd catalyst-native
npx expo install @supabase/supabase-js
npx expo install react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage
npx expo install nativewind
npx expo install victory-native react-native-svg
npx expo install react-native-reanimated
```

## 📚 Key Resources

- [Expo Docs](https://docs.expo.dev/)
- [Victory Native](https://commerce.nearform.com/open-source/victory-native/)
- [NativeWind](https://www.nativewind.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)

## ⚠️ Important Notes

1. **Don't break the web app** - Keep it working while refactoring
2. **Test after each refactor** - Ensure functionality remains intact
3. **Start small** - Refactor one service at a time
4. **Document dependencies** - Note which npm packages are web-only
5. **Ask questions** - Native development has different patterns

## 📞 Getting Help

Common questions during conversion:
- "This library doesn't work in React Native" → Check EXPO_CONVERSION_STRATEGY.md for alternatives
- "How do I style this in native?" → Use NativeWind or StyleSheet (similar to CSS-in-JS)
- "Charts aren't working" → Victory Native has different API, see examples
- "Navigation is different" → React Navigation is the standard (like React Router)

---

**Current Status**: ✅ Foundation created, ready for service extraction
**Next Action**: Create service files and move API logic
**Timeline**: 1-2 weeks for preparation phase
