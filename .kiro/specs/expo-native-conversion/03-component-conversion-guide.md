# Component Conversion Guide

## 🚨 CRITICAL: Source of Truth

**THE ACTUAL WEB APP IS THE ONLY SOURCE OF TRUTH**

This guide provides conversion examples, but you MUST validate against the actual web app.

### If This Guide Conflicts with Web App:
- ✅ Implement what the web app does
- ❌ Ignore this guide
- 📝 Update this guide to match reality

**Always use the side-by-side comparison tool to validate your implementation.**

## UI Component Library Conversion

### Button Component
**Web**: `src/components/ui/button.tsx` (Radix Slot + CVA)
**Native**: Custom component with Pressable

```typescript
// Native implementation
import { Pressable, Text, StyleSheet } from 'react-native';
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        outline: 'border border-input bg-background',
        ghost: 'hover:bg-accent',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3',
        lg: 'h-10 px-6',
      },
    },
  }
);

export const Button = ({ variant, size, children, ...props }) => {
  return (
    <Pressable className={buttonVariants({ variant, size })} {...props}>
      <Text>{children}</Text>
    </Pressable>
  );
};
```

### Card Component
**Web**: `src/components/ui/card.tsx` (div-based)
**Native**: View-based with NativeWind

```typescript
import { View, Text } from 'react-native';

export const Card = ({ className, children, ...props }) => {
  return (
    <View className={`bg-card rounded-xl border border-border ${className}`} {...props}>
      {children}
    </View>
  );
};

export const CardHeader = ({ className, children, ...props }) => {
  return (
    <View className={`px-6 pt-6 ${className}`} {...props}>
      {children}
    </View>
  );
};
```

### Dialog/Modal Component
**Web**: `@radix-ui/react-dialog`
**Native**: `react-native-modal`

```typescript
import Modal from 'react-native-modal';
import { View, Text, Pressable } from 'react-native';

export const Dialog = ({ isVisible, onClose, children }) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={{ margin: 0, justifyContent: 'flex-end' }}
    >
      <View className="bg-background rounded-t-xl p-6">
        {children}
      </View>
    </Modal>
  );
};
```

### ScrollArea Component
**Web**: `@radix-ui/react-scroll-area`
**Native**: `ScrollView` or `FlatList`

```typescript
import { ScrollView } from 'react-native';

export const ScrollArea = ({ className, children, ...props }) => {
  return (
    <ScrollView
      className={className}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
};
```

### Input Component
**Web**: HTML input element
**Native**: TextInput

```typescript
import { TextInput } from 'react-native';

export const Input = ({ className, ...props }) => {
  return (
    <TextInput
      className={`h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  );
};
```

## Chart Components Conversion

## Chart Components Conversion ⚠️ CRITICAL SECTION

### ⚠️ IMPORTANT: Dual-Section Chart Design
The stock chart is NOT a standard financial chart. It has a **unique dual-section design** that MUST be preserved:
- **Left 60%**: Historical price data with past event markers
- **Right 40%**: Future timeline with upcoming catalyst events
- Custom crosshair that works differently in each section
- Event dots that snap to price points in past section
- Event markers on timeline in future section

**See document 11-chart-component-detailed-spec.md for complete specification.**

### Stock Line Chart (Dual-Section)
**Web**: `src/components/charts/stock-line-chart.tsx` (2000+ lines, highly complex)
**Native**: Victory Native + Custom react-native-svg (hybrid approach)
**Complexity**: VERY HIGH

**Key Requirements**:
1. Preserve 60/40 viewport split
2. Past section: Price line with event dots
3. Future section: Event timeline with vertical markers
4. Interactive crosshair with section-aware behavior
5. Snap-to-event functionality
6. Multiple timeframe support (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)
7. Real-time price updates
8. Market session awareness (pre-market, regular, after-hours)

```typescript
import { VictoryChart, VictoryLine } from 'victory-native';
import Svg, { Line, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler } from 'react-native-reanimated';

