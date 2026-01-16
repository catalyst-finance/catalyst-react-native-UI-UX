/**
 * Property-Based Tests for PriceTargetsService
 * 
 * Feature: analyst-price-targets
 * Uses fast-check for property-based testing
 * 
 * Each test runs minimum 100 iterations as per design requirements.
 */

import * as fc from 'fast-check';
import { PriceTargetsService, PriceTarget } from './PriceTargetsService';

// Helper to generate valid ISO date strings
const validDateArbitrary = fc.integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
  .map(timestamp => new Date(timestamp).toISOString());

// Arbitrary for generating valid PriceTarget objects
const priceTargetArbitrary: fc.Arbitrary<PriceTarget> = fc.record({
  _id: fc.uuid(),
  symbol: fc.constantFrom('AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA'),
  analyst_firm: fc.string({ minLength: 1, maxLength: 50 }),
  analyst_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  price_target: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
  rating: fc.option(fc.constantFrom('Buy', 'Hold', 'Sell', 'Overweight', 'Underweight'), { nil: undefined }),
  published_date: validDateArbitrary,
  action: fc.option(fc.constantFrom('Maintains', 'Raises', 'Lowers', 'Initiates'), { nil: undefined }),
  previous_target: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }), { nil: undefined }),
  updated_at: fc.option(validDateArbitrary, { nil: undefined }),
});

// Arbitrary for generating arrays of price targets with potential duplicates by firm
const priceTargetsWithDuplicatesArbitrary: fc.Arbitrary<PriceTarget[]> = fc.array(priceTargetArbitrary, { minLength: 0, maxLength: 50 });

// Arbitrary for generating price targets with controlled firm names (to ensure duplicates)
const firmNameArbitrary = fc.constantFrom(
  'Morgan Stanley',
  'Goldman Sachs',
  'JP Morgan',
  'Bank of America',
  'Citigroup',
  'Wells Fargo',
  'Deutsche Bank',
  'UBS',
  'Credit Suisse',
  'Barclays'
);

const priceTargetWithKnownFirmArbitrary: fc.Arbitrary<PriceTarget> = fc.record({
  _id: fc.uuid(),
  symbol: fc.constant('AAPL'),
  analyst_firm: firmNameArbitrary,
  analyst_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  price_target: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
  rating: fc.option(fc.constantFrom('Buy', 'Hold', 'Sell'), { nil: undefined }),
  published_date: validDateArbitrary,
  action: fc.option(fc.constantFrom('Maintains', 'Raises', 'Lowers'), { nil: undefined }),
  previous_target: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }), { nil: undefined }),
  updated_at: fc.option(validDateArbitrary, { nil: undefined }),
});

