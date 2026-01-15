# Stock Detail Screen - Session 3 Implementation Plan

## Overview
Session 3 focuses on implementing the complete Statistics and Performance sections, matching the web app exactly. This is a comprehensive implementation with no simplifications.

## Components to Build

### 1. Statistics/Performance Toggle
- Pill-style toggle button (matching web app)
- Two views: "Key Statistics" and "Performance"
- Smooth transitions between views
- Disabled state for Performance when financials unavailable

### 2. Key Statistics View
Grid layout (2 columns) with the following metrics:
- **Open**: Current day's opening price
- **High**: Current day's high price
- **Low**: Current day's low price
- **Previous Close**: Yesterday's closing price
- **Volume**: Today's trading volume (formatted in millions)
- **Avg Volume (10D)**: 10-day average volume
- **52W High**: 52-week high price
- **52W Low**: 52-week low price

### 3. Performance View
Two sections with grid layouts:

**Price Performance** (2 columns):
- **5-Day Return**: 5-day price return percentage
- **Month-to-Date**: MTD price return percentage
- **52-Week Return**: 52-week price return percentage
- **Year-to-Date**: YTD price return percentage

**Performance vs S&P 500** (2 columns):
- **52-Week Relative**: Relative performance vs S&P 500 over 52 weeks
- **YTD Relative**: Relative performance vs S&P 500 YTD

### 4. Financials Card (Comprehensive)
**Always Visible Section** - Valuation Metrics (2 columns):
- **Market Cap**: Total market capitalization
- **Enterprise Value**: EV
- **P/E Ratio (TTM)**: Trailing twelve months P/E
- **Forward P/E**: Forward-looking P/E

**"Show More" Button** - Opens Modal with Complete Financials:

**Modal Sections** (all in 2-column grids):

1. **Additional Valuation**:
   - P/B Ratio
   - P/S Ratio (TTM)
   - P/FCF (TTM)
   - P/CF (TTM)
   - EV/Revenue
   - EV/EBITDA

2. **Profitability & Growth**:
   - EPS (TTM)
   - Revenue/Share (TTM)
   - EPS Growth (YoY)
   - Revenue Growth (YoY)
   - EPS Growth (5Y CAGR)
   - Revenue Growth (5Y)

3. **Margins**:
   - Net Profit Margin
   - Operating Margin
   - Gross Margin
   - Pretax Margin

4. **Returns**:
   - Return on Assets (TTM)
   - Return on Equity (TTM)
   - Return on Investment (TTM)
   - ROE (5Y Avg)

5. **Balance Sheet**:
   - Book Value/Share
   - Tangible Book Value/Share
   - Current Ratio
   - Quick Ratio
   - LT Debt/Equity
   - Total Debt/Equity

6. **Efficiency**:
   - Asset Turnover
   - Inventory Turnover
   - Receivables Turnover
   - Revenue/Employee

7. **Dividends & Shareholder Returns**:
   - Dividend/Share (Annual)
   - Dividend Yield
   - Payout Ratio (TTM)
   - Payout Ratio (Annual)

## Data Sources
- **StockData**: From `StockAPI.getStock(ticker)`
  - open, high, low, previousClose, volume
  - week52High, week52Low, avgVolume

- **CompanyFinancials**: From `StockAPI.getFinancials(ticker)`
  - All financial metrics from company_financials table
  - Performance metrics (price returns, relative performance)
  - Valuation ratios
  - Profitability metrics
  - Balance sheet data
  - Efficiency ratios
  - Dividend information

## Formatting Functions
All formatting utilities from `src/utils/formatting.ts`:
- `formatCurrency()` - Currency with $ and decimals
- `formatMarketCap()` - Large numbers (B, M, K)
- `formatPercentage()` - Percentage with +/- sign
- `formatPercentageNoSign()` - Percentage without sign
- `formatRatio()` - Ratios with 2 decimals
- `formatVolumeInMillions()` - Volume in millions
- `formatVolumeAlreadyInMillions()` - For pre-formatted volume
- `formatLargeNumber()` - General large number formatting

## Color Coding
- **Positive values**: Green (`colors.positive`)
- **Negative values**: Red (`colors.negative`)
- **Neutral/N/A**: Muted foreground color

## UI/UX Details
1. **Toggle Button**:
   - Rounded pill shape
   - Active state: foreground background, background text
   - Inactive state: transparent, muted foreground text
   - Smooth transitions

2. **Grid Layouts**:
   - 2 columns for all metric grids
   - Consistent spacing (gap-4 equivalent)
   - Label above value
   - Label: muted foreground, small text
   - Value: foreground, medium weight

3. **Modal**:
   - Full-screen on mobile
   - Header with ticker badge, company name, "Financials" subtitle
   - Scrollable content
   - Close button (X) in header
   - Sections separated by dividers
   - Section titles: medium weight, small text

4. **Loading States**:
   - Show loading indicator for financials
   - Disable Performance toggle when loading
   - Show "N/A" for missing data

5. **Error Handling**:
   - Gracefully handle missing financials
   - Show Statistics view even if Performance unavailable
   - Display "N/A" for null/undefined values

## Implementation Steps
1. ✅ Create formatting utilities file
2. ✅ Create CompanyFinancials type
3. ✅ Add getFinancials method to StockAPI
4. ⏳ Update StockDetailScreen with:
   - Load financials data
   - Statistics/Performance toggle
   - Key Statistics grid
   - Performance grids
   - Financials card with modal
5. ⏳ Test all sections with real data
6. ⏳ Verify formatting and color coding
7. ⏳ Test modal interactions
8. ⏳ Verify loading and error states

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

## Next Session (Session 4)
After Session 3 is complete, Session 4 will implement:
- Events Timeline section
- Event filtering by type
- Upcoming/Past toggle
- Event cards with details
- Quarter grouping
