# Requirements Document

## Introduction

This document outlines the requirements for converting the Catalyst App Mobile UI/UX v7.0 from a React web application into a native iOS and Android mobile application using Expo and React Native. The conversion must retain all existing functionality, design, styling, and user experience while leveraging native mobile capabilities.

## Glossary

- **Catalyst_App**: The existing React web application for market intelligence and stock tracking
- **Expo**: A framework and platform for universal React applications
- **React_Native**: A framework for building native mobile apps using React
- **NativeWind**: A utility-first styling system for React Native (Tailwind CSS equivalent)
- **Victory_Native**: A charting library for React Native (Recharts equivalent)
- **Supabase**: The backend service providing authentication, database, and real-time features
- **WebSocket**: Protocol for real-time bidirectional communication
- **Platform_Agnostic_Code**: Code that works identically on web and native platforms
- **Design_Tokens**: Platform-independent design values (colors, spacing, typography)
- **Service_Layer**: Business logic and data fetching separated from UI components

## Requirements

### Requirement 1: Platform-Agnostic Architecture

**User Story:** As a developer, I want the business logic separated from UI components, so that code can be shared between web and native platforms.

#### Acceptance Criteria

1. THE System SHALL extract all API calls and data fetching logic into platform-agnostic service files
2. THE System SHALL create service modules for stocks, portfolio, events, authentication, and real-time data
3. THE System SHALL move all calculation and transformation logic into pure utility functions
4. THE System SHALL consolidate all TypeScript type definitions into a shared types directory
5. THE System SHALL create platform-agnostic custom hooks that do not depend on DOM APIs

### Requirement 2: Design System Abstraction

**User Story:** As a designer, I want a unified design system, so that the app maintains consistent styling across web and native platforms.

#### Acceptance Criteria

1. THE System SHALL extract all design tokens (colors, spacing, typography, border radius) from CSS into TypeScript constants
2. THE System SHALL create a design tokens file that defines all visual design values
3. THE System SHALL ensure design tokens are platform-independent and can be consumed by both web and native styling systems
4. THE System SHALL document the mapping between Tailwind CSS classes and NativeWind equivalents
5. WHERE dark mode is enabled, THE System SHALL apply dark mode design tokens consistently

### Requirement 3: Chart Component Abstraction

**User Story:** As a user, I want to view stock charts on mobile, so that I can analyze price movements and trends.

#### Acceptance Criteria

1. THE System SHALL extract all chart data transformation logic into pure functions
2. THE System SHALL separate chart calculation logic from rendering logic
3. THE System SHALL create platform-specific chart implementations (Recharts for web, Victory Native for mobile)
4. THE System SHALL implement line charts for stock price visualization
5. THE System SHALL implement candlestick charts for detailed price analysis
6. THE System SHALL support touch gestures for chart interaction on mobile devices
7. THE System SHALL maintain chart performance with real-time price updates

### Requirement 4: Expo Project Setup

**User Story:** As a developer, I want an Expo project configured correctly, so that I can build and deploy native mobile apps.

#### Acceptance Criteria

1. THE System SHALL create an Expo project using TypeScript template
2. THE System SHALL install and configure Supabase client for React Native
3. THE System SHALL install and configure NativeWind for styling
4. THE System SHALL install and configure Victory Native for charts
5. THE System SHALL install and configure React Native Reanimated for animations
6. THE System SHALL configure platform-specific file extensions (.web.tsx, .native.tsx)
7. THE System SHALL set up development environment for iOS and Android testing

### Requirement 5: Authentication Implementation

**User Story:** As a user, I want to sign in to my account on mobile, so that I can access my personalized portfolio and watchlist.

#### Acceptance Criteria

1. WHEN a user opens the app, THE System SHALL display an authentication screen if not logged in
2. THE System SHALL implement email and password authentication using Supabase
3. THE System SHALL implement sign-up functionality with user profile creation
4. THE System SHALL implement sign-out functionality
5. THE System SHALL persist authentication state using AsyncStorage
6. WHERE biometric authentication is available, THE System SHALL offer Face ID or Touch ID login
7. THE System SHALL handle authentication errors with clear user feedback

