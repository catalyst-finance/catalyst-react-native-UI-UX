/**
 * Unified Chart Types
 * 
 * This file contains all shared interfaces and types used by the chart system.
 * Both line and candlestick charts use these same types for consistency.
 */

import { MarketEvent } from '../utils/supabase/events-api';

// ============================================================================
// Time Range Types
// ============================================================================

/**
 * Available time range options for chart display
 */
export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'ALL';

/**
 * Chart type (line or candlestick)
 */
export type ChartType = 'line' | 'candlestick';

/**
 * Market period states
 */
export type MarketPeriod = 'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday';

// ============================================================================
// Data Point Types
// ============================================================================

/**
 * Unified data point structure used by all chart types
 * Contains OHLCV data plus positioning information
 */
export interface UnifiedChartPoint {
  /** ISO date string or timestamp string */
  date: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Closing price (used as primary value for line charts) */
  close: number;
  /** Opening price (for candlestick charts) */
  open: number;
  /** High price (for candlestick charts) */
  high: number;
  /** Low price (for candlestick charts) */
  low: number;
  /** Trading volume */
  volume: number;
  /** Day index relative to current day (0 = today, -1 = yesterday, etc.) */
  dayIndex: number;
  /** Hour index relative to current time (optional, for intraday) */
  hourIndex?: number;
  /** Associated market event/catalyst (optional) */
  catalyst?: MarketEvent;
}

/**
 * Simple data point for line charts (subset of UnifiedChartPoint)
 */
export interface SimpleDataPoint {
  timestamp: number;
  value: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

/**
 * Candlestick-specific data point
 */
export interface CandlestickDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// Future Catalyst Types
// ============================================================================

/**
 * Future catalyst event positioned on the timeline
 */
export interface FutureCatalyst {
  /** ISO date string */
  date: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** The market event data */
  catalyst: MarketEvent;
  /** Days from today */
  dayIndex: number;
  /** Normalized Y position (0-1) for the event dot */
  position: number;
  /** Optional: title shorthand for display */
  title?: string;
}

// ============================================================================
// Hover/Interaction Types
// ============================================================================

/**
 * Hover point data for past section (actual price data)
 */
export interface HoverPoint {
  /** X coordinate in SVG viewBox */
  x: number;
  /** Y coordinate in SVG viewBox */
  y: number;
  /** Price value at this point */
  value: number;
  /** Timestamp of this data point */
  timestamp: number;
  /** Index into the data array */
  dataIndex?: number;
  /** OHLC data if available (for candlestick hover) */
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

/**
 * Hover point data for future section
 */
export interface FutureHoverPoint {
  /** Position as percentage (0-1) within future section */
  xPercent: number;
  /** Estimated timestamp based on position */
  timestamp: number;
}

/**
 * Combined hover state for chart interactions
 */
export interface ChartHoverState {
  /** Hover point in past section (null if not hovering over past) */
  pastHover: HoverPoint | null;
  /** Hover point in future section (null if not hovering over future) */
  futureHover: FutureHoverPoint | null;
  /** Hovered event (when snapped to an event dot) */
  hoveredEvent: FutureCatalyst | null;
  /** Whether user is actively pressing/touching */
  isPressed: boolean;
}

/**
 * Simplified hover state for ChartCore component
 */
export interface HoverState {
  /** Index in data array */
  index: number;
  /** The data point being hovered */
  point: UnifiedChartPoint;
  /** X coordinate (client or SVG) */
  x: number;
  /** Y coordinate (client or SVG) */
  y: number;
  /** Price at this point */
  price: number;
  /** Timestamp at this point */
  timestamp: number;
  /** Whether hover is active */
  isVisible: boolean;
}

// ============================================================================
// Chart Layout Types
// ============================================================================

/**
 * Chart dimensions and margins
 */
export interface ChartDimensions {
  /** Total width of chart container */
  width: number;
  /** Total height of chart container */
  height: number;
  /** Height reserved for candlestick/line area (excluding volume) */
  priceChartHeight: number;
  /** Height reserved for volume bars */
  volumeHeight: number;
  /** Margins around the price chart */
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Viewport split configuration
 */
export interface ViewportSplit {
  /** Percentage of width for past data (0-100) */
  pastPercent: number;
  /** Percentage of width for future timeline (0-100) */
  futurePercent: number;
}

/**
 * Price scale configuration
 */
export interface PriceScale {
  /** Minimum price value (with padding) */
  minPrice: number;
  /** Maximum price value (with padding) */
  maxPrice: number;
  /** Price range (maxPrice - minPrice) */
  priceRange: number;
  /** Function to convert price to Y coordinate */
  priceToY: (price: number) => number;
  /** Function to convert Y coordinate to price */
  yToPrice: (y: number) => number;
}

/**
 * Volume scale configuration
 */
export interface VolumeScale {
  /** Maximum volume value */
  maxVolume: number;
  /** Function to convert volume to bar height */
  volumeToHeight: (volume: number) => number;
}

// ============================================================================
// Time Label Types
// ============================================================================

/**
 * Time label for X-axis
 */
export interface TimeLabel {
  /** Display text */
  label: string;
  /** Position as percentage (0-100) across full chart width */
  position: number;
  /** Which section this label belongs to */
  section: 'past' | 'future';
  /** Whether this label should be visible (based on overlap detection) */
  visible?: boolean;
}

// ============================================================================
// Market Hours Types
// ============================================================================

/**
 * Market hours bounds in timestamps
 */
export interface MarketHoursBounds {
  /** Extended hours start (8 AM ET) */
  extendedOpen: number;
  /** Regular market open (9:30 AM ET) */
  regularOpen: number;
  /** Regular market close (4 PM ET) */
  regularClose: number;
  /** Extended hours end (8 PM ET) */
  extendedClose: number;
}

/**
 * Trading day context for calculations
 */
export interface TradingDayContext {
  /** The trading day date (midnight ET) */
  tradingDay: Date;
  /** Market hours bounds for this day */
  marketHours: MarketHoursBounds;
  /** Total duration of extended hours in milliseconds */
  extendedHoursDuration: number;
  /** Whether this is a historical day (not today) */
  isHistorical: boolean;
  /** Whether this is a weekend */
  isWeekend: boolean;
  /** Whether this is a holiday */
  isHoliday: boolean;
}

// ============================================================================
// Chart Rendering Props Types
// ============================================================================

/**
 * Parameters passed to chart renderer (line or candlestick)
 */
export interface ChartRenderParams {
  /** Processed data points */
  data: UnifiedChartPoint[];
  /** Chart dimensions */
  dimensions: ChartDimensions;
  /** Price scale for Y-axis */
  priceScale: PriceScale;
  /** Volume scale */
  volumeScale: VolumeScale;
  /** Trading day context */
  tradingDayContext: TradingDayContext;
  /** Current market period */
  marketPeriod: MarketPeriod;
  /** Whether chart shows positive or negative change */
  isPositive: boolean;
  /** Previous close price (for reference line) */
  previousClose: number | null;
  /** Hover state */
  hoverState: ChartHoverState;
  /** Selected time range */
  timeRange: TimeRange;
}

/**
 * Props for the unified chart core component
 */
export interface ChartCoreProps {
  // Data
  data: UnifiedChartPoint[];
  previousClose: number | null;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  futureCatalysts: FutureCatalyst[];
  
