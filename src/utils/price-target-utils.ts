/**
 * Price Target Calculation Utilities
 * 
 * Utility functions for calculating and displaying analyst price targets
 * in the StockLineChart component.
 * 
 * Feature: analyst-price-targets
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.7, 4.3, 4.4, 4.5
 */

import { PriceTarget } from '../services/PriceTargetsService';

/**
 * Aggregate statistics calculated from price targets
 */
export interface PriceTargetStats {
  average: number;
  median: number;
  high: number;
  low: number;
  count: number;
}

/**
 * Label position information for rendering
 */
export interface LabelPosition {
  y: number;
  height: number;
}

/**
 * Calculate aggregate statistics from an array of price targets
 * 
 * @param targets Array of price targets
 * @returns PriceTargetStats object or null if no valid targets
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * - 2.1: Calculate average price target
 * - 2.2: Calculate median price target
 * - 2.3: Identify highest price target
 * - 2.4: Identify lowest price target
 */
export function calculatePriceTargetStats(targets: PriceTarget[]): PriceTargetStats | null {
  // Filter out invalid targets (missing, NaN, negative, or zero price_target)
  const validTargets = targets.filter(
    t => t.price_target != null && 
         !isNaN(t.price_target) && 
         t.price_target > 0
  );

  // Requirement 2.5: If fewer than 1 valid price target exists, return null
  if (validTargets.length === 0) {
    return null;
  }

  const prices = validTargets.map(t => t.price_target);
  const count = prices.length;

  // Requirement 2.1: Calculate average
  const sum = prices.reduce((acc, price) => acc + price, 0);
  const average = sum / count;

  // Requirement 2.2: Calculate median
  const sortedPrices = [...prices].sort((a, b) => a - b);
  let median: number;
  if (count % 2 === 0) {
    // Even number of elements: average of two middle values
    const midIndex = count / 2;
    median = (sortedPrices[midIndex - 1] + sortedPrices[midIndex]) / 2;
  } else {
    // Odd number of elements: middle value
    median = sortedPrices[Math.floor(count / 2)];
  }

  // Requirement 2.3: Identify highest (High)
  const high = Math.max(...prices);

  // Requirement 2.4: Identify lowest (Low)
  const low = Math.min(...prices);

  return {
    average,
    median,
    high,
    low,
    count,
  };
}

/**
 * Format a price value for display with $ currency prefix
 * 
 * @param price The price value to format
 * @returns Formatted string representation with $ prefix
 * 
 * Requirements: 4.3, 4.4
 * - 4.3: Prices below $10 display with 2 decimal places
 * - 4.4: Prices $10 or above display as whole numbers
 */
export function formatTargetPrice(price: number): string {
  if (price < 10) {
    // Requirement 4.3: 2 decimal places for prices under $10
    return `$${price.toFixed(2)}`;
  } else {
    // Requirement 4.4: Whole numbers for prices $10 or above
    return `$${Math.round(price)}`;
  }
}

/**
 * Calculate the Y position for a price target within chart bounds
 * 
 * @param price The price target value
 * @param minY The minimum price value in the visible range
 * @param maxY The maximum price value in the visible range
 * @param chartHeight The total height of the chart area
 * @param marginTop The top margin of the chart
 * @returns The Y position, clamped to chart boundaries
 * 
 * Requirement 3.7: Clamp Y positions to chart boundaries
 */
export function calculateTargetY(
  price: number,
  minY: number,
  maxY: number,
  chartHeight: number,
  marginTop: number = 0
): number {
  // Handle edge case where minY equals maxY (flat line)
  if (maxY === minY) {
    return marginTop + chartHeight / 2;
  }

  // Calculate the proportional Y position (inverted because Y increases downward)
  const priceRange = maxY - minY;
  const priceRatio = (maxY - price) / priceRange;
  const rawY = marginTop + priceRatio * chartHeight;

  // Requirement 3.7: Clamp to chart boundaries
  const minBound = marginTop;
  const maxBound = marginTop + chartHeight;
  
  return Math.max(minBound, Math.min(maxBound, rawY));
}

/**
 * Adjust label positions to prevent overlap
 * 
 * @param labels Array of label positions with initial Y values and heights
 * @param minSpacing Minimum vertical spacing between labels (default: 20px)
 * @param chartHeight Total chart height for boundary clamping
 * @param marginTop Top margin of the chart
 * @returns Array of adjusted Y positions
 * 
 * Requirement 4.5: Maintain minimum 20px spacing between labels
 */
