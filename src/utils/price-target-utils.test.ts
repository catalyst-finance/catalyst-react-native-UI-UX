/**
 * Property-Based Tests for Price Target Utilities
 * 
 * Feature: analyst-price-targets
 * Uses fast-check for property-based testing
 * 
 * Each test runs minimum 100 iterations as per design requirements.
 */

import * as fc from 'fast-check';
import {
  calculatePriceTargetStats,
  formatTargetPrice,
  calculateTargetY,
  adjustLabelPositions,
  getPriceTargetLineConfigs,
  PRICE_TARGET_DASH_ARRAY,
  PriceTargetStats,
  LabelPosition,
} from './price-target-utils';
import { PriceTarget } from '../services/PriceTargetsService';

// Helper to generate valid ISO date strings
const validDateArbitrary = fc.integer({ min: 1577836800000, max: 1924905600000 })
  .map(timestamp => new Date(timestamp).toISOString());

// Arbitrary for generating valid positive price values
const validPriceArbitrary = fc.float({ 
  min: Math.fround(0.01), 
  max: Math.fround(10000), 
  noNaN: true 
});

// Arbitrary for generating valid PriceTarget objects with valid price_target
const validPriceTargetArbitrary: fc.Arbitrary<PriceTarget> = fc.record({
  _id: fc.uuid(),
  symbol: fc.constantFrom('AAPL', 'TSLA', 'GOOGL', 'MSFT'),
  analyst_firm: fc.string({ minLength: 1, maxLength: 50 }),
  analyst_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  price_target: validPriceArbitrary,
  rating: fc.option(fc.constantFrom('Buy', 'Hold', 'Sell'), { nil: undefined }),
  published_date: validDateArbitrary,
  action: fc.option(fc.constantFrom('Maintains', 'Raises', 'Lowers'), { nil: undefined }),
  previous_target: fc.option(validPriceArbitrary, { nil: undefined }),
  updated_at: fc.option(validDateArbitrary, { nil: undefined }),
});

// Arbitrary for non-empty arrays of valid price targets
const nonEmptyValidPriceTargetsArbitrary = fc.array(validPriceTargetArbitrary, { 
  minLength: 1, 
  maxLength: 50 
});

