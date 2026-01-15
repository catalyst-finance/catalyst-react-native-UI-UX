# StockDetailScreen Implementation Plan

## Overview
Building a complete stock detail screen matching the web app's stock-info-screen.tsx (~1000+ lines). This will be done in multiple sessions to ensure quality and completeness.

## Architecture
Based on web app analysis, the screen has 35+ files across multiple categories. We'll build the native equivalent systematically.

## Implementation Sessions

### Session 1: Foundation & Header (THIS SESSION)
**Files to Create:**
- `src/screens/StockDetailScreen.tsx` - Main screen component
- `src/components/stock/StockHeader.tsx` - Ticker, company name, back button

**Features:**
- Navigation setup (stack navigator for detail screen)
- Screen layout structure
- Header with back button
- Ticker badge
- Company name display
- Loading states

**Data Loading:**
- StockAPI.getStock(ticker) - Basic stock data
- Error handling
- Pull-to-refresh

### Session 2: Stock Chart Integration
**Files to Create:**
- Reuse existing `StockLineChart.tsx` component
- Add chart container with time range selector

**Features:**
- Full-width stock chart
- Time range buttons (1D, 1W, 1M, 3M, 6M, 1Y, ALL)
- Chart data loading from HistoricalPriceAPI
- Event dots integration
- Crosshair functionality
- Loading skeleton

### Session 3: Price & Stats Section
**Files to Create:**
- `src/components/stock/PriceDisplay.tsx` - Current price with change
- `src/components/stock/KeyStatistics.tsx` - Market cap, P/E, volume, etc.

**Features:**
- Animated price display
- Price change percentage
- Market cap
- P/E ratio
- 52-week high/low
- Volume
- Average volume
- Dividend yield
- Toggle between Statistics/Performance views

### Session 4: Events Timeline
**Files to Create:**
- `src/components/stock/EventsTimeline.tsx` - Vertical timeline
- `src/components/stock/EventCard.tsx` - Individual event cards

**Features:**
- Upcoming/Past toggle
- Vertical scrolling timeline
- Event type icons with colors
- Event filtering by type
- Quarter grouping
- Collapsible quarters
- Event click handling

### Session 5: Company Information
**Files to Create:**
- `src/components/stock/CompanyInfo.tsx` - Company details section

**Features:**
- Company logo
- Website link
- Industry
- Headquarters location
- Employee count
- IPO date
- Company description
- Expandable/collapsible

### Session 6: Ownership & Executives
**Files to Create:**
- `src/components/stock/CompanyOwnership.tsx` - Institutional holders
- `src/components/stock/CompanyExecutives.tsx` - Leadership team

**Features:**
- Top institutional investors
- Shares held and percentages
- Filing dates
- Expandable modal with full list
- Executive names and titles
- Board of directors
- Toggle between executives/board

### Session 7: Financials Section
**Files to Create:**
- `src/components/stock/FinancialsSection.tsx` - Financial metrics
- `src/components/stock/FinancialsModal.tsx` - Detailed financials modal

**Features:**
- Revenue
- Net income
- Profit margins
- P/E ratio
- EPS
- ROE
- Debt-to-equity
- Modal with full financial details

### Session 8: Polish & Integration
**Tasks:**
- Scroll-to-section functionality
- Deep linking support
- Performance optimization
- Error boundaries
- Loading skeletons
- Empty states
- Dark mode verification
- Navigation integration with HomeScreen

## Data Services Required
All already exist in native app:
- ✅ StockAPI.getStock(ticker)
- ✅ HistoricalPriceAPI.fetchHistoricalData(ticker, range)
- ✅ EventsAPI.getEventsByTicker(ticker)
- ✅ StockAPI.getCompanyOwnership(ticker, limit)
- ✅ StockAPI.getCompanyExecutives(ticker, limit)
- ✅ DataService.getFinancials(ticker)

## UI Components Needed
Most already exist:
- ✅ Card component
- ✅ Button component
- ✅ AnimatedPrice component
- ✅ StockLineChart component
- ⚠️ Modal component (need to create)
- ⚠️ Collapsible component (need to create)
- ⚠️ Badge component (need to enhance)

## Navigation Setup
Need to add stack navigator for detail screen:
```typescript
// In RootNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';

const HomeStack = createStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="StockDetail" component={StockDetailScreen} />
    </HomeStack.Navigator>
  );
}
```

## Design Tokens
All colors, spacing, typography already defined in:
- `src/constants/design-tokens.ts`
- Black, white, grey theme
- No blue colors

## Success Criteria
- ✅ Matches web app layout exactly
- ✅ All sections functional
- ✅ Smooth scrolling performance
- ✅ Proper data loading and error handling
- ✅ Dark mode support
- ✅ Navigation works from HomeScreen cards
- ✅ Deep linking support
- ✅ Pull-to-refresh
- ✅ Loading states for all async operations

## Estimated Complexity
- **Total Lines**: ~2000+ lines across all files
- **Sessions**: 8 sessions
- **Time**: 2-3 hours total
- **Difficulty**: High (complex layout, multiple data sources, interactions)

## Current Session: Session 1
Building foundation, navigation, and header component.