export function adjustLabelPositions(
  labels: LabelPosition[],
  minSpacing: number = 20,
  chartHeight: number,
  marginTop: number = 0
): { y: number }[] {
  if (labels.length === 0) {
    return [];
  }

  if (labels.length === 1) {
    // Single label: just clamp to bounds
    const clampedY = Math.max(marginTop, Math.min(marginTop + chartHeight, labels[0].y));
    return [{ y: clampedY }];
  }

  // Sort labels by their initial Y position
  const sortedLabels = labels
    .map((label, index) => ({ ...label, originalIndex: index }))
    .sort((a, b) => a.y - b.y);

  // Adjust positions to maintain minimum spacing
  const adjustedPositions: { y: number; originalIndex: number }[] = [];
  
  for (let i = 0; i < sortedLabels.length; i++) {
    const label = sortedLabels[i];
    let newY = label.y;

    if (i > 0) {
      const prevLabel = adjustedPositions[i - 1];
      const prevBottom = prevLabel.y + (sortedLabels[i - 1].height || 0);
      const minY = prevBottom + minSpacing;
      
      // Push down if too close to previous label
      if (newY < minY) {
        newY = minY;
      }
    }

    adjustedPositions.push({ y: newY, originalIndex: label.originalIndex });
  }

  // Check if labels exceed bottom boundary and need to be pushed up
  const maxBound = marginTop + chartHeight;
  const lastLabel = adjustedPositions[adjustedPositions.length - 1];
  const lastLabelHeight = sortedLabels[sortedLabels.length - 1].height || 0;
  
  if (lastLabel.y + lastLabelHeight > maxBound) {
    // Calculate how much we need to shift everything up
    const overflow = (lastLabel.y + lastLabelHeight) - maxBound;
    
    // Shift all labels up, but don't go above marginTop
    for (let i = adjustedPositions.length - 1; i >= 0; i--) {
      adjustedPositions[i].y -= overflow;
      
      // Clamp to top boundary
      if (adjustedPositions[i].y < marginTop) {
        adjustedPositions[i].y = marginTop;
      }
      
      // Re-check spacing with next label (going backwards)
      if (i < adjustedPositions.length - 1) {
        const currentBottom = adjustedPositions[i].y + (sortedLabels[i].height || 0);
        const nextY = adjustedPositions[i + 1].y;
        
        if (nextY - currentBottom < minSpacing) {
          // Push the next label down to maintain spacing
          adjustedPositions[i + 1].y = currentBottom + minSpacing;
        }
      }
    }
  }

  // Final pass: ensure all labels are within bounds
  for (const pos of adjustedPositions) {
    pos.y = Math.max(marginTop, Math.min(maxBound, pos.y));
  }

  // Restore original order
  const result: { y: number }[] = new Array(labels.length);
  for (const pos of adjustedPositions) {
    result[pos.originalIndex] = { y: pos.y };
  }

  return result;
}

/**
 * Price target line configuration
 */
export interface PriceTargetLineConfig {
  type: 'Avg' | 'Med' | 'High' | 'Low';
  price: number;
  color: string;
  strokeWidth: number;
}

/**
 * Get the line configuration for each price target type
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */
export function getPriceTargetLineConfigs(stats: PriceTargetStats): PriceTargetLineConfig[] {
  return [
    {
      type: 'Avg',
      price: stats.average,
      color: '#3b82f6', // blue - Requirement 3.2
      strokeWidth: 2,
    },
    {
      type: 'Med',
      price: stats.median,
      color: '#8b5cf6', // purple - Requirement 3.3
      strokeWidth: 1.5,
    },
    {
      type: 'High',
      price: stats.high,
      color: '#22c55e', // green - Requirement 3.4
      strokeWidth: 1.5,
    },
    {
      type: 'Low',
      price: stats.low,
      color: '#ef4444', // red - Requirement 3.5
      strokeWidth: 1.5,
    },
  ];
}

/**
 * The stroke dash array pattern for price target lines
 * Requirement 3.6: Use stroke-dasharray pattern of "4,4"
 */
export const PRICE_TARGET_DASH_ARRAY = '4,4';
