/**
 * Formatting Utilities
 * Comprehensive formatting functions for currency, numbers, percentages, dates, etc.
 * Matches web app formatting exactly.
 */

// Currency formatting functions
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatLargeCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

export const formatMarketCap = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  
  // Check if the amount looks like it's already in actual dollars (mock data)
  // vs. in millions (database data). Database values are typically smaller numbers.
  // If amount is less than 1 million, assume it's in millions already
  const actualAmount = amount < 1000000 ? amount * 1000000 : amount;
  
  if (actualAmount >= 1_000_000_000_000) {
    return `$${(actualAmount / 1_000_000_000_000).toFixed(2)}T`;
  } else if (actualAmount >= 1_000_000_000) {
    return `$${(actualAmount / 1_000_000_000).toFixed(2)}B`;
  } else if (actualAmount >= 1_000_000) {
    return `$${(actualAmount / 1_000_000).toFixed(2)}M`;
  } else if (actualAmount >= 1_000) {
    return `$${(actualAmount / 1_000).toFixed(2)}K`;
  }
  return formatCurrency(actualAmount);
};

// Number formatting functions for financial data
export const formatLargeNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
};

// Format percentage with sign
export const formatPercentage = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  const sign = value >= 0 ? '+' : '';
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
  
  // Convert to millions
  const millions = value / 1_000_000;
  
  if (millions >= 1000) {
    return `${(millions / 1000).toFixed(2)}B`;
  }
  return `${millions.toFixed(2)}M`;
};

// Format volume that is already stored in millions (for financials data)
export const formatVolumeAlreadyInMillions = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  // Value is already in millions
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}B`;
  }
  return `${value.toFixed(2)}M`;
};

// Format currency without decimal places for whole numbers
export const formatCurrencyShort = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date from ISO string or date string
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
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
  } catch {
    return 'N/A';
  }
};

// Helper function to format company name by removing ticker prefix and applying formatting
export const formatCompanyName = (companyName: string, ticker: string): string => {
  if (!companyName) return companyName;
  
  // Remove ticker prefix if it exists (e.g., "AAPL - Apple Inc." -> "Apple Inc.")
  const withoutTicker = companyName.replace(new RegExp(`^${ticker}\\s*-\\s*`, 'i'), '');
  return withoutTicker.trim();
};

// Strip corporate suffixes from company names
export const stripCorporateSuffix = (name: string): string => {
  if (!name) return name;
  
  const suffixes = [
    ' Inc.',
    ' Inc',
    ' Corporation',
    ' Corp.',
    ' Corp',
    ' Company',
    ' Co.',
    ' Co',
    ' LLC',
    ' L.L.C.',
    ' Ltd.',
    ' Ltd',
    ' Limited',
    ' PLC',
    ' plc',
    ' AG',
    ' S.A.',
    ' SA',
    ' N.V.',
    ' NV',
  ];
  
  let result = name;
  for (const suffix of suffixes) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
    }
  }
  
  return result.trim();
};

// Format event date/time
export const formatEventDateTime = (timestamp: string | null | undefined): string => {
  if (!timestamp) return 'TBA';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'TBA';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'TBA';
  }
};

// Impact rating formatting
export const formatImpactRating = (rating: number): string => {
  if (rating > 0) {
    return `Bullish +${rating}`;
  } else if (rating < 0) {
    return `Bearish ${rating}`;
  }
  return 'Neutral';
};

// Helper function to get state abbreviation
export const getStateAbbreviation = (state: string): string => {
  const stateMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };
  
  // If already abbreviated (2 characters), return as is
  if (state.length === 2) {
    return state.toUpperCase();
  }
  
  // Otherwise look up the abbreviation
  return stateMap[state] || state;
};

// Helper function to split text into paragraphs of 3 sentences each
export const formatDescriptionIntoParagraphs = (text: string): string[] => {
  // Split by sentence endings (. ! ?) followed by a space or end of string
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // Group sentences into chunks of 3
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    const chunk = sentences.slice(i, i + 3).join(' ').trim();
    if (chunk) {
      paragraphs.push(chunk);
    }
  }
  
  return paragraphs.length > 0 ? paragraphs : [text];
};