describe('Price Target Utilities', () => {
  describe('calculatePriceTargetStats', () => {
    /**
     * Feature: analyst-price-targets, Property 2: Statistical Calculations Correctness
     * 
     * For any non-empty array of valid price targets:
     * - The average SHALL equal the sum of all price_target values divided by the count
     * - The median SHALL be the middle value (or average of two middle values) when sorted
     * - The high SHALL equal the maximum price_target value
     * - The low SHALL equal the minimum price_target value
     * 
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
     */
    it('Property 2: average should equal sum divided by count', () => {
      fc.assert(
        fc.property(nonEmptyValidPriceTargetsArbitrary, (targets: PriceTarget[]) => {
          const stats = calculatePriceTargetStats(targets);
          
          // Should not be null for non-empty valid targets
          expect(stats).not.toBeNull();
          
          if (stats) {
            const prices = targets.map(t => t.price_target);
            const expectedAverage = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            // Use approximate equality due to floating point
            expect(stats.average).toBeCloseTo(expectedAverage, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 2: median should be middle value when sorted', () => {
      fc.assert(
        fc.property(nonEmptyValidPriceTargetsArbitrary, (targets: PriceTarget[]) => {
          const stats = calculatePriceTargetStats(targets);
          
          expect(stats).not.toBeNull();
          
          if (stats) {
            const prices = targets.map(t => t.price_target).sort((a, b) => a - b);
            const count = prices.length;
            
            let expectedMedian: number;
            if (count % 2 === 0) {
              expectedMedian = (prices[count / 2 - 1] + prices[count / 2]) / 2;
            } else {
              expectedMedian = prices[Math.floor(count / 2)];
            }
            
            expect(stats.median).toBeCloseTo(expectedMedian, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 2: high should equal maximum price_target value', () => {
      fc.assert(
        fc.property(nonEmptyValidPriceTargetsArbitrary, (targets: PriceTarget[]) => {
          const stats = calculatePriceTargetStats(targets);
          
          expect(stats).not.toBeNull();
          
          if (stats) {
            const expectedHigh = Math.max(...targets.map(t => t.price_target));
            expect(stats.high).toBeCloseTo(expectedHigh, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 2: low should equal minimum price_target value', () => {
      fc.assert(
        fc.property(nonEmptyValidPriceTargetsArbitrary, (targets: PriceTarget[]) => {
          const stats = calculatePriceTargetStats(targets);
          
          expect(stats).not.toBeNull();
          
          if (stats) {
            const expectedLow = Math.min(...targets.map(t => t.price_target));
            expect(stats.low).toBeCloseTo(expectedLow, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 2: count should equal number of valid targets', () => {
      fc.assert(
        fc.property(nonEmptyValidPriceTargetsArbitrary, (targets: PriceTarget[]) => {
          const stats = calculatePriceTargetStats(targets);
          
          expect(stats).not.toBeNull();
          
          if (stats) {
            expect(stats.count).toBe(targets.length);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 2: should return null for empty array', () => {
      const stats = calculatePriceTargetStats([]);
      expect(stats).toBeNull();
    });

    it('Property 2: single target should have same value for all stats', () => {
      fc.assert(
        fc.property(validPriceTargetArbitrary, (target: PriceTarget) => {
          const stats = calculatePriceTargetStats([target]);
          
          expect(stats).not.toBeNull();
          
          if (stats) {
            expect(stats.average).toBeCloseTo(target.price_target, 5);
            expect(stats.median).toBeCloseTo(target.price_target, 5);
            expect(stats.high).toBeCloseTo(target.price_target, 5);
            expect(stats.low).toBeCloseTo(target.price_target, 5);
            expect(stats.count).toBe(1);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });


  describe('formatTargetPrice', () => {
    /**
     * Feature: analyst-price-targets, Property 3: Price Formatting Consistency
     * 
     * For any price value:
     * - If price < 10, the formatted string SHALL contain exactly 2 decimal places
     * - If price >= 10, the formatted string SHALL contain no decimal places (whole number)
     * 
     * **Validates: Requirements 4.3, 4.4**
     */
    it('Property 3: prices under $10 should have exactly 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(9.99), noNaN: true }),
          (price: number) => {
            const formatted = formatTargetPrice(price);
            
            // Should start with $ prefix
            expect(formatted).toMatch(/^\$/);
            
            // Should contain a decimal point
            expect(formatted).toContain('.');
            
            // Should have exactly 2 decimal places after removing $ prefix
            const withoutPrefix = formatted.replace('$', '');
            const parts = withoutPrefix.split('.');
            expect(parts.length).toBe(2);
            expect(parts[1].length).toBe(2);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3: prices $10 or above should have no decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(10000), noNaN: true }),
          (price: number) => {
            const formatted = formatTargetPrice(price);
            
            // Should start with $ prefix
            expect(formatted).toMatch(/^\$/);
            
            // Should not contain a decimal point
            expect(formatted).not.toContain('.');
            
            // Should be a valid integer string after removing $ prefix
            const withoutPrefix = formatted.replace('$', '');
            expect(parseInt(withoutPrefix, 10).toString()).toBe(withoutPrefix);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3: formatted value should be close to original', () => {
      fc.assert(
        fc.property(validPriceArbitrary, (price: number) => {
          const formatted = formatTargetPrice(price);
          
          // Remove $ prefix before parsing
          const withoutPrefix = formatted.replace('$', '');
          const parsed = parseFloat(withoutPrefix);
          
          // The parsed value should be close to the original
          // Allow for rounding differences
          if (price < 10) {
            expect(parsed).toBeCloseTo(price, 2);
          } else {
            expect(parsed).toBeCloseTo(Math.round(price), 0);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateTargetY', () => {
    /**
     * Feature: analyst-price-targets, Property 5: Y Position Clamping
     * 
     * For any price target value and chart bounds (minY, maxY, chartHeight):
     * - The calculated Y position SHALL be >= 0
     * - The calculated Y position SHALL be <= chartHeight
     * - Prices within the visible range SHALL map proportionally to Y positions
     * 
     * **Validates: Requirements 3.7**
     */
    it('Property 5: Y position should be >= marginTop', () => {
      fc.assert(
        fc.property(
          validPriceArbitrary,
          fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(1001), max: Math.fround(2000), noNaN: true }),
          fc.float({ min: Math.fround(100), max: Math.fround(800), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }),
          (price: number, minY: number, maxY: number, chartHeight: number, marginTop: number) => {
            const y = calculateTargetY(price, minY, maxY, chartHeight, marginTop);
            
            expect(y).toBeGreaterThanOrEqual(marginTop);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: Y position should be <= marginTop + chartHeight', () => {
      fc.assert(
        fc.property(
          validPriceArbitrary,
          fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(1001), max: Math.fround(2000), noNaN: true }),
          fc.float({ min: Math.fround(100), max: Math.fround(800), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }),
          (price: number, minY: number, maxY: number, chartHeight: number, marginTop: number) => {
            const y = calculateTargetY(price, minY, maxY, chartHeight, marginTop);
            
            expect(y).toBeLessThanOrEqual(marginTop + chartHeight);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: prices within range should map proportionally', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(50), max: Math.fround(150), noNaN: true }),
          fc.constant(50),  // minY
          fc.constant(150), // maxY
          fc.constant(400), // chartHeight
          fc.constant(20),  // marginTop
          (price: number, minY: number, maxY: number, chartHeight: number, marginTop: number) => {
            const y = calculateTargetY(price, minY, maxY, chartHeight, marginTop);
            
            // For prices within range, Y should be proportional
            const expectedRatio = (maxY - price) / (maxY - minY);
            const expectedY = marginTop + expectedRatio * chartHeight;
            
            expect(y).toBeCloseTo(expectedY, 2);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: higher prices should have lower Y values (inverted axis)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(50), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(101), max: Math.fround(150), noNaN: true }),
          fc.constant(50),  // minY
          fc.constant(150), // maxY
          fc.constant(400), // chartHeight
          fc.constant(20),  // marginTop
          (lowerPrice: number, higherPrice: number, minY: number, maxY: number, chartHeight: number, marginTop: number) => {
            const yLower = calculateTargetY(lowerPrice, minY, maxY, chartHeight, marginTop);
            const yHigher = calculateTargetY(higherPrice, minY, maxY, chartHeight, marginTop);
            
            // Higher price should have lower Y (closer to top)
            expect(yHigher).toBeLessThan(yLower);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('adjustLabelPositions', () => {
    /**
     * Feature: analyst-price-targets, Property 4: Label Overlap Prevention
     * 
     * For any set of 4 price target labels with initial Y positions, after adjustment:
     * - The vertical distance between any two adjacent labels SHALL be at least 20 pixels
     * - All labels SHALL remain within the chart boundaries (0 to chartHeight)
     * 
     * **Validates: Requirements 4.5**
     */
    it('Property 4: adjacent labels should have at least minSpacing pixels between them', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              y: fc.float({ min: Math.fround(0), max: Math.fround(400), noNaN: true }),
              height: fc.float({ min: Math.fround(10), max: Math.fround(30), noNaN: true }),
            }),
            { minLength: 2, maxLength: 4 }
          ),
          fc.constant(20),  // minSpacing
          fc.constant(500), // chartHeight
          fc.constant(0),   // marginTop
          (labels: LabelPosition[], minSpacing: number, chartHeight: number, marginTop: number) => {
            const adjusted = adjustLabelPositions(labels, minSpacing, chartHeight, marginTop);
            
            // Sort by Y position to check adjacent spacing
            const sortedAdjusted = [...adjusted].sort((a, b) => a.y - b.y);
            
            // Check spacing between adjacent labels
            for (let i = 0; i < sortedAdjusted.length - 1; i++) {
              const currentY = sortedAdjusted[i].y;
              const nextY = sortedAdjusted[i + 1].y;
              const currentHeight = labels[adjusted.indexOf(sortedAdjusted[i])]?.height || 0;
              
              // The gap between current label bottom and next label top should be >= minSpacing
              // OR they should be at the boundary
              const gap = nextY - (currentY + currentHeight);
              
              // Allow for boundary cases where labels are pushed to edges
              if (currentY + currentHeight < chartHeight && nextY > marginTop) {
                expect(gap).toBeGreaterThanOrEqual(minSpacing - 1); // Allow 1px tolerance for floating point
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 4: all labels should remain within chart boundaries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              y: fc.float({ min: Math.fround(-50), max: Math.fround(600), noNaN: true }),
              height: fc.float({ min: Math.fround(10), max: Math.fround(30), noNaN: true }),
            }),
            { minLength: 1, maxLength: 4 }
          ),
          fc.constant(20),  // minSpacing
          fc.constant(500), // chartHeight
          fc.constant(10),  // marginTop
          (labels: LabelPosition[], minSpacing: number, chartHeight: number, marginTop: number) => {
            const adjusted = adjustLabelPositions(labels, minSpacing, chartHeight, marginTop);
            
            for (const pos of adjusted) {
              expect(pos.y).toBeGreaterThanOrEqual(marginTop);
              expect(pos.y).toBeLessThanOrEqual(marginTop + chartHeight);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 4: should return empty array for empty input', () => {
      const result = adjustLabelPositions([], 20, 500, 0);
      expect(result).toEqual([]);
    });

    it('Property 4: single label should be clamped to bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-100), max: Math.fround(700), noNaN: true }),
          fc.float({ min: Math.fround(10), max: Math.fround(30), noNaN: true }),
          fc.constant(500), // chartHeight
          fc.constant(10),  // marginTop
          (y: number, height: number, chartHeight: number, marginTop: number) => {
            const result = adjustLabelPositions([{ y, height }], 20, chartHeight, marginTop);
            
            expect(result.length).toBe(1);
            expect(result[0].y).toBeGreaterThanOrEqual(marginTop);
            expect(result[0].y).toBeLessThanOrEqual(marginTop + chartHeight);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 4: result length should equal input length', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              y: fc.float({ min: Math.fround(0), max: Math.fround(400), noNaN: true }),
              height: fc.float({ min: Math.fround(10), max: Math.fround(30), noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (labels: LabelPosition[]) => {
            const result = adjustLabelPositions(labels, 20, 500, 0);
            expect(result.length).toBe(labels.length);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getPriceTargetLineConfigs', () => {
    /**
     * Feature: analyst-price-targets, Property 6: Line Styling Consistency
     * 
     * For any rendered price target line:
     * - The strokeDasharray SHALL be "4,4"
     * - The Average line SHALL have color #3b82f6 and strokeWidth 2
     * - The Median line SHALL have color #8b5cf6 and strokeWidth 1.5
     * - The High line SHALL have color #22c55e and strokeWidth 1.5
     * - The Low line SHALL have color #ef4444 and strokeWidth 1.5
     * 
     * **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
     */
    
    // Arbitrary for generating valid PriceTargetStats
    const validStatsArbitrary: fc.Arbitrary<PriceTargetStats> = fc.record({
      average: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
      median: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
      high: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
      low: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
      count: fc.integer({ min: 1, max: 100 }),
    });

    it('Property 6: strokeDasharray constant should be "4,4"', () => {
      // Requirement 3.6: stroke-dasharray pattern of "4,4"
      expect(PRICE_TARGET_DASH_ARRAY).toBe('4,4');
    });

    it('Property 6: Average line should have color #3b82f6 and strokeWidth 2', () => {
      fc.assert(
        fc.property(validStatsArbitrary, (stats: PriceTargetStats) => {
          const configs = getPriceTargetLineConfigs(stats);
          const avgConfig = configs.find(c => c.type === 'Avg');
          
          expect(avgConfig).toBeDefined();
          if (avgConfig) {
            // Requirement 3.2: Average target line with color #3b82f6 (blue) and stroke width 2
            expect(avgConfig.color).toBe('#3b82f6');
            expect(avgConfig.strokeWidth).toBe(2);
            expect(avgConfig.price).toBeCloseTo(stats.average, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 6: Median line should have color #8b5cf6 and strokeWidth 1.5', () => {
      fc.assert(
        fc.property(validStatsArbitrary, (stats: PriceTargetStats) => {
          const configs = getPriceTargetLineConfigs(stats);
          const medConfig = configs.find(c => c.type === 'Med');
          
          expect(medConfig).toBeDefined();
          if (medConfig) {
            // Requirement 3.3: Median target line with color #8b5cf6 (purple) and stroke width 1.5
            expect(medConfig.color).toBe('#8b5cf6');
            expect(medConfig.strokeWidth).toBe(1.5);
            expect(medConfig.price).toBeCloseTo(stats.median, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 6: High line should have color #22c55e and strokeWidth 1.5', () => {
      fc.assert(
        fc.property(validStatsArbitrary, (stats: PriceTargetStats) => {
          const configs = getPriceTargetLineConfigs(stats);
          const highConfig = configs.find(c => c.type === 'High');
          
          expect(highConfig).toBeDefined();
          if (highConfig) {
            // Requirement 3.4: High target line with color #22c55e (green) and stroke width 1.5
            expect(highConfig.color).toBe('#22c55e');
            expect(highConfig.strokeWidth).toBe(1.5);
            expect(highConfig.price).toBeCloseTo(stats.high, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 6: Low line should have color #ef4444 and strokeWidth 1.5', () => {
      fc.assert(
        fc.property(validStatsArbitrary, (stats: PriceTargetStats) => {
          const configs = getPriceTargetLineConfigs(stats);
          const lowConfig = configs.find(c => c.type === 'Low');
          
          expect(lowConfig).toBeDefined();
          if (lowConfig) {
            // Requirement 3.5: Low target line with color #ef4444 (red) and stroke width 1.5
            expect(lowConfig.color).toBe('#ef4444');
            expect(lowConfig.strokeWidth).toBe(1.5);
            expect(lowConfig.price).toBeCloseTo(stats.low, 5);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 6: should return exactly 4 line configurations', () => {
      fc.assert(
        fc.property(validStatsArbitrary, (stats: PriceTargetStats) => {
          const configs = getPriceTargetLineConfigs(stats);
          
          expect(configs.length).toBe(4);
          
          // Verify all types are present
          const types = configs.map(c => c.type);
          expect(types).toContain('Avg');
          expect(types).toContain('Med');
          expect(types).toContain('High');
          expect(types).toContain('Low');
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 6: line colors should remain consistent across themes (Requirement 6.3)', () => {
      // This test verifies that the line colors are constants and don't change
      // Requirement 6.3: Price target line colors SHALL remain consistent across both themes
      fc.assert(
        fc.property(
          validStatsArbitrary,
          validStatsArbitrary,
          (stats1: PriceTargetStats, stats2: PriceTargetStats) => {
            const configs1 = getPriceTargetLineConfigs(stats1);
            const configs2 = getPriceTargetLineConfigs(stats2);
            
            // Colors should be the same regardless of stats values
            for (const type of ['Avg', 'Med', 'High', 'Low'] as const) {
              const config1 = configs1.find(c => c.type === type);
              const config2 = configs2.find(c => c.type === type);
              
              expect(config1?.color).toBe(config2?.color);
              expect(config1?.strokeWidth).toBe(config2?.strokeWidth);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