export const DualSectionStockChart = ({ 
  data, 
  futureCatalysts, 
  pastEvents,
  viewportSplit = 60, // 60% past, 40% future
  width,
  height = 312 
}) => {
  const splitPosition = (viewportSplit / 100) * width;
  const pastWidth = splitPosition;
  const futureWidth = width - splitPosition;
  
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* PAST SECTION (Left 60%) */}
        <G>
          {/* Price line path */}
          <Path
            d={generateSmoothPath(data, pastWidth, height)}
            stroke="#000"
            strokeWidth={2}
            fill="none"
          />
          
          {/* Past event dots on price line */}
          {pastEvents.map((event, i) => {
            const point = findDataPointForEvent(event, data);
            const x = calculateXPosition(point, data, pastWidth);
            const y = calculateYPosition(point.value, height);
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
        </G>
        
        {/* DIVIDER LINE */}
        <Line
          x1={splitPosition}
          y1={0}
          x2={splitPosition}
          y2={height}
          stroke="#666"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        
        {/* FUTURE SECTION (Right 40%) */}
        <G>
          {/* Timeline background */}
          <Rect
            x={splitPosition}
            y={0}
            width={futureWidth}
            height={height}
            fill="rgba(0,0,0,0.02)"
          />
          
          {/* Future event markers */}
          {futureCatalysts.map((catalyst, i) => {
            const now = Date.now();
            const futureWindowMs = 90 * 24 * 60 * 60 * 1000; // 90 days
            const timeFromNow = catalyst.timestamp - now;
            const xPercent = Math.min(1, timeFromNow / futureWindowMs);
            const eventX = splitPosition + (xPercent * futureWidth);
            const eventY = height / 2;
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
        </G>
        
        {/* INTERACTIVE CROSSHAIR OVERLAY */}
        <CrosshairOverlay
          splitPosition={splitPosition}
          data={data}
          futureCatalysts={futureCatalysts}
          width={width}
          height={height}
        />
      </Svg>
    </View>
  );
};

// Crosshair with section-aware behavior
const CrosshairOverlay = ({ splitPosition, data, futureCatalysts, width, height }) => {
  const crosshairX = useSharedValue(-1);
  const crosshairY = useSharedValue(-1);
  
  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      'worklet';
      crosshairX.value = event.x;
      crosshairY.value = event.y;
      
      // Section-aware behavior
      if (event.x < splitPosition) {
        // Past section: Snap to nearest data point
        runOnJS(snapToDataPoint)(event.x, event.y);
      } else {
        // Future section: Snap to nearest event
        runOnJS(snapToFutureEvent)(event.x);
      }
    },
    onEnd: () => {
      crosshairX.value = -1;
      crosshairY.value = -1;
    },
  });
  
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={StyleSheet.absoluteFill}>
        {/* Crosshair lines rendered here */}
      </Animated.View>
    </PanGestureHandler>
  );
};
```

**Performance Optimizations**:
- Memoize path generation
- Virtualize event dots (only render visible)
- Use worklets for 60fps crosshair
- Downsample data for large datasets (LTTB algorithm)
- Lazy load future events

**Testing Requirements**:
- Visual regression test against web version
- Test on iPhone SE (low-end iOS)
- Test on budget Android device
- Verify 60fps crosshair movement
- Verify event snapping accuracy
- Test all timeframes (1D, 1W, 1M, 3M, YTD, 1Y, 5Y)

### Stock Line Chart
**Web**: `src/components/charts/stock-line-chart.tsx` (Recharts + SVG)
**Native**: Victory Native + react-native-svg

```typescript
import { VictoryLine, VictoryChart, VictoryAxis } from 'victory-native';
import Svg from 'react-native-svg';

export const StockLineChart = ({ data, width, height }) => {
  return (
    <VictoryChart width={width} height={height}>
      <VictoryLine
        data={data}
        x="timestamp"
        y="value"
        style={{
          data: { stroke: '#000' },
        }}
      />
      <VictoryAxis />
    </VictoryChart>
  );
};
```

### Candlestick Chart
**Web**: Custom SVG implementation
**Native**: Custom SVG with react-native-svg

```typescript
import Svg, { Line, Rect } from 'react-native-svg';

export const CandlestickChart = ({ data, width, height }) => {
  return (
    <Svg width={width} height={height}>
      {data.map((candle, i) => (
        <React.Fragment key={i}>
          <Line
            x1={candle.x}
            y1={candle.high}
            x2={candle.x}
            y2={candle.low}
            stroke="#000"
            strokeWidth={1}
          />
          <Rect
            x={candle.x - 5}
            y={Math.min(candle.open, candle.close)}
            width={10}
            height={Math.abs(candle.open - candle.close)}
            fill={candle.open > candle.close ? '#FF4444' : '#00C851'}
          />
        </React.Fragment>
      ))}
    </Svg>
  );
};
```

## Navigation Components

### Bottom Navigation
**Web**: Custom component with buttons
**Native**: React Navigation Bottom Tabs

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Sparkles, Search, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export const BottomNavigation = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1 },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Timeline"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Home color={color} /> }}
      />
      <Tab.Screen
        name="Copilot"
        component={CopilotScreen}
        options={{ tabBarIcon: ({ color }) => <Sparkles color={color} /> }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarIcon: ({ color }) => <Search color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <User color={color} /> }}
      />
    </Tab.Navigator>
  );
};
```

## Drag & Drop Components

### Draggable Stock List
**Web**: react-dnd
**Native**: react-native-draggable-flatlist

```typescript
import DraggableFlatList from 'react-native-draggable-flatlist';

export const DraggableStockList = ({ stocks, onReorder }) => {
  return (
    <DraggableFlatList
      data={stocks}
      onDragEnd={({ data }) => onReorder(data)}
      keyExtractor={(item) => item.symbol}
      renderItem={({ item, drag, isActive }) => (
        <Pressable
          onLongPress={drag}
          disabled={isActive}
          className={`p-4 bg-card ${isActive ? 'opacity-50' : ''}`}
        >
          <Text>{item.symbol}</Text>
        </Pressable>
      )}
    />
  );
};
```
