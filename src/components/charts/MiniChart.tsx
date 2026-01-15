/**
 * MiniChart Component - React Native Port
 * 
 * Simplified version that focuses on rendering the chart correctly
 * without complex timezone calculations that cause issues in React Native.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Line, Rect, Defs, ClipPath } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Point, generateContinuousSmoothPath } from '../../utils/bezier-path-utils';
import { 
  getMarketHoursBounds, 
  getTradingDayFromData, 
  calculateIntradayXPosition 
} from '../../utils/chart-time-utils';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import { getEventTypeHexColor } from '../../utils/event-formatting';

interface MarketEvent {
  id: string;
  type: string;
  [key: string]: any;
}

interface DataPoint {
  timestamp: number | string; // Can be number (ms) or string (ISO format)
  value: number;
  session?: string;
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: MarketEvent;
  dayIndex: number;
  position: number;
}

interface MiniChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  ticker?: string;
  futureCatalysts?: FutureCatalyst[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  centeredEventId?: string | null;
  disableAnimation?: boolean;
  previousDayData?: { close: number; previousClose: number } | null;
  shortenedTradingHours?: { open: string; close: string } | null;
  globalMinValue?: number;
  globalMaxValue?: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({ 
  data, 
  previousClose, 
  currentPrice,
  ticker,
  futureCatalysts = [],
  width = 300, 
  height = 60,
  strokeWidth = 1.5,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  // Determine current market period based on time (always use time-based calculation)
  const currentPeriod = useMemo(() => {
    const now = new Date();
    
    // Convert to ET using a more reliable method
    // Get UTC time and adjust for ET offset
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcTotalMinutes = utcHours * 60 + utcMinutes;
    
    // ET is UTC-5 (EST) or UTC-4 (EDT)
    // For simplicity, we'll use EST (UTC-5) year-round
    // In production, you'd want to handle DST properly
    const etOffset = -5 * 60; // -5 hours in minutes
    let etTotalMinutes = utcTotalMinutes + etOffset;
    
    // Handle day wraparound
    if (etTotalMinutes < 0) {
      etTotalMinutes += 24 * 60;
    } else if (etTotalMinutes >= 24 * 60) {
      etTotalMinutes -= 24 * 60;
    }
    
    const etHours = Math.floor(etTotalMinutes / 60);
    const etMinutes = etTotalMinutes % 60;
    
    // Check day of week in ET
    const etDate = new Date(now.getTime() + etOffset * 60 * 1000);
    const dayOfWeek = etDate.getUTCDay();
    
    // Closed on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'closed' as const;
    }
    
    const preMarketStart = 4 * 60; // 4:00 AM
    const regularStart = 9 * 60 + 30; // 9:30 AM
    const regularEnd = 16 * 60; // 4:00 PM
    const afterHoursEnd = 20 * 60; // 8:00 PM
    
    let calculatedPeriod: 'premarket' | 'regular' | 'afterhours' | 'closed';
    
    if (etTotalMinutes < preMarketStart) {
      calculatedPeriod = 'closed';
    } else if (etTotalMinutes < regularStart) {
      calculatedPeriod = 'premarket';
    } else if (etTotalMinutes < regularEnd) {
      calculatedPeriod = 'regular';
    } else if (etTotalMinutes < afterHoursEnd) {
      calculatedPeriod = 'afterhours';
    } else {
      calculatedPeriod = 'closed';
    }
    
    return calculatedPeriod;
  }, [data]);
  
  // Determine if we're in a live trading session based on currentPeriod
  const isLiveSession = useMemo(() => {
    return currentPeriod === 'premarket' || currentPeriod === 'regular' || currentPeriod === 'afterhours';
  }, [currentPeriod]);

  // Get session opacity based on current period
  const getSessionOpacity = (session: 'premarket' | 'regular' | 'afterhours') => {
    if (currentPeriod === 'closed') return 1;
    return currentPeriod === session ? 1 : 0.3;
  };
  
  // Pulsing animation for live sessions
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    if (isLiveSession) {
      // Create echo/ripple effect - expands outward and fades
      const pulse = Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 2.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      return () => {
        pulse.stop();
      };
    } else {
      // Reset to initial values when not live
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.4);
    }
  }, [isLiveSession, currentPeriod, pulseAnim, pulseOpacity]);
  
  // Generate unique clip path ID
  const clipPathId = useMemo(() => {
    const safeTicker = (ticker || 'default').replace(/[^a-zA-Z0-9]/g, '');
    return `chart-${safeTicker}-${Math.random().toString(36).substring(2, 11)}`;
  }, [ticker]);

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        path: '',
        isPositive: true,
        lastPointX: 0,
        lastPointY: height / 2,
        previousCloseY: null,
        preMarketEndX: 0,
        regularHoursEndX: 0,
      };
    }

    // Get trading day and market hours for time-based positioning
    const tradingDay = getTradingDayFromData(data);
    const marketHours = getMarketHoursBounds(tradingDay);

    // Get all values for scaling
    const values = data.map(d => d.value);
    const effectivePreviousClose = previousClose || values[0];
    
    // Calculate min/max with padding
    const allValues = [...values, effectivePreviousClose, currentPrice];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.3;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY || 1; // Prevent division by zero

    // Determine session boundaries based on data
    // Data is chronological and has session field
    let preMarketEndX = 0;
    let regularHoursEndX = 0;
    
    // Find the transition points between sessions
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      const session = point.session?.toLowerCase();
      
      // Calculate time-based X position for this point (0 = 8 AM, width = 8 PM)
      const timestamp = typeof point.timestamp === 'string' 
        ? new Date(point.timestamp).getTime() 
        : point.timestamp;
      const x = calculateIntradayXPosition(timestamp, marketHours, width);
      
      // Track the last X position of pre-market (transition to regular)
      if (session === 'pre-market' && (i === data.length - 1 || data[i + 1]?.session?.toLowerCase() !== 'pre-market')) {
        preMarketEndX = x;
      }
      
      // Track the last X position of regular hours (transition to after-hours)
      if (session === 'regular' && (i === data.length - 1 || 
          (data[i + 1]?.session?.toLowerCase() !== 'regular' && 
           data[i + 1]?.session?.toLowerCase() !== undefined))) {
        regularHoursEndX = x;
      }
    }
    
    // Convert data points to SVG coordinates using TIME-BASED positioning
    // The past section represents the full 12-hour trading day (8 AM - 8 PM ET)
    const points: Point[] = data.map((point) => {
      // Convert timestamp to milliseconds if it's a string
      const timestamp = typeof point.timestamp === 'string' 
        ? new Date(point.timestamp).getTime() 
        : point.timestamp;
      
      // Use time-based X positioning (0 = 8 AM, width = 8 PM)
      const x = calculateIntradayXPosition(timestamp, marketHours, width);
      const y = height - ((point.value - minY) / valueRange) * height;
      
      return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? height / 2 : y };
    });

    // Generate smooth path
    const path = points.length > 1 ? generateContinuousSmoothPath([points], 0.4) : '';
    
    // Get last point position
    const lastPoint = points[points.length - 1] || { x: 0, y: height / 2 };
    
    // Calculate previous close Y position
    let previousCloseY: number | null = null;
    if (effectivePreviousClose) {
      previousCloseY = height - ((effectivePreviousClose - minY) / valueRange) * height;
      if (isNaN(previousCloseY)) previousCloseY = null;
    }

    // Determine if positive (current price >= previous close)
    // Use currentPrice, not the last data value, because data may be stale
    const isPositive = currentPrice >= effectivePreviousClose;

    return {
      path,
      isPositive,
      lastPointX: lastPoint.x,
      lastPointY: lastPoint.y,
      previousCloseY,
      preMarketEndX,
      regularHoursEndX,
    };
  }, [data, width, height, previousClose, currentPrice, ticker]);

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* Empty chart placeholder */}
      </View>
    );
  }

  const { path, isPositive, lastPointX, lastPointY, previousCloseY, preMarketEndX, regularHoursEndX } = chartData;
  const chartColor = isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';
  
  // Theme-aware colors
  const fadeOverlayColor = isDark ? 'rgba(3, 2, 19, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const previousCloseLineColor = isDark ? '#888888' : '#888888';
  
  // Future section gradients - should have dark/black background with edge fades
  const futureBackgroundColor = isDark ? '#030213' : '#ececf0'; // Black in dark mode, light grey in light mode
  const futureEdgeFadeStart = isDark ? 'rgba(3, 2, 19, 1)' : 'rgba(236, 236, 240, 0.75)'; // Solid at center
  const futureEdgeFadeEnd = isDark ? 'rgba(3, 2, 19, 0)' : 'rgba(236, 236, 240, 0)'; // Transparent at edges
  const futureTopFadeStart = isDark ? 'rgba(3, 2, 19, 1)' : 'rgba(255, 255, 255, 1)'; // Solid at top
  const futureTopFadeEnd = isDark ? 'rgba(3, 2, 19, 0)' : 'rgba(255, 255, 255, 0)'; // Transparent below
  const futureBottomFadeStart = isDark ? 'rgba(3, 2, 19, 0)' : 'rgba(255, 255, 255, 0)'; // Transparent above
  const futureBottomFadeEnd = isDark ? 'rgba(3, 2, 19, 1)' : 'rgba(255, 255, 255, 1)'; // Solid at bottom

  // Scale factor: SVG viewBox height (60) to container height (120)
  const containerHeight = 120;
  const scaleY = containerHeight / height;
  const scaledLastPointY = lastPointY * scaleY;

  // Layout: 58% past, 42% future
  const pastWidthPercent = 58;
  
  // Calculate the actual SVG width for the past section (this is what the viewBox should be)
  const pastSvgWidth = width; // The chart data is calculated using this width

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Past section with chart line */}
        <View style={[styles.pastSection, { width: `${pastWidthPercent}%` }]}>
          <Svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${pastSvgWidth} ${height}`}
            preserveAspectRatio="none"
          >
            <Defs>
              {/* Clip paths for each session - extended far beyond viewBox to prevent any clipping */}
              <ClipPath id={`${clipPathId}-premarket`}>
                <Rect x="0" y="-100" width={preMarketEndX + 2} height={height + 200} />
              </ClipPath>
              <ClipPath id={`${clipPathId}-regular`}>
                <Rect x={preMarketEndX - 2} y="-100" width={(regularHoursEndX - preMarketEndX) + 4} height={height + 200} />
              </ClipPath>
              <ClipPath id={`${clipPathId}-afterhours`}>
                <Rect x={regularHoursEndX - 2} y="-100" width={(pastSvgWidth - regularHoursEndX) + 2} height={height + 200} />
              </ClipPath>
            </Defs>
            
            {/* Single path at full opacity */}
            {path && (
              <Path
                d={path}
                fill="none"
                stroke={chartColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                strokeOpacity={1}
              />
            )}
            
            {/* Fade overlays for non-current sessions using semi-transparent rectangles */}
            {currentPeriod === 'afterhours' && (
              <>
                {/* Fade pre-market region (if it exists) */}
                {preMarketEndX > 0 && (
                  <Rect
                    x={0}
                    y={0}
                    width={preMarketEndX}
                    height={height}
                    fill={fadeOverlayColor}
                  />
                )}
                {/* Fade regular hours region (if it exists) */}
                {regularHoursEndX > preMarketEndX && (
                  <Rect
                    x={preMarketEndX}
                    y={0}
                    width={regularHoursEndX - preMarketEndX}
                    height={height}
                    fill={fadeOverlayColor}
                  />
                )}
              </>
            )}
            {currentPeriod === 'regular' && (
              <>
                {/* Fade pre-market region (if it exists) */}
                {preMarketEndX > 0 && (
                  <Rect
                    x={0}
                    y={0}
                    width={preMarketEndX}
                    height={height}
                    fill={fadeOverlayColor}
                  />
                )}
                {/* Fade after-hours region (if it exists) */}
                {regularHoursEndX > 0 && regularHoursEndX < pastSvgWidth && (
                  <Rect
                    x={regularHoursEndX}
                    y={0}
                    width={pastSvgWidth - regularHoursEndX}
                    height={height}
                    fill={fadeOverlayColor}
                  />
                )}
              </>
            )}
            {currentPeriod === 'premarket' && (
              <>
                {/* Fade regular hours region (if it exists) */}
                {regularHoursEndX > preMarketEndX && (
                  <Rect
                    x={preMarketEndX}
                    y={0}
                    width={regularHoursEndX - preMarketEndX}
                    height={height}
                    fill={fadeOverlayColor}
                  />
                )}
                {/* Fade after-hours region (if it exists) */}
                {regularHoursEndX > 0 && regularHoursEndX < pastSvgWidth && (
                  <Rect
                    x={regularHoursEndX}
                    y={0}
                    width={pastSvgWidth - regularHoursEndX}
                    height={height}
                    fill={fadeOverlayColor}
                  />
                )}
              </>
            )}
            
            {/* Previous close reference line */}
            {previousCloseY !== null && (
              <Line
                x1={0}
                y1={previousCloseY}
                x2={pastSvgWidth}
                y2={previousCloseY}
                stroke={previousCloseLineColor}
                strokeWidth={1}
                strokeDasharray="1,5"
                strokeLinecap="round"
                strokeOpacity={0.36}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </Svg>
        </View>
        
        {/* Current price dot - only shown during trading sessions (not when market is closed) */}
        {isLiveSession && (
          <View 
            style={[
              styles.nowDotContainer,
              { 
                left: `${(lastPointX / pastSvgWidth) * pastWidthPercent}%`,
                marginLeft: -4,
                top: scaledLastPointY - 4,
              }
            ]}
          >
            {/* Pulsing ring - always visible during live trading sessions */}
            <Animated.View
              style={[
                styles.pulsingRing,
                {
                  backgroundColor: chartColor,
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={[styles.nowDot, { backgroundColor: chartColor }]} />
          </View>
        )}

        {/* Future section with gradient and catalyst dots */}
        <View style={[styles.futureSection, { width: `${100 - pastWidthPercent}%`, backgroundColor: isDark ? '#030213' : '#ececf0' }]}>
          {/* Main horizontal gradient (left to right) - background to grey to background */}
          <LinearGradient
            colors={isDark 
              ? ['rgba(3, 2, 19, 1)', 'rgba(60, 60, 60, 1)', 'rgba(60, 60, 60, 1)', 'rgba(3, 2, 19, 1)']
              : ['rgba(255, 255, 255, 1)', 'rgba(236, 236, 240, 1)', 'rgba(236, 236, 240, 1)', 'rgba(255, 255, 255, 1)']}
            locations={[0, 0.2, 0.8, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Top gradient - background fading to transparent */}
          <LinearGradient
            colors={isDark 
              ? ['rgba(3, 2, 19, 1)', 'rgba(3, 2, 19, 0)']
              : ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)']}
            locations={[0, 0.25]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          
          {/* Bottom gradient - transparent to background */}
          <LinearGradient
            colors={isDark 
              ? ['rgba(3, 2, 19, 0)', 'rgba(3, 2, 19, 1)']
              : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
            locations={[0.75, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          
          {/* Catalyst dots - all positioned at scaled Y coordinate (same height as current price) */}
          {futureCatalysts.map((catalyst, index) => {
            const now = Date.now();
            const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
            const timeFromNow = catalyst.timestamp - now;
            const timeBufferMs = 14 * 24 * 60 * 60 * 1000; // 2 week buffer
            const adjustedTime = timeFromNow + timeBufferMs;
            const leftPercent = Math.min(95, Math.max(5, (adjustedTime / threeMonthsMs) * 100));
            
            const eventColor = getEventTypeHexColor(catalyst.catalyst.type);
            const dotBorderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
            
            return (
              <View
                key={`catalyst-${index}`}
                style={[
                  styles.catalystDot,
                  {
                    left: `${leftPercent}%`,
                    marginLeft: -5, // Center horizontally
                    top: scaledLastPointY - 5, // Center vertically on the line (scaled to container height)
                    backgroundColor: eventColor,
                    borderWidth: 1.5,
                    borderColor: dotBorderColor,
                  }
                ]}
              />
            );
          })}
        </View>
        
        {/* Dotted line from current price dot to end of chart - positioned absolutely to span both sections */}
        <View 
          style={[
            styles.upcomingEventsLine,
            {
              left: `${(lastPointX / pastSvgWidth) * pastWidthPercent}%`,
              width: `${100 - (lastPointX / pastSvgWidth) * pastWidthPercent}%`,
              top: 0,
              height: containerHeight,
            }
          ]}
          pointerEvents="none"
        >
          <Svg 
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 100 ${containerHeight}`}
            preserveAspectRatio="none"
          >
            <Line
              x1={0}
              y1={scaledLastPointY}
              x2={100}
              y2={scaledLastPointY}
              stroke={previousCloseLineColor}
              strokeWidth={1}
              strokeDasharray="1,5"
              strokeLinecap="round"
              strokeOpacity={0.6}
              vectorEffect="non-scaling-stroke"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chartContainer: {
    width: '100%',
    height: 120,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'visible',
  },
  emptyContainer: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastSection: {
    height: '100%',
    position: 'relative',
  },
  nowDotContainer: {
    position: 'absolute',
    width: 8,
    height: 8,
    zIndex: 30, // Higher than chart sections
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.4,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  futureSection: {
    height: '100%',
    position: 'relative',
  },
  upcomingEventsLine: {
    position: 'absolute',
    zIndex: 25, // Below the dot but above the chart
  },
  catalystDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
