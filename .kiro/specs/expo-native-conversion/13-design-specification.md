# Design Specification - Pixel-Perfect Reference

## ⚠️ CRITICAL DISCLAIMER

**THIS DOCUMENT IS A REFERENCE, NOT THE SOURCE OF TRUTH**

The **actual web app** (as seen in the side-by-side comparison tool) is the ONLY source of truth.

If this document conflicts with the actual web app:
- ✅ Trust the web app
- ❌ Ignore this document
- 📝 Update this document to match the web app

**Use this document as a starting point, but ALWAYS validate against the actual web app.**

## Overview
This document serves as a **reference guide** for visual design specifications extracted from the web app. Every measurement, color, spacing, and animation is documented here, but must be validated against the actual web app.

## Design Tokens (Extracted from Web App)

### Colors

#### Light Theme
```typescript
export const lightThemeColors = {
  // Base
  background: '#ffffff',
  foreground: 'oklch(0.145 0 0)', // #030213
  
  // Card
  card: '#ffffff',
  cardForeground: 'oklch(0.145 0 0)',
  
  // Popover
  popover: 'oklch(1 0 0)',
  popoverForeground: 'oklch(0.145 0 0)',
  
  // Primary
  primary: '#030213',
  primaryForeground: 'oklch(1 0 0)',
  
  // Secondary
  secondary: 'oklch(0.95 0.0058 264.53)', // #f3f3f5
  secondaryForeground: '#030213',
  
  // Muted
  muted: '#ececf0',
  mutedForeground: '#717182',
  
  // Accent
  accent: '#e9ebef',
  accentForeground: '#030213',
  
  // Destructive
  destructive: '#d4183d',
  destructiveForeground: '#ffffff',
  
  // Border & Input
  border: 'rgba(0, 0, 0, 0.1)',
  input: 'transparent',
  inputBackground: '#f3f3f5',
  switchBackground: '#cbced4',
  ring: 'oklch(0.708 0 0)',
  
  // Chart Colors
  chart1: '#000000',
  chart2: 'oklch(0.6 0.118 184.704)',
  chart3: 'oklch(0.398 0.07 227.392)',
  chart4: 'oklch(0.828 0.189 84.429)',
  chart5: 'oklch(0.769 0.188 70.08)',
  
  // Semantic Colors
  positive: '#00C851',
  negative: '#FF4444',
  aiAccent: '#000000',
  warning: '#FF8800',
  neutral: '#9E9E9E',
};
```

#### Dark Theme
```typescript
export const darkThemeColors = {
  // Base
  background: 'oklch(0.145 0 0)', // #030213
  foreground: 'oklch(0.985 0 0)', // #f8f8f8
  
  // Card
  card: 'oklch(0.145 0 0)',
  cardForeground: 'oklch(0.985 0 0)',
  
  // Popover
  popover: 'oklch(0.145 0 0)',
  popoverForeground: 'oklch(0.985 0 0)',
  
  // Primary
  primary: 'oklch(0.985 0 0)',
  primaryForeground: 'oklch(0.145 0 0)',
  
  // Secondary
  secondary: 'oklch(0.269 0 0)', // #444444
  secondaryForeground: 'oklch(0.985 0 0)',
  
  // Muted
  muted: 'oklch(0.269 0 0)',
  mutedForeground: 'oklch(0.78 0 0)', // #c7c7c7
  
  // Accent
  accent: 'oklch(0.269 0 0)',
  accentForeground: 'oklch(0.985 0 0)',
  
  // Destructive
  destructive: 'oklch(0.396 0.141 25.723)', // #651a2e
  destructiveForeground: 'oklch(0.637 0.237 25.331)', // #f28ba0
  
  // Border & Input
  border: 'oklch(0.4 0 0)', // #666666
  input: 'oklch(0.269 0 0)',
  ring: 'oklch(0.439 0 0)', // #707070
  
  // Chart Colors
  chart1: '#ffffff',
  chart2: 'oklch(0.696 0.17 162.48)',
  chart3: 'oklch(0.769 0.188 70.08)',
  chart4: 'oklch(0.627 0.265 303.9)',
  chart5: 'oklch(0.645 0.246 16.439)',
  
  // Semantic Colors
  positive: '#00C851',
  negative: '#FF4444',
  aiAccent: '#ffffff',
  warning: '#FF8800',
  neutral: '#9E9E9E',
};
```

