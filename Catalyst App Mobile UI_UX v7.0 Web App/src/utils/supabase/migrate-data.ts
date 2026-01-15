import StockAPI, { StockData } from './stock-api';

// NOTE: Mock data conversion removed - this migration utility now only works with real data

// Convert mock data format to database format (deprecated - no longer uses mock data)
function convertMockDataToStockData(): StockData[] {
  // No longer converts mock data - returns empty array
  console.warn('convertMockDataToStockData is deprecated - no mock data available');
  return [];
}

// Helper function to format market cap
function formatMarketCap(amount: number): string {
  if (amount >= 1000000000000) {
    return `$${(amount / 1000000000000).toFixed(2)}T`;
  } else if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${amount.toLocaleString()}`;
}

// NOTE: Additional hardcoded stocks removed - app now uses only real data from APIs/database

// Main migration function (deprecated - no longer migrates mock data)
export async function migrateStockData(): Promise<void> {
  console.warn('migrateStockData is deprecated - no mock data to migrate');
  // No longer migrates mock data - real data should come from APIs or be manually added to database
}

// Initialize the database (one-time setup)
export async function initializeStockDatabase(): Promise<void> {
  try {

    
    // First try to get existing stocks
    const existingStocks = await StockAPI.getAllStocks();
    const existingSymbols = Object.keys(existingStocks);
    
    if (existingSymbols.length > 0) {

      return;
    }
    
    // If no stocks exist, run migration
    await migrateStockData();
    
  } catch (error) {

    throw error;
  }
}

// Utility function to verify migration
export async function verifyMigration(): Promise<void> {
  try {

    
    const allStocks = await StockAPI.getAllStocks();
    const stockCount = Object.keys(allStocks).length;
    

    
    // Test individual stock retrieval
    const testStock = await StockAPI.getStock('AAPL');
    if (testStock) {

    } else {

    }
    
    // Test sector retrieval
    const techStocks = await StockAPI.getStocksBySector('Technology');

    
    // Test search
    const searchResults = await StockAPI.searchStocks('Apple', 5);

    

    
  } catch (error) {

    throw error;
  }
}

// Export utility functions for use in components (deprecated)
export { convertMockDataToStockData };