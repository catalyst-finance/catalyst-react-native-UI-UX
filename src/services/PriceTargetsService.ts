/**
 * PriceTargetsService - Fetches analyst price targets from the backend API
 * 
 * This service handles fetching price target data from the backend API which
 * proxies requests to MongoDB. It includes:
 * - Backend availability caching to avoid repeated failed requests
 * - Deduplication by analyst firm (keeping most recent per firm)
 * - Error handling with graceful degradation
 * 
 * Feature: analyst-price-targets
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

// Backend URL - DigitalOcean hosted Node.js server
const BACKEND_URL = 'https://catalyst-copilot-2nndy.ondigitalocean.app';

/**
 * PriceTarget interface matching MongoDB schema
 * Note: MongoDB uses different field names than the original design
 */
export interface PriceTarget {
  _id: string;
  symbol: string;
  analyst_firm: string;
  analyst_name?: string;
  price_target: number;
  rating?: string;
  published_date: string;
  action?: string;
  previous_target?: number;
  updated_at?: string;
}

/**
 * Raw price target from MongoDB (actual schema)
 */
interface RawPriceTarget {
  _id: string;
  ticker: string;
  date: string;
  analyst: string;
  action?: string;
  rating_change?: string;
  price_target_change: string; // Format: "$444 → $439" or "$439"
  source?: string;
  enriched?: boolean;
  inserted_at?: string;
}

/**
 * Parse price target from string format
 * Handles formats like "$444 → $439", "$439", "444", etc.
 * Returns the target price (the last/current price in the string)
 * 
 * Excludes invalid formats like "11-21" or "25-25" (number-dash-number without $ or →)
 */
function parsePriceTarget(priceTargetChange: string): number | null {
  if (!priceTargetChange) return null;
  
  // Remove any whitespace
  const cleaned = priceTargetChange.trim();
  
  // Exclude invalid formats: "11-21", "25-25" (number-dash-number without $ or →)
  // These are malformed entries that don't represent valid price targets
  if (/^\d+-\d+$/.test(cleaned)) {
    return null;
  }
  
  // Try to find the last price in the string (after arrow if present)
  // Handles: "$444 → $439", "$439", "444 → 439", "439"
  const arrowMatch = cleaned.match(/→\s*\$?([\d,.]+)/);
  if (arrowMatch) {
    const price = parseFloat(arrowMatch[1].replace(/,/g, ''));
    return isNaN(price) ? null : price;
  }
  
  // No arrow, try to parse the whole string as a price
  const priceMatch = cleaned.match(/\$?([\d,.]+)/);
  if (priceMatch) {
    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
    return isNaN(price) ? null : price;
  }
  
  return null;
}

/**
 * Parse previous price target from string format
 * Returns the previous price (before the arrow)
 */
function parsePreviousTarget(priceTargetChange: string): number | null {
  if (!priceTargetChange) return null;
  
  const cleaned = priceTargetChange.trim();
  
  // Try to find the first price in the string (before arrow)
  const arrowMatch = cleaned.match(/\$?([\d,.]+)\s*→/);
  if (arrowMatch) {
    const price = parseFloat(arrowMatch[1].replace(/,/g, ''));
    return isNaN(price) ? null : price;
  }
  
  return null;
}

/**
 * Transform raw MongoDB price target to normalized PriceTarget interface
 */
function transformPriceTarget(raw: RawPriceTarget): PriceTarget | null {
  const priceTarget = parsePriceTarget(raw.price_target_change);
  
  // Skip if we couldn't parse a valid price target
  if (priceTarget === null || priceTarget <= 0) {
    return null;
  }
  
  return {
    _id: raw._id,
    symbol: raw.ticker,
    analyst_firm: raw.analyst,
    price_target: priceTarget,
    rating: raw.rating_change,
    published_date: raw.date,
    action: raw.action,
    previous_target: parsePreviousTarget(raw.price_target_change) ?? undefined,
    updated_at: raw.inserted_at,
  };
}

/**
 * Get the backend URL based on environment
 * Handles both development and production environments
 */
function getBackendUrl(): string {
  // In React Native, we check for __DEV__ global
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Development: could use localhost for testing
    // But for now, use production backend since it's more reliable
    return BACKEND_URL;
  }
  
  // Production: use DigitalOcean backend
  return BACKEND_URL;
}

class PriceTargetsServiceClass {
  private backendAvailable: boolean | null = null;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL = 60000; // 60 seconds

  /**
   * Get the base URL for API requests
   */
  private getBaseUrl(): string {
    return getBackendUrl();
  }

