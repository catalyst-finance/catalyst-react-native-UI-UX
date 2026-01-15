/**
 * InlineChartCard.tsx
 * 
 * Renders a stock price chart card matching the web app design.
 * Shows ticker badge, price with today/after-hours changes, and mini chart.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Path, Line, Text as SvgText, Rect, Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as designColors } from '../../constants/design-tokens';
import { supabase } from '../../services/supabase/client';
import { 
  getMarketHoursBounds, 
  getTradingDayFromData, 
  calculateIntradayXPosition 
} from '../../utils/chart-time-utils';
import { generateContinuousSmoothPath, Point } from '../../utils/bezier-path-utils';

interface InlineChartCardProps {
  symbol: string;
  timeRange: string;
  onTickerClick?: (ticker: string) => void;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  value: number;
  volume?: number;
  session?: string;
}

interface QuoteData {
  close: number;
  previous_close: number;
  change: number;
  change_percent: number;
  after_hours_price?: number;
  after_hours_change?: number;
  after_hours_change_percent?: number;
}

export function InlineChartCard({
  symbol,
  timeRange,
  onTickerClick,
}: InlineChartCardProps) {
  const { isDark } = useTheme();
  const themeColors = isDark ? designColors.dark : designColors.light;
  
  const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64; // Account for padding
  const chartHeight = 120;

  const colors = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    cardBackground: isDark ? '#0d0d0d' : '#f8f9fa',
    border: isDark ? '#2a2a2a' : '#e5e5e5',
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? '#888888' : '#666666',
    labelText: isDark ? '#666666' : '#999999',
    positive: '#22c55e',
    negative: '#f97316', // Orange for negative (matching web app)
    gridLine: isDark ? '#333333' : '#e5e5e5',
    fadeOverlay: isDark ? 'rgba(13, 13, 13, 0.7)' : 'rgba(248, 249, 250, 0.7)', // Match card background
  };

  // Determine current market period based on time (same logic as MiniChart)
  const currentPeriod = useMemo(() => {
    const now = new Date();
    
    // Get UTC time and adjust for ET offset
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcTotalMinutes = utcHours * 60 + utcMinutes;
    
    // ET is UTC-5 (EST)
    const etOffset = -5 * 60;
    let etTotalMinutes = utcTotalMinutes + etOffset;
    
    // Handle day wraparound
    if (etTotalMinutes < 0) {
      etTotalMinutes += 24 * 60;
    } else if (etTotalMinutes >= 24 * 60) {
      etTotalMinutes -= 24 * 60;
    }
    
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
    
    if (etTotalMinutes < preMarketStart) {
      return 'closed' as const;
    } else if (etTotalMinutes < regularStart) {
      return 'premarket' as const;
    } else if (etTotalMinutes < regularEnd) {
      return 'regular' as const;
    } else if (etTotalMinutes < afterHoursEnd) {
      return 'afterhours' as const;
    } else {
      return 'closed' as const;
    }
  }, []);

  // Determine if we're in a live trading session
  const isLiveSession = useMemo(() => {
    return currentPeriod === 'premarket' || currentPeriod === 'regular' || currentPeriod === 'afterhours';
  }, [currentPeriod]);

  // Pulsing animation for live sessions
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    if (isLiveSession) {
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
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.4);
    }
  }, [isLiveSession, pulseAnim, pulseOpacity]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(false);

      try {
        const normalizedTimeRange = timeRange.toUpperCase();
        
        // Get current time and determine the trading day (same logic as HistoricalPriceAPI)
        const now = new Date();
        
        // Get current hour in ET
        const etHourStr = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          hour12: false,
        }).format(now);
        const etHour = parseInt(etHourStr, 10);
        
        // Check if we're in the overnight period (12:00 AM - 4:00 AM ET)
        const isOvernightPeriod = etHour < 4;
        
        // Get today's date in ET
        const etDateParts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(now);
        
        let year = parseInt(etDateParts.find(p => p.type === 'year')?.value || '2026', 10);
        let month = parseInt(etDateParts.find(p => p.type === 'month')?.value || '01', 10);
        let day = parseInt(etDateParts.find(p => p.type === 'day')?.value || '01', 10);
        
        // If overnight, go back one day
        if (isOvernightPeriod) {
          const tempDate = new Date(year, month - 1, day);
          tempDate.setDate(tempDate.getDate() - 1);
          year = tempDate.getFullYear();
          month = tempDate.getMonth() + 1;
          day = tempDate.getDate();
        }
        
        // Create start of day in UTC (midnight ET = 5:00 AM UTC for EST)
        const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

        // Fetch price data from five_minute_prices (same as HistoricalPriceAPI for 1D)
        const { data: prices, error: priceError } = await supabase
          .from('five_minute_prices')
          .select('timestamp, open, high, low, close, volume, session')
          .eq('symbol', symbol)
          .gte('timestamp', startOfDayUTC.toISOString())
          .lt('timestamp', endOfDayUTC.toISOString())
          .order('timestamp', { ascending: true })
          .limit(200);

        if (priceError) throw priceError;

        // Fetch quote data
        const { data: quoteResult, error: quoteError } = await supabase
          .from('finnhub_quote_snapshots')
          .select('*')
          .eq('symbol', symbol)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (!quoteError && quoteResult && quoteResult.length > 0) {
          const quote = quoteResult[0];
          const todayChange = quote.close - quote.previous_close;
          const todayChangePercent = ((quote.close - quote.previous_close) / quote.previous_close) * 100;
          
          setQuoteData({
            close: quote.close,
            previous_close: quote.previous_close,
            change: todayChange,
            change_percent: todayChangePercent,
            // After hours data if available
            after_hours_price: quote.after_hours_price,
            after_hours_change: quote.after_hours_change,
            after_hours_change_percent: quote.after_hours_change_percent,
          });
        }

        // Map to chart format
        const mappedData: ChartDataPoint[] = (prices || []).map((row: any) => {
          return {
            timestamp: new Date(row.timestamp).getTime(),
            price: row.close,
            value: row.close,
            volume: row.volume,
            session: row.session || 'regular',
          };
        });

        setChartData(mappedData);
        setIsLoading(false);
      } catch (err) {
        console.error('[InlineChartCard] Fetch error:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeRange]);

  // Calculate chart path and time labels using time-based positioning
  const chartRender = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { path: '', timeLabels: [], previousCloseY: null, preMarketEndX: 0, regularHoursEndX: 0, lastPointX: 0, lastPointY: chartHeight / 2 };
    }

    // Get trading day and market hours for time-based positioning
    const tradingDay = getTradingDayFromData(chartData.map(d => ({ timestamp: d.timestamp })));
    const marketHours = getMarketHoursBounds(tradingDay);

    const values = chartData.map(d => d.value);
    const effectivePreviousClose = quoteData?.previous_close || values[0];
    
    // Calculate min/max with padding
    const allValues = [...values, effectivePreviousClose];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.15;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY || 1;

    // Track session boundaries
    let preMarketEndX = 0;
    let regularHoursEndX = 0;
    
    // Find the transition points between sessions
    for (let i = 0; i < chartData.length; i++) {
      const point = chartData[i];
      const session = point.session?.toLowerCase();
      const x = calculateIntradayXPosition(point.timestamp, marketHours, chartWidth);
      
      // Track the last X position of pre-market (transition to regular)
      if (session === 'pre-market' && (i === chartData.length - 1 || chartData[i + 1]?.session?.toLowerCase() !== 'pre-market')) {
        preMarketEndX = x;
      }
      
      // Track the last X position of regular hours (transition to after-hours)
      if (session === 'regular' && (i === chartData.length - 1 || 
          (chartData[i + 1]?.session?.toLowerCase() !== 'regular' && 
           chartData[i + 1]?.session?.toLowerCase() !== undefined))) {
        regularHoursEndX = x;
      }
    }

    // Convert to SVG points using TIME-BASED positioning (same as MiniChart)
    // The chart represents the full 12-hour trading day (8 AM - 8 PM ET)
    const points: Point[] = chartData.map((point) => {
      // Use time-based X positioning (0 = 8 AM, chartWidth = 8 PM)
      const x = calculateIntradayXPosition(point.timestamp, marketHours, chartWidth);
      const y = chartHeight - ((point.value - minY) / valueRange) * chartHeight;
      return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? chartHeight / 2 : y };
    });

    // Generate smooth path using the same utility as MiniChart
    const path = points.length > 1 ? generateContinuousSmoothPath([points], 0.4) : '';

    // Get last point position for the current price dot
    const lastPoint = points[points.length - 1] || { x: 0, y: chartHeight / 2 };

    // Calculate previous close Y
    const previousCloseY = chartHeight - ((effectivePreviousClose - minY) / valueRange) * chartHeight;

    // Generate time labels aligned with session boundaries
    // Calculate the X position for 4 PM (16:00 ET) using time-based positioning
    const fourPmET = new Date(tradingDay);
    fourPmET.setUTCHours(16 + 5, 0, 0, 0); // 4 PM ET = 21:00 UTC (16:00 + 5 hour offset)
    const fourPmX = calculateIntradayXPosition(fourPmET.getTime(), marketHours, chartWidth);
    
    const timeLabels = [
      { x: preMarketEndX, label: '9:30 AM', offset: -25 }, // Longer text, larger offset
      { x: fourPmX, label: '4 PM', offset: -12 }, // Use calculated 4 PM position
      { x: chartWidth * 0.95, label: '8 PM', offset: -12 }, // Shorter text
    ];

    return { 
      path, 
      timeLabels, 
      previousCloseY: isNaN(previousCloseY) ? null : previousCloseY,
      preMarketEndX,
      regularHoursEndX,
      lastPointX: lastPoint.x,
      lastPointY: lastPoint.y,
    };
  }, [chartData, quoteData, chartWidth, chartHeight]);

  // Calculate after-hours change from chart data (when in after-hours period)
  const afterHoursChange = useMemo(() => {
    // Only calculate during after-hours or closed (overnight)
    if (currentPeriod !== 'afterhours' && currentPeriod !== 'closed') {
      return null;
    }
    
    if (!chartData || chartData.length === 0) {
      return null;
    }
    
    // Find the last regular session data point
    let regularSessionClose: number | null = null;
    for (let i = chartData.length - 1; i >= 0; i--) {
      const point = chartData[i];
      if (point.session === 'regular') {
        regularSessionClose = point.value;
        break;
      }
    }
    
    // Find the last after-hours data point
    const afterHoursData = chartData.filter(d => d.session === 'after-hours');
    const lastAfterHoursValue = afterHoursData.length > 0 
      ? afterHoursData[afterHoursData.length - 1].value 
      : null;
    
    // Calculate after-hours change
    if (regularSessionClose !== null && regularSessionClose > 0 && lastAfterHoursValue !== null) {
      const dollarChange = lastAfterHoursValue - regularSessionClose;
      const percentChange = (dollarChange / regularSessionClose) * 100;
      return { dollarChange, percentChange };
    }
    
    return null;
  }, [chartData, currentPeriod]);

  const isPositive = quoteData ? quoteData.change_percent >= 0 : true;
  const priceColor = isPositive ? colors.positive : colors.negative;
  const chartColor = isPositive ? colors.positive : colors.negative; // Match chart line to price direction

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => onTickerClick?.(symbol)}
      activeOpacity={0.8}
    >
      {/* Header Row */}
      <View style={styles.header}>
        {/* Ticker Badge */}
        <View style={styles.tickerBadge}>
          <Text style={styles.tickerText}>{symbol}</Text>
        </View>
        
        {/* Price and Changes */}
        {quoteData && (
          <View style={styles.priceSection}>
            <Text style={[styles.price, { color: priceColor }]}>
              ${quoteData.close.toFixed(2)}
            </Text>
            <View style={styles.changesRow}>
              {/* Today's Change */}
              <View style={styles.changeItem}>
                <View style={styles.changeValueRow}>
                  <Text style={[styles.changeArrow, { color: isPositive ? colors.positive : colors.negative }]}>
                    {isPositive ? '▲' : '▼'}
                  </Text>
                  <Text style={[styles.changePercent, { color: isPositive ? colors.positive : colors.negative }]}>
                    {Math.abs(quoteData.change_percent).toFixed(2)}%
                  </Text>
                </View>
                {(afterHoursChange || (currentPeriod === 'afterhours' || currentPeriod === 'closed')) && (
                  <Text style={[styles.changeLabel, { color: colors.secondaryText }]}>
                    Today
                  </Text>
                )}
              </View>
              
              {/* After Hours Change - use calculated value or database value */}
              {(afterHoursChange || quoteData.after_hours_change_percent !== undefined) && (
                <View style={styles.changeItem}>
                  <View style={styles.changeValueRow}>
                    <Text style={[styles.changeArrow, { color: (afterHoursChange?.percentChange ?? quoteData.after_hours_change_percent ?? 0) >= 0 ? colors.positive : colors.negative }]}>
                      {(afterHoursChange?.percentChange ?? quoteData.after_hours_change_percent ?? 0) >= 0 ? '▲' : '▼'}
                    </Text>
                    <Text style={[styles.changePercent, { color: (afterHoursChange?.percentChange ?? quoteData.after_hours_change_percent ?? 0) >= 0 ? colors.positive : colors.negative }]}>
                      {Math.abs(afterHoursChange?.percentChange ?? quoteData.after_hours_change_percent ?? 0).toFixed(2)}%
                    </Text>
                  </View>
                  <Text style={[styles.changeLabel, { color: colors.secondaryText }]}>
                    After Hours
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={themeColors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.secondaryText }]}>
              Unable to load chart
            </Text>
          </View>
        ) : chartRender.path ? (
          <>
          <Svg width={chartWidth} height={chartHeight + 20}>
            {/* Previous close reference line */}
            {chartRender.previousCloseY !== null && (
              <Line
                x1={0}
                y1={chartRender.previousCloseY}
                x2={chartWidth}
                y2={chartRender.previousCloseY}
                stroke={colors.gridLine}
                strokeWidth={1}
                strokeDasharray="4,4"
                strokeOpacity={0.5}
              />
            )}
            
            {/* Chart line */}
            <Path
              d={chartRender.path}
              fill="none"
              stroke={chartColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Fade overlays for non-current sessions (same logic as MiniChart) */}
            {currentPeriod === 'afterhours' && (
              <>
                {/* Fade pre-market region */}
                {chartRender.preMarketEndX > 0 && (
                  <Rect
                    x={0}
                    y={0}
                    width={chartRender.preMarketEndX}
                    height={chartHeight}
                    fill={colors.fadeOverlay}
                  />
                )}
                {/* Fade regular hours region */}
                {chartRender.regularHoursEndX > chartRender.preMarketEndX && (
                  <Rect
                    x={chartRender.preMarketEndX}
                    y={0}
                    width={chartRender.regularHoursEndX - chartRender.preMarketEndX}
                    height={chartHeight}
                    fill={colors.fadeOverlay}
                  />
                )}
              </>
            )}
            {currentPeriod === 'regular' && (
              <>
                {/* Fade pre-market region */}
                {chartRender.preMarketEndX > 0 && (
                  <Rect
                    x={0}
                    y={0}
                    width={chartRender.preMarketEndX}
                    height={chartHeight}
                    fill={colors.fadeOverlay}
                  />
                )}
                {/* Fade after-hours region */}
                {chartRender.regularHoursEndX > 0 && chartRender.regularHoursEndX < chartWidth && (
                  <Rect
                    x={chartRender.regularHoursEndX}
                    y={0}
                    width={chartWidth - chartRender.regularHoursEndX}
                    height={chartHeight}
                    fill={colors.fadeOverlay}
                  />
                )}
              </>
            )}
            {currentPeriod === 'premarket' && (
              <>
                {/* Fade regular hours region */}
                {chartRender.regularHoursEndX > chartRender.preMarketEndX && (
                  <Rect
                    x={chartRender.preMarketEndX}
                    y={0}
                    width={chartRender.regularHoursEndX - chartRender.preMarketEndX}
                    height={chartHeight}
                    fill={colors.fadeOverlay}
                  />
                )}
                {/* Fade after-hours region */}
                {chartRender.regularHoursEndX > 0 && chartRender.regularHoursEndX < chartWidth && (
                  <Rect
                    x={chartRender.regularHoursEndX}
                    y={0}
                    width={chartWidth - chartRender.regularHoursEndX}
                    height={chartHeight}
                    fill={colors.fadeOverlay}
                  />
                )}
              </>
            )}
            
            {/* Current price dot (static part in SVG) */}
            {isLiveSession && (
              <Circle
                cx={chartRender.lastPointX}
                cy={chartRender.lastPointY}
                r={4}
                fill={chartColor}
              />
            )}
          </Svg>
          
          {/* Time labels (React Native Text for proper font rendering) */}
          {chartRender.timeLabels.map((label, index) => (
            <Text
              key={index}
              numberOfLines={1}
              style={[
                styles.timeLabel,
                {
                  left: label.x,
                  transform: [{ translateX: label.offset }],
                  color: colors.labelText,
                },
              ]}
            >
              {label.label}
            </Text>
          ))}
          
          {/* Pulsing ring (animated, outside SVG) */}
          {isLiveSession && chartRender.path && (
            <Animated.View
              style={[
                styles.pulsingRing,
                {
                  left: chartRender.lastPointX - 4,
                  top: chartRender.lastPointY - 4,
                  backgroundColor: chartColor,
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          )}
        </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.secondaryText }]}>
              No data available
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tickerBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tickerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  changesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  changeItem: {
    alignItems: 'center',
  },
  changeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeArrow: {
    fontSize: 10,
  },
  changePercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  changeLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  chartContainer: {
    height: 140,
    justifyContent: 'center',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
  },
  pulsingRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeLabel: {
    position: 'absolute',
    top: 120, // Position below the chart
    fontSize: 10,
    fontWeight: '400',
  },
});

export default InlineChartCard;
