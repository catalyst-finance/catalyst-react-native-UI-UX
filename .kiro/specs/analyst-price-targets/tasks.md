# Implementation Plan: Analyst Price Targets

## Overview

This implementation adds analyst price target visualization to the React Native StockLineChart component, mirroring the web app functionality. The implementation follows a bottom-up approach: service layer first, then utilities, then chart integration.

## Tasks

- [x] 1. Create PriceTargetsService
  - [x] 1.1 Create the service file with PriceTarget interface and singleton class
    - Create `src/services/PriceTargetsService.ts`
    - Define PriceTarget interface matching MongoDB schema
    - Implement getBackendUrl() for environment detection
    - Implement fetchPriceTargets() with error handling
    - Implement deduplicateByAnalyst() to keep most recent per firm
    - Implement backend availability caching (60-second window)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Write property test for analyst deduplication
    - **Property 1: Analyst Deduplication Preserves Most Recent**
    - **Validates: Requirements 1.2**

  - [x] 1.3 Write property test for backend availability caching
    - **Property 7: Backend Availability Caching**
    - **Validates: Requirements 1.4**

- [x] 2. Create price target calculation utilities
  - [x] 2.1 Create utility file with calculation functions
    - Create `src/utils/price-target-utils.ts`
    - Implement calculatePriceTargetStats() for avg, median, high, low
    - Implement formatTargetPrice() for decimal formatting
    - Implement calculateTargetY() for Y position mapping
    - Implement adjustLabelPositions() for overlap prevention
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.3, 4.4, 4.5, 3.7_

  - [x] 2.2 Write property test for statistical calculations
    - **Property 2: Statistical Calculations Correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 2.3 Write property test for price formatting
    - **Property 3: Price Formatting Consistency**
    - **Validates: Requirements 4.3, 4.4**

  - [x] 2.4 Write property test for label overlap prevention
    - **Property 4: Label Overlap Prevention**
    - **Validates: Requirements 4.5**

  - [x] 2.5 Write property test for Y position clamping
    - **Property 5: Y Position Clamping**
    - **Validates: Requirements 3.7**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate price targets into StockLineChart
  - [x] 4.1 Add price target state and fetching to StockLineChart
    - Add priceTargets state variable
    - Add useEffect to fetch targets on mount (skip if miniMode)
    - Add showPriceTargets prop (default true when showUpcomingRange)
    - _Requirements: 1.1, 5.1, 5.2_

  - [x] 4.2 Implement price target line rendering
    - Calculate stats from fetched targets
    - Render SVG Line elements with dashed stroke pattern
    - Apply correct colors and stroke widths per target type
    - Clamp Y positions to chart boundaries
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 4.3 Implement price target label rendering
    - Render Text elements at line endpoints
    - Format labels as "{Type}: {Price}"
    - Apply overlap prevention algorithm
    - Position at right edge with padding
    - Apply theme-based styling (light/dark mode)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3_

  - [x] 4.4 Write property test for line styling consistency
    - **Property 6: Line Styling Consistency**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The implementation reuses patterns from the existing web app for consistency
