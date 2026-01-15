/**
 * Stock Split Adjuster Utility
 * 
 * Adjusts historical stock prices for stock splits to ensure accurate chart display.
 * 
 * When a stock splits (e.g., 1-to-5 split), historical prices before the split need
 * to be adjusted downward to be comparable with post-split prices.
 * 
 * Example: TSLA had two splits:
 * - Aug 31, 2020: 1-to-5 split (multiply by 5)
 * - Aug 25, 2022: 1-to-3 split (multiply by 3)
 * 
 * For a price on Jan 1, 2020 (before both splits):
 * - Original price: $100
 * - After 2020 split adjustment: $100 / 5 = $20
 * - After 2022 split adjustment: $20 / 3 = $6.67
 * - Displayed price: $6.67
 */

export interface StockSplit {
  symbol: string;
  split_date: string;
  from_factor: number;
  to_factor: number;
  split_ratio: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Adjusts historical prices for stock splits
 * 
 * @param prices - Array of historical price data points
 * @param splits - Array of stock splits ordered by date (ascending)
 * @returns Adjusted price data with split adjustments applied
 */
export function adjustPricesForSplits(
  prices: HistoricalPrice[],
  splits: StockSplit[]
): HistoricalPrice[] {
  // If no splits, return prices as-is
  if (splits.length === 0) {
    return prices;
  }

  // Sort splits by date descending (most recent first) for easier calculation
  const sortedSplits = [...splits].sort((a, b) => 
    new Date(b.split_date).getTime() - new Date(a.split_date).getTime()
  );

  // Adjust each price point
  return prices.map(price => {
    const priceDate = new Date(price.date);
    
    // Calculate cumulative split adjustment for this price
    // Find all splits that occurred AFTER this price date
    let cumulativeAdjustment = 1.0;
    
    for (const split of sortedSplits) {
      const splitDate = new Date(split.split_date);
      
      // If the price is before the split date, apply the split adjustment
      if (priceDate < splitDate) {
        // Divide by split ratio to adjust historical prices
        // Example: 1-to-5 split (ratio 5.0) means $100 becomes $100/5 = $20
        cumulativeAdjustment *= split.split_ratio;
      }
    }

    // If no adjustment needed, return original price
    if (cumulativeAdjustment === 1.0) {
      return price;
    }

    // Apply adjustment to all price fields
    return {
      date: price.date,
      open: price.open / cumulativeAdjustment,
      high: price.high / cumulativeAdjustment,
      low: price.low / cumulativeAdjustment,
      close: price.close / cumulativeAdjustment,
      // Volume should be multiplied by the adjustment (reverse of price)
      // Example: 1-to-5 split means 100 shares become 500 shares
      volume: price.volume * cumulativeAdjustment
    };
  });
}

/**
 * Check if a symbol has any splits in the given date range
 */
export function hasSplitsInRange(
  splits: StockSplit[],
  fromDate: string,
  toDate: string
): boolean {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  return splits.some(split => {
    const splitDate = new Date(split.split_date);
    return splitDate >= from && splitDate <= to;
  });
}

/**
 * Get the total split adjustment factor for a given date
 * (useful for debugging or displaying split-adjusted vs. non-adjusted prices)
 */
export function getSplitAdjustmentFactor(
  date: string,
  splits: StockSplit[]
): number {
  const priceDate = new Date(date);
  let factor = 1.0;
  
  for (const split of splits) {
    const splitDate = new Date(split.split_date);
    if (priceDate < splitDate) {
      factor *= split.split_ratio;
    }
  }
  
  return factor;
}
