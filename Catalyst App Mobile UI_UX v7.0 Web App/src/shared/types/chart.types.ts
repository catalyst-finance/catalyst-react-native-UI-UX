/**
 * Platform-agnostic chart data types and interfaces
 * Used by both web (Recharts) and native (Victory Native) implementations
 */

export interface PricePoint {
  timestamp: number;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface ChartDataRange {
  start: number;
  end: number;
  points: PricePoint[];
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ChartInteraction {
  type: 'hover' | 'press' | 'longPress';
  point: PricePoint;
  position: {
    x: number;
    y: number;
  };
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface ChartConfig {
  showGrid?: boolean;
  showAxis?: boolean;
  showCrosshair?: boolean;
  showVolume?: boolean;
  showEvents?: boolean;
  showPastEvents?: boolean;
  showUpcomingRange?: boolean;
  enableInteraction?: boolean;
  animationDuration?: number;
}

export interface CatalystEvent {
  id: string;
  ticker: string;
  date: string | number;
  timestamp?: number;
  type: string;
  title: string;
  description?: string;
  impact?: 'high' | 'medium' | 'low';
}

export interface MarketEvent extends CatalystEvent {
  price?: number;
  priceChange?: number;
  priceChangePercent?: number;
}

export interface PriceTarget {
  id: string;
  ticker: string;
  analyst: string;
  analyst_company: string;
  price_target: number;
  rating?: string;
  date: string;
  timestamp?: number;
}

/**
 * Unified chart data structure that works across platforms
 */
export interface UnifiedChartData {
  ticker: string;
  timeRange: TimeRange;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  previousClose?: number;
  marketCap?: number;
  
  // Price data
  historicalData: PricePoint[];
  
  // Events
  futureCatalysts?: CatalystEvent[];
  pastEvents?: MarketEvent[];
  
  // Analyst targets
  priceTargets?: PriceTarget[];
  
  // Chart configuration
  config: ChartConfig;
}

/**
 * Chart component props interface (platform-agnostic)
 */
export interface ChartComponentProps {
  data: UnifiedChartData;
  dimensions: ChartDimensions;
  onInteraction?: (interaction: ChartInteraction) => void;
  onEventClick?: (event: CatalystEvent | MarketEvent) => void;
  onTimeRangeChange?: (range: TimeRange) => void;
}

/**
 * Chart calculation results (used by both platforms)
 */
export interface ChartCalculations {
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  avgPrice: number;
  volatility: number;
  trend: 'up' | 'down' | 'sideways';
}

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  bullish: boolean;
}

export interface ChartViewport {
  pastSection: {
    startX: number;
    endX: number;
    width: number;
    widthPercent: number;
  };
  futureSection: {
    startX: number;
    endX: number;
    width: number;
    widthPercent: number;
  };
  totalWidth: number;
}