### Typography

#### Font Family
```typescript
export const fontFamily = {
  primary: 'Gotham',
  fallback: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
};
```

#### Font Sizes
```typescript
export const fontSize = {
  xs: 12,    // 0.75rem
  sm: 14,    // 0.875rem
  base: 16,  // 1rem
  lg: 18,    // 1.125rem
  xl: 20,    // 1.25rem
  '2xl': 24, // 1.5rem
  '3xl': 30, // 1.875rem
};
```

#### Font Weights
```typescript
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};
```

#### Line Heights
```typescript
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.625,
};
```

#### Letter Spacing
```typescript
export const letterSpacing = {
  tight: -0.025,  // -0.025em
  normal: 0,
  wide: 0.025,    // 0.025em
  wider: 0.05,    // 0.05em
  widest: 0.1,    // 0.1em
};
```

### Spacing

```typescript
export const spacing = {
  0: 0,
  0.5: 2,   // 0.125rem
  1: 4,     // 0.25rem
  1.5: 6,   // 0.375rem
  2: 8,     // 0.5rem
  2.5: 10,  // 0.625rem
  3: 12,    // 0.75rem
  3.5: 14,  // 0.875rem
  4: 16,    // 1rem
  5: 20,    // 1.25rem
  6: 24,    // 1.5rem
  7: 28,    // 1.75rem
  8: 32,    // 2rem
  9: 36,    // 2.25rem
  10: 40,   // 2.5rem
  11: 44,   // 2.75rem
  12: 48,   // 3rem
  14: 56,   // 3.5rem
  16: 64,   // 4rem
  20: 80,   // 5rem
  24: 96,   // 6rem
  32: 128,  // 8rem
  40: 160,  // 10rem
  48: 192,  // 12rem
  56: 224,  // 14rem
  64: 256,  // 16rem
  72: 288,  // 18rem
  80: 320,  // 20rem
  96: 384,  // 24rem
};
```

### Border Radius

```typescript
export const borderRadius = {
  none: 0,
  xs: 2,    // 0.125rem
  sm: 10,   // calc(0.75rem - 4px)
  md: 10,   // calc(0.75rem - 2px)
  lg: 12,   // 0.75rem
  xl: 16,   // calc(0.75rem + 4px)
  '2xl': 16, // 1rem
  full: 9999,
};
```

### Shadows

```typescript
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 8,
  },
};
```

## Component Specifications

### Stock Card

#### Dimensions
```typescript
export const stockCardSpec = {
  // Container
  padding: { horizontal: 16, vertical: 12 },
  marginBottom: 12,
  borderRadius: 12,
  borderWidth: 2,
  
  // Badge (Ticker)
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  
  // Company Name
  companyName: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    marginBottom: 4,
  },
  
  // Price
  price: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  
  // Price Change
  priceChange: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  
  // Catalyst Dot
  catalystDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
};
```

#### Layout
```
┌─────────────────────────────────────┐
│ [AAPL Badge]              $150.25 ↗ │ ← 16px padding
│ Apple Inc.                  +2.5%   │
│ ● Earnings Report                   │
│                                     │
│ [Mini Chart - 312px height]         │
│                                     │
└─────────────────────────────────────┘
  ↑                                   ↑
  16px                               16px
```

### Chart Component

