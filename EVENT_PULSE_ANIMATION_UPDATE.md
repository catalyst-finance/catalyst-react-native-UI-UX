# Event Pulse Animation Update

## Change
Updated the nearest upcoming event dot pulse animation to match the echo/ripple effect used on the stock chart's current price dot, with a more subtle radius.

## Previous Animation
- Pulsed in and out (1x → 1.5x → 1x scale)
- Opacity faded in and out (0.6 → 0 → 0.6)
- Duration: 1000ms per cycle (2000ms total)
- Created a "breathing" effect

## New Animation (Echo/Ripple Effect)
- Only expands outward (1x → 1.5x scale, no return)
- Opacity fades to transparent (0.4 → 0)
- Duration: 2000ms per cycle
- Creates a subtle echo/ripple effect that emanates from the dot
- More restrained than the stock chart animation for better visual balance

## Implementation Details

### Animation Values:
```typescript
const pulseAnim = useRef(new Animated.Value(1)).current;
const pulseOpacity = useRef(new Animated.Value(0.4)).current;
```

### Animation Loop:
```typescript
const pulse = Animated.loop(
  Animated.parallel([
    Animated.timing(pulseAnim, {
      toValue: 1.5,        // Expands to 1.5x size (reduced from 2.5x)
      duration: 2000,      // Over 2 seconds
      useNativeDriver: true,
    }),
    Animated.timing(pulseOpacity, {
      toValue: 0,          // Fades to transparent
      duration: 2000,      // Over 2 seconds
      useNativeDriver: true,
    }),
  ])
);
```

### Visual Effect:
- The pulse ring starts at 32px (same as dot container)
- Expands to 48px (32px × 1.5)
- Simultaneously fades from 40% opacity to 0%
- Creates a subtle ripple that emanates outward
- Resets instantly and repeats continuously

## Space Requirements

With the 1.5x scale:
- Pulse ring max size: `48px` (32px × 1.5)
- Pulse extends: `8px` above and `8px` below the 32px container
- Current space above dot container: `8px` (from wrapper padding)
- **Perfect fit**: The pulse fits exactly within the allocated space

## Files Modified
- `src/components/events/UpcomingEventsTimeline.tsx`

## Benefits
- ✅ Subtle and professional appearance
- ✅ Better visual feedback for "upcoming" status
- ✅ Smoother, more elegant animation
- ✅ Fits perfectly within allocated space (no overflow)
- ✅ More appropriate scale for timeline context
