# Design Document

## Overview

This design document outlines the architecture and implementation approach for converting the Catalyst App from a React web application to a native iOS and Android mobile application using Expo and React Native. The conversion will maintain 100% feature parity while leveraging native mobile capabilities and optimizing for mobile user experience.

### Conversion Strategy

The conversion follows a **hybrid refactor-and-rebuild** approach:

1. **Phase 1: Refactoring** - Extract platform-agnostic business logic, services, and utilities from the existing web codebase
2. **Phase 2: Setup** - Create Expo project with proper configuration and dependencies
3. **Phase 3: Rebuild UI** - Recreate all UI components using React Native primitives and libraries
4. **Phase 4: Integration** - Connect rebuilt UI to refactored business logic
5. **Phase 5: Testing** - Comprehensive testing of all features on both platforms

### Code Reusability Target

- **40-50% reusable**: Business logic, data services, utilities, type definitions
- **20-30% adaptable**: Hooks, context providers, navigation logic
- **30-40% rebuild**: All UI components, charts, animations, styling

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Application                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Native UI Layer                      │ │
│  │  (Screens, Components, Navigation, Styling)            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Platform-Agnostic Business Logic               │ │
│  │  (Services, Hooks, Utils, State Management)            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Supabase Backend                          │ │
│  │  (Auth, Database, Real-time, Edge Functions)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
expo-catalyst-app/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx             # Home/Timeline
│   │   ├── copilot.tsx           # AI Copilot
│   │   ├── discover.tsx          # Search/Discovery
│   │   └── profile.tsx           # User Profile
│   ├── stock/[ticker].tsx        # Stock detail screen
│   ├── event/[id].tsx            # Event analysis screen
│   └── _layout.tsx               # Root layout
├── components/                   # React Native components
│   ├── charts/                   # Victory Native charts
│   ├── ui/                       # Base UI components
│   └── screens/                  # Screen-specific components
├── shared/                       # Platform-agnostic code
│   ├── services/                 # Data fetching services
│   ├── hooks/                    # Custom hooks
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript types
│   └── design-system/            # Design tokens
├── assets/                       # Images, fonts, icons
└── config/                       # App configuration
```

### Technology Stack

**Core Framework:**
- Expo SDK 52+
- React Native 0.76+
- TypeScript 5.0+

**Navigation:**
- Expo Router (file-based routing)
- React Navigation (underlying)

**Styling:**
- NativeWind 4.0+ (Tailwind for React Native)
- React Native StyleSheet (for complex styles)

**Charts:**
- Victory Native (Recharts equivalent)
- react-native-svg (SVG rendering)

**State Management:**
- React Context API
- React hooks (useState, useEffect, useReducer)
- AsyncStorage (persistent storage)

**Backend:**
- Supabase JS Client
- WebSocket (real-time prices)
- Server-Sent Events (AI streaming)

**UI Components:**
- Custom components (replacing Radix UI)
- React Native Paper (optional, for complex components)
- React Native Gesture Handler
- React Native Reanimated 3

**Additional Libraries:**
- react-native-plaid-link-sdk (Plaid integration)
- expo-notifications (push notifications)
- expo-secure-store (secure token storage)
- expo-haptics (haptic feedback)
- react-native-fast-image (optimized images)

## Components and Interfaces

### Service Layer (Platform-Agnostic)

#### StockService
```typescript
// shared/services/stock.service.ts
export class StockService {
  static async getStock(ticker: string): Promise<StockData | null>
  static async getStocks(tickers: string[]): Promise<Record<string, StockData>>
  static async searchStocks(query: string, limit?: number): Promise<StockData[]>
  static async getHistoricalPrices(ticker: string, timeframe: string, days: number): Promise<PricePoint[]>
}
```

#### EventsService
```typescript
// shared/services/events.service.ts
export class EventsService {
  static async getEventsByTicker(ticker: string): Promise<MarketEvent[]>
  static async getEventsByTickers(tickers: string[]): Promise<MarketEvent[]>
  static async getUpcomingEvents(limit?: number): Promise<MarketEvent[]>
  static async searchEvents(query: string): Promise<MarketEvent[]>
}
```

#### AuthService
```typescript
// shared/services/auth.service.ts
export class AuthService {
  static async signIn(email: string, password: string): Promise<AuthResult>
  static async signUp(email: string, password: string, name?: string): Promise<AuthResult>
  static async signOut(): Promise<void>
  static async getCurrentUser(): Promise<User | null>
  static async refreshSession(): Promise<Session | null>
}
```

#### PortfolioService
```typescript
// shared/services/portfolio.service.ts
export class PortfolioService {
  static async getPositions(userId: string): Promise<Position[]>
  static async addManualPosition(position: ManualPosition): Promise<void>
  static async removePosition(positionId: string): Promise<void>
  static async connectPlaidAccount(publicToken: string): Promise<PlaidConnection>
  static async disconnectPlaidAccount(connectionId: string): Promise<void>
  static calculatePortfolioValue(positions: Position[]): number
  static calculatePortfolioChange(positions: Position[]): { change: number; changePercent: number }
}
```

#### RealtimeService
```typescript
// shared/services/realtime.service.ts
export class RealtimeService {
  static subscribe(ticker: string, callback: (update: PriceUpdate) => void): () => void
  static unsubscribe(ticker: string): void
  static connect(): void
  static disconnect(): void
  static getConnectionStatus(): 'connected' | 'disconnected' | 'connecting'
}
```

### UI Components (React Native)

#### Navigation Structure
```typescript
// app/_layout.tsx
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="stock/[ticker]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="event/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  )
}

// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Timeline' }} />
      <Tabs.Screen name="copilot" options={{ title: 'Copilot' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
```

#### Base UI Components
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  onPress: () => void
  title: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

// components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode
  onPress?: () => void
  style?: ViewStyle
}

// components/ui/Badge.tsx
interface BadgeProps {
  text: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  onPress?: () => void
}
```

#### Chart Components
```typescript
// components/charts/StockLineChart.tsx
interface StockLineChartProps {
  data: PricePoint[]
  width: number
  height: number
  previousClose: number | null
  currentPrice: number
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  events?: MarketEvent[]
  onEventPress?: (event: MarketEvent) => void
}

// components/charts/CandlestickChart.tsx
interface CandlestickChartProps {
  data: CandlestickData[]
  width: number
  height: number
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}

// components/charts/PortfolioChart.tsx
interface PortfolioChartProps {
  positions: Position[]
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}
```

#### Screen Components
```typescript
// components/screens/StockDetailScreen.tsx
interface StockDetailScreenProps {
  ticker: string
  onBack: () => void
  onTickerPress: (ticker: string) => void
  onEventPress: (event: MarketEvent) => void
}

// components/screens/PortfolioScreen.tsx
interface PortfolioScreenProps {
  onTickerPress: (ticker: string) => void
  onAddPosition: () => void
}

// components/screens/CopilotScreen.tsx
interface CopilotScreenProps {
  selectedTickers: string[]
  onTickerPress: (ticker: string) => void
  onEventPress: (event: MarketEvent) => void
}
```

### Data Flow

#### Authentication Flow
```
User Input → AuthService.signIn() → Supabase Auth → 
Store Session in SecureStore → Update Auth Context → 
Navigate to Main App
```

#### Stock Data Flow
```
Component Mount → StockService.getStock() → 
Supabase Database → Cache in Memory → 
Update Component State → Render UI
```

#### Real-time Price Flow
```
Component Mount → RealtimeService.subscribe() → 
WebSocket Connection → Price Update Event → 
Update Component State → Animated Price Change
```

#### Portfolio Data Flow
```
User Action → PortfolioService.addPosition() → 
Supabase Database → Refresh Portfolio → 
Recalculate Values → Update UI
```

## Data Models

### Core Data Types

```typescript
// shared/types/stock.types.ts
export interface StockData {
  symbol: string
  company: string
  currentPrice: number
  priceChange: number
  priceChangePercent: number
  sector: string
  marketCap: string
  volume: number
  avgVolume: number
  peRatio: number
  week52High: number
  week52Low: number
  open?: number
  high?: number
  low?: number
  previousClose?: number
  dividendYield?: number
  beta?: number
  eps?: number
  lastUpdated?: string
  logo?: string
  description?: string
  industry?: string
  exchange?: string
}

export interface PricePoint {
  timestamp: number
  value: number
  volume?: number
}

export interface CandlestickData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y'
```

```typescript
// shared/types/event.types.ts
export interface MarketEvent {
  id: string
  type: EventType
  title: string
  company: string
  ticker: string
  sector: string
  time: string
  actualDateTime: string
  impactRating: number
  confidence: number
  aiInsight: string
  currentPrice?: number
  priceChange?: number
  priceChangePercent?: number
  marketCap?: string
}

export type EventType = 
  | 'earnings'
  | 'fda'
  | 'merger'
  | 'split'
  | 'dividend'
  | 'launch'
  | 'product'
  | 'capital_markets'
  | 'legal'
  | 'commerce_event'
  | 'investor_day'
  | 'conference'
  | 'regulatory'
  | 'guidance_update'
  | 'partnership'
  | 'corporate'
  | 'pricing'
  | 'defense_contract'
  | 'guidance'
```

```typescript
// shared/types/portfolio.types.ts
export interface Position {
  id: string
  symbol: string
  name: string
  shares: number
  avgCost: number
  currentPrice: number
  value: number
  dayChange: number
  dayChangePercent: number
  totalReturn: number
  totalReturnPercent: number
  accountName: string
}

export interface PlaidConnection {
  connectionId: string
  institution: string
  accountType: string
  holdings: string[]
  lastSync: string
}

export interface ManualPosition {
  symbol: string
  shares: number
  avgCost: number
}
```

```typescript
// shared/types/auth.types.ts
export interface User {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  createdAt: string
}

export interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: User
}

export interface AuthResult {
  user: User | null
  session: Session | null
  error: Error | null
}
```

```typescript
// shared/types/chat.types.ts
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  blocks?: ChatBlock[]
}

export interface ChatBlock {
  type: 'text' | 'stock_card' | 'chart' | 'data_card'
  content: any
}

export interface StreamingResponse {
  delta: string
  done: boolean
  blocks?: ChatBlock[]
}
```

### Design Tokens

```typescript
// shared/design-system/tokens.ts
export const colors = {
  // Base colors
  background: '#FFFFFF',
  foreground: '#030213',
  card: '#F8F9FA',
  border: '#E5E7EB',
  
  // Dark mode
  backgroundDark: '#030213',
  foregroundDark: '#FFFFFF',
  cardDark: '#1A1B23',
  borderDark: '#2D2E3A',
  
  // Accent colors
  primary: '#030213',
  aiAccent: '#6366F1',
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280',
  warning: '#F59E0B',
  
  // Muted colors
  mutedForeground: '#6B7280',
  mutedForegroundDark: '#9CA3AF',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const typography = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
}
```

### State Management

```typescript
// Context Providers
export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export interface DarkModeContextValue {
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
}

export interface PortfolioContextValue {
  positions: Position[]
  loading: boolean
  totalValue: number
  totalChange: number
  totalChangePercent: number
  refreshPositions: () => Promise<void>
  addPosition: (position: ManualPosition) => Promise<void>
  removePosition: (positionId: string) => Promise<void>
}
```

### Storage Schema

```typescript
// AsyncStorage Keys
export const STORAGE_KEYS = {
  // Authentication
  SESSION: '@catalyst/session',
  USER: '@catalyst/user',
  
  // Preferences
  DARK_MODE: '@catalyst/dark_mode',
  SELECTED_TICKERS: '@catalyst/selected_tickers',
  WATCHLIST: '@catalyst/watchlist',
  
  // Portfolio
  PORTFOLIO_INTEGRATION: '@catalyst/portfolio_integration',
  MANUAL_POSITIONS: '@catalyst/manual_positions',
  
  // App State
  ONBOARDING_COMPLETED: '@catalyst/onboarding_completed',
  LAST_SYNC: '@catalyst/last_sync',
  
  // Cache
  STOCK_DATA_CACHE: '@catalyst/stock_data_cache',
  EVENTS_CACHE: '@catalyst/events_cache',
}

// SecureStore Keys (for sensitive data)
export const SECURE_KEYS = {
  ACCESS_TOKEN: 'catalyst_access_token',
  REFRESH_TOKEN: 'catalyst_refresh_token',
  PLAID_ACCESS_TOKEN: 'catalyst_plaid_access_token',
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Chart Data Transformation Purity
*For any* valid price data input, applying the same chart data transformation function multiple times should produce identical results, demonstrating that transformation functions are pure and deterministic.
**Validates: Requirements 3.1**

### Property 2: Data Persistence Round-Trip
*For any* valid data type (authentication tokens, user preferences, watchlist, portfolio, chart selections, onboarding status), storing the data and then retrieving it should produce an equivalent value, ensuring data persistence works correctly across all data types.
**Validates: Requirements 5.5, 13.5, 14.4, 20.1, 20.2, 20.3, 20.4, 20.5**

### Property 3: Navigation State Preservation
*For any* tab in the bottom navigation, switching away from the tab and then returning to it should preserve the scroll position and component state, ensuring users don't lose their place when navigating.
**Validates: Requirements 6.3**

### Property 4: Price Change Color Coding
*For any* stock price change value, positive changes should be displayed in green and negative changes should be displayed in red, ensuring consistent visual feedback across the app.
**Validates: Requirements 7.3**

### Property 5: Event Filtering Correctness
*For any* event type filter selection, all returned events should match the selected filter criteria, ensuring filtering works correctly across all event types.
**Validates: Requirements 9.4**

### Property 6: Event Proximity Indicators
*For any* stock with upcoming catalyst events within a defined time window, the stock card should display a catalyst dot indicator, ensuring users are aware of imminent events.
**Validates: Requirements 9.6**

### Property 7: Chat History Persistence
*For any* chat conversation, saving the chat history and then retrieving it should produce the same message sequence, ensuring chat context is maintained across app sessions.
**Validates: Requirements 10.7**

### Property 8: Market Status Calculation
*For any* given timestamp, the calculated market status (open, closed, pre-market, after-hours) should match the actual market hours, ensuring accurate market status display.
**Validates: Requirements 11.7**

### Property 9: Search Result Matching
*For any* search query, all returned stock results should match the query in either ticker symbol or company name, ensuring search accuracy.
**Validates: Requirements 12.2, 12.3**

### Property 10: Search Result Completeness
*For any* search result, the result should include both current price and price change data, ensuring users have complete information for decision-making.
**Validates: Requirements 12.4**

### Property 11: Watchlist Add Operation
*For any* stock, adding it to the watchlist should make it appear in the watchlist display, ensuring the add operation works correctly.
**Validates: Requirements 13.2**

### Property 12: Watchlist Remove Operation
*For any* stock in the watchlist, removing it should make it disappear from the watchlist display, ensuring the remove operation works correctly.
**Validates: Requirements 13.3**

### Property 13: Watchlist Reordering
*For any* two stocks in the watchlist, reordering them should change their relative positions in the display, ensuring drag-and-drop reordering works correctly.
**Validates: Requirements 13.4**

### Property 14: Watchlist Sorting
*For any* sort criteria (price change, alphabetical, market cap), the watchlist should be ordered according to that criteria, ensuring sorting works correctly across all options.
**Validates: Requirements 13.7**

### Property 15: Memoization Effectiveness
*For any* expensive calculation function that is memoized, calling it multiple times with the same inputs should return cached results without re-computation, ensuring performance optimization.
**Validates: Requirements 15.2**

### Property 16: Image Caching
*For any* image URL, loading it multiple times should use cached data after the first load, ensuring efficient image loading and reduced network usage.
**Validates: Requirements 15.3**

### Property 17: Offline Data Queue
*For any* data update operation performed while offline, the operation should be queued and executed when connection is restored, ensuring data consistency.
**Validates: Requirements 16.3**

### Property 18: Chart Data Caching
*For any* chart data for a given stock and timeframe, the data should be cached and retrievable for offline viewing, ensuring charts work without internet connection.
**Validates: Requirements 16.4**

### Property 19: Event Notifications
*For any* upcoming catalyst event that meets notification criteria, a push notification should be sent to the user, ensuring users stay informed about important events.
**Validates: Requirements 17.2**

### Property 20: Price Movement Notifications
*For any* significant price movement that exceeds the notification threshold, a push notification should be sent to the user, ensuring users are alerted to important price changes.
**Validates: Requirements 17.3**

### Property 21: Notification Preferences Persistence
*For any* notification preference setting, saving the preference and then retrieving it should produce the same value, ensuring user notification preferences are respected.
**Validates: Requirements 17.5**

### Property 22: Authentication Error Specificity
*For any* authentication error type (invalid credentials, network error, expired session), the system should display a specific error message corresponding to that error type, ensuring clear user feedback.
**Validates: Requirements 18.2**

### Property 23: Loading State Display
*For any* asynchronous operation (API call, data fetch, authentication), a loading state should be displayed while the operation is in progress, ensuring users understand the app is working.
**Validates: Requirements 18.4**

### Property 24: Empty State Messaging
*For any* empty data state (no watchlist stocks, no portfolio positions, no search results), an appropriate message should be displayed explaining the empty state, ensuring users understand why no data is shown.
**Validates: Requirements 18.5**

### Property 25: Error Logging Security
*For any* error that is logged, the log should not contain sensitive information (passwords, tokens, personal data), ensuring user privacy and security.
**Validates: Requirements 18.6**

### Property 26: Success Toast Notifications
*For any* successful user action (add to watchlist, save settings, connect account), a toast notification should be displayed confirming the action, ensuring positive user feedback.
**Validates: Requirements 18.7**

### Property 27: Accessibility Label Completeness
*For any* interactive element (button, link, input field), the element should have an accessibility label, ensuring screen reader compatibility.
**Validates: Requirements 19.1**

### Property 28: Color Contrast Compliance
*For any* text element in both light and dark modes, the color contrast ratio should meet WCAG AA standards (minimum 4.5:1 for normal text), ensuring readability for all users.
**Validates: Requirements 19.3**

### Property 29: Data Synchronization
*For any* locally persisted data that has been modified, when the device comes online, the data should be synchronized with Supabase, ensuring data consistency across devices.
**Validates: Requirements 20.6**

### Property 30: Data Migration Compatibility
*For any* old data format from a previous app version, the migration function should successfully convert it to the new format without data loss, ensuring smooth app updates.
**Validates: Requirements 20.7**


## Error Handling

### Error Categories

**Network Errors:**
- Connection timeout
- No internet connection
- Server unavailable
- Rate limiting

**Authentication Errors:**
- Invalid credentials
- Expired session
- Missing permissions
- Account locked

**Data Errors:**
- Invalid data format
- Missing required fields
- Data validation failures
- Sync conflicts

**Platform Errors:**
- Permission denied (camera, notifications, biometrics)
- Storage quota exceeded
- Platform API failures

### Error Handling Strategy

**User-Facing Errors:**
- Display clear, actionable error messages
- Provide retry options for transient failures
- Offer alternative actions when possible
- Use toast notifications for non-critical errors
- Use modal dialogs for critical errors requiring user action

**Silent Errors:**
- Log to error tracking service (Sentry, Crashlytics)
- Retry automatically with exponential backoff
- Fall back to cached data when available
- Continue operation with degraded functionality

**Error Recovery:**
- Implement automatic retry with exponential backoff for network errors
- Refresh authentication tokens automatically when expired
- Queue operations for retry when connection is restored
- Provide manual refresh options for users

### Error Logging

```typescript
// shared/utils/error-logger.ts
export class ErrorLogger {
  static log(error: Error, context?: Record<string, any>): void
  static logNetworkError(error: NetworkError, endpoint: string): void
  static logAuthError(error: AuthError, action: string): void
  static logDataError(error: DataError, operation: string): void
}
```

## Testing Strategy

### Testing Approach

The testing strategy employs a **dual testing approach** combining unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property-based tests**: Verify universal properties across all inputs
- Both types are complementary and necessary for comprehensive coverage

### Property-Based Testing

**Framework Selection:**
- Use **fast-check** for JavaScript/TypeScript property-based testing
- Configure each property test to run minimum 100 iterations
- Tag each test with feature name and property number

**Property Test Configuration:**
```typescript
import fc from 'fast-check'

// Example property test
describe('Feature: expo-native-conversion, Property 2: Data Persistence Round-Trip', () => {
  it('should preserve data through storage and retrieval', () => {
    fc.assert(
      fc.property(
        fc.record({
          session: fc.string(),
          user: fc.record({ id: fc.string(), email: fc.string() }),
          preferences: fc.record({ darkMode: fc.boolean() }),
        }),
        async (data) => {
          await AsyncStorage.setItem('test_key', JSON.stringify(data))
          const retrieved = JSON.parse(await AsyncStorage.getItem('test_key'))
          expect(retrieved).toEqual(data)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Unit Testing

**Framework:**
- Jest for unit and integration tests
- React Native Testing Library for component tests
- Mock Service Worker (MSW) for API mocking

**Test Coverage Goals:**
- 80%+ code coverage for business logic
- 70%+ code coverage for UI components
- 100% coverage for critical paths (authentication, payments, data persistence)

**Test Organization:**
```
__tests__/
├── unit/
│   ├── services/
│   ├── utils/
│   └── hooks/
├── integration/
│   ├── screens/
│   └── flows/
└── e2e/
    └── critical-paths/
```

### Integration Testing

**Framework:**
- Detox for end-to-end testing on iOS and Android
- Test critical user flows on real devices

**Critical Flows to Test:**
1. Authentication flow (sign up, sign in, sign out)
2. Portfolio management (add position, view details, remove position)
3. Stock search and detail view
4. Watchlist management (add, remove, reorder)
5. Real-time price updates
6. AI Copilot chat interaction
7. Event timeline navigation
8. Settings and preferences

### Visual Regression Testing

**Framework:**
- Pixelmatch for pixel-level comparison
- Automated screenshot comparison between web and native

**Validation Criteria:**
- < 0.5% pixel difference threshold
- Side-by-side comparison for all screens
- Automated validation in CI/CD pipeline

### Performance Testing

**Metrics to Monitor:**
- App launch time (< 2 seconds)
- Screen transition time (< 300ms)
- Chart rendering time (< 500ms)
- List scroll performance (60 FPS)
- Memory usage (< 200MB baseline)
- Network request latency

**Tools:**
- React Native Performance Monitor
- Flipper for debugging
- Xcode Instruments for iOS profiling
- Android Profiler for Android profiling

### Accessibility Testing

**Validation:**
- Screen reader compatibility (VoiceOver, TalkBack)
- Color contrast ratios (WCAG AA compliance)
- Touch target sizes (minimum 44x44 points)
- Keyboard navigation
- Dynamic text sizing

**Tools:**
- Accessibility Inspector (Xcode)
- Accessibility Scanner (Android)
- axe DevTools

### Test Execution Strategy

**Development:**
- Run unit tests on every file save (watch mode)
- Run integration tests before committing
- Run property-based tests before pull request

**CI/CD Pipeline:**
1. Lint and type checking
2. Unit tests (all platforms)
3. Integration tests (iOS and Android simulators)
4. Property-based tests (100 iterations minimum)
5. E2E tests (critical paths only)
6. Visual regression tests
7. Performance benchmarks
8. Accessibility validation

**Pre-Release:**
- Full test suite on physical devices (iOS and Android)
- Manual QA testing of all features
- Beta testing with select users
- Performance profiling under load
- Security audit

### Test Data Management

**Mock Data:**
- Use realistic mock data for development and testing
- Maintain separate mock data sets for different scenarios
- Version control mock data alongside code

**Test Accounts:**
- Create dedicated test accounts for different user types
- Use test mode for Plaid and payment integrations
- Isolate test data from production data

### Continuous Monitoring

**Production Monitoring:**
- Error tracking (Sentry, Crashlytics)
- Performance monitoring (Firebase Performance)
- Analytics (Amplitude, Mixpanel)
- User feedback collection

**Alerts:**
- Critical error rate > 1%
- Crash rate > 0.5%
- API response time > 2 seconds
- App launch time > 3 seconds