#### Dimensions
```typescript
export const chartSpec = {
  // Container
  width: '100%', // Full width minus padding
  height: 312,
  
  // Viewport Split
  pastSectionPercent: 60,
  futureSectionPercent: 40,
  
  // Margins
  marginTop: 40,
  marginBottom: 20,
  marginLeft: 0,
  marginRight: 0,
  
  // Chart Area
  chartHeight: 252, // 312 - 40 - 20
  
  // Event Dots
  eventDot: {
    radius: 6,
    strokeWidth: 2,
    strokeColor: '#fff',
  },
  
  // Crosshair
  crosshair: {
    strokeWidth: 1,
    strokeColor: '#666',
    strokeDasharray: [2, 2],
  },
  
  // Divider Line
  divider: {
    strokeWidth: 1,
    strokeColor: '#666',
    strokeDasharray: [4, 4],
  },
  
  // Time Labels
  timeLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: '#717182',
  },
  
  // Price Labels
  priceLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: '#717182',
  },
};
```

#### Layout
```
┌─────────────────────────────────────────────────────────┐
│                    [Time Range Buttons]                 │ ← 40px margin top
├──────────────────────────────┬──────────────────────────┤
│                              │                          │
│   PAST SECTION (60%)         │  FUTURE SECTION (40%)    │
│                              │                          │
│   [Price Line with Dots]     │  [Event Timeline]        │
│                              │                          │
│   ● Past Event 1             │     │ Future Event 1     │
│   ● Past Event 2             │     │ Future Event 2     │
│                              │     │ Future Event 3     │
│                              │                          │
├──────────────────────────────┴──────────────────────────┤
│                    [Volume Bars]                        │ ← 20px margin bottom
└─────────────────────────────────────────────────────────┘
     ↑                                                 ↑
     60% of width                                     40%
```

### Bottom Navigation

#### Dimensions
```typescript
export const bottomNavSpec = {
  // Container
  height: 64, // Base height
  paddingBottom: 'env(safe-area-inset-bottom)', // iOS safe area
  paddingTop: 8,
  paddingHorizontal: 16,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(8px)',
  borderTopWidth: 1,
  
  // Tab Item
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  
  // Icon
  icon: {
    width: 20,
    height: 20,
    marginBottom: 4,
  },
  
  // Label
  label: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
};
```

#### Layout
```
┌─────────────────────────────────────────────────────────┐
│  [Timeline]  [Copilot]  [Discover]  [Profile]          │
│     Icon        Icon       Icon        Icon             │
│    Label       Label      Label       Label             │
└─────────────────────────────────────────────────────────┘
  ↑                                                     ↑
  16px padding                                         16px
```

### Chat Bubble (Copilot)

#### Dimensions
```typescript
export const chatBubbleSpec = {
  // User Message
  user: {
    backgroundColor: '#000',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  
  // AI Message
  ai: {
    backgroundColor: '#f3f3f5',
    color: '#030213',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  
  // Text
  text: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
};
```

### Input Field

#### Dimensions
```typescript
export const inputSpec = {
  // Container
  height: 44,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1,
  backgroundColor: '#f3f3f5',
  
  // Text
  fontSize: 16,
  fontWeight: '400',
  lineHeight: 24,
  color: '#030213',
  
  // Placeholder
  placeholderColor: '#717182',
  
  // Focus State
  focus: {
    borderWidth: 2,
    borderColor: '#000',
  },
};
```

### Button

#### Dimensions
```typescript
export const buttonSpec = {
  // Default
  default: {
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#030213',
  },
  
  // Small
  sm: {
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  
  // Large
  lg: {
    height: 40,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  
  // Icon Only
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Text
  text: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
};
```

## Animation Specifications

### Transitions

```typescript
export const animations = {
  // Screen Transitions
  screenTransition: {
    duration: 300,
    easing: 'ease-out',
  },
  
  // Modal Slide Up
  modalSlideUp: {
    duration: 250,
    easing: 'ease-out',
    from: { translateY: '100%' },
    to: { translateY: 0 },
  },
  
  // Fade In
  fadeIn: {
    duration: 200,
    easing: 'ease-in',
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  
  // Crosshair
  crosshair: {
    duration: 0, // Instant, follows touch
    easing: 'linear',
  },
  
  // Chart Path Draw
  chartPathDraw: {
    duration: 500,
    easing: 'ease-out',
  },
  
  // Button Press
  buttonPress: {
    duration: 100,
    easing: 'ease-out',
    scale: 0.95,
  },
  
  // Pull to Refresh
  pullToRefresh: {
    duration: 300,
    easing: 'ease-out',
  },
};
```

