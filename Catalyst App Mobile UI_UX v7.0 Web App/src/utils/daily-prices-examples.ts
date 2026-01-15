/**
 * Daily Prices API Usage Examples
 * 
 * This file contains examples of how to use the new daily_prices table integration.
 * These are reference examples - not meant to be imported or executed directly.
 */

import StockAPI from './supabase/stock-api';
import HistoricalPriceService from './historical-price-service';

// ============================================================================
// EXAMPLE 1: Fetch daily prices for a single stock
// ============================================================================
export async function example1_SingleStock() {
  try {
    const prices = await StockAPI.getDailyPrices(
      'AAPL',
      '2024-01-01',
      '2024-12-31'
    );
    
    console.log(`Fetched ${prices.length} daily prices for AAPL`);
    console.log('First price:', prices[0]);
    // Output: { date: '2024-01-01', open: 185.64, high: 186.95, low: 184.35, close: 185.14, volume: 48234567 }
    
    return prices;
  } catch (error) {
    console.error('Error fetching single stock prices:', error);
    return [];
  }
}

// ============================================================================
// EXAMPLE 2: Fetch daily prices for multiple stocks (optimized batch query)
// ============================================================================
export async function example2_MultipleStocks() {
  try {
    const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA'];
    const prices = await StockAPI.getMultipleDailyPrices(
      symbols,
      '2024-01-01',
      '2024-12-31'
    );
    
    // Result is a Record<symbol, prices[]>
    console.log(`Fetched prices for ${Object.keys(prices).length} stocks`);
    
    // Access specific stock
    const applePrices = prices['AAPL'];
    console.log(`AAPL has ${applePrices?.length || 0} daily prices`);
    
    // Iterate through all stocks
    for (const [symbol, stockPrices] of Object.entries(prices)) {
      console.log(`${symbol}: ${stockPrices.length} days of data`);
    }
    
    return prices;
  } catch (error) {
    console.error('Error fetching multiple stock prices:', error);
    return {};
  }
}

