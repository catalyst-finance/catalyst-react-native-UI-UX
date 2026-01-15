// Centralized mock data for Catalyst app
// This file contains all market events, stocks, and analysis data

export interface MarketEvent {
  id: string;
  type: 'earnings' | 'fda' | 'merger' | 'split' | 'dividend' | 'launch' | 'product' | 'capital_markets' | 'legal' | 'commerce_event' | 'investor_day' | 'regulatory' | 'guidance_update' | 'conference' | 'partnership' | 'corporate' | 'pricing' | 'defense_contract' | 'guidance';
  title: string;
  company: string;
  ticker: string;
  time: string;
  timeUntil?: string;
  impactRating: number; // -3 to +3 scale
  confidence: number;
  aiInsight: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  marketCap: number;
  actualDateTime?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  positions: number;
}

export interface AnalysisMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  confidence?: number;
}

export interface HistoricalData {
  event: string;
  date: string;
  priceMove: number;
  accuracy: number;
}

export interface KeyFactor {
  factor: string;
  impact: 'High' | 'Medium' | 'Low';
  status: 'positive' | 'warning' | 'neutral';
}

export interface StockData {
  ticker: string;
  company: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  peRatio: number;
  dividend?: number;
  dividendYield?: number;
  sector: string;
}

export interface CatalystTimelineData {
  quarter: string;
  year: string;
  catalystCount: number;
  isCurrentQuarter?: boolean;
}

// Event Type Configuration
export const eventTypeConfig = {
  earnings: { 
    icon: 'BarChart3', 
    color: 'bg-blue-500', 
    label: 'Earnings',
    description: 'Quarterly financial reports'
  },
  fda: { 
    icon: 'AlertCircle', 
    color: 'bg-green-500', 
    label: 'FDA Approval',
    description: 'Drug and medical device approvals'
  },
  merger: { 
    icon: 'Target', 
    color: 'bg-purple-500', 
    label: 'M&A',
    description: 'Mergers and acquisitions'
  },
  split: { 
    icon: 'TrendingUp', 
    color: 'bg-teal-500', 
    label: 'Stock Split',
    description: 'Stock splits and special dividends'
  },
  dividend: { 
    icon: 'DollarSign', 
    color: 'bg-emerald-500', 
    label: 'Dividend',
    description: 'Dividend announcements'
  },
  launch: { 
    icon: 'Sparkles', 
    color: 'bg-pink-500', 
    label: 'Product Launch',
    description: 'Product and service launches'
  },
  product: { 
    icon: 'Package', 
    color: 'bg-rose-500', 
    label: 'Product',
    description: 'Product announcements and updates'
  },
  capital_markets: { 
    icon: 'DollarSign', 
    color: 'bg-indigo-500', 
    label: 'Capital Markets',
    description: 'IPOs, offerings, and capital events'
  },
  legal: { 
    icon: 'AlertCircle', 
    color: 'bg-red-500', 
    label: 'Legal',
    description: 'Legal proceedings and decisions'
  },
  commerce_event: { 
    icon: 'ShoppingCart', 
    color: 'bg-chart-4', 
    label: 'Commerce',
    description: 'E-commerce and retail events'
  },
  investor_day: { 
    icon: 'Users', 
    color: 'bg-slate-500', 
    label: 'Investor Day',
    description: 'Investor and analyst presentations'
  },
  conference: { 
    icon: 'Users', 
    color: 'bg-orange-500', 
    label: 'Conference',
    description: 'Industry conferences and presentations'
  },
  regulatory: { 
    icon: 'Shield', 
    color: 'bg-amber-500', 
    label: 'Regulatory',
    description: 'Regulatory decisions and filings'
  },
  guidance_update: { 
    icon: 'TrendingUp', 
    color: 'bg-cyan-500', 
    label: 'Guidance Update',
    description: 'Forward guidance and outlook changes'
  },
  partnership: { 
    icon: 'Handshake', 
    color: 'bg-violet-500', 
    label: 'Partnership',
    description: 'Strategic partnerships and alliances'
  },
  corporate: { 
    icon: 'Building', 
    color: 'bg-gray-500', 
    label: 'Corporate',
    description: 'Corporate actions and restructuring'
  },
  pricing: { 
    icon: 'Tag', 
    color: 'bg-lime-500', 
    label: 'Pricing',
    description: 'Price changes and pricing strategy'
  },
  defense_contract: { 
    icon: 'Shield', 
    color: 'bg-stone-500', 
    label: 'Defense Contract',
    description: 'Defense and government contracts'
  },
  guidance: { 
    icon: 'TrendingUp', 
    color: 'bg-sky-500', 
    label: 'Guidance',
    description: 'Earnings guidance and forecasts'
  }
};

