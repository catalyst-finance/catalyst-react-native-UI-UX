/**
 * Chart Time Utilities
 * 
 * Shared time calculation functions used by all chart components.
 * Extracted from large-svg-chart.tsx and advanced-financial-chart.tsx
 * to eliminate duplication.
 */

import { 
  TimeRange, 
  MarketPeriod, 
  MarketHoursBounds, 
  TradingDayContext,
  UnifiedChartPoint,
  TimeLabel 
} from '../types/chart-types';

// ============================================================================
// Constants
// ============================================================================

/** Extended market hours in ET */
export const EXTENDED_MARKET_HOURS = {
  openHour: 8,    // 8:00 AM ET (websocket start)
  openMinute: 0,
  regularOpenHour: 9,  // 9:30 AM ET
  regularOpenMinute: 30,
  regularCloseHour: 16, // 4:00 PM ET
  regularCloseMinute: 0,
  closeHour: 20,  // 8:00 PM ET
  closeMinute: 0,
};

/** Total extended hours duration in hours */
export const EXTENDED_HOURS_TOTAL = 12; // 8 AM to 8 PM = 12 hours

/** Milliseconds in common time units */
export const MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

// ============================================================================
// Market Hours Functions
// ============================================================================

/**
 * Get market hours bounds for a specific trading day
 * @param tradingDay - Date object representing the trading day
 * @returns Market hours bounds with timestamps  
 */
export function getMarketHoursBounds(tradingDay: Date): MarketHoursBounds {
  // Convert to ET to get the correct trading day date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(tradingDay);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  
  // Create timestamps for market hours on this ET date
  const createETTime = (hour: number, minute: number): number => {
    // Create an ISO string for the desired ET time
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isoTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    
    // Parse this as a local date first
    const localDate = new Date(`${isoDate}T${isoTime}`);
    
    // Check what this date is in ET
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const etParts = etFormatter.formatToParts(localDate);
    const etHour = parseInt(etParts.find(p => p.type === 'hour')?.value || '0');
    const etMinute = parseInt(etParts.find(p => p.type === 'minute')?.value || '0');
    
    // Calculate offset needed
    const targetMinutes = hour * 60 + minute;
    const actualMinutes = etHour * 60 + etMinute;
    const offsetMinutes = targetMinutes - actualMinutes;
    
    // Return adjusted timestamp
    return localDate.getTime() + (offsetMinutes * 60 * 1000);
  };
  
  return {
    extendedOpen: createETTime(EXTENDED_MARKET_HOURS.openHour, EXTENDED_MARKET_HOURS.openMinute),
    regularOpen: createETTime(EXTENDED_MARKET_HOURS.regularOpenHour, EXTENDED_MARKET_HOURS.regularOpenMinute),
    regularClose: createETTime(EXTENDED_MARKET_HOURS.regularCloseHour, EXTENDED_MARKET_HOURS.regularCloseMinute),
    extendedClose: createETTime(EXTENDED_MARKET_HOURS.closeHour, EXTENDED_MARKET_HOURS.closeMinute),
  };
}

/**
 * Get the trading day from data points
 * Uses the first data point to determine which day we're showing
 * @param data - Array of chart data points
 * @returns Trading day date object (midnight ET)
 */
export function getTradingDayFromData(data: UnifiedChartPoint[] | { timestamp: number }[]): Date {
  if (data.length === 0) {
    // Default to today
    return new Date();
  }
  
  const firstTimestamp = data[0].timestamp;
  return new Date(firstTimestamp);
}

/**
 * Create a full trading day context for calculations
 * @param data - Chart data points to derive trading day from
 * @param isHoliday - Whether this day is a market holiday
 * @returns Complete trading day context
 */
export function createTradingDayContext(
  data: UnifiedChartPoint[] | { timestamp: number }[],
  isHoliday: boolean = false
): TradingDayContext {
  const tradingDay = getTradingDayFromData(data);
  const marketHours = getMarketHoursBounds(tradingDay);
  
  // Get today's date for comparison
  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  todayET.setHours(0, 0, 0, 0);
  
  const tradingDayDateOnly = tradingDay.toISOString().split('T')[0];
  const todayDateOnly = todayET.toISOString().split('T')[0];
  
  // Get day of week from TRADING DAY, not today
  const dayOfWeek = tradingDay.getDay();
  
  return {
    tradingDay,
    marketHours,
    extendedHoursDuration: marketHours.extendedClose - marketHours.extendedOpen,
    isHistorical: tradingDayDateOnly !== todayDateOnly,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isHoliday,
  };
}

