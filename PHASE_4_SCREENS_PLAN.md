# Phase 4: Screens Implementation Plan

**Date**: January 13, 2026  
**Status**: Starting Phase 4

---

## Overview

Phase 4 focuses on implementing all main screens with full functionality, integrating charts, data services, and UI components.

**Priority Order**:
1. HomeScreen (Timeline) - HIGHEST PRIORITY
2. ProfileScreen - Quick win for testing theme
3. DiscoverScreen - Search functionality
4. CopilotScreen - AI chat interface

---

## 1. HomeScreen (Timeline) - PRIORITY 1

### Features to Implement:
- ✅ Watchlist with WatchlistCard components
- ✅ Drag-to-reorder functionality
- ✅ Pull-to-refresh
- ✅ Real-time price updates
- ✅ Add/remove stocks
- ✅ Dark mode support
- ✅ Empty state
- ✅ Loading state

### Implementation Steps:
1. Create watchlist state management
2. Integrate WatchlistCard component
3. Add DraggableFlatList for reordering
4. Connect to StockAPI for data
5. Add real-time price updates via RealtimeIntradayAPI
6. Implement pull-to-refresh
7. Add stock search/add functionality
8. Theme integration

### Dependencies:
- ✅ react-native-draggable-flatlist (installed)
- ✅ WatchlistCard component (exists)
- ✅ StockAPI (exists)
- ✅ RealtimeIntradayAPI (exists)
- ✅ DataService (exists)

### Estimated Time: 3-4 hours

---

## 2. ProfileScreen - PRIORITY 2

### Features to Implement:
- ✅ Theme toggle (light/dark/system)
- ✅ Account information
- ✅ Settings sections
- ✅ Logout functionality
- ✅ About section
- ✅ Dark mode support

### Implementation Steps:
1. Expand current ProfileScreen
2. Add theme selector (light/dark/system)
3. Add account section with auth integration
4. Add settings sections
5. Add logout with confirmation
6. Theme integration

### Dependencies:
- ✅ ThemeContext (exists)
- ✅ AuthContext (exists)
- ✅ UI components (exist)

### Estimated Time: 1-2 hours

---

## 3. DiscoverScreen - PRIORITY 3

### Features to Implement:
- ✅ Search bar with autocomplete
- ✅ Search results list
- ✅ Trending stocks section
- ✅ Recent searches
- ✅ Stock detail navigation
- ✅ Add to watchlist from search
- ✅ Dark mode support

### Implementation Steps:
1. Create search input with debounce
2. Connect to StockAPI for search
3. Display search results with stock cards
4. Add trending stocks section
5. Implement recent searches with AsyncStorage
6. Add navigation to stock detail
7. Theme integration

### Dependencies:
- ✅ StockAPI (exists)
- ✅ DataService (exists)
- ✅ Card component (exists)

### Estimated Time: 2-3 hours

---

## 4. CopilotScreen - PRIORITY 4

### Features to Implement:
- ✅ Chat message list (inverted FlatList)
- ✅ Message input with auto-grow
- ✅ Markdown rendering
- ✅ Streaming messages
- ✅ Stock cards in messages
- ✅ Thinking animation
- ✅ Keyboard handling
- ✅ Dark mode support

### Implementation Steps:
1. Create chat message list with FlatList
2. Add message input component
3. Install and configure react-native-markdown-display
4. Implement streaming message support
5. Add stock cards in messages
6. Add thinking animation
7. Implement KeyboardAvoidingView
8. Theme integration

### Dependencies:
- ⏳ react-native-markdown-display (need to install)
- ✅ Card component (exists)
- ✅ UI components (exist)

### Estimated Time: 4-5 hours

---

## Additional Screens (Phase 4.5)

### 5. StockDetailScreen
- Stock chart with timeframes
- Company information
- Events timeline
- Financials tabs
- Add/remove from watchlist

### 6. PortfolioScreen
- Portfolio chart
- Position list
- Connected accounts
- Plaid integration
- Manual position entry

### 7. EventDetailScreen
- Event details
- Impact analysis
- Related stocks
- Historical context

---

## Implementation Order

**Week 1** (This session):
1. ✅ HomeScreen - Full implementation with watchlist
2. ✅ ProfileScreen - Complete settings and theme
3. ✅ DiscoverScreen - Search and trending

**Week 2** (Next session):
4. ✅ CopilotScreen - Chat interface
5. ⏳ StockDetailScreen - Stock info
6. ⏳ PortfolioScreen - Portfolio management

---

## Success Criteria

Phase 4 is complete when:
- ✅ All 4 main screens fully functional
- ✅ Navigation between screens works
- ✅ Data services integrated
- ✅ Charts displaying correctly
- ✅ Real-time updates working
- ✅ Dark mode working on all screens
- ✅ Pull-to-refresh working
- ✅ No crashes or errors
- ✅ Performance is smooth (60fps)

---

## Let's Start!

Beginning with HomeScreen implementation...
