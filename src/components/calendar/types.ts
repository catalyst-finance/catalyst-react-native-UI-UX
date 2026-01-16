/**
 * TypeScript interfaces for Calendar components
 */

import { MarketEvent } from '../../services/supabase/EventsAPI';

export interface CompanyInfo {
  ticker: string;
  logo: string;
  earliestEventDate: Date;
  eventTypes: string[];
}

export interface MonthData {
  month: number;
  year: number;
  eventCount: number;
  companies: CompanyInfo[];
}

export interface CalendarMonthGridProps {
  events: MarketEvent[];
  onMonthClick?: (year: number, month: number) => void;
  year?: number;
  onYearChange?: (year: number) => void;
  selectedTickers?: string[];
  onTickerClick?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
  stocksData?: Record<string, any>; // Preloaded stock data with logos
}

export interface MonthCellProps {
  data: MonthData;
  isCurrentMonth: boolean;
  isExpanded: boolean;
  onPress: () => void;
  quarterHasEvents: boolean;
}

export interface CompactMonthCellProps {
  data: MonthData;
  isCurrentMonth: boolean;
  isExpanded: boolean;
  onPress: () => void;
}

export interface ExpandedTimelineProps {
  monthIndex: number;
  year: number;
  events: MarketEvent[];
  onClose: () => void;
  onEventClick?: (event: MarketEvent) => void;
}

export interface EventCardProps {
  event: MarketEvent;
  isToday: boolean;
  isNextUpcoming: boolean;
  onPress?: () => void;
}

export interface EventTypeIconProps {
  eventType: string;
  size?: number;
}