// ============================================================================
// Market Period Functions
// ============================================================================

/**
 * Determine current market period based on time and trading day context
 * @param tradingDayContext - Trading day context
 * @returns Current market period
 */
export function determineMarketPeriod(tradingDayContext: TradingDayContext): MarketPeriod {
  const { marketHours, isHistorical, isWeekend, isHoliday } = tradingDayContext;
  
  // On weekends, holidays, or when showing historical data, always return 'closed'
  if (isWeekend || isHoliday || isHistorical) {
    return 'closed';
  }
  
  const currentTimestamp = Date.now();
  
  if (currentTimestamp < marketHours.regularOpen) {
    return 'premarket';
  } else if (currentTimestamp <= marketHours.regularClose) {
    return 'regular';
  } else if (currentTimestamp <= marketHours.extendedClose) {
    return 'afterhours';
  } else {
    return 'closed';
  }
}

/**
 * Determine which session a specific timestamp belongs to
 * @param timestamp - Unix timestamp to check
 * @param marketHours - Market hours bounds
 * @returns Session name
 */
export function getSessionForTimestamp(
  timestamp: number, 
  marketHours: MarketHoursBounds
): 'premarket' | 'regular' | 'afterhours' {
  if (timestamp < marketHours.regularOpen) {
    return 'premarket';
  } else if (timestamp <= marketHours.regularClose) {
    return 'regular';
  } else {
    return 'afterhours';
  }
}

/**
 * Check if it's currently pre-market hours on a trading day
 * CRITICAL: Weekends are NOT pre-market even if the time is before 9:30 AM
 * @returns true if it's a weekday before 9:30 AM ET, false otherwise
 */
export function isCurrentlyPreMarket(): boolean {
  const now = new Date();
  const nowET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Check if it's a weekend first - weekends are NEVER pre-market
  const dayOfWeek = nowET.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  
  if (isWeekend) {
    return false;
  }
  
  // On weekdays, check if we're before 9:30 AM
  const preMarketCheckTime = new Date(nowET);
  preMarketCheckTime.setHours(9, 30, 0, 0);
  
  return Date.now() < preMarketCheckTime.getTime();
}

/**
 * Check if it's currently a weekend
 * @returns true if today is Saturday or Sunday in ET timezone
 */
