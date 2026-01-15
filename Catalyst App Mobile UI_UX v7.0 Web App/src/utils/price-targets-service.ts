/**
 * Price Targets Service
 * 
 * Fetches analyst price targets from the backend API.
 * The backend proxies requests to MongoDB since Edge Functions can't access
 * MongoDB directly due to IP whitelist restrictions.
 */

// Backend URL - same as the chat endpoint
const BACKEND_URL = 'https://catalyst-copilot-2nndy.ondigitalocean.app';

export interface PriceTarget {
  _id: string;
  symbol: string;
  analyst_firm: string;
  analyst_name?: string;
  price_target: number;
  rating?: string; // e.g., "Buy", "Hold", "Sell"
  published_date: string; // ISO date string
  action?: string; // e.g., "Maintains", "Raises", "Lowers"
  previous_target?: number;
  updated_at?: string;
}

/**
 * Get the backend URL based on environment
 * This handles both development and production environments
 */
function getBackendUrl(): string {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    // Allow runtime override for testing
    const configUrl = (window as any).__BACKEND_URL__;
    if (configUrl) return configUrl;
    
    // Development: use localhost backend
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // Production: use DigitalOcean backend
    return BACKEND_URL;
  }
  
  // Server-side fallback
  return BACKEND_URL;
}

class PriceTargetsService {
  private backendAvailable: boolean | null = null; // Track if backend is available
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL = 60000; // Check once per minute

  private getBaseUrl(): string {
    return getBackendUrl();
  }

  /**
   * Fetch price targets for a given symbol
   * @param symbol Stock ticker symbol (e.g., "TSLA")
   * @param limit Maximum number of price targets to return (default: 10)
   * @returns Array of price targets
   */
  async fetchPriceTargets(symbol: string, limit: number = 10): Promise<PriceTarget[]> {
    try {
      // Skip if backend is known to be unavailable (reduce console spam)
      const now = Date.now();
      if (this.backendAvailable === false && now - this.lastCheckTime < this.CHECK_INTERVAL) {
        return []; // Silently return empty array
      }

      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}/api/price-targets/${symbol}?limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store' // Don't cache for now to ensure fresh data
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
        
        // Log once that endpoint returned non-JSON
        if (this.backendAvailable !== false) {
          console.log(`[PriceTargetsService] Backend endpoint returned non-JSON response. Price targets disabled. Please set up the backend API endpoint.`);
        }
        return [];
      }

      const data = await response.json();
      
      // Mark backend as available
      this.backendAvailable = true;
      
      return data.priceTargets || [];
      
    } catch (error) {
      // Network error or parsing error
      this.backendAvailable = false;
      this.lastCheckTime = Date.now();
      
      // Only log the first error, not every subsequent one
      if (this.backendAvailable !== false) {
        console.log(`[PriceTargetsService] Backend not available. Price targets disabled. Set up the backend endpoint to enable this feature.`);
      }
      
      return [];
    }
  }

  /**
   * Get the most recent price target for a symbol
   * @param symbol Stock ticker symbol
   * @returns Single most recent price target or null
   */
  async fetchLatestPriceTarget(symbol: string): Promise<PriceTarget | null> {
    const targets = await this.fetchPriceTargets(symbol, 1);
    return targets.length > 0 ? targets[0] : null;
  }

  /**
   * Get average price target from multiple analysts
   * @param symbol Stock ticker symbol
   * @param limit Number of recent targets to average
   * @returns Average price target or null
   */
  async getAveragePriceTarget(symbol: string, limit: number = 10): Promise<number | null> {
    const targets = await this.fetchPriceTargets(symbol, limit);
    if (targets.length === 0) return null;

    const sum = targets.reduce((acc, target) => acc + target.price_target, 0);
    return sum / targets.length;
  }

  /**
   * Set a custom backend URL (useful for testing or runtime configuration)
   * @param url Custom backend URL
   */
  setBackendUrl(url: string): void {
    if (typeof window !== 'undefined') {
      (window as any).__BACKEND_URL__ = url;
    }
    // Reset availability check when URL changes
    this.backendAvailable = null;
    this.lastCheckTime = 0;
  }

  /**
   * Reset the backend availability check (useful for retry after backend deployment)
   */
  resetAvailabilityCheck(): void {
    this.backendAvailable = null;
    this.lastCheckTime = 0;
    console.log('[PriceTargetsService] Backend availability check reset. Will retry on next fetch.');
  }
}

// Export singleton instance
const priceTargetsService = new PriceTargetsService();
export default priceTargetsService;