### Requirement 6: Navigation Implementation

**User Story:** As a user, I want to navigate between screens, so that I can access different features of the app.

#### Acceptance Criteria

1. THE System SHALL implement bottom tab navigation with Home, Copilot, Discover, and Profile tabs
2. THE System SHALL implement stack navigation for drilling into stock details and event analysis
3. THE System SHALL maintain navigation state when switching between tabs
4. THE System SHALL implement back navigation with native gestures
5. THE System SHALL scroll to top when tapping the active tab icon
6. THE System SHALL use native navigation transitions and animations

### Requirement 7: Portfolio Screen Implementation

**User Story:** As a user, I want to view my portfolio on mobile, so that I can track my investments.

#### Acceptance Criteria

1. THE System SHALL display portfolio value and daily change
2. THE System SHALL display a list of portfolio holdings with current prices
3. THE System SHALL display price changes with color coding (green for positive, red for negative)
4. THE System SHALL support pull-to-refresh for updating portfolio data
5. THE System SHALL display loading states while fetching portfolio data
6. THE System SHALL handle empty portfolio state with appropriate messaging
7. THE System SHALL support manual portfolio entry and Plaid integration

### Requirement 8: Stock Detail Screen Implementation

**User Story:** As a user, I want to view detailed stock information on mobile, so that I can make informed investment decisions.

#### Acceptance Criteria

1. WHEN a user taps a stock, THE System SHALL navigate to the stock detail screen
2. THE System SHALL display current price, change, and percentage change
3. THE System SHALL display a price chart with multiple timeframe options (1D, 1W, 1M, 3M, 1Y, ALL)
4. THE System SHALL display company information (sector, market cap, P/E ratio, etc.)
5. THE System SHALL display upcoming and past catalyst events for the stock
6. THE System SHALL display company financials in an organized layout
7. THE System SHALL support scrolling through all stock information sections

### Requirement 9: Catalyst Events Timeline

**User Story:** As a user, I want to view catalyst events on mobile, so that I can stay informed about market-moving events.

#### Acceptance Criteria

1. THE System SHALL display a timeline of upcoming and past events
2. THE System SHALL display event type, title, company, ticker, and time
3. THE System SHALL display impact rating with visual indicators
4. THE System SHALL support filtering events by type (earnings, FDA, economic, etc.)
5. WHEN a user taps an event, THE System SHALL navigate to event analysis screen
6. THE System SHALL display catalyst dots on stock cards indicating event proximity
7. THE System SHALL update events in real-time as new data arrives

### Requirement 10: Catalyst Copilot Chat Interface

**User Story:** As a user, I want to chat with the AI copilot on mobile, so that I can get market insights and analysis.

#### Acceptance Criteria

1. THE System SHALL display a chat interface with message history
2. THE System SHALL support text input with native keyboard
3. THE System SHALL display streaming responses from the AI with animated text
4. THE System SHALL render markdown formatting in chat messages
5. THE System SHALL display stock cards and data visualizations inline in chat
6. THE System SHALL support scrolling through chat history
7. THE System SHALL maintain chat context across app sessions
8. THE System SHALL handle network errors gracefully with retry options

### Requirement 11: Real-Time Price Updates

**User Story:** As a user, I want to see live price updates on mobile, so that I can monitor market movements in real-time.

#### Acceptance Criteria

1. THE System SHALL establish WebSocket connection for real-time price data
2. THE System SHALL update stock prices automatically without user interaction
3. THE System SHALL display price changes with smooth animations
4. THE System SHALL maintain WebSocket connection when app is in foreground
5. THE System SHALL reconnect WebSocket when app returns to foreground
6. THE System SHALL handle WebSocket disconnections gracefully
7. THE System SHALL display market status (open, closed, pre-market, after-hours)

### Requirement 12: Search and Discovery

