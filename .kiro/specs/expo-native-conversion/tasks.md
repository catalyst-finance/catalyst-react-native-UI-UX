# Implementation Plan: Stock Detail Screen - Financials & Statistics

## Overview

This implementation plan focuses on completing the Stock Detail Screen by adding the Statistics/Performance toggle section and the comprehensive Financials card with modal. The implementation follows the web app exactly with no simplifications.

## Tasks

- [x] 1. Implement Statistics/Performance Toggle Section
  - Create pill-style toggle button matching web app design
  - Implement smooth transitions between Statistics and Performance views
  - Add disabled state for Performance when financials unavailable
  - _Requirements: 8.4_

- [x] 1.1 Implement Key Statistics View
  - Create 2-column grid layout for statistics
  - Display: Open, High, Low, Previous Close
  - Display: Volume, Avg Volume (10D), 52W High, 52W Low
  - Apply proper formatting using utility functions
  - _Requirements: 8.4_

- [x] 1.2 Implement Performance View
  - Create Price Performance section (2 columns)
  - Display: 5-Day Return, Month-to-Date, 52-Week Return, Year-to-Date
  - Create Performance vs S&P 500 section (2 columns)
  - Display: 52-Week Relative, YTD Relative
  - Apply color coding (green for positive, red for negative)
  - _Requirements: 8.4_

- [x] 2. Implement Financials Card
  - [x] 2.1 Create Always Visible Valuation Metrics Section
    - Create 2-column grid layout
    - Display: Market Cap, Enterprise Value, P/E Ratio (TTM), Forward P/E
    - Apply proper formatting for large numbers and ratios
    - _Requirements: 8.6_

  - [x] 2.2 Add "Show More" Button
    - Create button to open financials modal
    - Match web app styling
    - _Requirements: 8.6_

  - [x] 2.3 Create Financials Modal
    - Implement full-screen modal on mobile
    - Add header with ticker badge, company name, "Financials" subtitle
    - Add close button (X) in header
    - Make content scrollable
    - _Requirements: 8.6_

  - [x] 2.4 Implement Modal Content Sections
    - Additional Valuation (6 metrics in 2 columns)
    - Profitability & Growth (6 metrics in 2 columns)
    - Margins (4 metrics in 2 columns)
    - Returns (4 metrics in 2 columns)
    - Balance Sheet (6 metrics in 2 columns)
    - Efficiency (4 metrics in 2 columns)
    - Dividends & Shareholder Returns (4 metrics in 2 columns)
    - Add section dividers and titles
    - _Requirements: 8.6_

- [x] 3. Implement Loading and Error States
  - Show loading indicator for financials data
  - Disable Performance toggle when loading
  - Display "N/A" for missing data
  - Handle missing financials gracefully
  - Show Statistics view even if Performance unavailable
  - _Requirements: 18.1, 18.4, 18.5_

- [x] 4. Apply Formatting and Color Coding
  - Use formatCurrency() for currency values
  - Use formatMarketCap() for large numbers
  - Use formatPercentage() for percentages with +/- sign
  - Use formatRatio() for ratios
  - Apply green color for positive values
  - Apply red color for negative values
  - Apply muted color for neutral/N/A values
  - _Requirements: 8.4, 8.6_

- [ ] 5. Checkpoint - Test Statistics and Financials
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Integration and Polish
  - Verify smooth toggle transitions
  - Test modal open/close interactions
  - Verify pull-to-refresh updates all data
  - Test with real stock data (multiple tickers)
  - Verify formatting for edge cases (very large/small numbers)
  - Test loading states
  - Test error states
  - _Requirements: 8.4, 8.6, 18.4_

- [ ] 7. Final Checkpoint - Verify Complete Implementation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All formatting utilities are already available in `src/utils/formatting.ts`
- CompanyFinancials type is already defined in `src/types/financials.ts`
- StockAPI.getFinancials() method is already implemented
- StockDetailScreen already loads financials data
- Focus on UI implementation only - data layer is complete
- Match web app layout and styling exactly
- No simplifications allowed per project policy

## Success Criteria

- ✅ Matches web app layout exactly
- ✅ All metrics display correctly
- ✅ Proper formatting for all number types
- ✅ Color coding for positive/negative values
- ✅ Smooth toggle transitions
- ✅ Modal opens/closes properly
- ✅ Handles missing data gracefully
- ✅ Loading states work correctly
- ✅ Pull-to-refresh updates all data
