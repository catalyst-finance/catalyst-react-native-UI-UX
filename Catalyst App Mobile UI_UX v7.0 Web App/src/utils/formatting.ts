// Utility functions for formatting data across the Catalyst app
// 
// ⚠️  IMPORTANT: This file contains the SINGLE SOURCE OF TRUTH for event type configurations
// All event types, colors, icons, and labels should be defined here and nowhere else
// This ensures consistency across the entire application and prevents color mapping issues

// SINGLE SOURCE OF TRUTH: Event Type Configuration 
// This configuration MUST match exactly the event types in the Supabase "Catalyst Event Data" table
// Event types from database: product, earnings, investor_day, regulatory, guidance_update, conference, commerce_event, partnership, merger, legal, corporate, pricing, capital_markets, defense_contract, guidance
export const eventTypeConfig = {
  // Primary event types from Supabase database
  product: { 
    icon: 'Package', 
    color: 'bg-rose-500', 
    label: 'Product',
    description: 'Product announcements and updates'
  },
  earnings: { 
    icon: 'BarChart3', 
    color: 'bg-blue-500', 
    label: 'Earnings',
    description: 'Quarterly financial reports and earnings releases'
  },
  investor_day: { 
    icon: 'Users', 
    color: 'bg-slate-500', 
    label: 'Investor Day',
    description: 'Investor and analyst presentation events'
  },
  regulatory: { 
    icon: 'Shield', 
    color: 'bg-amber-500', 
    label: 'Regulatory',
    description: 'Regulatory decisions and compliance filings'
  },
  guidance_update: { 
    icon: 'TrendingUp', 
    color: 'bg-cyan-500', 
    label: 'Guidance Update',
    description: 'Forward guidance and outlook revisions'
  },
  conference: { 
    icon: 'Users', 
    color: 'bg-orange-500', 
    label: 'Conference',
    description: 'Industry conferences and speaking events'
  },
  commerce_event: { 
    icon: 'ShoppingCart', 
    color: 'bg-teal-500', 
    label: 'Commerce Event',
    description: 'E-commerce and retail milestone events'
  },
  partnership: { 
    icon: 'Handshake', 
    color: 'bg-violet-500', 
    label: 'Partnership',
    description: 'Strategic partnerships and business alliances'
  },
  merger: { 
    icon: 'Target', 
    color: 'bg-purple-500', 
    label: 'M&A',
    description: 'Mergers, acquisitions, and corporate combinations'
  },
  legal: { 
    icon: 'AlertCircle', 
    color: 'bg-red-500', 
    label: 'Legal',
    description: 'Legal proceedings and judicial decisions'
  },
  corporate: { 
    icon: 'Building', 
    color: 'bg-gray-500', 
    label: 'Corporate Action',
    description: 'Corporate restructuring and organizational changes'
  },
  pricing: { 
    icon: 'Tag', 
    color: 'bg-lime-500', 
    label: 'Pricing',
    description: 'Product pricing changes and strategy updates'
  },
  capital_markets: { 
    icon: 'DollarSign', 
    color: 'bg-indigo-500', 
    label: 'Capital Markets',
    description: 'IPOs, public offerings, and capital raising events'
  },
  defense_contract: { 
    icon: 'Shield', 
    color: 'bg-stone-500', 
    label: 'Defense Contract',
    description: 'Defense and government contract awards'
  },
  guidance: { 
    icon: 'TrendingUp', 
    color: 'bg-sky-500', 
    label: 'Guidance',
    description: 'Earnings guidance and financial forecasts'
  },
  
  // Legacy fallback types (for backwards compatibility)
  launch: { 
    icon: 'Sparkles', 
    color: 'bg-pink-500', 
    label: 'Product Launch',
    description: 'Product and service launches'
  },
  fda: { 
    icon: 'AlertCircle', 
    color: 'bg-green-500', 
    label: 'FDA Approval',
    description: 'Drug and medical device approvals'
  },
  split: { 
    icon: 'TrendingUp', 
    color: 'bg-emerald-500', 
    label: 'Stock Split',
    description: 'Stock splits and special dividends'
  },
  dividend: { 
    icon: 'DollarSign', 
    color: 'bg-emerald-600', 
    label: 'Dividend',
    description: 'Dividend announcements'
  }
};

// Currency formatting functions
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

