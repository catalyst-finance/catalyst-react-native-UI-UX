# Developer Checklist - Pre-Implementation & Validation

## Overview
This checklist ensures every component/screen is implemented with exact fidelity to the web app. Use this before starting work and before marking work as complete.

## ⚠️ CRITICAL: Source of Truth

**THE ACTUAL WEB APP IS THE ONLY SOURCE OF TRUTH**

If documentation conflicts with the actual web app behavior in the side-by-side comparison tool:
- ✅ Match the web app
- ❌ Ignore the documentation
- 📝 Update the documentation after fixing

**Priority**: Side-by-Side Tool > Web App Screenshots > DevTools Measurements > Documentation

## Pre-Implementation Checklist

### Before Starting Any Component

#### 1. Research Phase
- [ ] **FIRST**: Open actual web app and interact with component
- [ ] **SECOND**: Take screenshots and measurements from actual web app
- [ ] **THIRD**: Read the component's web implementation (`src/components/...`)
- [ ] Identify all props and state
- [ ] Document all user interactions
- [ ] Note all animations and transitions
- [ ] List all dependencies
- [ ] Check for platform-specific behavior
- [ ] **VERIFY**: Documentation matches actual web app behavior

#### 2. Design Reference
- [ ] Open web app and navigate to component
- [ ] Take screenshots (light and dark mode)
- [ ] Measure exact dimensions using DevTools
- [ ] Extract colors using color picker
- [ ] Note font sizes and weights
- [ ] Document spacing and padding
- [ ] Record animation timings

#### 3. Specification Review
- [ ] Check 13-design-specification.md for component specs
- [ ] Review 03-component-conversion-guide.md for conversion approach
- [ ] Check 02-dependency-mapping.md for library alternatives
- [ ] Review 11-chart-component-detailed-spec.md (if chart-related)

#### 4. Test Planning
- [ ] Write test cases before implementation
- [ ] Plan visual regression test
- [ ] Plan interaction tests
- [ ] Plan performance tests

## Implementation Checklist

### During Development

#### Visual Fidelity
- [ ] Colors match exactly (use color picker to verify)
- [ ] Font family matches (Gotham)
- [ ] Font sizes match exactly
- [ ] Font weights match exactly
- [ ] Line heights match exactly
- [ ] Letter spacing matches
- [ ] Spacing/padding matches exactly
- [ ] Margins match exactly
- [ ] Border radius matches exactly
- [ ] Border widths match exactly
- [ ] Shadows match exactly (if applicable)

#### Layout
- [ ] Component dimensions match
- [ ] Flex/grid layout matches
- [ ] Alignment matches
- [ ] Overflow behavior matches
- [ ] Scroll behavior matches
- [ ] Responsive behavior matches

#### Interactions
- [ ] All touch targets are minimum 44x44
- [ ] Tap interactions work
- [ ] Long press works (if applicable)
- [ ] Swipe gestures work (if applicable)
- [ ] Drag gestures work (if applicable)
- [ ] Haptic feedback added (iOS/Android)
- [ ] Loading states match
- [ ] Error states match
- [ ] Empty states match
- [ ] Disabled states match

#### Animations
- [ ] Animation duration matches
- [ ] Easing function matches
- [ ] Animation triggers match
- [ ] Smooth 60fps performance
- [ ] No jank or stuttering

#### Accessibility
- [ ] Screen reader labels added
- [ ] Touch targets are accessible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Keyboard navigation works (if applicable)

#### Platform-Specific
- [ ] iOS safe area handled
- [ ] Android status bar handled
- [ ] Platform-specific styles applied
- [ ] Platform-specific behavior implemented

## Post-Implementation Checklist

### Before Marking as Complete

#### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Visual regression test passing (< 0.5% difference)
- [ ] Interaction tests passing
- [ ] Performance tests passing
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] Tested on real iOS device
- [ ] Tested on real Android device

#### Code Quality
- [ ] TypeScript types defined
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code formatted with Prettier
- [ ] No console.log statements
- [ ] Comments added for complex logic
- [ ] Props documented
- [ ] Component exported correctly

#### Documentation
- [ ] Component usage documented
- [ ] Props documented
- [ ] Examples added (if applicable)
- [ ] Known issues documented
- [ ] Migration notes added (if different from web)