export function isCurrentlyWeekend(): boolean {
  const now = new Date();
  const nowET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dayOfWeek = nowET.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

/**
 * Get the effective previous close for chart calculations
 * During pre-market (on trading days only), use yesterday's close
 * On weekends/holidays/after-hours, use the standard previous close
 * 
 * @param previousClose - Standard previous close (the day before the last trading day's close)
 * @param previousDayData - Previous day data containing close price (the last trading day's close)
 * @returns The appropriate previous close to use for chart baseline
 */
export function getEffectivePreviousClose(
  previousClose: number | null,
  previousDayData: { close: number; previousClose?: number } | null
): number | null {
  const isPreMarket = isCurrentlyPreMarket();
  
  // During pre-market on trading days, use yesterday's close (the 'close' field from previous day data)
  if (isPreMarket && previousDayData?.close) {
    return previousDayData.close;
  }
  
  // Otherwise (weekends, after-hours, regular hours), use the standard previous close
  return previousClose;
}

// ============================================================================
// X Position Calculation Functions
// ============================================================================

/**
 * Calculate X position for intraday (1D) view using time-based positioning
 * @param timestamp - Unix timestamp of the data point
 * @param marketHours - Market hours bounds for the trading day
 * @param chartWidth - Total width of the chart in pixels/viewBox units
 * @returns X position (0 to chartWidth)
 */
export function calculateIntradayXPosition(
  timestamp: number,
  marketHours: MarketHoursBounds,
  chartWidth: number
): number {
  const hoursFromOpen = (timestamp - marketHours.extendedOpen) / MS.HOUR;
  const xPercent = hoursFromOpen / EXTENDED_HOURS_TOTAL;
  return xPercent * chartWidth;
}

/**
 * Calculate X position for multi-day views using index-based positioning
 * This removes gaps for weekends/non-trading days
 * @param index - Index of the data point in the array
 * @param totalPoints - Total number of data points
 * @param chartWidth - Total width of the chart
 * @returns X position (0 to chartWidth)
 */
export function calculateIndexBasedXPosition(
  index: number,
  totalPoints: number,
  chartWidth: number
): number {
  if (totalPoints <= 1) return chartWidth / 2;
  return (index / (totalPoints - 1)) * chartWidth;
}

/**
 * Calculate X position for 5Y view using timestamp-based positioning
 * This shows blank space when data doesn't go back full 5 years
 * @param timestamp - Unix timestamp of the data point
 * @param chartWidth - Total width of the chart
 * @returns X position (0 to chartWidth)
 */
export function calculate5YXPosition(
  timestamp: number,
  chartWidth: number
): number {
  const now = Date.now();
  const fiveYearsPast = 5 * MS.YEAR;
  const startTime = now - fiveYearsPast;
  const totalDuration = fiveYearsPast;
  
  const timeFromStart = timestamp - startTime;
  const xPercent = timeFromStart / totalDuration;
  return xPercent * chartWidth;
}

/**
 * Calculate X position based on time range
 * @param timestamp - Unix timestamp of the data point
 * @param index - Index in the data array
 * @param totalPoints - Total number of data points
 * @param timeRange - Selected time range
 * @param marketHours - Market hours bounds (for intraday)
 * @param chartWidth - Total chart width
 * @returns X position
 */
export function calculateXPosition(
  timestamp: number,
  index: number,
  totalPoints: number,
  timeRange: TimeRange,
  marketHours: MarketHoursBounds,
  chartWidth: number
): number {
  if (timeRange === '1D') {
    return calculateIntradayXPosition(timestamp, marketHours, chartWidth);
  } else if (timeRange === '5Y') {
    return calculate5YXPosition(timestamp, chartWidth);
  } else {
    // 1W, 1M, 3M, YTD, 1Y - use index-based positioning
    return calculateIndexBasedXPosition(index, totalPoints, chartWidth);
  }
}

// ============================================================================
// Future Window Calculations
// ============================================================================

/**
 * Calculate the future window duration based on time range and viewport split
 * @param timeRange - Selected time range
 * @param futureWidthPercent - Percentage of viewport for future section (0-100)
 * @returns Future window in milliseconds
 */
export function calculateFutureWindowMs(
  timeRange: TimeRange,
  futureWidthPercent: number
): number {
  // Base case: 50% width = 3 months, scale linearly
  const baseMonths = 3;
  const baseWidth = 50;
  const monthsToShow = Math.max(1, Math.round((futureWidthPercent / baseWidth) * baseMonths));
  
  switch (timeRange) {
    case '1D':
    case '1W':
    case '1M':
    case '3M':
      return monthsToShow * MS.MONTH;
    case 'YTD': {
      // Match past duration
      const now = Date.now();
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      const pastDuration = now - yearStart;
      return Math.max(pastDuration, 90 * MS.DAY);
    }
    case '1Y':
      return MS.YEAR;
    case '5Y':
      return 5 * MS.YEAR;
    default:
      return 90 * MS.DAY;
  }
}

// ============================================================================
// Time Label Functions
// ============================================================================

/**
 * Generate time labels for intraday (1D) view
 * @param viewportSplit - Percentage of viewport for past section
 * @param futureWindowMs - Future window duration in milliseconds
 * @returns Array of time labels
 */
export function generateIntradayLabels(
  viewportSplit: number,
  futureWindowMs: number
): TimeLabel[] {
  const labels: TimeLabel[] = [];
  const pastPercent = viewportSplit;
  
  // Past labels for market hours
  // 9:30 AM at 12.5% of extended hours (1.5 hours into 12 hour window)
  labels.push({ label: '9:30 AM', position: (12.5 / 100) * pastPercent, section: 'past' });
  // 4 PM at 66.67% of extended hours (8 hours into 12 hour window)
  labels.push({ label: '4 PM', position: (66.67 / 100) * pastPercent, section: 'past' });
  // 8 PM at 100% of extended hours
  labels.push({ label: '8 PM', position: pastPercent, section: 'past' });
  
  // Future labels
  const now = Date.now();
  const numFutureLabels = Math.max(1, Math.round(futureWindowMs / MS.MONTH));
  
  for (let i = 1; i <= numFutureLabels; i++) {
    const futureTimestamp = now + (futureWindowMs * i / numFutureLabels);
    const date = new Date(futureTimestamp);
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    const position = pastPercent + ((i / (numFutureLabels + 1)) * (100 - pastPercent));
    labels.push({ label: monthLabel, position, section: 'future' });
  }
  
  return labels;
}

/**
 * Generate time labels for weekly/monthly views with index-based positioning
 * @param data - Chart data points
 * @param timeRange - Selected time range
 * @param viewportSplit - Percentage of viewport for past section
 * @param futureWindowMs - Future window duration
 * @returns Array of time labels
 */
export function generateIndexBasedLabels(
  data: { timestamp: number }[],
  timeRange: TimeRange,
  viewportSplit: number,
  futureWindowMs: number
): TimeLabel[] {
  const labels: TimeLabel[] = [];
  const now = Date.now();
  const pastPercent = viewportSplit;
  
  const pastData = data.filter(d => d.timestamp <= now);
  
  if (pastData.length > 0) {
    // Group data by day
    const dayMap = new Map<string, number[]>();
    pastData.forEach((point, index) => {
      const date = new Date(point.timestamp);
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      const label = `${month}/${day}`;
      
      if (!dayMap.has(label)) {
        dayMap.set(label, []);
      }
      dayMap.get(label)!.push(index);
    });
    
    const uniqueDays = Array.from(dayMap.entries());
    const numLabels = timeRange === '1W' ? Math.min(5, uniqueDays.length) : Math.min(6, uniqueDays.length);
    
    for (let i = 0; i < numLabels; i++) {
      const dayIndex = Math.floor((uniqueDays.length - 1) * i / Math.max(1, numLabels - 1));
      const [label, dataIndices] = uniqueDays[dayIndex];
      const middleIndex = dataIndices[Math.floor(dataIndices.length / 2)];
      const position = (middleIndex / Math.max(1, pastData.length - 1)) * pastPercent;
      labels.push({ label, position, section: 'past' });
    }
  }
  
  // Add future month labels
  const numFutureLabels = Math.max(1, Math.round(futureWindowMs / MS.MONTH));
  for (let i = 1; i <= numFutureLabels; i++) {
    const futureTimestamp = now + (futureWindowMs * i / numFutureLabels);
    const date = new Date(futureTimestamp);
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    const position = pastPercent + ((i / (numFutureLabels + 1)) * (100 - pastPercent));
    labels.push({ label: monthLabel, position, section: 'future' });
  }
  
  return labels;
}

/**
 * Generate time labels for year views (1Y, 5Y)
 * @param timeRange - Selected time range
 * @param dataStartTimestamp - Timestamp of first data point
 * @param viewportSplit - Percentage of viewport for past section
 * @returns Array of time labels
 */
export function generateYearLabels(
  timeRange: TimeRange,
  dataStartTimestamp: number,
  viewportSplit: number
): TimeLabel[] {
  const labels: TimeLabel[] = [];
  const now = Date.now();
  
  let pastDuration: number;
  let futureDuration: number;
  
  if (timeRange === '5Y') {
    pastDuration = 5 * MS.YEAR;
    futureDuration = 5 * MS.YEAR;
  } else if (timeRange === '1Y') {
    pastDuration = MS.YEAR;
    futureDuration = MS.YEAR;
  } else {
    // YTD, 3M
    pastDuration = now - dataStartTimestamp;
    futureDuration = pastDuration;
  }
  
  const totalDuration = pastDuration + futureDuration;
  const startTime = now - pastDuration;
  const endTime = now + futureDuration;
  
  if (timeRange === '5Y') {
    // Show year labels
    const startYear = new Date(startTime).getFullYear();
    const endYear = new Date(endTime).getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      const yearStart = Date.UTC(year, 0, 1);
      const yearEnd = Date.UTC(year + 1, 0, 1);
      const yearCenter = (yearStart + yearEnd) / 2;
      
      if (yearCenter >= startTime && yearCenter <= endTime) {
        const position = ((yearCenter - startTime) / totalDuration) * 100;
        const section: 'past' | 'future' = yearCenter <= now ? 'past' : 'future';
        labels.push({ label: year.toString(), position, section });
      }
    }
  } else {
    // Show month labels
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    let monthCounter = 0;
    
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthCenter = Date.UTC(year, month, 15, 12, 0, 0);
      
      if (monthCenter >= startTime && monthCenter <= endTime) {
        const shouldShowLabel = timeRange === '3M' || (monthCounter % 2 === 0);
        
        if (shouldShowLabel) {
          const position = ((monthCenter - startTime) / totalDuration) * 100;
          const section: 'past' | 'future' = monthCenter <= now ? 'past' : 'future';
          const monthLabel = new Date(monthCenter).toLocaleDateString('en-US', { month: 'short' });
          labels.push({ label: monthLabel, position, section });
        }
        
        monthCounter++;
      }
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  
  return labels;
}

/**
 * Generate unified time labels for any time range
 * @param data - Chart data points
 * @param timeRange - Selected time range
 * @param viewportSplit - Percentage of viewport for past section
 * @param futureWindowMs - Future window duration (optional, will calculate if not provided)
 * @returns Array of time labels
 */
export function generateTimeLabels(
  data: { timestamp: number }[],
  timeRange: TimeRange,
  viewportSplit: number,
  futureWindowMs?: number
): TimeLabel[] {
  const calculatedFutureWindow = futureWindowMs ?? calculateFutureWindowMs(timeRange, 100 - viewportSplit);
  
  if (timeRange === '1D') {
    return generateIntradayLabels(viewportSplit, calculatedFutureWindow);
  } else if (timeRange === '1W' || timeRange === '1M') {
    return generateIndexBasedLabels(data, timeRange, viewportSplit, calculatedFutureWindow);
  } else {
    // YTD, 3M, 1Y, 5Y
    const dataStartTimestamp = data.length > 0 ? data[0].timestamp : Date.now();
    return generateYearLabels(timeRange, dataStartTimestamp, viewportSplit);
  }
}

/**
 * Filter labels to prevent overlapping
 * @param labels - Array of time labels
 * @param viewportSplit - Percentage of viewport for past section
 * @param minLabelSpacing - Minimum percentage distance between labels (default 12)
 * @param edgeThreshold - Minimum distance from section edge (default 8)
 * @returns Labels with visibility flags set
 */
export function filterOverlappingLabels(
  labels: TimeLabel[],
  viewportSplit: number,
  minLabelSpacing: number = 12,
  edgeThreshold: number = 8
): TimeLabel[] {
  if (labels.length === 0) return [];
  
  const visible = new Set<number>();
  const pastLabels = labels.filter(l => l.section === 'past').sort((a, b) => a.position - b.position);
  const futureLabels = labels.filter(l => l.section === 'future').sort((a, b) => a.position - b.position);
  
  // Check past section for overlaps
  let lastPastPosition = -Infinity;
  pastLabels.forEach((label) => {
    const originalIndex = labels.indexOf(label);
    // Hide label if too close to start edge when section is compressed
    if (label.position < edgeThreshold && viewportSplit < 25) {
      return;
    }
    if (label.position - lastPastPosition >= minLabelSpacing) {
      visible.add(originalIndex);
      lastPastPosition = label.position;
    }
  });
  
  // Check future section for overlaps
  let lastFuturePosition = -Infinity;
  futureLabels.forEach((label) => {
    const originalIndex = labels.indexOf(label);
    const distanceFromFutureStart = label.position - viewportSplit;
    if (distanceFromFutureStart < edgeThreshold && (100 - viewportSplit) < 25) {
      return;
    }
    if (label.position - lastFuturePosition >= minLabelSpacing) {
      visible.add(originalIndex);
      lastFuturePosition = label.position;
    }
  });
  
  return labels.map((label, idx) => ({
    ...label,
    visible: visible.has(idx),
  }));
}

// ============================================================================
// Timestamp Utilities
// ============================================================================

/**
 * Snap timestamp to nearest interval for display
 * @param timestamp - Unix timestamp
 * @param intervalMinutes - Interval in minutes (default 5)
 * @returns Snapped timestamp
 */
export function snapTimestampToInterval(timestamp: number, intervalMinutes: number = 5): number {
  const intervalMs = intervalMinutes * MS.MINUTE;
  return Math.round(timestamp / intervalMs) * intervalMs;
}

/**
 * Check if a timestamp is within a certain time window
 * @param timestamp - Timestamp to check
 * @param targetTimestamp - Target timestamp
 * @param windowMs - Window size in milliseconds
 * @returns Whether timestamp is within window
 */
export function isWithinTimeWindow(
  timestamp: number,
  targetTimestamp: number,
  windowMs: number
): boolean {
  return Math.abs(timestamp - targetTimestamp) <= windowMs;
}

/**
 * Get formatted time label based on time range
 * @param timestamp - Unix timestamp
 * @param timeRange - Selected time range
 * @returns Formatted time string
 */
export function formatTimestampForRange(timestamp: number, timeRange: TimeRange): string {
  const date = new Date(timestamp);
  
  if (timeRange === '1D') {
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (timeRange === '1W' || timeRange === '1M') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
