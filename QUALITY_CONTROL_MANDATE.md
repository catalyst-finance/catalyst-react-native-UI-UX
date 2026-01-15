# QUALITY CONTROL MANDATE
## Zero Simplification Policy - Exact Matching Required

**THIS DOCUMENT MUST BE REFERENCED AT EVERY STEP OF DEVELOPMENT**

---

## CORE PRINCIPLE

**NO SIMPLIFICATIONS ALLOWED**

Every single element must match the web app EXACTLY in terms of:
1. **Design** - Visual appearance, colors, spacing, typography, animations
2. **Functionality** - User interactions, data flow, state management, edge cases
3. **Performance** - 60fps interactions, smooth animations, efficient rendering
4. **Behavior** - Error handling, loading states, empty states, edge cases

---

## MANDATORY CHECKS BEFORE ANY CODE COMMIT

### ✅ Pre-Implementation Checklist

Before writing ANY code, you MUST:

1. **Read the entire web app implementation**
   - Don't skim - read every line
   - Understand the logic flow
   - Note all edge cases handled
   - Identify all dependencies

2. **Document all features and behaviors**
   - List every user interaction
   - List every state transition
   - List every calculation
   - List every visual element

3. **Identify platform-specific adaptations**
   - What needs to change for React Native?
   - What can stay the same?
   - What requires native APIs?

4. **Plan the exact port**
   - Line-by-line mapping from web to native
   - Identify utility functions needed
   - Identify components needed
   - Identify dependencies needed

### ✅ During Implementation Checklist

While writing code, you MUST:

1. **Copy logic exactly**
   - Same variable names where possible
   - Same function signatures
   - Same calculation methods
   - Same data structures

2. **Preserve all edge cases**
   - Weekend handling
   - Holiday handling
   - Pre-market vs regular hours
   - Empty data states
   - Error states
   - Loading states

3. **Maintain all comments**
   - Copy explanatory comments from web app
   - Add new comments for React Native-specific code
   - Document any platform differences

4. **Keep all optimizations**
   - useMemo for expensive calculations
   - useCallback for event handlers
   - Proper key props for lists
   - Virtualization where needed

### ✅ Post-Implementation Checklist

After writing code, you MUST:

1. **Visual comparison**
   - Screenshot web app
   - Screenshot native app
   - Compare pixel-by-pixel
   - Verify colors match exactly
   - Verify spacing matches exactly
   - Verify typography matches exactly

2. **Functional comparison**
   - Test every user interaction
   - Test every edge case
   - Test error scenarios
   - Test loading scenarios
   - Test empty states

3. **Performance verification**
   - Profile with React DevTools
   - Verify 60fps on interactions
   - Check memory usage
   - Check bundle size impact

4. **Code review**
   - Compare with web app line-by-line
   - Verify no logic was simplified
   - Verify all features present
   - Verify all edge cases handled

---

## SPECIFIC REQUIREMENTS BY COMPONENT TYPE

### Charts (Phase 2 Week 4)

**CRITICAL**: Charts are the most complex and important components.

#### Dual-Section Layout
- ✅ MUST have 60/40 split (past/future)
- ✅ MUST have vertical divider line at split point
- ✅ MUST support customizable split percentage
- ✅ MUST render past data in left section
- ✅ MUST render future catalysts in right section
- ❌ CANNOT simplify to single section
- ❌ CANNOT remove future timeline
- ❌ CANNOT use different split ratio without user control

#### Event Dots
- ✅ MUST render on actual data points (not approximated)
- ✅ MUST use exact event type colors from web app
- ✅ MUST support all event types (earnings, FDA, merger, etc.)
- ✅ MUST be clickable/tappable
- ✅ MUST show event details on tap
- ❌ CANNOT simplify to generic dots
- ❌ CANNOT remove event type differentiation
- ❌ CANNOT approximate positions

#### Crosshair Interaction
- ✅ MUST follow touch/mouse exactly
- ✅ MUST snap to nearest data point in past section
- ✅ MUST snap to nearest event when close enough
- ✅ MUST show price and timestamp
- ✅ MUST show event details when snapped to event
- ✅ MUST work in both past and future sections
- ❌ CANNOT simplify to tooltip only
- ❌ CANNOT remove snap-to-event behavior
- ❌ CANNOT approximate crosshair position