  /**
   * Fetch price targets for a given symbol
   * 
   * @param symbol Stock ticker symbol (e.g., "TSLA")
   * @param limit Maximum number of price targets to return (default: 10)
   * @returns Array of price targets, deduplicated by analyst firm
   * 
   * Requirements: 1.1, 1.3, 1.4
   */
  async fetchPriceTargets(symbol: string, limit: number = 10): Promise<PriceTarget[]> {
    try {
      const now = Date.now();
      
      // Skip if backend is known to be unavailable (reduce console spam)
      // Requirement 1.4: Cache backend availability status for 60 seconds
      if (this.backendAvailable === false && now - this.lastCheckTime < this.CHECK_INTERVAL) {
        return [];
      }

      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}/api/price-targets/${symbol}?limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        // Update backend availability status
        if (response.status === 404 || response.status >= 500) {
          this.backendAvailable = false;
          this.lastCheckTime = now;
          
          // Only log once when backend becomes unavailable
          if (this.backendAvailable !== false) {
            console.log(`[PriceTargetsService] Backend endpoint not available (${response.status}). Price targets disabled.`);
          }
        }
        return [];
      }

      // Check if response is JSON
      if (!contentType || !contentType.includes('application/json')) {
        this.backendAvailable = false;
        this.lastCheckTime = now;
        
        if (this.backendAvailable !== false) {
          console.log(`[PriceTargetsService] Backend endpoint returned non-JSON response. Price targets disabled.`);
        }
        return [];
      }

      const data = await response.json();
      
      // Mark backend as available
      this.backendAvailable = true;
      
      // Handle different response formats
      // Backend might return: { priceTargets: [...] } or just [...]
      let rawTargets: RawPriceTarget[] = [];
      if (Array.isArray(data)) {
        rawTargets = data;
      } else if (data.priceTargets && Array.isArray(data.priceTargets)) {
        rawTargets = data.priceTargets;
      } else if (data.data && Array.isArray(data.data)) {
        rawTargets = data.data;
      }
      
      // Transform raw MongoDB data to normalized PriceTarget interface
      const transformedTargets: PriceTarget[] = [];
      for (const raw of rawTargets) {
        const transformed = transformPriceTarget(raw);
        if (transformed) {
          transformedTargets.push(transformed);
        }
      }
      
      // Requirement 1.2: Deduplicate by analyst firm, keeping most recent
      const deduplicated = this.deduplicateByAnalyst(transformedTargets);
      
      return deduplicated;
      
    } catch (error) {
      // Network error or parsing error
      // Requirement 1.3: Return empty array on error
      this.backendAvailable = false;
      this.lastCheckTime = Date.now();
      
      if (this.backendAvailable !== false) {
        console.log(`[PriceTargetsService] Backend not available. Price targets disabled.`);
      }
      
      return [];
    }
  }

  /**
   * Deduplicate price targets by analyst firm, keeping only the most recent per firm
   * 
   * @param targets Array of price targets
   * @returns Deduplicated array with most recent target per analyst firm
   * 
   * Requirement 1.2: Keep only the most recent target per analyst based on published_date
   */
  deduplicateByAnalyst(targets: PriceTarget[]): PriceTarget[] {
    if (!targets || targets.length === 0) {
      return [];
    }

    // Group by analyst firm and keep the most recent
    const firmMap = new Map<string, PriceTarget>();
    
    for (const target of targets) {
      const firm = target.analyst_firm;
      const existing = firmMap.get(firm);
      
      if (!existing) {
        firmMap.set(firm, target);
      } else {
        // Compare published dates, keep the more recent one
        const existingDate = new Date(existing.published_date).getTime();
        const newDate = new Date(target.published_date).getTime();
        
        if (newDate > existingDate) {
          firmMap.set(firm, target);
        }
      }
    }
    
    return Array.from(firmMap.values());
  }

  /**
   * Reset the backend availability check
   * Useful for retry after backend deployment or manual refresh
   * 
   * Requirement 1.4: Allow resetting the availability cache
   */
  resetAvailabilityCheck(): void {
    this.backendAvailable = null;
    this.lastCheckTime = 0;
    console.log('[PriceTargetsService] Backend availability check reset. Will retry on next fetch.');
  }

  /**
   * Check if backend is currently available
   * Returns null if not yet checked, true/false otherwise
   */
  isBackendAvailable(): boolean | null {
    return this.backendAvailable;
  }

  /**
   * Get the time of the last availability check
   */
  getLastCheckTime(): number {
    return this.lastCheckTime;
  }

  /**
   * Get the check interval in milliseconds
   */
  getCheckInterval(): number {
    return this.CHECK_INTERVAL;
  }

  /**
   * For testing: Set backend availability status directly
   * This allows testing the caching behavior without making network requests
   */
  _setBackendAvailable(available: boolean | null, checkTime?: number): void {
    this.backendAvailable = available;
    this.lastCheckTime = checkTime ?? Date.now();
  }
}

// Export singleton instance
export const PriceTargetsService = new PriceTargetsServiceClass();
export default PriceTargetsService;