// NOTE: All event data has been removed to ensure the app only uses real Supabase data.
// This file now only contains configuration and utility functions.

// Portfolio Summary Data
export const mockPortfolio: PortfolioSummary = {
  totalValue: 127450.89,
  dayChange: 2340.12,
  dayChangePercent: 1.87,
  positions: 12
};

// NOTE: Analysis metrics, historical data, and key factors have been removed.
// Real analysis data should come from the Supabase database or be calculated from real events.

// Stock Data for individual stock pages
export const stocksData: Record<string, StockData> = {
  'AAPL': {
    ticker: 'AAPL',
    company: 'Apple Inc.',
    currentPrice: 189.45,
    priceChange: 2.34,
    priceChangePercent: 1.25,
    marketCap: 2950000000000,
    volume: 45123000,
    avgVolume: 52341000,
    dayHigh: 191.23,
    dayLow: 187.45,
    yearHigh: 199.62,
    yearLow: 124.17,
    peRatio: 29.8,
    dividend: 0.24,
    dividendYield: 0.51,
    sector: 'Technology'
  },
  'MSFT': {
    ticker: 'MSFT',
    company: 'Microsoft Corp.',
    currentPrice: 378.85,
    priceChange: 3.21,
    priceChangePercent: 0.85,
    marketCap: 2800000000000,
    volume: 28567000,
    avgVolume: 31245000,
    dayHigh: 381.45,
    dayLow: 375.23,
    yearHigh: 384.30,
    yearLow: 213.43,
    peRatio: 32.4,
    dividend: 0.75,
    dividendYield: 0.79,
    sector: 'Technology'
  },
  'NVDA': {
    ticker: 'NVDA',
    company: 'NVIDIA Corp.',
    currentPrice: 875.23,
    priceChange: 15.67,
    priceChangePercent: 1.82,
    marketCap: 2150000000000,
    volume: 67234000,
    avgVolume: 45123000,
    dayHigh: 889.45,
    dayLow: 867.12,
    yearHigh: 892.50,
    yearLow: 108.13,
    peRatio: 71.2,
    sector: 'Technology'
  },
  'TSLA': {
    ticker: 'TSLA',
    company: 'Tesla Inc.',
    currentPrice: 248.42,
    priceChange: -2.18,
    priceChangePercent: -0.87,
    marketCap: 790000000000,
    volume: 98234000,
    avgVolume: 85467000,
    dayHigh: 251.34,
    dayLow: 246.78,
    yearHigh: 299.29,
    yearLow: 101.81,
    peRatio: 62.1,
    sector: 'Consumer Discretionary'
  },
  'META': {
    ticker: 'META',
    company: 'Meta Platforms Inc.',
    currentPrice: 485.23,
    priceChange: 8.45,
    priceChangePercent: 1.77,
    marketCap: 1230000000000,
    volume: 23456000,
    avgVolume: 28934000,
    dayHigh: 489.67,
    dayLow: 478.23,
    yearHigh: 531.49,
    yearLow: 88.09,
    peRatio: 24.7,
    sector: 'Communication Services'
  },
  'AMZN': {
    ticker: 'AMZN',
    company: 'Amazon.com Inc.',
    currentPrice: 155.89,
    priceChange: 1.82,
    priceChangePercent: 1.18,
    marketCap: 1620000000000,
    volume: 34567000,
    avgVolume: 41234000,
    dayHigh: 157.45,
    dayLow: 153.67,
    yearHigh: 170.00,
    yearLow: 81.43,
    peRatio: 53.8,
    sector: 'Consumer Discretionary'
  },
  'GOOGL': {
    ticker: 'GOOGL',
    company: 'Alphabet Inc.',
    currentPrice: 142.65,
    priceChange: 0.95,
    priceChangePercent: 0.67,
    marketCap: 1780000000000,
    volume: 28934000,
    avgVolume: 31567000,
    dayHigh: 144.23,
    dayLow: 141.34,
    yearHigh: 153.78,
    yearLow: 83.34,
    peRatio: 25.9,
    sector: 'Communication Services'
  },
  'MRNA': {
    ticker: 'MRNA',
    company: 'Moderna Inc.',
    currentPrice: 87.12,
    priceChange: -1.23,
    priceChangePercent: -1.39,
    marketCap: 32500000000,
    volume: 15234000,
    avgVolume: 12567000,
    dayHigh: 89.45,
    dayLow: 86.23,
    yearHigh: 170.47,
    yearLow: 62.56,
    peRatio: 15.3,
    sector: 'Healthcare'
  },
  'ADBE': {
    ticker: 'ADBE',
    company: 'Adobe Inc.',
    currentPrice: 512.78,
    priceChange: 45.67,
    priceChangePercent: 9.78,
    marketCap: 240000000000,
    volume: 8234000,
    avgVolume: 3456000,
    dayHigh: 518.45,
    dayLow: 467.23,
    yearHigh: 518.45,
    yearLow: 274.73,
    peRatio: 44.2,
    sector: 'Technology'
  },
  'JPM': {
    ticker: 'JPM',
    company: 'JPMorgan Chase & Co.',
    currentPrice: 162.45,
    priceChange: 1.23,
    priceChangePercent: 0.76,
    marketCap: 465000000000,
    volume: 12345000,
    avgVolume: 14567000,
    dayHigh: 164.23,
    dayLow: 161.34,
    yearHigh: 172.81,
    yearLow: 104.40,
    peRatio: 11.8,
    dividend: 1.15,
    dividendYield: 2.83,
    sector: 'Financial Services'
  },
  'PFE': {
    ticker: 'PFE',
    company: 'Pfizer Inc.',
    currentPrice: 28.75,
    priceChange: -0.34,
    priceChangePercent: -1.17,
    marketCap: 162000000000,
    volume: 45678000,
    avgVolume: 52345000,
    dayHigh: 29.23,
    dayLow: 28.56,
    yearHigh: 41.16,
    yearLow: 25.20,
    peRatio: 13.2,
    dividend: 1.64,
    dividendYield: 5.70,
    sector: 'Healthcare'
  },
  'AMD': {
    ticker: 'AMD',
    company: 'Advanced Micro Devices Inc.',
    currentPrice: 142.76,
    priceChange: 2.84,
    priceChangePercent: 2.03,
    marketCap: 230000000000,
    volume: 42567000,
    avgVolume: 48923000,
    dayHigh: 145.23,
    dayLow: 139.67,
    yearHigh: 164.46,
    yearLow: 93.12,
    peRatio: 158.4,
    sector: 'Technology'
  },
  'PLTR': {
    ticker: 'PLTR',
    company: 'Palantir Technologies Inc.',
    currentPrice: 23.84,
    priceChange: 0.67,
    priceChangePercent: 2.89,
    marketCap: 52000000000,
    volume: 38234000,
    avgVolume: 42156000,
    dayHigh: 24.45,
    dayLow: 23.12,
    yearHigh: 29.29,
    yearLow: 13.69,
    peRatio: 186.5,
    sector: 'Technology'
  },
  'COIN': {
    ticker: 'COIN',
    company: 'Coinbase Global Inc.',
    currentPrice: 165.43,
    priceChange: -3.27,
    priceChangePercent: -1.94,
    marketCap: 41000000000,
    volume: 15734000,
    avgVolume: 18923000,
    dayHigh: 169.84,
    dayLow: 163.45,
    yearHigh: 283.48,
    yearLow: 39.50,
    peRatio: 45.2,
    sector: 'Financial Services'
  }
};