// Company name formatting - strip corporate suffixes
export const stripCorporateSuffix = (companyName: string): string => {
  if (!companyName) return companyName;
  
  let result = companyName.trim();
  
  // List of common corporate suffixes to remove (case-insensitive)
  // More specific suffixes first (Inc, Corp, Ltd, etc.)
  const specificSuffixes = [
    'Inc.', 'Inc', 'Corporation', 'Corp.', 'Corp', 'LLC', 'L.L.C.', 'L.L.C',
    'Ltd.', 'Ltd', 'Limited', 'LP', 'L.P.', 'L.P',
    'PLC', 'P.L.C.', 'N.V.', 'NV', 'S.A.', 'SA', 'AG', 'A.G.', 'GmbH'
  ];
  
  // Generic suffixes that should only be removed with comma or "and" before them
  const genericSuffixes = ['Co.', 'Co', 'Company'];
  
  // First remove specific corporate suffixes (Inc, Corp, etc.)
  for (const suffix of specificSuffixes) {
    // Create a regex that matches the suffix at the end, with optional comma before it
    // Case-insensitive and allows for optional periods
    const regex = new RegExp('[,\\s]+' + suffix.replace(/\./g, '\\.?') + '$', 'i');
    result = result.replace(regex, '');
  }
  
  // Then remove generic suffixes only if preceded by comma or "and"
  // This prevents removing "company" from "The Metals Company" but removes it from "Apple, Company" or "Apple Company"
  for (const suffix of genericSuffixes) {
    // Match: ", Co", " & Co", " and Company", etc.
    const regex = new RegExp('([,&]\\s+|\\s+and\\s+)' + suffix.replace(/\./g, '\\.?') + '$', 'i');
    result = result.replace(regex, '');
  }
  
  // THEN remove domain suffixes (like .com, .net, etc.) at the end
  result = result.replace(/\.(com|net|org|io|ai|co|us|biz|info)$/i, '');
  
  result = result.trim();
  
  // Capitalize first letter of each word (proper title case)
  result = result.split(' ').map(word => {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
  
  return result;
};

// Helper function to format company name by removing ticker prefix and applying formatting
export const formatCompanyName = (companyName: string, ticker: string): string => {
  if (!companyName) return companyName;
  
  // Just apply corporate suffix stripping and capitalization, no ticker trimming
  return stripCorporateSuffix(companyName.trim());
};

// Impact rating formatting
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

// Get actual color value for inline styles (not CSS classes)
export const getImpactBackgroundColor = (rating: number) => {
  if (rating > 0) return '#00C851'; // positive green
  if (rating < 0) return '#FF4444'; // negative red
  return '#9E9E9E'; // neutral gray
};

export const getImpactSentiment = (rating: number): 'bullish' | 'bearish' | 'neutral' => {
  if (rating > 0) return 'bullish';
  if (rating < 0) return 'bearish';
  return 'neutral';
};

// Event type utility functions
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

// Centralized icon component mapping for consistency across all components
// This maps event types to actual Lucide React icon components
// Import this in components instead of defining separate eventTypeIcons objects
export const getEventTypeIconComponent = (eventType: string) => {
  const iconMappings = {
    // Primary event types from Supabase database
    product: 'Package',
    earnings: 'BarChart3',
    investor_day: 'Users',
    regulatory: 'Shield',
    guidance_update: 'TrendingUp',
    conference: 'Users',
    commerce_event: 'ShoppingCart',
    partnership: 'Handshake',
    merger: 'Target',
    legal: 'AlertCircle',
    corporate: 'Building',
    pricing: 'Tag',
    capital_markets: 'DollarSign',
    defense_contract: 'Shield',
    guidance: 'TrendingUp',
    
    // Legacy fallback types
    launch: 'Sparkles',
    fda: 'AlertCircle',
    split: 'TrendingUp',
    dividend: 'DollarSign'
  };
  
  return iconMappings[eventType as keyof typeof iconMappings] || 'Circle';
};

// Color mapping for SVG elements (hex colors) - matches eventTypeConfig colors
const tailwindColorToHex: Record<string, string> = {
  'bg-blue-500': '#3b82f6',      // earnings
  'bg-green-500': '#22c55e',     // fda (legacy)
  'bg-purple-500': '#a855f7',    // merger
  'bg-teal-500': '#14b8a6',      // commerce_event
  'bg-emerald-500': '#10b981',   // split (legacy)
  'bg-emerald-600': '#059669',   // dividend (legacy)
  'bg-pink-500': '#ec4899',      // launch (legacy)
  'bg-rose-500': '#f43f5e',      // product
  'bg-indigo-500': '#6366f1',    // capital_markets
  'bg-red-500': '#ef4444',       // legal
  'bg-chart-4': '#f59e0b',       // (legacy usage)
  'bg-slate-500': '#64748b',     // investor_day
  'bg-orange-500': '#f97316',    // conference
  'bg-yellow-500': '#eab308',    // (unused)
  'bg-amber-500': '#f59e0b',     // regulatory
  'bg-cyan-500': '#06b6d4',      // guidance_update
  'bg-violet-500': '#8b5cf6',    // partnership
  'bg-lime-500': '#84cc16',      // pricing
  'bg-stone-500': '#78716c',     // defense_contract
  'bg-sky-500': '#0ea5e9',       // guidance
  'bg-gray-500': '#6b7280'       // corporate
};

export const getEventTypeHexColor = (eventType: string): string => {
  const config = getEventTypeConfig(eventType);
  const tailwindClass = config?.color || 'bg-gray-500';
  return tailwindColorToHex[tailwindClass] || '#6b7280';
};

// Date and time formatting
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

// Number formatting functions for financial data
export const formatLargeNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  } else if (absNum >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (absNum >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  
  return num.toFixed(2);
};

// Format percentage with sign
export const formatPercentage = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

// Format percentage without sign
export const formatPercentageNoSign = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

// Format percentage from decimal (e.g., 0.4691 -> 46.91%)
export const formatPercentageFromDecimal = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
};

// Format ratio (e.g., P/E, debt ratio)
export const formatRatio = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
};

// Format volume in millions (for raw volume counts)
export const formatVolumeInMillions = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  // Convert raw volume to millions and format
  const valueInMillions = value / 1000000;
  
  // For very large volumes (billions), show in B
  if (valueInMillions >= 1000) {
    return `${(valueInMillions / 1000).toFixed(2)}B`;
  }
  
  // Otherwise show in millions with 2 decimal places
  return `${valueInMillions.toFixed(2)}M`;
};

// Format volume that is already stored in millions (for financials data)
export const formatVolumeAlreadyInMillions = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  // Value is already in millions, just format it
  // For very large volumes (billions), show in B
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}B`;
  }
  
  // Otherwise show in millions with 2 decimal places
  return `${value.toFixed(2)}M`;
};

// Format currency without decimal places for whole numbers
export const formatCurrencyShort = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date from ISO string or date string
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'N/A';
  }
};

// Format year from date string (for "since" dates)
export const formatYear = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.getFullYear().toString();
  } catch (error) {
    return 'N/A';
  }
};