#### Review
- [ ] Self-review completed
- [ ] Side-by-side comparison with web app
- [ ] Screenshots taken (light and dark mode)
- [ ] Video recorded (if interactive)
- [ ] Code review requested
- [ ] QA review requested

## Component-Specific Checklists

### Stock Card Component

#### Visual
- [ ] Badge (ticker) styling matches
- [ ] Company name styling matches
- [ ] Price styling matches
- [ ] Price change styling matches
- [ ] Catalyst dot size and color match
- [ ] Card padding matches
- [ ] Card border matches
- [ ] Card shadow matches

#### Interaction
- [ ] Tap navigates to stock info
- [ ] Long press shows options (if applicable)
- [ ] Drag to reorder works
- [ ] Haptic feedback on long press

#### Data
- [ ] Real-time price updates
- [ ] Price change updates
- [ ] Catalyst data displays
- [ ] Loading state shows
- [ ] Error state shows

### Chart Component

#### Visual
- [ ] Viewport split is exactly 60/40
- [ ] Past section renders correctly
- [ ] Future section renders correctly
- [ ] Divider line matches
- [ ] Event dots match size and color
- [ ] Crosshair styling matches
- [ ] Time labels match
- [ ] Price labels match

#### Interaction
- [ ] Crosshair follows touch
- [ ] Snaps to past events correctly
- [ ] Snaps to future events correctly
- [ ] Timeframe switching works
- [ ] Chart type toggle works (line/candlestick)
- [ ] Pinch to zoom works (if applicable)

#### Performance
- [ ] Renders in < 300ms
- [ ] Smooth 60fps crosshair
- [ ] No lag when switching timeframes
- [ ] Memory usage acceptable

### Chat Bubble Component

#### Visual
- [ ] User bubble styling matches
- [ ] AI bubble styling matches
- [ ] Markdown rendering matches
- [ ] Code block styling matches
- [ ] Stock card styling matches
- [ ] Citation badge styling matches

#### Interaction
- [ ] Tap stock card navigates
- [ ] Tap citation shows source
- [ ] Long press shows options
- [ ] Copy text works

#### Data
- [ ] Streaming messages work
- [ ] Markdown parses correctly
- [ ] Stock cards load data
- [ ] Citations link correctly

### Input Field Component

#### Visual
- [ ] Height matches (44px)
- [ ] Padding matches
- [ ] Border radius matches
- [ ] Border color matches
- [ ] Background color matches
- [ ] Text color matches
- [ ] Placeholder color matches
- [ ] Focus state matches

#### Interaction
- [ ] Keyboard appears on tap
- [ ] Focus indicator shows
- [ ] Clear button works
- [ ] Submit on enter works
- [ ] Keyboard dismisses correctly

#### Behavior
- [ ] Auto-focus works (if applicable)
- [ ] Validation works
- [ ] Error state shows
- [ ] Character limit enforced (if applicable)

## Screen-Specific Checklists

### Home Screen (Timeline)

#### Visual
- [ ] Header matches
- [ ] Stock list matches
- [ ] Portfolio chart matches
- [ ] Event timeline matches
- [ ] Bottom navigation matches
- [ ] Pull-to-refresh indicator matches

#### Interaction
- [ ] Pull-to-refresh works
- [ ] Drag-to-reorder works
- [ ] Tap stock navigates
- [ ] Tap event navigates
- [ ] Scroll position restores
- [ ] Tab switching works

#### Data
- [ ] Real-time prices update
- [ ] Events load correctly
- [ ] Portfolio data loads
- [ ] Offline mode works
- [ ] Cache works correctly

### Copilot Screen

#### Visual
- [ ] Chat list matches
- [ ] Input field matches
- [ ] Send button matches
- [ ] Thinking indicator matches
- [ ] Message bubbles match

#### Interaction
- [ ] Keyboard handling works
- [ ] Send message works
- [ ] Scroll to bottom works
- [ ] Tap stock card navigates
- [ ] Copy message works

#### Data
- [ ] Streaming works
- [ ] Messages persist
- [ ] Stock cards load
- [ ] Citations work

### Stock Info Screen