// ============================================================================
// EXAMPLE 3: Get most recent price for a stock
// ============================================================================
export async function example3_MostRecentPrice() {
  try {
    const recentPrice = await StockAPI.getMostRecentDailyPrice('AAPL');
    
    if (recentPrice) {
      console.log(`Most recent AAPL close: $${recentPrice.close} on ${recentPrice.date}`);
    } else {
      console.log('No recent price data found');
    }
    
    return recentPrice;
  } catch (error) {
    console.error('Error fetching most recent price:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 4: Using the high-level HistoricalPriceService (RECOMMENDED)
// ============================================================================
export async function example4_HighLevelService() {
  try {
    // This method automatically:
    // 1. Checks memory cache
    // 2. Tries daily_prices table (for daily timeframe)
    // 3. Falls back to Finnhub API if needed
    // 4. Uses mock data as ultimate fallback
    
    const chartData = await HistoricalPriceService.getHistoricalPrices(
      'AAPL',
      'daily',  // timeframe
      90        // days
    );
    
    console.log('Chart data:', {
      symbol: chartData.symbol,
      priceCount: chartData.prices.length,
      source: chartData.source, // 'database', 'api', or 'mock'
      fromDate: chartData.fromDate,
      toDate: chartData.toDate
    });
    
    // Access the price data
    chartData.prices.forEach(price => {
      console.log(`${price.date}: Close $${price.close} (Volume: ${price.volume})`);
    });
    
    return chartData;
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Batch fetch for multiple stocks with high-level service
// ============================================================================
export async function example5_BatchHighLevelService() {
  try {
    const symbols = ['AAPL', 'MSFT', 'NVDA'];
    
    // For daily timeframe, this is optimized with a single database query
    const allChartData = await HistoricalPriceService.getMultipleHistoricalPrices(
      symbols,
      'daily',
      365  // 1 year of data
    );
    
    // Result is Record<symbol, ChartData>
    for (const [symbol, chartData] of Object.entries(allChartData)) {
      console.log(`${symbol}:`, {
        prices: chartData.prices.length,
        source: chartData.source,
        firstDate: chartData.prices[0]?.date,
        lastDate: chartData.prices[chartData.prices.length - 1]?.date
      });
    }
    
    return allChartData;
  } catch (error) {
    console.error('Error in batch fetch:', error);
    return {};
  }
}

// ============================================================================
// EXAMPLE 6: Calculate returns from daily prices
// ============================================================================
export async function example6_CalculateReturns() {
  try {
    const prices = await StockAPI.getDailyPrices('AAPL', '2024-01-01', '2024-12-31');
    
    if (prices.length < 2) {
      console.log('Not enough data to calculate returns');
      return null;
    }
    
    const firstClose = prices[0].close;
    const lastClose = prices[prices.length - 1].close;
    const totalReturn = ((lastClose - firstClose) / firstClose) * 100;
    
    console.log('AAPL Performance:');
    console.log(`  First close: $${firstClose.toFixed(2)} on ${prices[0].date}`);
    console.log(`  Last close: $${lastClose.toFixed(2)} on ${prices[prices.length - 1].date}`);
    console.log(`  Total return: ${totalReturn.toFixed(2)}%`);
    
    // Calculate daily returns
    const dailyReturns = prices.slice(1).map((price, i) => {
      const prevPrice = prices[i];
      const dailyReturn = ((price.close - prevPrice.close) / prevPrice.close) * 100;
      return {
        date: price.date,
        dailyReturn: parseFloat(dailyReturn.toFixed(2))
      };
    });
    
    console.log(`Calculated ${dailyReturns.length} daily returns`);
    
    return {
      totalReturn,
      dailyReturns
    };
  } catch (error) {
    console.error('Error calculating returns:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 7: Find highest and lowest prices in a date range
// ============================================================================
export async function example7_FindExtremes() {
  try {
    const prices = await StockAPI.getDailyPrices('AAPL', '2024-01-01', '2024-12-31');
    
    if (prices.length === 0) {
      console.log('No price data found');
      return null;
    }
    
    let highestDay = prices[0];
    let lowestDay = prices[0];
    
    prices.forEach(price => {
      if (price.high > highestDay.high) {
        highestDay = price;
      }
      if (price.low < lowestDay.low) {
        lowestDay = price;
      }
    });
    
    console.log('AAPL Extremes in 2024:');
    console.log(`  Highest: $${highestDay.high.toFixed(2)} on ${highestDay.date}`);
    console.log(`  Lowest: $${lowestDay.low.toFixed(2)} on ${lowestDay.date}`);
    
    return {
      highest: highestDay,
      lowest: lowestDay
    };
  } catch (error) {
    console.error('Error finding extremes:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 8: Get data for a specific date range with different intervals
// ============================================================================
export async function example8_DateRanges() {
  const symbol = 'AAPL';
  
  try {
    // Last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekData = await StockAPI.getDailyPrices(
      symbol,
      oneWeekAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
    console.log(`Last week: ${weekData.length} days`);
    
    // Last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthData = await StockAPI.getDailyPrices(
      symbol,
      oneMonthAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
    console.log(`Last month: ${monthData.length} days`);
    
    // Last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yearData = await StockAPI.getDailyPrices(
      symbol,
      oneYearAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
    console.log(`Last year: ${yearData.length} days`);
    
    return {
      week: weekData,
      month: monthData,
      year: yearData
    };
  } catch (error) {
    console.error('Error fetching date ranges:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 9: Integration with React Component
// ============================================================================
/*
// Example React component usage:

import { useState, useEffect } from 'react';
import HistoricalPriceService from '../utils/historical-price-service';

function StockPriceDisplay({ symbol }: { symbol: string }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'database' | 'api' | 'mock'>('mock');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await HistoricalPriceService.getHistoricalPrices(
          symbol,
          'daily',
          90  // 90 days
        );
        setChartData(data);
        setDataSource(data.source);
      } catch (error) {
        console.error('Failed to load chart data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [symbol]);

  if (loading) {
    return <div>Loading {symbol} data...</div>;
  }

  return (
    <div>
      <h2>{symbol}</h2>
      <p>Data source: {dataSource}</p>
      <p>{chartData?.prices.length} days of data</p>
      {chartData && (
        <div>
          Latest close: ${chartData.prices[chartData.prices.length - 1]?.close.toFixed(2)}
        </div>
      )}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 10: Error handling and graceful degradation
// ============================================================================
export async function example10_ErrorHandling() {
  try {
    // The service gracefully handles errors at each level:
    // 1. If daily_prices table fails -> tries Finnhub API
    // 2. If API fails -> uses mock data
    // 3. Always returns valid data (never throws)
    
    const chartData = await HistoricalPriceService.getHistoricalPrices(
      'INVALID_SYMBOL',  // This might not be in the database
      'daily',
      30
    );
    
    console.log('Even with invalid symbol, got data:', {
      symbol: chartData.symbol,
      source: chartData.source,  // Will likely be 'mock'
      prices: chartData.prices.length
    });
    
    // Check what source was used
    if (chartData.source === 'database') {
      console.log('✅ Data came from daily_prices table');
    } else if (chartData.source === 'api') {
      console.log('⚠️ Data came from Finnhub API');
    } else {
      console.log('⚠️ Using mock data (database and API unavailable)');
    }
    
    return chartData;
  } catch (error) {
    // This should rarely happen since the service handles errors internally
    console.error('Unexpected error:', error);
    return null;
  }
}

// Export all examples
export const examples = {
  example1_SingleStock,
  example2_MultipleStocks,
  example3_MostRecentPrice,
  example4_HighLevelService,
  example5_BatchHighLevelService,
  example6_CalculateReturns,
  example7_FindExtremes,
  example8_DateRanges,
  example10_ErrorHandling
};