# Expo Native Conversion Plan - Executive Summary

## Project Overview
Convert the Catalyst App from a React web application (Vite + React) to an Expo native mobile application while maintaining 100% feature parity, design fidelity, and user experience.

## Current Architecture Analysis

### Technology Stack (Web)
- **Build Tool**: Vite 6.3.5
- **Framework**: React 18.3.1 with TypeScript
- **UI Library**: Radix UI components (40+ components)
- **Styling**: Tailwind CSS v4.1.3 with custom design tokens
- **Charts**: Recharts 2.15.2 for data visualization
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React Context (DarkModeContext, AuthContext)
- **Drag & Drop**: react-dnd with HTML5 and touch backends
- **Navigation**: Custom bottom navigation with 4 tabs

### App Structure
- **Main Screens**: Home (Timeline), Copilot (AI Chat), Discover (Search), Profile
- **Sub-Screens**: Stock Info, Event Analysis, Portfolio, Settings, Onboarding
- **Key Features**: Real-time stock prices, event tracking, portfolio management, AI copilot, charts

## Conversion Strategy

### Phase 1: Foundation (Week 1-2)
1. Initialize Expo project with TypeScript
2. Set up navigation (React Navigation)
3. Configure Tailwind CSS (NativeWind)
4. Port design system and tokens

### Phase 2: Core Components (Week 3-4)
1. Convert UI component library (40+ components)
2. Implement custom chart components
3. Port data services and API integration
4. Set up authentication flow

### Phase 3: Screens & Features (Week 5-6)
1. Convert all main screens
2. Implement navigation flows
3. Port real-time price updates
4. Add portfolio management

### Phase 4: Polish & Testing (Week 7-8)
1. Performance optimization
2. Platform-specific adjustments
3. Testing on iOS and Android
4. Bug fixes and refinements

## Key Challenges & Solutions

### Challenge 1: Radix UI Components
**Problem**: Radix UI is web-only (uses DOM APIs)
**Solution**: Use React Native Paper or create custom native components matching exact design

### Challenge 2: Recharts
**Problem**: Recharts uses SVG with web-specific APIs
**Solution**: Use react-native-svg + victory-native or custom SVG charts

### Challenge 3: Drag & Drop
**Problem**: react-dnd uses HTML5 drag API
**Solution**: Use react-native-draggable-flatlist or react-native-reanimated

### Challenge 4: Tailwind CSS
**Problem**: Tailwind is CSS-based
**Solution**: Use NativeWind (Tailwind for React Native)

### Challenge 5: Web-specific APIs
**Problem**: localStorage, window, document APIs
**Solution**: Use AsyncStorage, Dimensions, Platform APIs

## Timeline Estimate
**Total Duration**: 8 weeks (2 months)
**Team Size**: 2-3 developers
**Effort**: ~320-480 developer hours

## Success Criteria
✅ 100% feature parity with web app
✅ Identical visual design and UX
✅ Native performance (60fps animations)
✅ Works on iOS 13+ and Android 8+
✅ Passes all existing test cases
✅ App store ready (iOS App Store + Google Play)
