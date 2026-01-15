/**
 * Shared TypeScript types for the Catalyst Native app
 * These types are platform-agnostic and can be shared with the web app
 */

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  sector?: string;
}

export interface CatalystEvent {
  id: string;
  type: 'earnings' | 'fda' | 'economic' | 'conference' | 'other';
  title: string;
  description?: string;
  symbol: string;
  companyName: string;
  timestamp: number;
  impact?: 'high' | 'medium' | 'low';
  isPast: boolean;
}

export interface PortfolioPosition {
  symbol: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
}

export interface Portfolio {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  positions: PortfolioPosition[];
}

export interface PriceDataPoint {
  timestamp: number;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface ChartData {
  data: PriceDataPoint[];
  timeframe: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y';
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export type Theme = 'light' | 'dark' | 'system';