#### Session-Based Coloring
- ✅ MUST differentiate pre-market (gray)
- ✅ MUST differentiate regular hours (green/red)
- ✅ MUST differentiate after-hours (gray)
- ✅ MUST use exact colors from web app
- ❌ CANNOT use single color for all sessions
- ❌ CANNOT simplify to just regular hours

#### Time Ranges
- ✅ MUST support all ranges: 1D, 1W, 1M, 3M, YTD, 1Y, 5Y
- ✅ MUST use time-based positioning for 1D
- ✅ MUST use index-based positioning for 1W, 1M, 3M, YTD, 1Y
- ✅ MUST use timestamp-based positioning for 5Y
- ✅ MUST handle data gaps correctly
- ❌ CANNOT remove any time range
- ❌ CANNOT use same positioning logic for all ranges

#### Bezier Smoothing
- ✅ MUST use Catmull-Rom to Bezier conversion
- ✅ MUST use tension value of 0.4 (Robinhood-style)
- ✅ MUST generate smooth continuous paths
- ✅ MUST handle segment transitions seamlessly
- ❌ CANNOT use linear interpolation
- ❌ CANNOT use different smoothing algorithm
- ❌ CANNOT simplify to straight lines

### Services (Phase 3)

#### DataService
- ✅ MUST cache data with AsyncStorage
- ✅ MUST handle offline mode
- ✅ MUST detect network state
- ✅ MUST retry failed requests
- ✅ MUST handle rate limiting
- ❌ CANNOT skip caching
- ❌ CANNOT ignore offline mode
- ❌ CANNOT simplify error handling

#### RealtimePriceService
- ✅ MUST use WebSocket for live updates
- ✅ MUST reconnect on disconnect
- ✅ MUST handle background/foreground transitions
- ✅ MUST batch updates for performance
- ❌ CANNOT use polling instead of WebSocket
- ❌ CANNOT skip reconnection logic
- ❌ CANNOT ignore background state

### Screens (Phase 4)

#### Home Screen (Timeline)
- ✅ MUST support drag-to-reorder stocks
- ✅ MUST show real-time price updates
- ✅ MUST show event timeline
- ✅ MUST support pull-to-refresh
- ✅ MUST show portfolio chart
- ❌ CANNOT remove drag-to-reorder
- ❌ CANNOT use static prices
- ❌ CANNOT simplify to list only

#### Copilot Screen
- ✅ MUST support streaming messages
- ✅ MUST render markdown correctly
- ✅ MUST handle keyboard properly
- ✅ MUST auto-scroll to new messages
- ❌ CANNOT remove streaming
- ❌ CANNOT use plain text instead of markdown
- ❌ CANNOT have keyboard issues

---

## ACCEPTABLE IMPROVEMENTS

While NO simplifications are allowed, these improvements ARE acceptable:

### ✅ Performance Optimizations
- Using React Native's FlatList instead of ScrollView for long lists
- Using react-native-reanimated for smoother animations
- Using useMemo/useCallback more aggressively
- Implementing virtualization for large datasets

### ✅ Platform-Specific Enhancements
- Using native haptic feedback (not available on web)
- Using native biometric authentication
- Using native share sheet
- Using native notifications

### ✅ Code Quality Improvements
- Better TypeScript types
- More descriptive variable names
- Better code organization
- More comprehensive error handling
- Better logging and debugging

### ✅ Accessibility Improvements
- Better screen reader support
- Better keyboard navigation
- Better color contrast
- Better touch target sizes

### ❌ NOT Acceptable "Improvements"
- Removing features "for simplicity"
- Using different UI patterns "for mobile"
- Skipping edge cases "that rarely happen"
- Removing animations "for performance"
- Using different colors "that look better"
- Changing layouts "to fit mobile better"

---

## VERIFICATION PROCESS

### Level 1: Self-Check (Every Component)
1. Compare side-by-side with web app
2. Test all interactions
3. Verify all edge cases
4. Check performance

