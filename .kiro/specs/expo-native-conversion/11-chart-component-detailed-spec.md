# Stock Chart Component - Detailed Conversion Specification

## Critical Design Feature: Dual-Section Chart

### Overview
The stock chart component has a **unique dual-section design** that MUST be preserved:
1. **Left Section (60%)**: Historical price data with past events
2. **Right Section (40%)**: Future timeline with upcoming catalyst events

This is NOT a standard financial chart - it's a custom innovation that combines:
- Real-time/historical price visualization
- Past event markers (catalyst dots)
- Future event timeline projection
- Interactive crosshair with event snapping
- Multiple timeframe support (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
- Candlestick/Line chart toggle
- Session-based coloring (pre-market, regular, after-hours)

## Current Web Implementation Analysis

### File: `src/components/charts/stock-line-chart.tsx`
**Lines of Code**: ~2000+ (highly complex)
**Key Features**:
- Custom SVG path generation with Bezier smoothing
- Viewport split at 60/40 (customizable)
- Time-based positioning for intraday data
- Index-based positioning for multi-day data
- Event dot rendering with type-specific colors
- Crosshair with snap-to-event functionality
- Real-time price updates via WebSocket
- Market hours awareness (pre-market, regular, after-hours)
- Previous close reference line
- Volume bars (for candlestick mode)
- Price target projections

### Critical Code Sections

#### 1. Viewport Split Logic
```typescript
// Fixed viewport split at 60% past, 40% future
const customViewportSplit = 60;
const splitPosition = (customViewportSplit / 100) * chartWidth;

// Past section: 0 to splitPosition
// Future section: splitPosition to chartWidth
```

#### 2. Past Section Rendering
```typescript
// Intraday mode: Time-based positioning
const pointX = calculateIntradayXPosition(point.timestamp, marketHours, width);

// Multi-day mode: Index-based positioning
const pointX = calculateIndexBasedXPosition(originalIndex, data.length, actualWidth);

// Generate smooth Bezier path
const continuousPath = generateContinuousSmoothPath(points, width, height);
```

#### 3. Future Section Rendering
```typescript
// Calculate future event positions
const now = Date.now();
const futureWindowMs = 90 * 24 * 60 * 60 * 1000; // 90 days
const timeFromNow = catalyst.timestamp - now;
const eventXPercent = Math.min(1, Math.max(0, timeFromNow / futureWindowMs));

// Position in future section
const futureWidth = chartWidth - splitPosition;
const eventX = splitPosition + (eventXPercent * futureWidth);
```

#### 4. Event Dots (Past & Future)
```typescript
// Past events: Snap to actual data points
const eventDataPoint = renderData[eventRenderIndex];
const eventX = calculateIntradayXPosition(eventDataPoint.timestamp, marketHours, actualWidth);
const eventY = margin.top + chartHeight - ((eventDataPoint.value - minY) / valueRange) * chartHeight;

// Future events: Position on timeline
const eventColor = getEventTypeHexColor(catalyst.catalyst.type);
<circle
  cx={eventX}
  cy={eventY}
  r={6}
  fill={eventColor}
  className="cursor-pointer"
/>
```

#### 5. Crosshair Interaction
```typescript
// Detect which section user is hovering
if (x < splitPosition) {
  // Past section: Snap to nearest data point
  const closestPoint = findClosestDataPoint(viewBoxX, renderData);
  
  // Check proximity to past events
  if (showPastEvents && distance < snapThreshold) {
    // Snap to event
    closestPoint.catalyst = closestPastEvent;
  }
} else {
  // Future section: Continuous crosshair
  const xInFuture = x - splitPosition;
  const xPercentInFuture = xInFuture / futureWidth;
  const hoverTimestamp = now + (xPercentInFuture * futureWindowMs);
  
  // Check proximity to future events
  if (distance < snapThreshold) {
    setHoverEvent(closestEvent);
  }
}
```

## Native Conversion Strategy

### Technology Choice: Victory Native + Custom SVG

**Why Victory Native**:
- Built on react-native-svg (performant)
- Supports custom components
- Good touch handling
- Active maintenance

**Why NOT just Victory Native**:
- Need custom dual-section layout
- Need custom event dot rendering
- Need custom crosshair behavior
- Need precise control over positioning

**Solution**: Hybrid approach
- Use Victory Native for base chart rendering
- Use custom react-native-svg for event dots and future section
- Implement custom gesture handlers for crosshair

### Implementation Plan

#### Phase 1: Base Chart Structure
```typescript
import { VictoryChart, VictoryLine, VictoryAxis } from 'victory-native';
import Svg, { Line, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

export const StockChart = ({ 
  data, 
  futureCatalysts, 
  pastEvents,
  viewportSplit = 60 
}) => {
  const chartWidth = useSharedValue(0);
  const chartHeight = 312;
  
  // Calculate split position
  const splitPosition = (viewportSplit / 100) * chartWidth.value;
  const pastWidth = splitPosition;
  const futureWidth = chartWidth.value - splitPosition;
  
  return (
    <View onLayout={(e) => chartWidth.value = e.nativeEvent.layout.width}>
      <Svg width={chartWidth.value} height={chartHeight}>
        {/* Past section */}
        <PastPriceChart 
          data={data}
          width={pastWidth}
          height={chartHeight}
          pastEvents={pastEvents}
        />
        
        {/* Divider line */}
        <Line
          x1={splitPosition}
          y1={0}
          x2={splitPosition}
          y2={chartHeight}
          stroke="#666"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        
        {/* Future section */}
        <FutureEventsTimeline
          futureCatalysts={futureCatalysts}
          x={splitPosition}
          width={futureWidth}
          height={chartHeight}
        />
        
        {/* Crosshair overlay */}
        <CrosshairOverlay
          splitPosition={splitPosition}
          data={data}
          futureCatalysts={futureCatalysts}
        />
      </Svg>
    </View>
  );
};
```

#### Phase 2: Past Price Chart Component
```typescript
const PastPriceChart = ({ data, width, height, pastEvents }) => {
  // Generate path data
  const pathData = useMemo(() => {
    return generateSmoothPath(data, width, height);
  }, [data, width, height]);
  
  // Calculate Y positions for price scale
  const { minY, maxY, valueRange } = useMemo(() => {
    const prices = data.map(d => d.value);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const padding = range * 0.1;
    
    return {
      minY: min - padding,
      maxY: max + padding,
      valueRange: max - min + (padding * 2)
    };
  }, [data]);
  
  return (
    <>
      {/* Price line */}
      <Path
        d={pathData}
        stroke="#000"
        strokeWidth={2}
        fill="none"
      />
      
      {/* Past event dots */}
      {pastEvents.map((event, i) => {
        const dataPoint = findClosestDataPoint(event.timestamp, data);
        const x = calculateXPosition(dataPoint, data, width);
        const y = calculateYPosition(dataPoint.value, minY, valueRange, height);
        const color = getEventTypeColor(event.type);
        
        return (
          <Circle
            key={i}
            cx={x}
            cy={y}
            r={6}
            fill={color}
            onPress={() => handleEventPress(event)}
          />
        );
      })}
    </>
  );
};
```

#### Phase 3: Future Events Timeline
```typescript
const FutureEventsTimeline = ({ futureCatalysts, x, width, height }) => {
  const now = Date.now();
  const futureWindowMs = 90 * 24 * 60 * 60 * 1000; // 90 days
  
  return (
    <>
      {/* Timeline background */}
      <Rect
        x={x}
        y={0}
        width={width}
        height={height}
        fill="rgba(0,0,0,0.02)"
      />
      
      {/* Future event markers */}
      {futureCatalysts.map((catalyst, i) => {
        const timeFromNow = catalyst.timestamp - now;
        const xPercent = Math.min(1, Math.max(0, timeFromNow / futureWindowMs));
        const eventX = x + (xPercent * width);
        const eventY = height / 2; // Center vertically
        const color = getEventTypeColor(catalyst.catalyst.type);
        
        return (
          <G key={i}>
            {/* Vertical line */}
            <Line
              x1={eventX}
              y1={0}
              x2={eventX}
              y2={height}
              stroke={color}
              strokeWidth={2}
              strokeDasharray="4,4"
              opacity={0.5}
            />
            
            {/* Event dot */}
            <Circle
              cx={eventX}
              cy={eventY}
              r={8}
              fill={color}
              onPress={() => handleEventPress(catalyst.catalyst)}
            />
            
            {/* Event label */}
            <SvgText
              x={eventX}
              y={eventY + 20}
              fontSize={10}
              fill="#666"
              textAnchor="middle"
            >
              {catalyst.catalyst.type}
            </SvgText>
          </G>
        );
      })}
    </>
  );
};
```

#### Phase 4: Interactive Crosshair
```typescript
const CrosshairOverlay = ({ splitPosition, data, futureCatalysts }) => {
  const crosshairX = useSharedValue(-1);
  const crosshairY = useSharedValue(-1);
  const [hoverData, setHoverData] = useState(null);
  
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (event) => {
      crosshairX.value = event.x;
      crosshairY.value = event.y;
    },
    onActive: (event) => {
      crosshairX.value = event.x;
      crosshairY.value = event.y;
      
      // Determine which section
      if (event.x < splitPosition) {
        // Past section: Find closest data point
        runOnJS(findClosestPoint)(event.x, event.y);
      } else {
        // Future section: Find closest event
        runOnJS(findClosestEvent)(event.x);
      }
    },
    onEnd: () => {
      crosshairX.value = -1;
      crosshairY.value = -1;
      runOnJS(setHoverData)(null);
    },
  });
  
  const crosshairStyle = useAnimatedStyle(() => ({
    opacity: crosshairX.value >= 0 ? 1 : 0,
  }));
  
  return (
    <>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={StyleSheet.absoluteFill} />
      </PanGestureHandler>
      
      {/* Crosshair lines */}
      <Animated.View style={crosshairStyle}>
        <Svg>
          <Line
            x1={crosshairX}
            y1={0}
            x2={crosshairX}
            y2={height}
            stroke="#666"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          <Line
            x1={0}
            y1={crosshairY}
            x2={width}
            y2={crosshairY}
            stroke="#666"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        </Svg>
      </Animated.View>
      
      {/* Hover info popup */}
      {hoverData && (
        <HoverInfoPopup data={hoverData} x={crosshairX} y={crosshairY} />
      )}
    </>
  );
};
```

## Performance Optimizations

### 1. Path Memoization
```typescript
const pathData = useMemo(() => {
  return generateSmoothPath(data, width, height);
}, [data, width, height]);
```

### 2. Event Dot Virtualization
```typescript
// Only render events visible in viewport
const visibleEvents = useMemo(() => {
  return pastEvents.filter(event => {
    const x = calculateXPosition(event);
    return x >= 0 && x <= width;
  });
}, [pastEvents, width]);
```

### 3. Gesture Handler Optimization
```typescript
// Use worklets for smooth 60fps interactions
const gestureHandler = useAnimatedGestureHandler({
  onActive: (event) => {
    'worklet';
    crosshairX.value = event.x;
    crosshairY.value = event.y;
  },
});
```

### 4. Data Downsampling
```typescript
// For large datasets, downsample intelligently
const downsampledData = useMemo(() => {
  if (data.length > 500) {
    return downsampleLTTB(data, 200); // Largest Triangle Three Buckets
  }
  return data;
}, [data]);
```

## Testing Requirements

### Visual Regression Tests
- [ ] Past section renders correctly
- [ ] Future section renders correctly
- [ ] Divider line at correct position
- [ ] Event dots positioned correctly
- [ ] Colors match web version exactly

### Interaction Tests
- [ ] Crosshair follows touch
- [ ] Snaps to past events correctly
- [ ] Snaps to future events correctly
- [ ] Hover info displays correctly
- [ ] Timeframe switching works

### Performance Tests
- [ ] 60fps scrolling with chart visible
- [ ] Smooth crosshair movement
- [ ] No jank when switching timeframes
- [ ] Memory usage < 50MB for chart

## Migration Checklist

- [ ] Port viewport split logic
- [ ] Port time-based positioning (intraday)
- [ ] Port index-based positioning (multi-day)
- [ ] Port Bezier path generation
- [ ] Port event dot rendering
- [ ] Port crosshair interaction
- [ ] Port snap-to-event logic
- [ ] Port market hours awareness
- [ ] Port session coloring
- [ ] Port previous close line
- [ ] Port real-time updates
- [ ] Port candlestick mode
- [ ] Port volume bars
- [ ] Port price targets
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Test on tablets
- [ ] Performance profiling
- [ ] Visual comparison with web

## Success Criteria

✅ Dual-section layout preserved exactly
✅ 60/40 split maintained
✅ Past events render on price line
✅ Future events render on timeline
✅ Crosshair works in both sections
✅ Event snapping works correctly
✅ All timeframes supported
✅ Candlestick mode works
✅ Performance: 60fps interactions
✅ Visual match: 100% identical to web