// NOTE: Catalyst timeline data has been removed. This should be calculated from real events in the database.

// Utility functions for formatting
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatLargeCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
};

export const formatMarketCap = (amount: number) => {
  // Check if the amount looks like it's already in actual dollars (mock data)
  // vs. in millions (database data). Database values are typically smaller numbers.
  const isAlreadyInDollars = amount >= 1000000000; // >= 1 billion suggests actual dollars
  const actualAmount = isAlreadyInDollars ? amount : amount * 1000000;
  
  if (actualAmount >= 1000000000000) {
    return `${(actualAmount / 1000000000000).toFixed(2)}T`;
  } else if (actualAmount >= 1000000000) {
    return `${(actualAmount / 1000000000).toFixed(1)}B`;
  } else if (actualAmount >= 1000000) {
    return `${(actualAmount / 1000000).toFixed(1)}M`;
  }
  return formatCurrency(actualAmount);
};

export const formatImpactRating = (rating: number) => {
  if (rating > 0) {
    return `Bullish +${rating}`;
  } else if (rating < 0) {
    return `Bearish ${rating}`;
  } else {
    return 'Neutral';
  }
};

export const getImpactColor = (rating: number) => {
  if (rating > 0) return 'border-positive text-positive';
  if (rating < 0) return 'border-negative text-negative';
  return 'border-neutral text-neutral';
};