#### Visual
- [ ] Header matches
- [ ] Chart matches
- [ ] Tabs match
- [ ] Company info matches
- [ ] Events timeline matches
- [ ] Financials match

#### Interaction
- [ ] Back button works
- [ ] Tab switching works
- [ ] Chart interactions work
- [ ] Scroll works
- [ ] Share button works

#### Data
- [ ] Stock data loads
- [ ] Chart data loads
- [ ] Events load
- [ ] Financials load
- [ ] Real-time updates work

## Quality Gates

### Phase 1 Gate (Foundation)
- [ ] All design tokens validated
- [ ] Base components pass visual regression
- [ ] Navigation structure correct
- [ ] Theme switching works

### Phase 2 Gate (Core Components)
- [ ] All UI components pass visual regression
- [ ] Chart component matches exactly
- [ ] Performance benchmarks pass
- [ ] No memory leaks

### Phase 3 Gate (Data Layer)
- [ ] All API calls work
- [ ] Caching works correctly
- [ ] Offline mode functional
- [ ] Real-time updates work

### Phase 4 Gate (Screens)
- [ ] All screens pass visual regression
- [ ] All user flows work
- [ ] Performance acceptable
- [ ] No critical bugs

### Phase 5 Gate (Polish)
- [ ] All animations smooth
- [ ] All interactions feel native
- [ ] No bugs remaining
- [ ] Accessibility audit passed

### Phase 6 Gate (Testing)
- [ ] 80%+ test coverage
- [ ] All E2E tests pass
- [ ] Beta feedback addressed
- [ ] App store ready

## Final Release Checklist

### Pre-Release
- [ ] All components pass checklists
- [ ] All screens pass checklists
- [ ] All user flows tested
- [ ] Visual regression tests pass
- [ ] Performance benchmarks pass
- [ ] Accessibility audit passed
- [ ] Security audit passed
- [ ] Privacy policy updated
- [ ] Terms of service updated

### iOS Release
- [ ] App icons generated
- [ ] Screenshots captured
- [ ] App Store metadata written
- [ ] TestFlight beta tested
- [ ] App Store review guidelines checked
- [ ] Privacy manifest created
- [ ] Build uploaded
- [ ] Submitted for review

### Android Release
- [ ] App icons generated
- [ ] Screenshots captured
- [ ] Play Store metadata written
- [ ] Internal testing complete
- [ ] Beta tested
- [ ] Build uploaded
- [ ] Submitted for review

## Daily Development Workflow

### Morning
1. [ ] Pull latest code
2. [ ] Review assigned tasks
3. [ ] Read relevant specifications
4. [ ] Plan implementation approach

### During Development
1. [ ] Follow pre-implementation checklist
2. [ ] Implement component
3. [ ] Follow implementation checklist
4. [ ] Write tests
5. [ ] Run tests locally

### Before Committing
1. [ ] Follow post-implementation checklist
2. [ ] Run all tests
3. [ ] Run visual regression tests
4. [ ] Take screenshots
5. [ ] Write commit message
6. [ ] Push code
7. [ ] Create pull request

### Code Review
1. [ ] Self-review code
2. [ ] Compare with web app
3. [ ] Address review comments
4. [ ] Update documentation
5. [ ] Merge when approved

## Tips for Success

### Visual Fidelity
- Use color picker to verify exact colors
- Use ruler tool to measure exact spacing
- Take screenshots for side-by-side comparison
- Test in both light and dark mode
- Test on multiple screen sizes

### Performance
- Profile with React DevTools
- Monitor memory usage
- Test on low-end devices
- Optimize images and assets
- Use memoization where appropriate

### Testing
- Write tests before implementation
- Test on real devices, not just simulators
- Test edge cases
- Test error states
- Test offline mode

### Collaboration
- Communicate blockers early
- Ask for help when stuck
- Share learnings with team
- Review others' code
- Document decisions

## Summary

This checklist ensures:
1. **Pre-Implementation**: Proper research and planning
2. **Implementation**: Exact visual and functional fidelity
3. **Post-Implementation**: Comprehensive testing and validation
4. **Quality Gates**: Phase-by-phase validation
5. **Release**: App store readiness

By following this checklist religiously, we guarantee the native app is an **exact copy** of the web app.