  // Layout
  width: number;
  height: number;
  viewportSplit: number; // 0-100, percentage for past section
  
  // Display options
  selectedTimeRange: TimeRange;
  chartType: 'line' | 'candlestick';
  showVolume?: boolean;
  showPreviousCloseLine?: boolean;
  
  // Market status
  marketPeriod: MarketPeriod;
  marketClosePrice?: number | null;
  previousDayData?: { close: number; previousClose: number } | null;
  
  // Callbacks
  onTimeRangeChange?: (range: TimeRange) => void;
  onViewportSplitChange?: (split: number) => void;
  onToggleChartType?: () => void;
  onEventClick?: (event: MarketEvent) => void;
  
  // Optional
  ticker?: string;
  disableAnimation?: boolean;
}

// ============================================================================
// Chart Component Props Types
// ============================================================================

/**
 * Props for line chart renderer
 */
export interface LineChartRendererProps {
  renderParams: ChartRenderParams;
  strokeWidth?: number;
}

/**
 * Props for candlestick chart renderer
 */
export interface CandlestickChartRendererProps {
  renderParams: ChartRenderParams;
  candleWidth?: number;
}

/**
 * Props for volume section component
 */
export interface VolumeSectionProps {
  data: UnifiedChartPoint[];
  dimensions: ChartDimensions;
  volumeScale: VolumeScale;
  hoverIndex: number | null;
  viewportSplit: number;
  timeRange: TimeRange;
  tradingDayContext: TradingDayContext;
}

/**
 * Props for time labels component
 */
export interface TimeLabelsProps {
  labels: TimeLabel[];
  viewportSplit: number;
}

/**
 * Props for crosshair component
 */
export interface CrosshairProps {
  hoverState: ChartHoverState;
  dimensions: ChartDimensions;
  viewportSplit: number;
  isPositive: boolean;
  futureWindowMs: number;
}

/**
 * Props for future timeline component
 */
export interface FutureTimelineProps {
  futureCatalysts: FutureCatalyst[];
  lastPointY: number;
  lastPointX: number;
  dimensions: ChartDimensions;
  viewportSplit: number;
  futureWindowMs: number;
  hoverState: ChartHoverState;
  isNearCenter: boolean;
  isDragging: boolean;
}

/**
 * Props for price header component
 */
export interface PriceHeaderProps {
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  previousClose: number | null;
  marketClosePrice: number | null;
  previousDayData: { close: number; previousClose: number } | null;
  marketPeriod: MarketPeriod;
  timeRange: TimeRange;
  hoverState: ChartHoverState;
  isPositive: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * SVG path segment for multi-session line charts
 */
export interface PathSegments {
  preMarket: string;
  regularHours: string;
  afterHours: string;
}

/**
 * Position of the "now" indicator
 */
export interface NowIndicatorPosition {
  x: number;
  y: number;
  isVisible: boolean;
}

/**
 * Chart color configuration
 */
export interface ChartColors {
  positive: string;
  negative: string;
  neutral: string;
  previousCloseLine: string;
  crosshair: string;
  volume: {
    positive: string;
    negative: string;
  };
}

/**
 * Default chart colors
 */
export const DEFAULT_CHART_COLORS: ChartColors = {
  positive: 'rgb(0, 200, 5)',
  negative: 'rgb(255, 80, 0)',
  neutral: 'currentColor',
  previousCloseLine: 'currentColor',
  crosshair: 'currentColor',
  volume: {
    positive: 'rgba(0, 200, 5, 0.5)',
    negative: 'rgba(255, 80, 0, 0.5)',
  },
};

/**
 * Default chart dimensions
 */
export const DEFAULT_CHART_DIMENSIONS: ChartDimensions = {
  width: 400,
  height: 312,
  priceChartHeight: 272, // 312 - 40 for volume
  volumeHeight: 40,
  margin: {
    top: 40,
    right: 0,
    bottom: 20,
    left: 0,
  },
};

/**
 * Default viewport split (50/50)
 */
export const DEFAULT_VIEWPORT_SPLIT: ViewportSplit = {
  pastPercent: 50,
  futurePercent: 50,
};