### Gestures

```typescript
export const gestures = {
  // Swipe Threshold
  swipeThreshold: 50, // pixels
  
  // Long Press Duration
  longPressDuration: 500, // ms
  
  // Tap Timeout
  tapTimeout: 200, // ms
  
  // Pan Threshold
  panThreshold: 10, // pixels
};
```

## Accessibility

### Touch Targets

```typescript
export const touchTargets = {
  // Minimum touch target size (iOS HIG)
  minimum: 44,
  
  // Recommended touch target size
  recommended: 48,
  
  // Spacing between touch targets
  spacing: 8,
};
```

### Text Contrast

```typescript
export const textContrast = {
  // WCAG AA compliance
  normalText: 4.5, // Minimum contrast ratio
  largeText: 3.0,  // Minimum contrast ratio for 18pt+ or 14pt+ bold
  
  // WCAG AAA compliance
  normalTextAAA: 7.0,
  largeTextAAA: 4.5,
};
```

## Platform-Specific Adjustments

### iOS

```typescript
export const iosAdjustments = {
  // Status Bar
  statusBarHeight: 44, // iPhone with notch
  statusBarHeightLegacy: 20, // iPhone without notch
  
  // Safe Area
  safeAreaTop: 'env(safe-area-inset-top)',
  safeAreaBottom: 'env(safe-area-inset-bottom)',
  
  // Navigation Bar
  navigationBarHeight: 44,
  
  // Tab Bar
  tabBarHeight: 49,
  
  // Haptic Feedback
  hapticFeedback: {
    selection: 'selection',
    impact: 'medium',
    notification: 'success',
  },
};
```

### Android

```typescript
export const androidAdjustments = {
  // Status Bar
  statusBarHeight: 24,
  
  // Navigation Bar
  navigationBarHeight: 48,
  
  // Tab Bar
  tabBarHeight: 56,
  
  // Elevation (Material Design)
  elevation: {
    card: 2,
    modal: 8,
    navigation: 4,
  },
  
  // Ripple Effect
  rippleColor: 'rgba(0, 0, 0, 0.12)',
};
```

## Validation Checklist

Use this checklist to verify each component matches the specification:

### Visual Validation
- [ ] Colors match exactly (use color picker)
- [ ] Font sizes match exactly
- [ ] Font weights match exactly
- [ ] Spacing matches exactly (use ruler tool)
- [ ] Border radius matches exactly
- [ ] Shadows match exactly
- [ ] Animations match timing and easing

### Interaction Validation
- [ ] Touch targets are minimum 44x44
- [ ] Gestures work as expected
- [ ] Haptic feedback triggers correctly
- [ ] Loading states match
- [ ] Error states match
- [ ] Empty states match

### Accessibility Validation
- [ ] Text contrast meets WCAG AA
- [ ] Touch targets are accessible
- [ ] Screen reader labels present
- [ ] Focus indicators visible
- [ ] Color is not sole indicator

## Measurement Tools

### Recommended Tools
1. **Figma Inspect**: Extract exact measurements from design
2. **Zeplin**: Design handoff with specifications
3. **Color Picker**: Verify exact color values
4. **Ruler Tool**: Measure spacing and dimensions
5. **React DevTools**: Inspect component hierarchy
6. **Flipper**: Debug React Native apps

### Measurement Process
1. Open web app in browser
2. Open DevTools
3. Inspect element
4. Note computed styles
5. Document in this specification
6. Verify in native implementation
7. Use visual regression tests to confirm

## Summary

This specification provides:
- **Exact color values** for light and dark themes
- **Precise typography** settings
- **Detailed spacing** system
- **Component dimensions** for all UI elements
- **Animation specifications** with timing and easing
- **Platform-specific** adjustments
- **Accessibility** requirements
- **Validation checklist** for QA

By following this specification exactly, the native app will be **pixel-perfect** match to the web app.