export const getImpactSentiment = (rating: number): 'bullish' | 'bearish' | 'neutral' => {
  if (rating > 0) return 'bullish';
  if (rating < 0) return 'bearish';
  return 'neutral';
};

// Utility functions for consistent event type handling across the app
export const getEventTypeConfig = (eventType: string) => {
  return eventTypeConfig[eventType as keyof typeof eventTypeConfig];
};

export const getEventTypeLabel = (eventType: string): string => {
  const config = getEventTypeConfig(eventType);
  return config?.label || eventType;
};

export const getEventTypeColor = (eventType: string): string => {
  const config = getEventTypeConfig(eventType);
  return config?.color || 'bg-gray-500';
};

export const getEventTypeIcon = (eventType: string): string => {
  const config = getEventTypeConfig(eventType);
  return config?.icon || 'Circle';
};

// Color mapping for SVG elements (hex colors)
const tailwindColorToHex: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-purple-500': '#a855f7',
  'bg-teal-500': '#14b8a6',
  'bg-emerald-500': '#10b981',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
  'bg-indigo-500': '#6366f1',
  'bg-red-500': '#ef4444',
  'bg-chart-4': '#f59e0b',
  'bg-slate-500': '#64748b',
  'bg-orange-500': '#f97316',
  'bg-yellow-500': '#eab308',
  'bg-gray-500': '#6b7280'
};

export const getEventTypeHexColor = (eventType: string): string => {
  const config = getEventTypeConfig(eventType);
  const tailwindClass = config?.color || 'bg-gray-500';
  return tailwindColorToHex[tailwindClass] || '#6b7280';
};

// Format timestamp for display on event cards
export const formatEventDateTime = (timestamp: string | null | undefined): string => {
  if (!timestamp) return 'TBA';
  
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'TBA';
    }
    
    // Format as: "Oct 23, 2024 8:00 PM EST"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    console.warn('Error formatting event timestamp:', timestamp, error);
    return 'TBA';
  }
};