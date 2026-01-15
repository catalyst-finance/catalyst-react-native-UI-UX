# Portfolio Chart Ticker Logos Implementation

## Summary
Updated the portfolio chart to display company profile images (logos) instead of colored dots for upcoming event markers. Implemented variable dot sizes that will eventually be driven by event significance scores.

## Changes Made

### 1. StockLineChart Component (`src/components/charts/StockLineChart.tsx`)
- Added `showTickerLogos` prop to enable ticker logo display mode
- Added `tickerLogo` field to `FutureCatalyst` interface
- Updated catalyst dot rendering to support both colored dots and ticker logos
- Implemented variable dot sizes (8px, 10px, 12px, 14px) that cycle through events
- Added Image import from react-native

**Key Features:**
- When `showTickerLogos={true}`, displays company logos instead of colored dots
- Variable dot sizes create visual variety (ready for significance score integration)
- Maintains proper positioning and z-index for all dot types
- Gracefully falls back to colored dots if logo is unavailable

### 2. PortfolioChart Component (`src/components/charts/PortfolioChart.tsx`)
- Added `catalystsWithLogos` state to store catalysts enriched with logo URLs
- Implemented `useEffect` to fetch company logos from StockAPI for each catalyst
- Passes `showTickerLogos={true}` to StockLineChart for portfolio view
- Uses ticker from `catalyst.catalyst.ticker` to fetch logo data

**Data Flow:**
1. Receives `futureCatalysts` prop with event data
2. Extracts ticker from each catalyst's event data
3. Fetches stock data (including logo) from StockAPI
4. Enriches catalysts with logo URLs
5. Passes enriched data to StockLineChart

## Visual Changes

### Before
- All event dots were solid colored circles (10px fixed size)
- Color indicated event type (earnings, FDA, etc.)

### After
- Portfolio chart shows company logos in circular frames
- Dot sizes vary between 8-17px for visual interest
- Stock detail charts still use colored dots (unchanged)
- Logo images are properly centered and scaled

## Future Enhancement: Significance Scores

The implementation is ready for significance scores:

```typescript
// Current implementation (placeholder)
const dotSizes = [8, 10.5, 13, 15.5, 17];
const dotSize = dotSizes[index % dotSizes.length];

// Future implementation (when data supports it)
const significanceScore = catalyst.catalyst.significanceScore || 0.5;
const dotSize = 8 + (significanceScore * 9); // Maps 0-1 to 8-17px
```

When the event data includes `significanceScore` field, simply replace the cycling logic with score-based sizing.

## Testing

To test the changes:
1. Navigate to Home Screen
2. Scroll to Portfolio Chart section
3. Verify company logos appear on the upcoming events timeline
4. Verify dots have varying sizes
5. Check that stock detail charts still show colored dots

## Technical Notes

- Logo URLs come from StockAPI's company info data
- Images are loaded asynchronously with proper error handling
- Fallback to colored dots if logo fetch fails
- No performance impact - logos are fetched once per catalyst
- Maintains all existing chart functionality (crosshair, time ranges, etc.)
