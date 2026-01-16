/**
 * StockLineChart Component - React Native Implementation
 * 
 * Full-featured stock chart with dual-section layout:
 * - Past section (60%): Price line with session-based rendering
 * - Future section (40%): Catalyst timeline with upcoming events
 * 
 * Reuses proven patterns from MiniChart for consistency and reliability.
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder, Switch } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Slider from '@react-native-community/slider';
import Svg, { Path, Line, Rect, Defs, ClipPath, Circle, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPrice } from '../ui/AnimatedPrice';
import { generateContinuousSmoothPath, Point } from '../../utils/bezier-path-utils';
import { 
  getMarketHoursBounds, 
  getTradingDayFromData, 
  calculateIntradayXPosition,
  calculateIndexBasedXPosition,
  getEffectivePreviousClose,
  MS
} from '../../utils/chart-time-utils';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import { getEventTypeHexColor } from '../../utils/event-formatting';
import { getEventIcon } from '../../utils/event-icons';
import { Ionicons } from '@expo/vector-icons';
import { PriceTargetsService, PriceTarget } from '../../services/PriceTargetsService';
import { 
  calculatePriceTargetStats, 
  formatTargetPrice, 
  calculateTargetY, 
  adjustLabelPositions,
  getPriceTargetLineConfigs,
  PRICE_TARGET_DASH_ARRAY,
  PriceTargetStats
} from '../../utils/price-target-utils';

interface DataPoint {
  timestamp: number | string;
  value: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  session?: string;
}

interface MarketEvent {
  id: string;
  type: string;
  actualDateTime?: string;
  [key: string]: any;
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: MarketEvent;
  dayIndex: number;
  position: number;
  tickerLogo?: string; // Optional logo URL for portfolio view
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y';
export type FutureRange = '3M' | '6M' | '1Y' | '2Y' | '3Y';

interface StockLineChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  priceChange?: number;
  priceChangePercent?: number;
  sessionChange?: number; // Session-specific change (pre-market or after-hours)
  marketPeriod?: 'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday';
  futureCatalysts?: FutureCatalyst[];
  pastEvents?: MarketEvent[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  onTimeRangeChange?: (range: TimeRange) => void;
  defaultTimeRange?: TimeRange;
  defaultFutureRange?: FutureRange;
  onFutureRangeChange?: (range: FutureRange) => void;
  ticker?: string;
  companyName?: string;
  previousDayData?: { close: number; previousClose: number } | null;
  showUpcomingRange?: boolean;
  onCrosshairChange?: (isActive: boolean, value?: number, timestamp?: number) => void;
  onDisplayValuesChange?: (values: { displayPrice: number; displayChange: number; displayChangePercent: number; isPositive: boolean }) => void;
  hideHeader?: boolean; // Hide the header section (for use in PortfolioChart)
  showTickerLogos?: boolean; // Show ticker logos instead of colored dots (for portfolio view)
  miniMode?: boolean; // Mini chart mode - skip price target fetching
  showPriceTargets?: boolean; // Control whether to show price target lines (defaults to true when showUpcomingRange)
  priceTargets?: PriceTarget[]; // Optional externally provided price targets
}

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'];
const FUTURE_RANGES: FutureRange[] = ['3M', '6M', '1Y', '2Y', '3Y'];

export const StockLineChart: React.FC<StockLineChartProps> = ({
  data,
  previousClose,
  currentPrice,
  priceChange = 0,
  priceChangePercent = 0,
  sessionChange,
  marketPeriod = 'regular',
  futureCatalysts = [],
  pastEvents = [],
  width: propWidth,
  height = 312,
  strokeWidth = 2,
  onTimeRangeChange,
  defaultTimeRange = '1D',
  defaultFutureRange = '6M',
  onFutureRangeChange,
  ticker = '',
  companyName = '',
  previousDayData = null,
  showUpcomingRange = true,
  onCrosshairChange,
  onDisplayValuesChange,
  hideHeader = false,
  showTickerLogos = false,
  miniMode = false,
  showPriceTargets,
  priceTargets: externalPriceTargets,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [selectedFutureRange, setSelectedFutureRange] = useState<FutureRange>(defaultFutureRange);
  
  // Price targets state - Requirement 1.1, 5.1, 5.2
  const [fetchedPriceTargets, setFetchedPriceTargets] = useState<PriceTarget[]>([]);
  
  // User toggle for price targets visibility (defaults to false, enabled when pastDays >= 30)
  const [priceTargetsEnabled, setPriceTargetsEnabled] = useState(false);
  
  // Track slider widths for accurate label positioning
  const [pastSliderWidth, setPastSliderWidth] = useState(0);
  const [futureSliderWidth, setFutureSliderWidth] = useState(0);
  
  // Track when sliders are being actively dragged for label animation
  const [isPastSliderActive, setIsPastSliderActive] = useState(false);
  const [isFutureSliderActive, setIsFutureSliderActive] = useState(false);
  
  // Animated values for slider label effects
  const pastLabelScale = useRef(new Animated.Value(1)).current;
  const pastLabelTranslateY = useRef(new Animated.Value(0)).current;
  const futureLabelScale = useRef(new Animated.Value(1)).current;
  const futureLabelTranslateY = useRef(new Animated.Value(0)).current;
  
  // Animate past slider label when active state changes
  useEffect(() => {
    if (isPastSliderActive) {
      Animated.parallel([
        Animated.spring(pastLabelScale, {
          toValue: 1.15,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(pastLabelTranslateY, {
          toValue: -12,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(pastLabelScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(pastLabelTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
      ]).start();
    }
  }, [isPastSliderActive, pastLabelScale, pastLabelTranslateY]);
  
  // Animate future slider label when active state changes
  useEffect(() => {
    if (isFutureSliderActive) {
      Animated.parallel([
        Animated.spring(futureLabelScale, {
          toValue: 1.15,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(futureLabelTranslateY, {
          toValue: -12,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(futureLabelScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(futureLabelTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
      ]).start();
    }
  }, [isFutureSliderActive, futureLabelScale, futureLabelTranslateY]);
  
  // Convert slider position (0-100) to days with smooth logarithmic curve
  // This creates smooth transitions: 1D → 1W → 1M → 1Y → 5Y
  const sliderPositionToDays = useCallback((position: number): number => {
    // Use logarithmic scale for smooth progression
    // Map 0-100 to 1-1825 days with logarithmic distribution
    const minDays = 1;
    const maxDays = 1825; // 5 years
    
    // Logarithmic formula: days = minDays * (maxDays/minDays)^(position/100)
    const ratio = maxDays / minDays;
    const normalizedPosition = position / 100;
    const days = minDays * Math.pow(ratio, normalizedPosition);
    
    return Math.round(days);
  }, []);

  // Convert days to slider position (0-100) with smooth logarithmic curve
  const daysToSliderPosition = useCallback((days: number): number => {
    const minDays = 1;
    const maxDays = 1825;
    
    // Inverse logarithmic formula: position = 100 * log(days/minDays) / log(maxDays/minDays)
    const ratio = maxDays / minDays;
    const position = 100 * (Math.log(days / minDays) / Math.log(ratio));
    
    return position;
  }, []);

  // Future slider: Convert position (0-100) to days with logarithmic scale
  // Designed so that 6M (180 days) is at 50% (center)
  // Range: 7 days (1W) at 100% to 1095 days (3Y) at 0%
  // Note: Slider is reversed, so 0% = 3Y (left), 100% = 1W (right)
  const futureSliderPositionToDays = useCallback((position: number): number => {
    const minDays = 7;    // 1W at position 100 (right)
    const maxDays = 1095; // 3Y at position 0 (left)
    const midDays = 180;  // 6M at position 50 (center)
    
    // Calculate the exponent that makes midDays appear at 50%
    // We need: midDays = minDays * (maxDays/minDays)^0.5
    // So: exponent = log(midDays/minDays) / log(maxDays/minDays) should equal 0.5
    // But we want to force 180 at 50%, so we use a custom formula
    
    // Use piecewise approach: different rates for left and right halves
    // This ensures 180 is exactly at 50%
    const normalizedPos = position / 100;
    
    if (normalizedPos <= 0.5) {
      // Left half: 0% (3Y/1095) to 50% (6M/180)
      // Map 0-0.5 to 1095-180
      const t = normalizedPos / 0.5; // 0 to 1
      const days = maxDays * Math.pow(midDays / maxDays, t);
      return Math.round(days);
    } else {
      // Right half: 50% (6M/180) to 100% (1W/7)
      // Map 0.5-1 to 180-7
      const t = (normalizedPos - 0.5) / 0.5; // 0 to 1
      const days = midDays * Math.pow(minDays / midDays, t);
      return Math.round(days);
    }
  }, []);

  // Future slider: Convert days to position (0-100)
  const futureDaysToSliderPosition = useCallback((days: number): number => {
    const minDays = 7;
    const maxDays = 1095;
    const midDays = 180;
    
    if (days >= midDays) {
      // Left half: 1095-180 maps to 0%-50%
      const t = Math.log(days / maxDays) / Math.log(midDays / maxDays);
      return t * 50;
    } else {
      // Right half: 180-7 maps to 50%-100%
      const t = Math.log(days / midDays) / Math.log(minDays / midDays);
      return 50 + t * 50;
    }
  }, []);
  
  // Initialize days based on default ranges
  const getInitialPastDays = (range: TimeRange): number => {
    switch (range) {
      case '1D': return 1;
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case 'YTD': return Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000));
      case '1Y': return 365;
      case '5Y': return 1825;
      default: return 1;
    }
  };
  
  const getInitialFutureDays = (range: FutureRange): number => {
    switch (range) {
      case '3M': return 90;
      case '6M': return 180;
      case '1Y': return 365;
      case '2Y': return 730;
      case '3Y': return 1095;
      default: return 180; // Default to 6M
    }
  };
  
  const initialPastDays = getInitialPastDays(defaultTimeRange);
  const [pastDays, setPastDays] = useState<number>(initialPastDays);
  const [futureDays, setFutureDays] = useState<number>(getInitialFutureDays(defaultFutureRange));
  const [pastSliderPosition, setPastSliderPosition] = useState<number>(daysToSliderPosition(initialPastDays));
  
  // Price targets are only available when past slider shows 3M or greater
  // getDaysLabel shows "3M" when days >= 75 (Math.round(75/30) = 3)
  const priceTargetsAvailable = pastDays >= 75;
  
  // Determine if price targets should be shown (respects availability, user toggle, and miniMode)
  const shouldShowPriceTargets = priceTargetsAvailable && priceTargetsEnabled && !miniMode;
  
  const containerRef = useRef<View>(null);
  const [containerWidth, setContainerWidth] = useState(propWidth || Dimensions.get('window').width - 32);
  const chartContainerRef = useRef<View>(null);
  
  // Crosshair state
  const [crosshairPoint, setCrosshairPoint] = useState<{
    x: number;
    y: number;
    value: number;
    timestamp: number;
    index: number;
  } | null>(null);
  
  // Calculate the actual calendar days needed to get N trading days back
  // This accounts for weekends when filtering data
  const tradingDaysToCalendarDays = useCallback((tradingDays: number): number => {
    // For longer periods (> 30 trading days), approximate with calendar days
    if (tradingDays > 30) return tradingDays;
    
    // Count backwards from today, counting only trading days
    const now = new Date();
    let tradingDaysCount = 0;
    let calendarDaysBack = 0;
    
    while (tradingDaysCount < tradingDays) {
      calendarDaysBack++;
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() - calendarDaysBack);
      const dayOfWeek = checkDate.getDay();
      
      // Count only weekdays (Monday-Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        tradingDaysCount++;
      }
    }
    
    return calendarDaysBack;
  }, []);

  // Filter data based on pastDays for smooth slider updates
  // pastDays represents trading days for short-term views
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return data;
    
    // For 1D view (pastDays <= 1), show all intraday data
    if (pastDays <= 1) return data;
    
    // Convert trading days to calendar days for filtering
    const calendarDays = tradingDaysToCalendarDays(pastDays);
    
    const now = Date.now();
    const cutoffTime = now - (calendarDays * 24 * 60 * 60 * 1000);
    
    const filtered = data.filter(point => {
      const timestamp = typeof point.timestamp === 'string' 
        ? new Date(point.timestamp).getTime() 
        : point.timestamp;
      return timestamp >= cutoffTime;
    });
    
    // Ensure we always have at least 2 points for the chart
    return filtered.length >= 2 ? filtered : data.slice(-2);
  }, [data, pastDays, tradingDaysToCalendarDays]);

  // Calculate crosshair display values
  const firstDataPointPrice = filteredData && filteredData.length > 0 ? filteredData[0].value : currentPrice;
  const lastDataPointPrice = filteredData && filteredData.length > 0 ? filteredData[filteredData.length - 1].value : currentPrice;
  
  // For 1D view (pastDays <= 1), use previousClose as reference and currentPrice as the end value
  // For other periods, use first/last data points
  const referencePrice = pastDays <= 1 && previousClose ? previousClose : firstDataPointPrice;
  const endPrice = pastDays <= 1 ? currentPrice : lastDataPointPrice;
  
  // Calculate period-based change (relative to reference price)
  const periodPriceChange = endPrice - referencePrice;
  const periodPriceChangePercent = ((endPrice - referencePrice) / referencePrice) * 100;
  
  // Determine current market period based on time (always use time-based calculation)
  // Not using useMemo because we want this to recalculate on every render based on current time
  const getCurrentPeriod = (): 'premarket' | 'regular' | 'afterhours' | 'closed' => {
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
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'closed';
    }
    
    const preMarketStart = 4 * 60;
    const regularStart = 9 * 60 + 30;
    const regularEnd = 16 * 60;
    const afterHoursEnd = 20 * 60;
    
    if (etTotalMinutes < preMarketStart) {
      return 'closed';
    } else if (etTotalMinutes < regularStart) {
      return 'premarket';
    } else if (etTotalMinutes < regularEnd) {
      return 'regular';
    } else if (etTotalMinutes < afterHoursEnd) {
      return 'afterhours';
    } else {
      return 'closed';
    }
  };
  
  const currentPeriod = getCurrentPeriod();
  
  // Calculate session-specific change based on crosshair or current state
  const calculateSessionSpecificChange = () => {
    if (!crosshairPoint || !filteredData || filteredData.length === 0) {
      // No crosshair - check if we need to calculate after-hours change
      // Check both selectedTimeRange and pastDays to handle slider-based time selection
      const isOneDayView = selectedTimeRange === '1D' || pastDays <= 1;
      if (currentPeriod === 'closed' && isOneDayView) {
        // During overnight/weekend, calculate after-hours change from the data
        const afterHoursData = filteredData.filter(d => d.session === 'after-hours');
        const regularSessionData = filteredData.filter(d => d.session === 'regular');
        
        if (afterHoursData.length > 0 && regularSessionData.length > 0) {
          const regularClose = regularSessionData[regularSessionData.length - 1].value;
          const afterHoursClose = afterHoursData[afterHoursData.length - 1].value;
          const dollarChange = afterHoursClose - regularClose;
          const percentChange = (dollarChange / regularClose) * 100;
          return { dollarChange, percentChange };
        }
      }
      
      // Otherwise use current session change if available
      return sessionChange !== undefined ? {
        dollarChange: (sessionChange / 100) * (previousClose || currentPrice),
        percentChange: sessionChange
      } : null;
    }
    
    // Crosshair active - calculate based on crosshair point's session
    const crosshairSession = filteredData[crosshairPoint.index]?.session;
    const crosshairPrice = crosshairPoint.value;
    
    if (crosshairSession === 'pre-market') {
      // Pre-market: change from previous close
      const refPrice = previousClose || firstDataPointPrice;
      const dollarChange = crosshairPrice - refPrice;
      const percentChange = (dollarChange / refPrice) * 100;
      return { dollarChange, percentChange };
    } else if (crosshairSession === 'after-hours') {
      // After-hours: change from regular session close
      const regularSessionData = filteredData.filter(d => d.session === 'regular');
      const refPrice = regularSessionData.length > 0 
        ? regularSessionData[regularSessionData.length - 1].value 
        : (previousClose || firstDataPointPrice);
      const dollarChange = crosshairPrice - refPrice;
      const percentChange = (dollarChange / refPrice) * 100;
      return { dollarChange, percentChange };
    }
    
    return null;
  };
  
  const sessionSpecificChange = calculateSessionSpecificChange();
  
  // Display values: use crosshair if active, otherwise use period-based values
  const displayPrice = crosshairPoint ? crosshairPoint.value : currentPrice;
  const displayPriceChange = crosshairPoint 
    ? crosshairPoint.value - referencePrice
    : periodPriceChange;
  const displayPriceChangePercent = crosshairPoint
    ? ((crosshairPoint.value - referencePrice) / referencePrice) * 100
    : periodPriceChangePercent;
  const isDisplayPositive = displayPriceChange >= 0;

  // Notify parent of display value changes (for PortfolioChart header)
  useEffect(() => {
    if (onDisplayValuesChange && !crosshairPoint) {
      onDisplayValuesChange({
        displayPrice: currentPrice,
        displayChange: periodPriceChange,
        displayChangePercent: periodPriceChangePercent,
        isPositive: periodPriceChange >= 0,
      });
    }
  }, [periodPriceChange, periodPriceChangePercent, currentPrice, onDisplayValuesChange, crosshairPoint]);
  
  // Long-press detection for crosshair activation
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isCrosshairEnabled, setIsCrosshairEnabled] = useState(false);
  const isCrosshairEnabledRef = useRef(false); // Ref to track state for PanResponder
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const LONG_PRESS_DURATION = 200; // 200ms for long press
  const MOVE_THRESHOLD = 10; // pixels - if finger moves more than this, cancel long press

  // Pulsing animation for live sessions
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  // Update ref when state changes
  useEffect(() => {
    isCrosshairEnabledRef.current = isCrosshairEnabled;
  }, [isCrosshairEnabled]);

  // Fetch price targets on mount (skip if miniMode) - Requirements 1.1, 5.1, 5.2
  useEffect(() => {
    // Requirement 5.1: Skip fetching in mini mode
    if (miniMode) {
      return;
    }
    
    // Skip if no ticker provided
    if (!ticker) {
      return;
    }
    
    // Skip if external price targets are provided
    if (externalPriceTargets) {
      return;
    }
    
    // Requirement 1.1: Fetch price targets from backend API
    const fetchTargets = async () => {
      try {
        const targets = await PriceTargetsService.fetchPriceTargets(ticker);
        setFetchedPriceTargets(targets);
      } catch (error) {
        // Requirement 1.3: Return empty array on error (handled by service)
        setFetchedPriceTargets([]);
      }
    };
    
    fetchTargets();
  }, [ticker, miniMode, externalPriceTargets]);
  
  // Use external price targets if provided, otherwise use fetched ones
  const priceTargets = externalPriceTargets || fetchedPriceTargets;
  
  // Calculate price target stats - Requirements 2.1, 2.2, 2.3, 2.4
  const priceTargetStats = useMemo(() => {
    if (!shouldShowPriceTargets || priceTargets.length === 0) {
      console.log(`[StockLineChart ${ticker}] Price targets not shown: shouldShow=${shouldShowPriceTargets}, count=${priceTargets.length}`);
      return null;
    }
    const stats = calculatePriceTargetStats(priceTargets);
    console.log(`[StockLineChart ${ticker}] Price target stats:`, stats);
    return stats;
  }, [priceTargets, shouldShowPriceTargets, ticker]);

  // Note: Logo prefetching is now handled by AppDataContext using expo-image
  // which has better caching than React Native's Image.prefetch

  // Update width on layout
  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const width = propWidth || containerWidth;

  // Fixed viewport split: 60% past, 40% future (when showUpcomingRange is true)
  const pastWidthPercent = showUpcomingRange ? 60 : 100;
  const futureWidthPercent = showUpcomingRange ? 40 : 0;
  const pastWidth = (width * pastWidthPercent) / 100;

  // Check if we're in intraday mode (based on pastDays for smooth transitions)
  const isIntradayMode = pastDays <= 1;
  
  // Calculate the fixed starting point for the chart (right edge of past section)
  // The chart should always end at the same pixel position
  const chartEndX = pastWidth;

  // Calculate future window based on continuous days slider
  const futureWindowMs = useMemo(() => {
    return futureDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
  }, [futureDays]);

  // Handle time range change
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    onTimeRangeChange?.(range);
  };

  // Handle future range change
  const handleFutureRangeChange = (range: FutureRange) => {
    setSelectedFutureRange(range);
    onFutureRangeChange?.(range);
  };

  // Convert days to display label with smart formatting
  const getDaysLabel = (days: number): string => {
    if (days === 1) return '1D';
    if (days <= 6) return `${days}D`;
    if (days === 7) return '1W';
    if (days < 28) {
      const weeks = Math.round(days / 7);
      return `${weeks}W`;
    }
    if (days < 45) return '1M';
    if (days < 335) {
      const months = Math.round(days / 30);
      return `${months}M`;
    }
    if (days < 545) return '1Y';
    // For years, use calendar days (365 per year)
    const years = Math.round(days / 365);
    return `${years}Y`;
  };

  // Track previous slider labels for haptic feedback on label change
  const lastPastLabel = useRef<string>('');
  const lastFutureLabel = useRef<string>('');

  // Handle past slider change (logarithmic scaling)
  const handlePastSliderChange = (position: number) => {
    setPastSliderPosition(position);
    const days = sliderPositionToDays(position);
    setPastDays(days);
    
    // Trigger haptic feedback only when label changes
    const currentLabel = getDaysLabel(days);
    if (currentLabel !== lastPastLabel.current) {
      Haptics.selectionAsync();
      lastPastLabel.current = currentLabel;
    }
    
    // Map to closest TimeRange for backward compatibility
    let range: TimeRange;
    if (days <= 1) range = '1D';
    else if (days <= 7) range = '1W';
    else if (days <= 30) range = '1M';
    else if (days <= 90) range = '3M';
    else if (days <= 365) range = '1Y';
    else range = '5Y';
    
    if (range !== selectedTimeRange) {
      setSelectedTimeRange(range);
      onTimeRangeChange?.(range);
    }
  };

  // Handle future slider change (continuous days, range: 7 to 1095)
  const handleFutureSliderChange = (days: number) => {
    setFutureDays(days);
    
    // Trigger haptic feedback only when label changes
    const currentLabel = getDaysLabel(days);
    if (currentLabel !== lastFutureLabel.current) {
      Haptics.selectionAsync();
      lastFutureLabel.current = currentLabel;
    }
    
    // Map to closest FutureRange for backward compatibility
    let range: FutureRange;
    if (days <= 90) range = '3M';
    else if (days <= 180) range = '6M';
    else if (days <= 365) range = '1Y';
    else if (days <= 730) range = '2Y';
    else range = '3Y';
    
    if (range !== selectedFutureRange) {
      setSelectedFutureRange(range);
      onFutureRangeChange?.(range);
    }
  };

  // Generate unique clip path ID
  const clipPathId = useMemo(() => {
    const safeTicker = (ticker || 'default').replace(/[^a-zA-Z0-9]/g, '');
    return `stockchart-${safeTicker}-${Math.random().toString(36).substring(2, 11)}`;
  }, [ticker]);

  // Determine if we're in a live trading session
  const isLiveSession = useMemo(() => {
    return currentPeriod === 'premarket' || currentPeriod === 'regular' || currentPeriod === 'afterhours';
  }, [currentPeriod]);

  // Pulsing animation effect
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
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.4);
    }
  }, [isLiveSession, pulseAnim, pulseOpacity]);

  // Calculate chart data (reusing MiniChart logic)
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        path: '',
        isPositive: true,
        lastPointX: 0,
        lastPointY: height / 2,
        previousCloseY: null,
        preMarketEndX: 0,
        regularHoursEndX: 0,
        minY: 0,
        maxY: 100,
        valueRange: 100,
      };
    }

    // Chart layout margins (matching web app)
    const margin = { top: 40, bottom: 20 };
    const chartHeight = height - margin.top - margin.bottom;

    // Get trading day and market hours for time-based positioning
    // Convert timestamps to numbers for getTradingDayFromData
    const dataWithNumericTimestamps = filteredData.map(d => ({
      timestamp: typeof d.timestamp === 'string' ? new Date(d.timestamp).getTime() : d.timestamp
    }));
    const tradingDay = getTradingDayFromData(dataWithNumericTimestamps);
    const marketHours = getMarketHoursBounds(tradingDay);

    // Get all values for scaling (include OHLC if available)
    let allPriceValues: number[] = [];
    filteredData.forEach(d => {
      if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
        allPriceValues.push(d.open, d.high, d.low, d.close);
      } else {
        allPriceValues.push(d.value);
      }
    });
    
    const effectivePreviousClose = getEffectivePreviousClose(previousClose, previousDayData);
    
    // Calculate min/max with padding
    const allValues = effectivePreviousClose 
      ? [...allPriceValues, effectivePreviousClose, currentPrice] 
      : [...allPriceValues, currentPrice];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    const minY = minValue - padding;
    const maxY = maxValue + padding;
    const valueRange = maxY - minY || 1;

    // Determine session boundaries
    let preMarketEndX = 0;
    let regularHoursEndX = 0;
    // Calculate blend factor for smooth transition between intraday and multi-day views
    // 1 at 1D, 0 at 2D+, linear blend between
    const blendFactor = pastDays <= 1 ? 1 : pastDays <= 2 ? 2 - pastDays : 0;
    
    for (let i = 0; i < filteredData.length; i++) {
      const point = filteredData[i];
      const session = point.session?.toLowerCase();
      
      const timestamp = typeof point.timestamp === 'string' 
        ? new Date(point.timestamp).getTime() 
        : point.timestamp;
      
      // Calculate index-based position
      const pointsFromEnd = filteredData.length - 1 - i;
      const totalPoints = filteredData.length;
      const indexBasedX = chartEndX - (pointsFromEnd / totalPoints) * pastWidth;
      
      let x: number;
      if (blendFactor === 1) {
        x = calculateIntradayXPosition(timestamp, marketHours, pastWidth);
      } else if (blendFactor === 0) {
        if (pastDays <= 30) {
          x = indexBasedX;
        } else {
          const now = Date.now();
          const oldestTimestamp = filteredData[0].timestamp;
          const oldestTime = typeof oldestTimestamp === 'string' 
            ? new Date(oldestTimestamp).getTime() 
            : oldestTimestamp;
          
          const totalDuration = now - oldestTime;
          const timeFromOldest = timestamp - oldestTime;
          
          x = chartEndX - (pastWidth * (1 - timeFromOldest / totalDuration));
        }
      } else {
        // Blend between intraday and index-based positioning
        const intradayX = calculateIntradayXPosition(timestamp, marketHours, pastWidth);
        x = intradayX * blendFactor + indexBasedX * (1 - blendFactor);
      }
      
      // Check for session boundaries (handle both hyphenated and non-hyphenated versions)
      if (session === 'pre-market' && (i === filteredData.length - 1 || filteredData[i + 1]?.session?.toLowerCase() !== 'pre-market')) {
        preMarketEndX = x;
      }
      
      if (session === 'regular' && (i === filteredData.length - 1 || filteredData[i + 1]?.session?.toLowerCase() !== 'regular')) {
        regularHoursEndX = x;
      }
    }

    // Convert data points to SVG coordinates
    // Position points so the most recent data always ends at chartEndX
    // Use blending for smooth transition between intraday and multi-day views
    
    const points: Point[] = filteredData.map((point, i) => {
      const timestamp = typeof point.timestamp === 'string' 
        ? new Date(point.timestamp).getTime() 
        : point.timestamp;
      
      let x: number;
      
      // Calculate index-based position (used for multi-day views)
      const pointsFromEnd = filteredData.length - 1 - i;
      const totalPoints = filteredData.length;
      const indexBasedX = chartEndX - (pointsFromEnd / totalPoints) * pastWidth;
      
      if (blendFactor === 1) {
        // Pure intraday mode
        x = calculateIntradayXPosition(timestamp, marketHours, pastWidth);
      } else if (blendFactor === 0) {
        // Pure multi-day mode
        if (pastDays <= 30) {
          // For short ranges (up to 1 month), use index-based positioning to skip weekends
          x = indexBasedX;
        } else {
          // For longer ranges, use time-based positioning
          const now = Date.now();
          const oldestTimestamp = filteredData[0].timestamp;
          const oldestTime = typeof oldestTimestamp === 'string' 
            ? new Date(oldestTimestamp).getTime() 
            : oldestTimestamp;
          
          const totalDuration = now - oldestTime;
          const timeFromOldest = timestamp - oldestTime;
          
          // Map to pastWidth, ending at the right edge
          x = chartEndX - (pastWidth * (1 - timeFromOldest / totalDuration));
        }
      } else {
        // Blend between intraday and index-based positioning for smooth transition
        const intradayX = calculateIntradayXPosition(timestamp, marketHours, pastWidth);
        x = intradayX * blendFactor + indexBasedX * (1 - blendFactor);
      }
      
      // Y position with margins (matching web app)
      const y = margin.top + chartHeight - ((point.value - minY) / valueRange) * chartHeight;
      
      return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? height / 2 : y };
    });

    // Generate smooth path with appropriate tension based on data density
    // More points = higher tension for smoother curves
    // Fewer points = lower tension to preserve actual data shape
    let tension: number;
    const pointsPerDay = filteredData.length / Math.max(1, pastDays);
    
    if (pointsPerDay > 50) {
      // High density (intraday 5-min data): smooth curves
      tension = 0.4;
    } else if (pointsPerDay > 10) {
      // Medium density (hourly data): moderate smoothing
      tension = 0.3;
    } else if (pointsPerDay > 1) {
      // Low density (daily data): minimal smoothing
      tension = 0.2;
    } else {
      // Very low density: almost no smoothing
      tension = 0.1;
    }
    
    const path = points.length > 1 ? generateContinuousSmoothPath([points], tension) : '';
    
    // Get last point position
    const lastPoint = points[points.length - 1] || { x: 0, y: height / 2 };
    
    // Calculate previous close Y position
    let previousCloseY: number | null = null;
    if (effectivePreviousClose) {
      previousCloseY = margin.top + chartHeight - ((effectivePreviousClose - minY) / valueRange) * chartHeight;
      if (isNaN(previousCloseY)) previousCloseY = null;
    }

    // Determine if positive based on the time range
    // For 1D: compare to previous close
    // For other ranges: compare last price to first price in the filtered period
    const lastDataPointPrice = filteredData[filteredData.length - 1].value;
    const firstDataPointPrice = filteredData[0].value;
    
    let isPositive: boolean;
    if (isIntradayMode && effectivePreviousClose) {
      // 1D view: compare to previous close
      isPositive = lastDataPointPrice >= effectivePreviousClose;
    } else {
      // Other time ranges: compare last to first (period change)
      isPositive = lastDataPointPrice >= firstDataPointPrice;
    }

    return {
      path,
      isPositive,
      lastPointX: lastPoint.x,
      lastPointY: lastPoint.y,
      previousCloseY,
      preMarketEndX,
      regularHoursEndX,
      minY,
      maxY,
      valueRange,
    };
  }, [filteredData, pastWidth, height, previousClose, currentPrice, isIntradayMode, previousDayData, pastDays]);

  // Memoize data point positions for faster crosshair lookup
  const dataPointPositions = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    // Convert timestamps to numbers for getTradingDayFromData
    const dataWithNumericTimestamps = filteredData.map(d => ({
      timestamp: typeof d.timestamp === 'string' ? new Date(d.timestamp).getTime() : d.timestamp
    }));
    const tradingDay = getTradingDayFromData(dataWithNumericTimestamps);
    const marketHours = getMarketHoursBounds(tradingDay);
    
    // Calculate blend factor for smooth transition
    const blendFactor = pastDays <= 1 ? 1 : pastDays <= 2 ? 2 - pastDays : 0;
    
    return filteredData.map((point, index) => {
      const timestamp = typeof point.timestamp === 'string' 
        ? new Date(point.timestamp).getTime() 
        : point.timestamp;
      
      // Calculate index-based position
      const pointsFromEnd = filteredData.length - 1 - index;
      const totalPoints = filteredData.length;
      const indexBasedX = chartEndX - (pointsFromEnd / totalPoints) * pastWidth;
      
      let x: number;
      if (blendFactor === 1) {
        x = calculateIntradayXPosition(timestamp, marketHours, pastWidth);
      } else if (blendFactor === 0) {
        if (pastDays <= 30) {
          x = indexBasedX;
        } else {
          const now = Date.now();
          const oldestTimestamp = filteredData[0].timestamp;
          const oldestTime = typeof oldestTimestamp === 'string' 
            ? new Date(oldestTimestamp).getTime() 
            : oldestTimestamp;
          
          const totalDuration = now - oldestTime;
          const timeFromOldest = timestamp - oldestTime;
          
          x = chartEndX - (pastWidth * (1 - timeFromOldest / totalDuration));
        }
      } else {
        // Blend between intraday and index-based positioning
        const intradayX = calculateIntradayXPosition(timestamp, marketHours, pastWidth);
        x = intradayX * blendFactor + indexBasedX * (1 - blendFactor);
      }
      
      return { x, index, value: point.value, timestamp };
    });
  }, [filteredData, pastWidth, pastDays, chartEndX]);

  // Handle touch interaction for crosshair - use useCallback to stabilize reference
  const handleTouch = useCallback((touchX: number, touchY: number) => {
    if (!filteredData || filteredData.length === 0 || dataPointPositions.length === 0) {
      return;
    }

    // Calculate the actual past section width in pixels
    const actualPastWidth = (width * pastWidthPercent) / 100;
    
    // Check if touch is in past or future section
    const isInFutureSection = touchX > actualPastWidth;
    
    if (isInFutureSection && showUpcomingRange) {
      // Handle future section - calculate date based on position
      const futureWidth = (width * futureWidthPercent) / 100;
      const xInFutureSection = touchX - actualPastWidth;
      const percentIntoFuture = xInFutureSection / futureWidth;
      
      // Calculate timestamp in the future
      const now = Date.now();
      const futureTimestamp = now + (percentIntoFuture * futureWindowMs);
      
      // Use last point's Y position
      const lastPoint = filteredData[filteredData.length - 1];
      const margin = { top: 40, bottom: 20 };
      const chartHeight = height - margin.top - margin.bottom;
      const { minY, valueRange } = chartData;
      const y = margin.top + chartHeight - ((lastPoint.value - minY) / valueRange) * chartHeight;
      
      setCrosshairPoint({
        x: touchX,
        y,
        value: lastPoint.value,
        timestamp: futureTimestamp,
        index: filteredData.length - 1,
      });
      return;
    }

    // Handle past section - find closest data point using pre-calculated positions
    // Scale touch X from pixel coordinates to SVG viewBox coordinates
    const scaledTouchX = (touchX / actualPastWidth) * pastWidth;
    
    let closestIndex = 0;
    let minDistance = Infinity;

    // Use pre-calculated positions for faster lookup
    // Don't clamp - find the closest point even if touch is beyond the data range
    dataPointPositions.forEach(({ x, index }) => {
      const distance = Math.abs(x - scaledTouchX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Get the closest point data
    const point = filteredData[closestIndex];
    const { x, timestamp } = dataPointPositions[closestIndex];

    // Calculate Y position using same logic as chart
    const margin = { top: 40, bottom: 20 };
    const chartHeight = height - margin.top - margin.bottom;
    const { minY, valueRange } = chartData;
    const y = margin.top + chartHeight - ((point.value - minY) / valueRange) * chartHeight;

    // Convert x back to pixel coordinates for rendering
    const pixelX = (x / pastWidth) * actualPastWidth;

    setCrosshairPoint({
      x: pixelX,
      y,
      value: point.value,
      timestamp,
      index: closestIndex,
    });
  }, [filteredData, dataPointPositions, width, pastWidthPercent, futureWidthPercent, showUpcomingRange, futureWindowMs, height, chartData, pastWidth]);


  // PanResponder for crosshair interaction - recreate when handleTouch changes
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return true;
      },
      onMoveShouldSetPanResponder: () => {
        return true;
      },
      onStartShouldSetPanResponderCapture: () => {
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        return isCrosshairEnabledRef.current;
      },
      onPanResponderGrant: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        const locationY = evt.nativeEvent.locationY;
        
        touchStartPos.current = {
          x: locationX,
          y: locationY,
        };
        
        longPressTimer.current = setTimeout(() => {
          isCrosshairEnabledRef.current = true;
          setIsCrosshairEnabled(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleTouch(locationX, locationY);
        }, LONG_PRESS_DURATION);
      },
      onPanResponderMove: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        const locationY = evt.nativeEvent.locationY;
        
        if (!isCrosshairEnabledRef.current) {
          if (touchStartPos.current && longPressTimer.current) {
            const dx = Math.abs(locationX - touchStartPos.current.x);
            const dy = Math.abs(locationY - touchStartPos.current.y);
            
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }
        } else {
          handleTouch(locationX, locationY);
        }
      },
      onPanResponderRelease: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        
        if (isCrosshairEnabledRef.current) {
          isCrosshairEnabledRef.current = false;
          setCrosshairPoint(null);
          setIsCrosshairEnabled(false);
          onCrosshairChange?.(false);
        }
        
        touchStartPos.current = null;
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        
        if (isCrosshairEnabledRef.current) {
          isCrosshairEnabledRef.current = false;
          setCrosshairPoint(null);
          setIsCrosshairEnabled(false);
          onCrosshairChange?.(false);
        }
        
        touchStartPos.current = null;
      },
      onPanResponderTerminationRequest: () => {
        return !isCrosshairEnabledRef.current;
      },
    }),
    [handleTouch]
  );
  
  // Notify parent when crosshair value changes
  useEffect(() => {
    if (crosshairPoint) {
      onCrosshairChange?.(true, crosshairPoint.value, crosshairPoint.timestamp);
    } else if (isCrosshairEnabled === false) {
      // Crosshair was disabled, notify parent
      onCrosshairChange?.(false);
    }
  }, [crosshairPoint, isCrosshairEnabled, onCrosshairChange]);

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, backgroundColor: themeColors.card }]} onLayout={handleLayout}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>No data available</Text>
        </View>
      </View>
    );
  }

  const { path, isPositive, lastPointX, lastPointY, previousCloseY, preMarketEndX, regularHoursEndX } = chartData;
  const chartColor = isPositive ? 'rgb(0, 200, 5)' : 'rgb(255, 80, 0)';

  // Calculate actual pixel widths for rendering
  const actualPastWidth = (width * pastWidthPercent) / 100;

  // Theme-aware colors
  const fadeOverlayColor = isDark ? 'rgba(3, 2, 19, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const previousCloseLineColor = isDark ? '#888888' : '#888888';
  const gradientEdgeColor = isDark ? 'rgba(3, 2, 19, 1)' : 'rgba(255, 255, 255, 1)';
  const gradientCenterColor = isDark ? 'rgba(60, 60, 60, 1)' : 'rgba(236, 236, 240, 1)';
  const gradientSideColor = isDark ? 'rgba(3, 2, 19, 1)' : 'rgba(255, 255, 255, 1)';
  const gradientSideTransparent = isDark ? 'rgba(3, 2, 19, 0)' : 'rgba(255, 255, 255, 0)';

  // Scale factor for dot positioning (SVG viewBox to container)
  const containerHeight = height;
  const scaleY = containerHeight / height;
  const scaledLastPointY = lastPointY * scaleY;

  // Get session opacity based on current period
  const getSessionOpacity = (session: 'premarket' | 'regular' | 'afterhours') => {
    if (currentPeriod === 'closed') return 1;
    return currentPeriod === session ? 1 : 0.3;
  };

  return (
    <View 
      style={[
        hideHeader ? styles.containerNoStyle : styles.container, 
        { width, backgroundColor: themeColors.card },
        !hideHeader && { shadowColor: isDark ? '#000' : '#000' }
      ]} 
      onLayout={handleLayout} 
      ref={containerRef}
    >
      {/* Header with ticker badge, company name, and price */}
      {!hideHeader && (
        <View style={styles.header}>
          {/* Ticker badge */}
          <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
            <Text style={[styles.tickerText, { color: themeColors.primaryForeground }]}>{ticker}</Text>
          </View>
          
          {/* Company name */}
          <Text style={[styles.companyName, { color: themeColors.mutedForeground }]}>{companyName}</Text>
          
          {/* Price row */}
          <View style={styles.priceRow}>
            {crosshairPoint ? (
              // Show crosshair price without animation
              <Text style={[styles.crosshairPrice, { color: themeColors.foreground }]}>
                ${displayPrice.toFixed(2)}
              </Text>
            ) : (
              // Show current price with animation
              <AnimatedPrice 
                price={currentPrice} 
                showCurrency={true}
                fontSize={28}
                fontWeight="600"
              />
            )}
          </View>
          
          {/* Change row */}
          <View style={styles.changeContainer}>
            {(() => {
              // Always show two rows to prevent height jumping
              const crosshairSession = crosshairPoint && filteredData[crosshairPoint.index]?.session;
              const effectiveMarketPeriod = crosshairPoint 
                ? (crosshairSession === 'pre-market' ? 'premarket' : crosshairSession === 'after-hours' ? 'afterhours' : 'regular')
                : marketPeriod;
              
              // For display purposes, treat overnight/weekend as after-hours
              // This shows both "Today" and "After Hours" changes
              const displayPeriod = currentPeriod === 'closed' ? 'afterhours' : effectiveMarketPeriod;
              
              const isOneDayView = selectedTimeRange === '1D' || pastDays <= 1;
              const showSessionData = isOneDayView
                && displayPeriod !== 'regular'
                && sessionSpecificChange !== null;
              
              const sessionDollarChange = sessionSpecificChange?.dollarChange || 0;
              const sessionPercentChange = sessionSpecificChange?.percentChange || 0;
              const isSessionPositive = sessionDollarChange >= 0;
              
              // Determine labels based on period
              let firstRowLabel = '';
              let secondRowLabel = '';
              
              if (showSessionData) {
                if (displayPeriod === 'premarket') {
                  firstRowLabel = 'Prev Close';
                  secondRowLabel = 'Pre-Market';
                } else {
                  // After-hours or overnight/weekend
                  firstRowLabel = 'Today';
                  secondRowLabel = 'After Hours';
                }
              }
              
              return (
                <View style={styles.changesColumn}>
                  {/* Full day change - always visible */}
                  <View style={styles.changeRow}>
                    <Text style={[styles.changeArrow, isDisplayPositive ? styles.positive : styles.negative]}>
                      {isDisplayPositive ? '▲' : '▼'}
                    </Text>
                    <Text style={[styles.changeValue, isDisplayPositive ? styles.positive : styles.negative]}>
                      ${Math.abs(displayPriceChange).toFixed(2)} ({isDisplayPositive ? '+' : ''}{displayPriceChangePercent.toFixed(2)}%)
                    </Text>
                    <Text style={[styles.changeLabel, { color: themeColors.mutedForeground }]}>
                      {firstRowLabel}
                    </Text>
                  </View>

                  {/* Session-specific change - visible only in extended hours on 1D, empty otherwise */}
                  <View style={styles.changeRow}>
                    {showSessionData ? (
                      <>
                        <Text style={[styles.changeArrow, isSessionPositive ? styles.positive : styles.negative]}>
                          {isSessionPositive ? '▲' : '▼'}
                        </Text>
                        <Text style={[styles.changeValue, isSessionPositive ? styles.positive : styles.negative]}>
                          ${Math.abs(sessionDollarChange).toFixed(2)} ({isSessionPositive ? '+' : ''}{sessionPercentChange.toFixed(2)}%)
                        </Text>
                        <Text style={[styles.changeLabel, { color: themeColors.mutedForeground }]}>
                          {secondRowLabel}
                        </Text>
                      </>
                    ) : (
                      // Empty row to maintain height
                      <Text style={styles.emptyRow}> </Text>
                    )}
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* Chart Container */}
      <View style={styles.chartWrapper}>
        <View 
          style={[styles.chartContainer, { height }]}
          ref={chartContainerRef}
          {...panResponder.panHandlers}
        >
          {/* Past Section */}
          <View style={[styles.pastSection, { width: `${pastWidthPercent}%` }]} pointerEvents="box-none">
            <Svg 
              width="100%" 
              height="100%" 
              viewBox={`0 0 ${pastWidth} ${height}`}
              preserveAspectRatio="none"
              pointerEvents="none"
            >
              <Defs>
                <ClipPath id={`${clipPathId}-premarket`}>
                  <Rect x="0" y="-100" width={preMarketEndX + 2} height={height + 200} />
                </ClipPath>
                <ClipPath id={`${clipPathId}-regular`}>
                  <Rect x={preMarketEndX - 2} y="-100" width={(regularHoursEndX - preMarketEndX) + 4} height={height + 200} />
                </ClipPath>
                <ClipPath id={`${clipPathId}-afterhours`}>
                  <Rect x={regularHoursEndX - 2} y="-100" width={(pastWidth - regularHoursEndX) + 2} height={height + 200} />
                </ClipPath>
              </Defs>

              {/* Render path based on time range */}
              {isIntradayMode ? (
                <>
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
                  
                  {/* Fade overlays for non-current sessions using semi-transparent white rectangles */}
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
                      {regularHoursEndX > 0 && regularHoursEndX < pastWidth && (
                        <Rect
                          x={regularHoursEndX}
                          y={0}
                          width={pastWidth - regularHoursEndX}
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
                      {regularHoursEndX > 0 && regularHoursEndX < pastWidth && (
                        <Rect
                          x={regularHoursEndX}
                          y={0}
                          width={pastWidth - regularHoursEndX}
                          height={height}
                          fill={fadeOverlayColor}
                        />
                      )}
                    </>
                  )}
                </>
              ) : (
                /* Multi-day views - single continuous path */
                path && (
                  <Path
                    d={path}
                    fill="none"
                    stroke={chartColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              )}
              
              {/* Previous close reference line - only on 1D view */}
              {isIntradayMode && previousCloseY !== null && (
                <Line
                  x1={0}
                  y1={previousCloseY}
                  x2={pastWidth}
                  y2={previousCloseY}
                  stroke={previousCloseLineColor}
                  strokeWidth={1}
                  strokeDasharray="1,5"
                  strokeLinecap="round"
                  opacity={0.4}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </Svg>
            
            {/* Crosshair rendered outside SVG for better performance */}
            {crosshairPoint && crosshairPoint.x <= actualPastWidth && (
              <>
                {/* Vertical line - position as percentage of pastSection width */}
                {/* Start at margin.top (40px) to avoid overlapping header */}
                <View
                  style={{
                    position: 'absolute',
                    left: `${(crosshairPoint.x / actualPastWidth) * 100}%`,
                    top: 40,
                    width: 1,
                    height: height - 40,
                    backgroundColor: chartColor,
                    opacity: 0.5,
                  }}
                  pointerEvents="none"
                />
              </>
            )}
            
            {/* Past event dots - rendered on the price line */}
            {pastEvents && pastEvents.length > 0 && filteredData.length > 0 && (() => {
              const now = Date.now();
              const oldestTimestamp = filteredData[0].timestamp;
              const oldestTime = typeof oldestTimestamp === 'string' 
                ? new Date(oldestTimestamp).getTime() 
                : oldestTimestamp;
              const totalDuration = now - oldestTime;
              
              const margin = { top: 40, bottom: 20 };
              const chartHeight = height - margin.top - margin.bottom;
              const { minY, valueRange } = chartData;
              
              // Get market hours for intraday positioning
              const dataWithNumericTimestamps = filteredData.map(d => ({
                timestamp: typeof d.timestamp === 'string' ? new Date(d.timestamp).getTime() : d.timestamp
              }));
              const tradingDay = getTradingDayFromData(dataWithNumericTimestamps);
              const marketHours = getMarketHoursBounds(tradingDay);
              
              // Calculate blend factor for smooth transition (same as chart line)
              const blendFactor = pastDays <= 1 ? 1 : pastDays <= 2 ? 2 - pastDays : 0;
              
              // Sort by dot size descending so smaller dots render on top
              const eventsWithPositions = pastEvents
                .map((event, index) => {
                  const eventTimestamp = event.actualDateTime 
                    ? new Date(event.actualDateTime).getTime() 
                    : 0;
                  
                  // Check if event is within the visible time range
                  if (eventTimestamp < oldestTime || eventTimestamp > now) {
                    return null;
                  }
                  
                  // Calculate X position using the same logic as the chart line
                  let xPosition: number;
                  
                  // Calculate index-based position (find closest data point index)
                  let closestIndex = 0;
                  let minTimeDiff = Infinity;
                  for (let i = 0; i < filteredData.length; i++) {
                    const point = filteredData[i];
                    const pointTime = typeof point.timestamp === 'string' 
                      ? new Date(point.timestamp).getTime() 
                      : point.timestamp;
                    const timeDiff = Math.abs(pointTime - eventTimestamp);
                    if (timeDiff < minTimeDiff) {
                      minTimeDiff = timeDiff;
                      closestIndex = i;
                    }
                  }
                  
                  const pointsFromEnd = filteredData.length - 1 - closestIndex;
                  const totalPoints = filteredData.length;
                  const indexBasedX = pastWidth - (pointsFromEnd / totalPoints) * pastWidth;
                  
                  if (blendFactor === 1) {
                    // Pure intraday mode - use market hours positioning
                    xPosition = calculateIntradayXPosition(eventTimestamp, marketHours, pastWidth);
                  } else if (blendFactor === 0) {
                    if (pastDays <= 30) {
                      // Index-based positioning
                      xPosition = indexBasedX;
                    } else {
                      // Time-based positioning
                      const timeFromOldest = eventTimestamp - oldestTime;
                      xPosition = (timeFromOldest / totalDuration) * pastWidth;
                    }
                  } else {
                    // Blend between intraday and index-based positioning
                    const intradayX = calculateIntradayXPosition(eventTimestamp, marketHours, pastWidth);
                    xPosition = intradayX * blendFactor + indexBasedX * (1 - blendFactor);
                  }
                  
                  // Convert to percentage
                  const xPercent = (xPosition / pastWidth) * 100;
                  
                  // Find the closest data point to get Y position
                  const closestDataPoint = filteredData[closestIndex];
                  
                  // Calculate Y position in pixels using the same formula as the chart
                  const yPosition = margin.top + chartHeight - ((closestDataPoint.value - minY) / valueRange) * chartHeight;
                  
                  // Dot size based on index (varying sizes)
                  const baseDotSizes = [12, 14, 16, 18, 20];
                  const dotSize = baseDotSizes[index % baseDotSizes.length];
                  
                  return { event, index, xPercent, yPosition, dotSize };
                })
                .filter(Boolean)
                .sort((a, b) => (b?.dotSize || 0) - (a?.dotSize || 0)); // Larger dots first
              
              return eventsWithPositions.map((item) => {
                if (!item) return null;
                const { event, index, xPercent, yPosition, dotSize } = item;
                const eventColor = getEventTypeHexColor(event.type);
                const dotBorderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
                const halfDotSize = dotSize / 2;
                
                return (
                  <View
                    key={`past-event-${event.id || index}`}
                    style={{
                      position: 'absolute',
                      left: `${xPercent}%`,
                      top: yPosition - halfDotSize,
                      marginLeft: -halfDotSize,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: halfDotSize,
                      backgroundColor: eventColor,
                      borderWidth: 1.5,
                      borderColor: dotBorderColor,
                      zIndex: 10,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    pointerEvents="none"
                  >
                    <Ionicons
                      name={getEventIcon(event.type)}
                      size={dotSize * 0.5}
                      color="#FFFFFF"
                    />
                  </View>
                );
              });
            })()}
          </View>
          
          {/* Continuous upcoming events line - spans from current price dot to end */}
          <View 
            style={[
              styles.upcomingEventsLine,
              {
                left: `${(lastPointX / pastWidth) * pastWidthPercent}%`,
                width: `${100 - (lastPointX / pastWidth) * pastWidthPercent}%`,
                top: 0,
                height: height,
              }
            ]}
            pointerEvents="none"
          >
            <Svg 
              style={StyleSheet.absoluteFill}
              viewBox={`0 0 100 ${height}`}
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
                opacity={0.6}
                vectorEffect="non-scaling-stroke"
              />
            </Svg>
          </View>
          
          {/* Crosshair tooltip */}
          {crosshairPoint && (() => {
            // Calculate tooltip positioning to prevent cutoff
            const LABEL_PADDING = 8; // Horizontal padding from styles
            const ESTIMATED_LABEL_WIDTH = 100; // Approximate max width for labels
            const EDGE_MARGIN = 8; // Minimum margin from screen edges
            
            const labelHalfWidth = ESTIMATED_LABEL_WIDTH / 2;
            const leftEdge = crosshairPoint.x - labelHalfWidth;
            const rightEdge = crosshairPoint.x + labelHalfWidth;
            
            let translateX = -50; // Default: center on crosshair (-50%)
            let leftPosition = crosshairPoint.x <= actualPastWidth 
              ? crosshairPoint.x 
              : actualPastWidth + (crosshairPoint.x - actualPastWidth);
            
            // Check if label would overflow left edge
            if (leftEdge < EDGE_MARGIN) {
              // Shift right: align left edge of label with margin
              translateX = 0;
              leftPosition = EDGE_MARGIN;
            }
            // Check if label would overflow right edge
            else if (rightEdge > width - EDGE_MARGIN) {
              // Shift left: align right edge of label with margin
              translateX = -100;
              leftPosition = width - EDGE_MARGIN;
            }
            
            return (
              <View
                style={[
                  styles.crosshairLabel,
                  {
                    left: leftPosition,
                    top: 22, // Position right above the crosshair line (which starts at 40px)
                    transform: [{ translateX: `${translateX}%` }],
                  }
                ]}
              >
                <Text style={[styles.crosshairLabelText, { color: themeColors.mutedForeground }]}>
                  {crosshairPoint.x > actualPastWidth ? (
                    // Future section: Show date
                    new Date(crosshairPoint.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  ) : isIntradayMode ? (
                    // 1D view: Show time rounded to 5-minute intervals
                    (() => {
                      const date = new Date(crosshairPoint.timestamp);
                      const minutes = date.getMinutes();
                      const roundedMinutes = Math.round(minutes / 5) * 5;
                      date.setMinutes(roundedMinutes, 0, 0);
                      return date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                    })()
                  ) : selectedTimeRange === '1W' || selectedTimeRange === '1M' ? (
                    // 1W and 1M views: Show date and time
                    new Date(crosshairPoint.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  ) : selectedTimeRange === 'YTD' && (() => {
                    // YTD view: Check if less than one month has elapsed
                    const now = new Date();
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    const oneMonthLater = new Date(yearStart);
                    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                    return now < oneMonthLater;
                  })() ? (
                    // YTD with less than 1 month elapsed: Show date and time
                    new Date(crosshairPoint.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  ) : (
                    // Other views (3M, YTD after 1 month, 1Y, 5Y): Show only date
                    new Date(crosshairPoint.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  )}
                </Text>
              </View>
            );
          })()}

          {/* Current price dot - only shown during trading sessions (not when market is closed) */}
          {isLiveSession && (
            <View 
              style={[
                styles.nowDotContainer,
                { 
                  left: `${(lastPointX / pastWidth) * pastWidthPercent}%`,
                  marginLeft: -5,
                  top: scaledLastPointY - 5,
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

          {/* Future Section */}
          {showUpcomingRange && (
            <View style={[styles.futureSection, { width: `${futureWidthPercent}%` }]} pointerEvents="box-none">
              {/* Main horizontal gradient (left to right) - background to grey to background */}
              <LinearGradient
                colors={[gradientEdgeColor, gradientCenterColor, gradientCenterColor, gradientEdgeColor]}
                locations={[0, 0.2, 0.8, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              
              {/* Top gradient - background fading to transparent */}
              <LinearGradient
                colors={[gradientSideColor, gradientSideTransparent]}
                locations={[0, 0.25]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              
              {/* Bottom gradient - transparent to background */}
              <LinearGradient
                colors={[gradientSideTransparent, gradientSideColor]}
                locations={[0.75, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* Price Target Lines - Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7 */}
              {/* Price Target Labels - Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3 */}
              {shouldShowPriceTargets && priceTargetStats && (() => {
                // Get chart layout margins (matching chartData calculation)
                const margin = { top: 40, bottom: 20 };
                const chartHeight = height - margin.top - margin.bottom;
                const { minY, maxY, valueRange } = chartData;
                
                // Get line configurations for each target type
                const lineConfigs = getPriceTargetLineConfigs(priceTargetStats);
                
                // Calculate the future section width for positioning
                const futureWidth = (width * futureWidthPercent) / 100;
                
                // Analyst price targets represent 1 year (365 days) into the future
                // Calculate the X position where lines should end based on the current future slider range
                const targetHorizonDays = 365; // 1 year target horizon
                const targetXRatio = Math.min(1, targetHorizonDays / futureDays); // Clamp to 1 if slider < 1 year
                
                // Label width estimation (for positioning lines to end before labels)
                const estimatedLabelWidth = 75; // Approximate width of "High: $548" label
                const labelPadding = 8;
                
                // Lines end at the target horizon position, but leave room for labels
                // If target horizon is beyond the visible range, lines go to the edge minus label space
                const lineEndX = Math.min(
                  futureWidth * targetXRatio,
                  futureWidth - estimatedLabelWidth - labelPadding
                );
                
                // Starting Y position for diagonal lines (current price point)
                // Use scaledLastPointY which is the Y position of the last data point
                const startY = scaledLastPointY;
                
                // Calculate the Y position at the line end point (interpolated based on where line ends)
                // The progress determines how far along the line we are toward the 1-year target
                const progress = lineEndX / (futureWidth * targetXRatio);
                
                // Calculate Y positions for each line at the LINE END POINT (not the full target)
                // This is the key: we interpolate based on how far the line extends
                const linesWithEndY = lineConfigs.map(config => {
                  // Full target Y position (where line would end at 1 year)
                  const fullTargetY = calculateTargetY(config.price, minY, maxY, chartHeight, margin.top);
                  // Interpolated Y position at the actual line endpoint
                  const lineEndY = startY + (fullTargetY - startY) * progress;
                  return { ...config, fullTargetY, lineEndY };
                });
                
                // Requirement 4.5: Apply overlap prevention algorithm to LINE END Y positions
                const labelHeight = 18; // Approximate height of label text
                const labelPositions = adjustLabelPositions(
                  linesWithEndY.map(line => ({ y: line.lineEndY, height: labelHeight })),
                  22, // Minimum spacing between labels
                  chartHeight,
                  margin.top
                );
                
                // Combine line data with adjusted label positions
                const linesWithLabels = linesWithEndY.map((line, index) => ({
                  ...line,
                  adjustedLabelY: labelPositions[index]?.y ?? line.lineEndY,
                }));
                
                // Requirements 6.1, 6.2: Theme-based label styling
                const labelBackgroundColor = isDark 
                  ? 'rgba(0, 0, 0, 0.7)' // Dark mode: semi-transparent dark background
                  : 'rgba(255, 255, 255, 0.85)'; // Light mode: semi-transparent light background
                const labelTextColor = isDark 
                  ? '#FFFFFF' // Dark mode: light text
                  : '#1F2937'; // Light mode: dark text
                
                return (
                  <>
                    {/* SVG for diagonal lines from current price to target prices */}
                    <Svg 
                      style={StyleSheet.absoluteFill}
                      viewBox={`0 0 ${futureWidth} ${height}`}
                      preserveAspectRatio="none"
                      pointerEvents="none"
                    >
                      {linesWithLabels.map((line, index) => (
                        <Line
                          key={`price-target-line-${line.type}`}
                          x1={0}
                          y1={startY}
                          x2={lineEndX}
                          y2={line.lineEndY}
                          stroke={line.color}
                          strokeWidth={line.strokeWidth}
                          strokeDasharray={PRICE_TARGET_DASH_ARRAY}
                          strokeLinecap="round"
                          opacity={0.8}
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </Svg>
                    
                    {/* Labels rendered as React Native Views for better styling */}
                    {/* Labels are positioned at the line end Y position */}
                    {linesWithLabels.map((line, index) => {
                      // Requirement 4.2, 4.3, 4.4: Format labels as "{Type}: {Price}"
                      const formattedPrice = formatTargetPrice(line.price);
                      const labelText = `${line.type}: ${formattedPrice}`;
                      
                      return (
                        <View
                          key={`price-target-label-${line.type}`}
                          style={{
                            position: 'absolute',
                            right: labelPadding,
                            top: line.adjustedLabelY - (labelHeight / 2),
                            backgroundColor: labelBackgroundColor,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: line.color,
                            zIndex: 20,
                          }}
                          pointerEvents="none"
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: labelTextColor,
                            }}
                          >
                            {labelText}
                          </Text>
                        </View>
                      );
                    })}
                  </>
                );
              })()}

              {/* Catalyst dots - rendered after dotted line to appear on top */}
              {/* All dots are rendered but hidden with opacity to prevent image re-renders */}
              {(() => {
                const now = Date.now();
                const logoSize = 24;
                
                // Track which logos have been rendered to avoid duplicates for clustered events
                // Key: ticker symbol, Value: position percentage where logo was rendered
                const renderedLogos = new Map<string, number>();
                
                // Pre-calculate positions for clustering
                const catalystPositions = futureCatalysts.map((catalyst, index) => {
                  const timeFromNow = catalyst.timestamp - now;
                  const isVisible = timeFromNow > 0 && timeFromNow <= futureWindowMs;
                  const timeBufferMs = 14 * 24 * 60 * 60 * 1000;
                  const adjustedTime = timeFromNow + timeBufferMs;
                  const leftPercent = isVisible 
                    ? Math.min(95, Math.max(5, (adjustedTime / futureWindowMs) * 100))
                    : 150;
                  
                  // Calculate dot size for sorting
                  let baseDotSizes: number[];
                  if (futureDays <= 90) {
                    baseDotSizes = [18, 21, 24, 27, 30];
                  } else if (futureDays <= 180) {
                    baseDotSizes = [15, 18, 21, 24, 27];
                  } else if (futureDays <= 365) {
                    baseDotSizes = [12, 15, 18, 21, 24];
                  } else if (futureDays <= 730) {
                    baseDotSizes = [10.5, 12.75, 15, 17.25, 19.5];
                  } else {
                    baseDotSizes = [9, 10.5, 12, 13.5, 15];
                  }
                  const dotSize = baseDotSizes[index % baseDotSizes.length];
                  
                  return { catalyst, index, leftPercent, isVisible, timeFromNow, dotSize };
                });
                
                // Sort by dot size descending so smaller dots render last (on top)
                const sortedPositions = [...catalystPositions].sort((a, b) => b.dotSize - a.dotSize);
                
                return sortedPositions.map(({ catalyst, index, leftPercent, isVisible, timeFromNow, dotSize: preCalculatedDotSize }) => {
                const eventColor = getEventTypeHexColor(catalyst.catalyst.type);
                
                // Use pre-calculated dot size from sorting
                const dotSize = preCalculatedDotSize;
                const halfDotSize = dotSize / 2;
                
                // Portfolio view: colored dot + dashed line + company logo below
                if (showTickerLogos && catalyst.tickerLogo) {
                  const logoSize = 24;
                  
                  // Get ticker from catalyst
                  const catalystTicker = catalyst.catalyst?.ticker || '';
                  
                  // Check if ANY logo (regardless of ticker) is already rendered within proximity
                  // This consolidates all nearby events to a single logo
                  const clusterTolerance = 8; // 8% of the future section width
                  let shouldShowLogo = isVisible;
                  
                  // Check all previously rendered logos to see if any are too close
                  for (const [existingTicker, existingPosition] of renderedLogos.entries()) {
                    if (Math.abs(leftPercent - existingPosition) <= clusterTolerance) {
                      shouldShowLogo = false;
                      break;
                    }
                  }
                  
                  // Update the rendered logo position if we're showing one
                  if (shouldShowLogo) {
                    renderedLogos.set(catalystTicker, leftPercent);
                  }
                  
                  // All logos on the same line (no vertical staggering)
                  const logoTop = scaledLastPointY + 25;
                  const lineHeight = logoTop - scaledLastPointY - halfDotSize + (logoSize / 2);
                  
                  const dotBorderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
                  
                  return (
                    <React.Fragment key={`catalyst-${index}`}>
                      {/* Colored event dot with border for differentiation - always show */}
                      <View
                        style={[
                          styles.catalystDot,
                          {
                            left: `${leftPercent}%`,
                            marginLeft: -halfDotSize,
                            top: scaledLastPointY - halfDotSize,
                            width: dotSize,
                            height: dotSize,
                            borderRadius: dotSize / 2,
                            backgroundColor: eventColor,
                            borderWidth: 1.5,
                            borderColor: dotBorderColor,
                            zIndex: 12,
                            opacity: isVisible ? 1 : 0,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }
                        ]}
                        pointerEvents="none"
                      >
                        <Ionicons
                          name={getEventIcon(catalyst.catalyst.type)}
                          size={dotSize * 0.5}
                          color="#FFFFFF"
                        />
                      </View>
                      
                      {/* Vertical dashed line - only show if this event shows its logo */}
                      <View
                        style={{
                          position: 'absolute',
                          left: `${leftPercent}%`,
                          marginLeft: -0.5,
                          top: scaledLastPointY + halfDotSize,
                          width: 1,
                          height: lineHeight,
                          zIndex: 9,
                          opacity: shouldShowLogo ? 1 : 0,
                        }}
                        pointerEvents="none"
                      >
                        <Svg width="1" height={lineHeight}>
                          <Line
                            x1={0.5}
                            y1={0}
                            x2={0.5}
                            y2={lineHeight}
                            stroke={eventColor}
                            strokeWidth={1}
                            strokeDasharray="3,3"
                            opacity={0.6}
                          />
                        </Svg>
                      </View>
                      
                      {/* Company logo - only show if not clustered with another event */}
                      <View
                        style={{
                          position: 'absolute',
                          left: `${leftPercent}%`,
                          marginLeft: -(logoSize / 2),
                          top: logoTop,
                          width: logoSize,
                          height: logoSize,
                          borderRadius: 6,
                          overflow: 'hidden',
                          backgroundColor: themeColors.card,
                          borderWidth: 1,
                          borderColor: themeColors.border,
                          zIndex: 11,
                          opacity: shouldShowLogo ? 1 : 0,
                        }}
                        pointerEvents="none"
                      >
                        <ExpoImage
                          source={{ uri: catalyst.tickerLogo }}
                          style={{ width: logoSize, height: logoSize }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      </View>
                    </React.Fragment>
                  );
                }
                
                // Default colored dot (stock chart view) with border for differentiation
                const dotBorderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
                return (
                  <View
                    key={`catalyst-${index}`}
                    style={[
                      styles.catalystDot,
                      {
                        left: `${leftPercent}%`,
                        marginLeft: -halfDotSize,
                        top: scaledLastPointY - halfDotSize,
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor: eventColor,
                        borderWidth: 1.5,
                        borderColor: dotBorderColor,
                        zIndex: 10,
                        opacity: isVisible ? 1 : 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }
                    ]}
                    pointerEvents="none"
                  >
                    <Ionicons
                      name={getEventIcon(catalyst.catalyst.type)}
                      size={dotSize * 0.5}
                      color="#FFFFFF"
                    />
                  </View>
                );
              });
              })()}
              
              {/* Crosshair in future section */}
              {crosshairPoint && crosshairPoint.x > pastWidth && (
                <Svg 
                  style={StyleSheet.absoluteFill}
                  viewBox={`0 0 100 ${height}`}
                  preserveAspectRatio="none"
                  pointerEvents="none"
                >
                  {/* Calculate position relative to future section */}
                  {(() => {
                    const futureWidth = (width * futureWidthPercent) / 100;
                    const xInFutureSection = crosshairPoint.x - pastWidth;
                    const xPercent = (xInFutureSection / futureWidth) * 100;
                    
                    return (
                      <Line
                        x1={xPercent}
                        y1={0}
                        x2={xPercent}
                        y2={height}
                        stroke={chartColor}
                        strokeWidth={1}
                        strokeDasharray="3,3"
                        opacity={0.5}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })()}
                </Svg>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Time Range Selectors - Split into Past and Future with Continuous Sliders */}
      <View style={styles.dualRangeContainer}>
        {/* Past Range Slider - Logarithmic scaling (1D → 1W → 1M → 1Y → 5Y) */}
        <View style={[styles.rangeSection, { width: `${pastWidthPercent}%` }]}>
          <View style={styles.sliderContainer}>
            {/* Current value label positioned above slider thumb */}
            {pastSliderWidth > 0 && (() => {
              // Slider thumb has internal padding (~15px on each side on iOS)
              // The thumb center travels from thumbPadding to (width - thumbPadding)
              const thumbPadding = 15;
              const travelWidth = pastSliderWidth - (thumbPadding * 2);
              const thumbCenterX = thumbPadding + (pastSliderPosition / 100) * travelWidth;
              
              return (
                <Animated.View 
                  style={[
                    styles.sliderValueLabel, 
                    { 
                      left: thumbCenterX,
                      transform: [
                        { translateX: -20 }, // Center the 40px label
                        { translateY: pastLabelTranslateY },
                        { scale: pastLabelScale },
                      ],
                    }
                  ]}
                >
                  <View style={styles.sliderValueBubbleCentered}>
                    <Text style={[styles.sliderValueText, { color: themeColors.foreground }]}>
                      {getDaysLabel(pastDays)}
                    </Text>
                  </View>
                </Animated.View>
              );
            })()}
            
            {/* Triangle background for Past slider */}
            <View style={styles.sliderWithBackground}>
              <View style={styles.triangleBackground}>
                <Svg width="100%" height="12" viewBox="0 0 100 12" preserveAspectRatio="none">
                  <Path
                    d="M 100,0 L 0,6 L 100,12 Z"
                    fill={themeColors.mutedForeground}
                    opacity={0.15}
                  />
                </Svg>
              </View>
              <View onLayout={(e) => setPastSliderWidth(e.nativeEvent.layout.width)} style={styles.sliderOverlay}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={0.1}
                  value={pastSliderPosition}
                  onValueChange={handlePastSliderChange}
                  onSlidingStart={() => setIsPastSliderActive(true)}
                  onSlidingComplete={() => setIsPastSliderActive(false)}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor={themeColors.primary}
                />
              </View>
            </View>
          </View>
          
          {/* Section label below - right aligned */}
          <Text style={[styles.rangeSectionLabelBelow, styles.labelRight, { color: themeColors.mutedForeground }]}>Past</Text>
        </View>

        {/* Future Range Slider - Range from 1W to 3Y, 6M at center - Logarithmic scale */}
        {showUpcomingRange && (
          <View style={[styles.rangeSection, { width: `${futureWidthPercent}%` }]}>
            <View style={styles.sliderContainer}>
              {/* Current value label positioned above slider thumb */}
              {futureSliderWidth > 0 && (() => {
                // Use logarithmic position where 6M (180 days) is at 50%
                const sliderPercent = futureDaysToSliderPosition(futureDays);
                // Slider thumb has internal padding (~15px on each side on iOS)
                const thumbPadding = 15;
                const travelWidth = futureSliderWidth - (thumbPadding * 2);
                const thumbCenterX = thumbPadding + (sliderPercent / 100) * travelWidth;
                
                return (
                  <Animated.View 
                    style={[
                      styles.sliderValueLabel, 
                      { 
                        left: thumbCenterX,
                        transform: [
                          { translateX: -20 }, // Center the 40px label
                          { translateY: futureLabelTranslateY },
                          { scale: futureLabelScale },
                        ],
                      }
                    ]}
                  >
                    <View style={styles.sliderValueBubbleCentered}>
                      <Text style={[styles.sliderValueText, { color: themeColors.foreground }]}>
                        {getDaysLabel(futureDays)}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })()}
              
              {/* Triangle background for Future slider */}
              <View style={styles.sliderWithBackground}>
                <View style={styles.triangleBackground}>
                  <Svg width="100%" height="12" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <Path
                      d="M 0,0 L 100,6 L 0,12 Z"
                      fill={themeColors.mutedForeground}
                      opacity={0.15}
                    />
                  </Svg>
                </View>
                <View onLayout={(e) => setFutureSliderWidth(e.nativeEvent.layout.width)} style={styles.sliderOverlay}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    step={0.1}
                    value={futureDaysToSliderPosition(futureDays)}
                    onValueChange={(position) => handleFutureSliderChange(futureSliderPositionToDays(position))}
                    onSlidingStart={() => setIsFutureSliderActive(true)}
                    onSlidingComplete={() => setIsFutureSliderActive(false)}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor={themeColors.primary}
                  />
                </View>
              </View>
            </View>
            
            {/* Section label below - left aligned */}
            <Text style={[styles.rangeSectionLabelBelow, styles.labelLeft, { color: themeColors.mutedForeground }]}>Upcoming</Text>
          </View>
        )}
      </View>
      
      {/* Price Targets Toggle - only show when showUpcomingRange is true and not in miniMode */}
      {showUpcomingRange && !miniMode && priceTargets.length > 0 && (
        <View style={styles.priceTargetsToggleContainer}>
          <Text style={[
            styles.priceTargetsToggleLabel, 
            { color: priceTargetsAvailable ? themeColors.mutedForeground : themeColors.muted }
          ]}>
            Price Targets {!priceTargetsAvailable && '(3M+)'}
          </Text>
          <Switch
            value={priceTargetsEnabled}
            onValueChange={setPriceTargetsEnabled}
            disabled={!priceTargetsAvailable}
            trackColor={{ 
              false: priceTargetsAvailable ? themeColors.muted : `${themeColors.muted}80`, 
              true: priceTargetsAvailable ? themeColors.primary : `${themeColors.primary}40` 
            }}
            thumbColor={priceTargetsAvailable ? (priceTargetsEnabled ? '#fff' : '#f4f3f4') : '#d0d0d0'}
            ios_backgroundColor={priceTargetsAvailable ? themeColors.muted : `${themeColors.muted}80`}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerNoStyle: {
    // No padding, border, shadow - full width for embedded use
  },
  header: {
    marginBottom: 0,
  },
  tickerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  priceRow: {
    marginBottom: 4,
  },
  crosshairPrice: {
    fontSize: 28,
    fontWeight: '600',
  },
  changeContainer: {
    marginTop: 4,
  },
  changesColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 20, // Fixed height to match empty row
  },
  changeArrow: {
    fontSize: 10,
    fontWeight: '600',
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 12,
  },
  emptyRow: {
    fontSize: 14,
    minHeight: 20, // Match the minHeight of changeRow
    lineHeight: 20,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: 'rgb(0, 200, 5)',
  },
  negative: {
    color: 'rgb(255, 80, 0)',
  },
  chartWrapper: {
    marginBottom: 0,
    position: 'relative',
  },
  chartContainer: {
    flexDirection: 'row',
    position: 'relative',
    overflow: 'visible',
  },
  pastSection: {
    height: '100%',
    position: 'relative',
    overflow: 'visible',
  },

  nowDotContainer: {
    position: 'absolute',
    width: 10,
    height: 10,
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.4,
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  futureSection: {
    height: '100%',
    position: 'relative',
  },
  upcomingEventsLine: {
    position: 'absolute',
    zIndex: 5, // Behind catalyst dots
  },
  catalystDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  dualRangeContainer: {
    flexDirection: 'row',
    marginTop: 32, // Add constant top margin to prevent logo overlap
    gap: 8,
    paddingHorizontal: 16,
  },
  rangeSection: {
    flexDirection: 'column',
    position: 'relative',
  },
  sliderContainer: {
    position: 'relative',
    paddingTop: 24,
  },
  sliderValueLabel: {
    position: 'absolute',
    top: 0,
  },
  sliderValueBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20, // Half of minWidth to center
  },
  sliderValueBubbleCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  sliderValueText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 40,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rangeSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rangeSectionLabelBelow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    textAlign: 'center',
  },
  sliderWithBackground: {
    position: 'relative',
    width: '100%',
  },
  triangleBackground: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    height: 12,
    zIndex: 0,
  },
  sliderOverlay: {
    position: 'relative',
    zIndex: 1,
  },
  labelRight: {
    textAlign: 'right',
  },
  labelLeft: {
    textAlign: 'left',
  },
  rangeValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
  },
  sliderLabelText: {
    fontSize: 10,
    fontWeight: '500',
  },
  timeRangeSelector: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  timeRangeSelectorContent: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rangeButtonActive: {
    // backgroundColor applied dynamically
  },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rangeButtonTextActive: {
    // color applied dynamically
  },
  emptyContainer: {
    height: 312,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  crosshairLabel: {
    position: 'absolute',
    zIndex: 100,
  },
  crosshairLabelText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  priceTargetsToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 8,
  },
  priceTargetsToggleLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});