### Level 2: Peer Review (Every Major Feature)
1. Code review against web app
2. Visual comparison screenshots
3. Functional testing checklist
4. Performance profiling results

### Level 3: User Testing (Before Each Phase Completion)
1. Test on real devices (iOS and Android)
2. Test with real data
3. Test offline scenarios
4. Test edge cases
5. Collect feedback

---

## DOCUMENTATION REQUIREMENTS

Every component/service/screen MUST have:

### Implementation Notes
```markdown
## Web App Reference
- File: src/components/charts/stock-line-chart.tsx
- Lines: 1-2000
- Key features: Dual-section layout, event dots, crosshair

## Native Implementation
- File: catalyst-native/src/components/charts/StockLineChart.tsx
- Platform differences:
  - Using react-native-svg instead of web SVG
  - Using PanGestureHandler instead of mouse events
  - Using Animated API for crosshair

## Exact Matches
- ✅ Dual-section layout (60/40 split)
- ✅ Event dot positioning algorithm
- ✅ Bezier smoothing (tension 0.4)
- ✅ Session-based coloring
- ✅ All time ranges supported

## Known Differences
- None - exact functional match

## Testing Checklist
- [x] Visual comparison passed
- [x] All interactions work
- [x] All edge cases handled
- [x] Performance at 60fps
- [x] Works on iOS
- [x] Works on Android
```

---

## FAILURE MODES TO AVOID

### ❌ "Good Enough" Syndrome
**Symptom**: "It looks close enough, users won't notice"
**Reality**: Users WILL notice. Catalyst's value is in the details.
**Solution**: Pixel-perfect matching required.

### ❌ "Mobile is Different" Excuse
**Symptom**: "Mobile users expect different patterns"
**Reality**: Catalyst users want the SAME experience everywhere.
**Solution**: Match web app exactly, add mobile enhancements on top.

### ❌ "Performance Trade-off" Rationalization
**Symptom**: "We need to simplify for performance"
**Reality**: React Native can handle the complexity with proper optimization.
**Solution**: Optimize the implementation, don't simplify the features.

### ❌ "Time Constraint" Pressure
**Symptom**: "We need to ship faster, let's cut corners"
**Reality**: Shipping incomplete features creates technical debt.
**Solution**: Take the time to do it right the first time.

---

## ENFORCEMENT

This document is NOT optional. It is MANDATORY.

### Before Starting Any Work
- [ ] Read this document
- [ ] Read the web app implementation
- [ ] Create detailed implementation plan
- [ ] Get approval on plan

### During Implementation
- [ ] Reference this document at every decision point
- [ ] Document any deviations (there should be NONE)
- [ ] Test continuously
- [ ] Compare with web app frequently

### After Implementation
- [ ] Complete all checklists in this document
- [ ] Provide side-by-side comparison screenshots
- [ ] Provide test results
- [ ] Document any platform-specific differences

### Review Process
- [ ] Code review against web app
- [ ] Visual review against web app
- [ ] Functional review against web app
- [ ] Performance review
- [ ] Approval required before merge

---

## SUMMARY

**ZERO SIMPLIFICATIONS**
**EXACT MATCHING REQUIRED**
**QUALITY OVER SPEED**
**DETAILS MATTER**

The web app is the source of truth. When in doubt, copy it exactly.

If you find yourself thinking "maybe we can simplify this", the answer is NO.

If you find yourself thinking "users won't notice this difference", the answer is they WILL.

If you find yourself thinking "this is taking too long", the answer is take the time to do it right.

**Excellence is not negotiable.**

---

## SIGN-OFF

By proceeding with development, you acknowledge:
- ✅ I have read and understood this document
- ✅ I will reference this document at every step
- ✅ I will NOT simplify any code or features
- ✅ I will match the web app EXACTLY
- ✅ I will document any platform-specific differences
- ✅ I will complete all verification checklists
- ✅ I understand that quality is more important than speed

**Date**: January 12, 2026
**Phase**: 2 Week 4 - Charts & Data Visualization
**Status**: ACTIVE - MUST BE FOLLOWED
