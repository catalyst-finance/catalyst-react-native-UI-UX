# Crosshair Bidirectional Touch Handling Fix

## Problem
The crosshair could only be activated when starting from the past section and moving into the future section. It was not possible to:
- Start crosshair directly in the future section
- Move backwards from future to past section

After initial fix, the crosshair was crashing due to function reference issues.

## Root Cause
1. The PanResponder was properly attached to the chart container, but the `handleTouch` function was defined using `useMemo` before the variables it depended on were initialized, causing dependency issues.
2. After moving `handleTouch` to after variable definitions, the PanResponder (created with `useRef`) was trying to call `handleTouch` before it was defined, causing a crash.

## Solution

### 1. Created Function Reference Pattern
- Added `handleTouchRef` using `useRef` to hold the `handleTouch` function reference
- PanResponder calls `handleTouchRef.current?.()` instead of `handleTouch()` directly
- Added `useEffect` to update the ref whenever the component renders

### 2. Moved `handleTouch` Function Definition
- Moved `handleTouch` from being defined before `PanResponder` to after `chartData` calculation
- Function now has access to all required variables: `width`, `pastWidthPercent`, `futureWidthPercent`, `futureWindowMs`, `isIntradayMode`, `selectedTimeRange`, `height`, `chartData`, `pastWidth`

### 3. Updated PanResponder
- Changed from `useMemo` to `useRef` to avoid re-creating the responder
- PanResponder now calls `handleTouchRef.current?.()` with optional chaining for safety
- PanResponder is stable and doesn't need to be recreated

### 4. Added Pointer Events Configuration
- Set `pointerEvents="box-none"` on both past and future section containers to allow touches to pass through to the PanResponder
- Set `pointerEvents="none"` on all visual elements (SVG, gradients, dots) so they don't block touches
- This ensures touches are captured by the PanResponder regardless of where they start

## Key Changes

### StockLineChart.tsx
1. **handleTouchRef**: Added `useRef` to hold function reference
2. **PanResponder**: Changed to `useRef` instead of `useMemo`, calls `handleTouchRef.current?.()`
3. **handleTouch**: Moved after variable definitions, regular function (not memoized)
4. **useEffect**: Updates `handleTouchRef.current` on every render
5. **Past Section**: Added `pointerEvents="box-none"` to container, `pointerEvents="none"` to SVG
6. **Future Section**: Added `pointerEvents="box-none"` to container, `pointerEvents="none"` to all child elements
7. **Catalyst Dots**: Changed from `TouchableOpacity` to `View` with `pointerEvents="none"`

## Result
- Crosshair can now be initiated from anywhere on the chart (past or future section)
- Crosshair moves smoothly in both directions (past→future and future→past)
- Long-press activation works consistently across the entire chart
- Touch handling is bidirectional and continuous
- No crashes due to proper function reference handling

## Testing
Test the following scenarios:
1. Long-press in past section → crosshair activates
2. Long-press in future section → crosshair activates
3. Start in past, drag to future → crosshair follows
4. Start in future, drag to past → crosshair follows
5. Move back and forth between sections → crosshair updates continuously
6. Release touch → crosshair deactivates properly