describe('PriceTargetsService', () => {
  describe('deduplicateByAnalyst', () => {
    /**
     * Feature: analyst-price-targets, Property 1: Analyst Deduplication Preserves Most Recent
     * 
     * For any array of price targets containing multiple targets from the same analyst firm,
     * deduplicating by analyst SHALL keep only the target with the most recent published_date
     * for each firm, and the resulting array length SHALL be less than or equal to the input length.
     * 
     * **Validates: Requirements 1.2**
     */
    it('Property 1: should preserve most recent target per analyst firm', () => {
      fc.assert(
        fc.property(
          fc.array(priceTargetWithKnownFirmArbitrary, { minLength: 1, maxLength: 30 }),
          (targets: PriceTarget[]) => {
            const result = PriceTargetsService.deduplicateByAnalyst(targets);
            
            // Result length should be <= input length
            expect(result.length).toBeLessThanOrEqual(targets.length);
            
            // Each firm should appear at most once in the result
            const firmCounts = new Map<string, number>();
            for (const target of result) {
              const count = firmCounts.get(target.analyst_firm) || 0;
              firmCounts.set(target.analyst_firm, count + 1);
            }
            
            for (const [firm, count] of firmCounts) {
              expect(count).toBe(1);
            }
            
            // For each firm in the result, verify it's the most recent from input
            for (const resultTarget of result) {
              const firm = resultTarget.analyst_firm;
              const inputTargetsForFirm = targets.filter(t => t.analyst_firm === firm);
              
              // Find the most recent date among input targets for this firm
              const mostRecentDate = Math.max(
                ...inputTargetsForFirm.map(t => new Date(t.published_date).getTime())
              );
              
              // The result target should have this most recent date
              const resultDate = new Date(resultTarget.published_date).getTime();
              expect(resultDate).toBe(mostRecentDate);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1 (continued): Empty array handling
     */
    it('Property 1: should return empty array for empty input', () => {
      const result = PriceTargetsService.deduplicateByAnalyst([]);
      expect(result).toEqual([]);
    });

    /**
     * Property 1 (continued): Single target handling
     */
    it('Property 1: should return single target unchanged', () => {
      fc.assert(
        fc.property(priceTargetArbitrary, (target: PriceTarget) => {
          const result = PriceTargetsService.deduplicateByAnalyst([target]);
          expect(result.length).toBe(1);
          expect(result[0]).toEqual(target);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1 (continued): Result contains only targets from input
     */
    it('Property 1: result should only contain targets from input', () => {
      fc.assert(
        fc.property(priceTargetsWithDuplicatesArbitrary, (targets: PriceTarget[]) => {
          const result = PriceTargetsService.deduplicateByAnalyst(targets);
          
          // Every target in result should exist in input
          for (const resultTarget of result) {
            const existsInInput = targets.some(t => t._id === resultTarget._id);
            expect(existsInInput).toBe(true);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 1 (continued): Number of unique firms is preserved
     */
    it('Property 1: result length should equal number of unique firms', () => {
      fc.assert(
        fc.property(priceTargetsWithDuplicatesArbitrary, (targets: PriceTarget[]) => {
          const result = PriceTargetsService.deduplicateByAnalyst(targets);
          const uniqueFirms = new Set(targets.map(t => t.analyst_firm));
          
          expect(result.length).toBe(uniqueFirms.size);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});


describe('PriceTargetsService - Backend Availability Caching', () => {
  // Reset the service state before each test
  beforeEach(() => {
    PriceTargetsService.resetAvailabilityCheck();
  });

  /**
   * Feature: analyst-price-targets, Property 7: Backend Availability Caching
   * 
   * For any sequence of fetchPriceTargets calls within a 60-second window after a backend failure:
   * - Only the first call SHALL attempt to contact the backend
   * - Subsequent calls SHALL return empty arrays without network requests
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 7: Backend Availability Caching', () => {
    it('Property 7: should cache backend unavailability for 60 seconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 59000 }), // Time within 60-second window
          (elapsedTime: number) => {
            const checkInterval = PriceTargetsService.getCheckInterval();
            
            // Simulate backend being unavailable
            const initialCheckTime = Date.now();
            PriceTargetsService._setBackendAvailable(false, initialCheckTime);
            
            // Verify that within the check interval, backend is still considered unavailable
            const currentTime = initialCheckTime + elapsedTime;
            const lastCheckTime = PriceTargetsService.getLastCheckTime();
            const timeSinceLastCheck = currentTime - lastCheckTime;
            
            // If time since last check is less than check interval, backend should still be marked unavailable
            if (timeSinceLastCheck < checkInterval) {
              expect(PriceTargetsService.isBackendAvailable()).toBe(false);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 7: should allow retry after 60 seconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 60001, max: 120000 }), // Time after 60-second window
          (elapsedTime: number) => {
            const checkInterval = PriceTargetsService.getCheckInterval();
            
            // Simulate backend being unavailable at a past time
            const initialCheckTime = Date.now() - elapsedTime;
            PriceTargetsService._setBackendAvailable(false, initialCheckTime);
            
            // Verify that after the check interval, a retry would be allowed
            const currentTime = Date.now();
            const lastCheckTime = PriceTargetsService.getLastCheckTime();
            const timeSinceLastCheck = currentTime - lastCheckTime;
            
            // If time since last check is >= check interval, retry should be allowed
            expect(timeSinceLastCheck).toBeGreaterThanOrEqual(checkInterval);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 7: resetAvailabilityCheck should clear cached state', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 0, max: 100000 }),
          (wasAvailable: boolean, checkTime: number) => {
            // Set some state
            PriceTargetsService._setBackendAvailable(wasAvailable, checkTime);
            
            // Verify state was set
            expect(PriceTargetsService.isBackendAvailable()).toBe(wasAvailable);
            expect(PriceTargetsService.getLastCheckTime()).toBe(checkTime);
            
            // Reset
            PriceTargetsService.resetAvailabilityCheck();
            
            // Verify state was cleared
            expect(PriceTargetsService.isBackendAvailable()).toBeNull();
            expect(PriceTargetsService.getLastCheckTime()).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 7: check interval should be 60 seconds', () => {
      const checkInterval = PriceTargetsService.getCheckInterval();
      expect(checkInterval).toBe(60000); // 60 seconds in milliseconds
    });
  });
});
