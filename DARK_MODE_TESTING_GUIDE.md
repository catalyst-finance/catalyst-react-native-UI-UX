# Dark Mode Testing Guide

## Quick Start

### How to Toggle Dark Mode

**Option 1: ServiceTestScreen**
1. Open the app
2. Navigate to "Service Test" tab
3. Look for "Dark Mode: 🌙 Yes" or "Dark Mode: ☀️ No"
4. Tap the toggle button to switch themes

**Option 2: ProfileScreen** (if available)
1. Open the app
2. Navigate to "Profile" screen
3. Find the "Dark Mode" switch
4. Toggle to switch themes

### What to Test

#### 1. ComponentShowcaseScreen
Navigate to the "Components" tab to see all UI components:

**Light Mode Checklist**:
- [ ] Background is white (#ffffff)
- [ ] Text is black (#030213)
- [ ] Buttons have black background
- [ ] Cards have white background with visible borders
- [ ] Inputs have light grey background
- [ ] All text is readable

**Dark Mode Checklist**:
- [ ] Background is black (#030213)
- [ ] Text is white (#fafafa)
- [ ] Buttons have white background with black text
- [ ] Cards have dark background with visible borders
- [ ] Inputs have dark grey background
- [ ] All text is readable

#### 2. Component-Specific Tests

**Button Component**:
- [ ] Default variant: Correct background and text colors
- [ ] Outline variant: Visible border in both themes
- [ ] Secondary variant: Correct muted colors
- [ ] Ghost variant: Transparent background, visible text
- [ ] Link variant: Underlined text, correct color

**Badge Component**:
- [ ] Default: Correct colors
- [ ] Secondary: Muted background
- [ ] Destructive: Red colors
- [ ] Outline: Visible border
- [ ] Success: Green background
- [ ] Warning: Orange background

**Card Component**:
- [ ] Background color matches theme
- [ ] Border visible in both themes
- [ ] Title text readable
- [ ] Description text readable
- [ ] Content area properly styled

**Input Component**:
- [ ] Background color matches theme
- [ ] Border visible
- [ ] Placeholder text visible
- [ ] Input text readable
- [ ] Focus state works

**Text Component**:
- [ ] Default text readable
- [ ] Muted text visible but dimmed
- [ ] All size variants work
- [ ] All weight variants work

**Progress Component**:
- [ ] Bar color matches theme primary
- [ ] Background color matches theme muted
- [ ] Progress visible at different values

**Slider Component**:
- [ ] Track colors correct
- [ ] Thumb color matches theme
- [ ] Minimum track visible
- [ ] Maximum track visible

**Checkbox Component**:
- [ ] Unchecked: Border visible
- [ ] Checked: Background and checkmark visible
- [ ] Disabled state works

**Switch Component**:
- [ ] Off state: Correct track color
- [ ] On state: Correct track color
- [ ] Thumb always white
- [ ] Smooth animation

**Select Component**:
- [ ] Trigger background correct
- [ ] Trigger text readable
- [ ] Modal background correct
- [ ] Options readable
- [ ] Selected option highlighted

**Dropdown Component**:
- [ ] Trigger background correct
- [ ] Trigger text readable
- [ ] Overlay visible
- [ ] Options readable
- [ ] Selected option highlighted

**Tabs Component**:
- [ ] Tab list background correct
- [ ] Inactive tabs: Muted color
- [ ] Active tab: Highlighted correctly
- [ ] Content area visible

**Accordion Component**:
- [ ] Trigger background correct
- [ ] Title text readable
- [ ] Chevron icon visible
- [ ] Content background correct
- [ ] Border visible

**Modal Component**:
- [ ] Backdrop visible (semi-transparent black)
- [ ] Content background correct
- [ ] Content text readable
- [ ] Close button works

**Separator Component**:
- [ ] Horizontal separator visible
- [ ] Vertical separator visible
- [ ] Color matches theme border

**Avatar Component**:
- [ ] Image displays correctly
- [ ] Fallback background correct
- [ ] Fallback text readable

#### 3. Chart Components

**WatchlistCard**:
- [ ] Background matches theme
- [ ] Stock symbols readable
- [ ] Prices readable
- [ ] Change percentages readable (green/red)
- [ ] Mini charts visible

**HoldingsCard**:
- [ ] Background matches theme
- [ ] Holdings data readable
- [ ] Total value visible
- [ ] Change indicators work

**StockLineChart**:
- [ ] Chart line visible in both themes
- [ ] Grid lines visible
- [ ] Labels readable
- [ ] Crosshair works
- [ ] Pre-market opacity correct

#### 4. Navigation

**Tab Bar**:
- [ ] Background matches theme
- [ ] Active tab icon/text highlighted
- [ ] Inactive tab icon/text visible
- [ ] Tab press feedback works

#### 5. Transition Testing

**Theme Toggle**:
- [ ] Smooth transition between themes
- [ ] No flashing or flickering
- [ ] All components update immediately
- [ ] No layout shifts
- [ ] No console errors

## Color Reference

### Light Mode Colors
```
Background:     #ffffff (white)
Foreground:     #030213 (black)
Primary:        #030213 (black)
Muted:          #ececf0 (light grey)
Border:         rgba(0, 0, 0, 0.1) (light border)
Input BG:       #f3f3f5 (light grey)
```

### Dark Mode Colors
```
Background:     #030213 (black)
Foreground:     #fafafa (white)
Primary:        #fafafa (white)
Muted:          #1e293b (dark grey)
Border:         #666666 (grey)
Input BG:       #1e293b (dark grey)
```

## Common Issues to Check

### Text Visibility
- [ ] No white text on white background
- [ ] No black text on black background
- [ ] All text has sufficient contrast

### Border Visibility
- [ ] Borders visible in both themes
- [ ] No invisible borders on cards/inputs
- [ ] Border colors appropriate for theme

### Component States
- [ ] Hover states work (web)
- [ ] Press states work (mobile)
- [ ] Disabled states visible
- [ ] Focus states visible

### Layout Issues
- [ ] No layout shifts when toggling theme
- [ ] Spacing consistent in both themes
- [ ] Alignment correct in both themes

## Performance Checks

- [ ] Theme toggle is instant (< 100ms)
- [ ] No memory leaks when toggling
- [ ] No excessive re-renders
- [ ] Smooth scrolling in both themes

## Platform-Specific Tests

### iOS
- [ ] Status bar color matches theme
- [ ] Safe area insets work
- [ ] Native components styled correctly

### Android
- [ ] Status bar color matches theme
- [ ] Navigation bar color matches theme
- [ ] Material components styled correctly

### Web
- [ ] Browser theme-color meta tag updates
- [ ] Scrollbars styled for theme
- [ ] Focus outlines visible

## Automated Testing (Future)

```typescript
// Example test structure
describe('Dark Mode', () => {
  it('should toggle between light and dark themes', () => {
    // Test implementation
  });
  
  it('should persist theme preference', () => {
    // Test implementation
  });
  
  it('should apply correct colors to all components', () => {
    // Test implementation
  });
});
```

## Reporting Issues

If you find any issues, document:
1. Component name
2. Theme (light/dark)
3. Platform (iOS/Android/Web)
4. Expected behavior
5. Actual behavior
6. Screenshot if possible

## Success Criteria

✅ All components visible in both themes  
✅ All text readable in both themes  
✅ All borders visible in both themes  
✅ Smooth theme transitions  
✅ No console errors  
✅ No layout shifts  
✅ Theme preference persists  

---

**Last Updated**: January 13, 2026  
**Status**: Ready for testing  
**Components**: 16 UI components + 3 chart components + 4 screens