**User Story:** As a user, I want to search for stocks on mobile, so that I can discover and add new stocks to my watchlist.

#### Acceptance Criteria

1. THE System SHALL display a search interface with text input
2. WHEN a user types in the search field, THE System SHALL display matching stocks
3. THE System SHALL search by ticker symbol and company name
4. THE System SHALL display search results with stock price and change
5. WHEN a user taps a search result, THE System SHALL navigate to stock detail screen
6. THE System SHALL support adding stocks to watchlist from search results
7. THE System SHALL display trending stocks and sector categories

### Requirement 13: Watchlist Management

**User Story:** As a user, I want to manage my watchlist on mobile, so that I can track stocks I'm interested in.

#### Acceptance Criteria

1. THE System SHALL display watchlist stocks with current prices
2. THE System SHALL support adding stocks to watchlist
3. THE System SHALL support removing stocks from watchlist
4. THE System SHALL support reordering watchlist stocks with drag-and-drop
5. THE System SHALL persist watchlist changes to Supabase database
6. THE System SHALL sync watchlist across devices
7. THE System SHALL support sorting watchlist by various criteria (price change, alphabetical, etc.)

### Requirement 14: Dark Mode Support

**User Story:** As a user, I want to toggle dark mode on mobile, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE System SHALL detect system dark mode preference on app launch
2. THE System SHALL apply dark mode styling to all screens and components
3. THE System SHALL support manual dark mode toggle in settings
4. THE System SHALL persist dark mode preference
5. THE System SHALL update all colors, backgrounds, and text when dark mode changes
6. THE System SHALL ensure sufficient contrast in both light and dark modes

### Requirement 15: Performance Optimization

**User Story:** As a user, I want the app to perform smoothly on mobile, so that I have a responsive experience.

#### Acceptance Criteria

1. THE System SHALL use FlatList for rendering long lists of stocks and events
2. THE System SHALL implement memoization for expensive calculations
3. THE System SHALL optimize image loading with caching
4. THE System SHALL minimize re-renders using React.memo and useMemo
5. THE System SHALL lazy load screens and components when possible
6. THE System SHALL maintain 60 FPS during animations and scrolling
7. THE System SHALL handle large datasets efficiently without memory issues

### Requirement 16: Offline Support

**User Story:** As a user, I want to view cached data when offline, so that I can still use the app without internet connection.

#### Acceptance Criteria

1. WHEN the device is offline, THE System SHALL display cached stock data
2. THE System SHALL display a network status indicator when offline
3. THE System SHALL queue data updates for when connection is restored
4. THE System SHALL cache chart data for offline viewing
5. THE System SHALL display appropriate messaging for features requiring internet connection
6. WHEN connection is restored, THE System SHALL sync pending changes

### Requirement 17: Push Notifications

**User Story:** As a user, I want to receive push notifications for important events, so that I stay informed about my portfolio.

#### Acceptance Criteria

1. THE System SHALL request push notification permissions from user
2. THE System SHALL send notifications for upcoming catalyst events
3. THE System SHALL send notifications for significant price movements
4. THE System SHALL send notifications for earnings announcements
5. THE System SHALL allow users to configure notification preferences
6. WHEN a user taps a notification, THE System SHALL navigate to relevant screen
7. THE System SHALL respect system notification settings

### Requirement 18: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN an API call fails, THE System SHALL display an error message with retry option
2. WHEN authentication fails, THE System SHALL display specific error messages
3. WHEN network is unavailable, THE System SHALL display offline indicator
4. THE System SHALL display loading states for all asynchronous operations
5. THE System SHALL display empty states with helpful messaging
6. THE System SHALL log errors for debugging without exposing sensitive information
7. THE System SHALL provide toast notifications for successful actions

### Requirement 19: Accessibility

**User Story:** As a user with accessibility needs, I want the app to be accessible, so that I can use all features effectively.

#### Acceptance Criteria

