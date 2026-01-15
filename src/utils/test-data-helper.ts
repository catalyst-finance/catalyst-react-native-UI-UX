/**
 * Test Data Helper
 * 
 * Utility functions to populate test data for development and testing.
 * This helps us see the HomeScreen with actual data.
 */

import { DataService } from '../services/DataService';

// Portfolio holdings with purchase info
export interface PortfolioHolding {
  ticker: string;
  shares: number;
  avgCost: number;
  purchaseDate: string; // ISO date string
}

// Test portfolio based on actual trades
export const TEST_PORTFOLIO_HOLDINGS: PortfolioHolding[] = [
  { ticker: 'TSLA', shares: 10, avgCost: 453.14, purchaseDate: '2026-01-02' },
  { ticker: 'MNMD', shares: 200, avgCost: 13.45, purchaseDate: '2026-01-02' },
  { ticker: 'TMC', shares: 500, avgCost: 6.42, purchaseDate: '2026-01-02' },
];

// Purchase date timestamp (January 2, 2026)
export const PURCHASE_DATE = new Date('2026-01-02T00:00:00').getTime();

/**
 * Populate test watchlist and holdings
 */
export async function populateTestData() {
  try {
    console.log('📦 [TestData] Populating test data...');

    // Test holdings (stocks in portfolio)
    const testHoldings = TEST_PORTFOLIO_HOLDINGS.map(h => h.ticker);
    await DataService.setCachedData('holdings', testHoldings, Infinity);
    console.log('✅ [TestData] Holdings set:', testHoldings);

    // Test holdings with full details (shares, avgCost, purchaseDate)
    await DataService.setCachedData('portfolio_holdings', TEST_PORTFOLIO_HOLDINGS, Infinity);
    console.log('✅ [TestData] Portfolio holdings set:', TEST_PORTFOLIO_HOLDINGS);

    // Test watchlist (stocks being watched)
    const testWatchlist = ['AAPL'];
    await DataService.setCachedData('watchlist', testWatchlist, Infinity);
    console.log('✅ [TestData] Watchlist set:', testWatchlist);

    console.log('✅ [TestData] Test data populated successfully');
    console.log('📊 Portfolio Summary:');
    TEST_PORTFOLIO_HOLDINGS.forEach(h => {
      const costBasis = h.shares * h.avgCost;
      console.log(`   ${h.ticker}: ${h.shares} shares @ $${h.avgCost} = $${costBasis.toFixed(2)} cost basis`);
    });
    
    return {
      holdings: testHoldings,
      portfolioHoldings: TEST_PORTFOLIO_HOLDINGS,
      watchlist: testWatchlist,
    };
  } catch (error) {
    console.error('❌ [TestData] Error populating test data:', error);
    throw error;
  }
}

/**
 * Clear all test data
 */
export async function clearTestData() {
  try {
    console.log('🗑️ [TestData] Clearing test data...');

    await DataService.invalidateCache('holdings');
    await DataService.invalidateCache('watchlist');

    console.log('✅ [TestData] Test data cleared');
  } catch (error) {
    console.error('❌ [TestData] Error clearing test data:', error);
    throw error;
  }
}

/**
 * Get current test data
 */
export async function getTestData() {
  try {
    const holdings = await DataService.getCachedData<string[]>('holdings');
    const watchlist = await DataService.getCachedData<string[]>('watchlist');

    return {
      holdings: holdings || [],
      watchlist: watchlist || [],
    };
  } catch (error) {
    console.error('❌ [TestData] Error getting test data:', error);
    return {
      holdings: [],
      watchlist: [],
    };
  }
}