1. THE System SHALL provide accessibility labels for all interactive elements
2. THE System SHALL support screen readers (VoiceOver on iOS, TalkBack on Android)
3. THE System SHALL ensure sufficient color contrast for text readability
4. THE System SHALL support dynamic text sizing
5. THE System SHALL provide haptic feedback for important interactions
6. THE System SHALL ensure all features are keyboard accessible
7. THE System SHALL follow platform accessibility guidelines

### Requirement 20: Data Persistence

**User Story:** As a user, I want my app settings and preferences saved, so that they persist across app sessions.

#### Acceptance Criteria

1. THE System SHALL persist authentication tokens using secure storage
2. THE System SHALL persist user preferences (dark mode, notification settings)
3. THE System SHALL persist watchlist and portfolio data
4. THE System SHALL persist chart timeframe selections
5. THE System SHALL persist onboarding completion status
6. THE System SHALL sync persisted data with Supabase when online
7. THE System SHALL handle data migration for app updates


---

## Implementation Progress Tracking

### Phase 3: Data Layer Services (Week 5)

**Overall Progress**: 40% Complete  
**Last Updated**: January 12, 2026

#### Completed Requirements
- ✅ **Requirement 1**: Platform-Agnostic Architecture (Partial)
  - DataService, NetworkService, and all Supabase services implemented
  - Pure utility functions in place
  - TypeScript types consolidated
- ✅ **Requirement 5**: Authentication Implementation (Partial)
  - Supabase client with secure storage implemented
  - AuthContext pending
- ✅ **Requirement 11**: Real-Time Price Updates (Complete)
  - RealtimeIntradayAPI fully implemented
  - WebSocket connection with reconnection logic
  - App state handling for background/foreground
- ✅ **Requirement 16**: Offline Support (Complete)
  - DataService with two-tier caching
  - NetworkService with offline queue
  - Cached data accessible offline
- ✅ **Requirement 20**: Data Persistence (Complete)
  - SecureStore for auth tokens
  - AsyncStorage for preferences and cache
  - Supabase sync when online

#### In Progress Requirements
- 🚧 **Requirement 1**: Platform-Agnostic Architecture (60% complete)
  - Pending: BackgroundFetchService, AuthContext
- 🚧 **Requirement 5**: Authentication Implementation (50% complete)
  - Pending: AuthContext, biometric auth
- 🚧 **Requirement 14**: Dark Mode Support (80% complete)
  - ThemeContext exists, needs system theme integration
- 🚧 **Requirement 17**: Push Notifications (0% complete)
  - Pending: Background fetch setup

#### Pending Requirements
- ⏳ **Requirement 15**: Performance Optimization
  - Pending: Integration testing, performance benchmarks
- ⏳ **Requirement 18**: Error Handling and User Feedback
  - Pending: Comprehensive error handling patterns
- ⏳ **Requirement 19**: Accessibility
  - Pending: Accessibility implementation

### Implementation Notes

**Services Implemented**:
1. DataService - Two-tier caching (memory + AsyncStorage), TTL-based expiration
2. NetworkService - Real-time network monitoring, offline queue
3. Supabase Client - SecureStore for auth, AsyncStorage for data
4. EventsAPI - Event fetching with caching
5. HistoricalPriceAPI - All time ranges (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
6. IntradayPriceAPI - Intraday price fetching
7. RealtimeIntradayAPI - WebSocket real-time updates
8. MarketStatusAPI - Market status detection
9. StockAPI - Stock data fetching

**Pending Implementation**:
1. BackgroundFetchService - iOS/Android background updates
2. App.tsx Integration - Service initialization
3. AuthContext - Authentication context provider
4. Integration Testing - All services working together
5. Performance Testing - Benchmarks and optimization

**Quality Assurance**:
- All implementations follow NO SIMPLIFICATIONS POLICY
- Security best practices enforced (SecureStore for sensitive data)
- Offline support in all services
- Proper error handling and logging
- TypeScript strict mode compliance

**Next Phase**: Phase 3 Week 6 - Context & State Management
