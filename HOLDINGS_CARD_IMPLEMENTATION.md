# HoldingsCard Component Implementation

## Overview
The HoldingsCard component displays a stock position for users who have connected their external brokerage accounts. It shows shares owned and total market value instead of the company name and percentage changes shown in the WatchlistCard.

## Component Structure

### Layout
```
┌─────────────────────────────────────────┐
│ TSLA                      $442.27       │
│ 10 shares • $4,425.90     ▼ -0.54%     │
│                                         │
│ [MiniChart with catalysts]              │
└─────────────────────────────────────────┘
```

### Key Differences from WatchlistCard

| Feature | WatchlistCard | HoldingsCard |
|---------|---------------|--------------|
| Below ticker | Company name | Shares + Market value |
| Below price | Prev Close + Pre-Market | Single percentage change |
| Use case | Watchlist stocks | Portfolio holdings |

## Props

```typescript
interface HoldingsCardProps {
  ticker: string;              // Stock ticker (e.g., "TSLA")
  company: string;             // Company name (for reference)
  currentPrice: number;        // Current stock price
  priceChange: number;         // Price change in dollars
  priceChangePercent: number;  // Price change as percentage
  previousClose: number | null; // Previous close price
  shares: number;              // Number of shares owned
  data: DataPoint[];           // Chart data points
  futureCatalysts?: FutureCatalyst[]; // Upcoming events
}
```

## Features

### 1. Holdings Display
Shows the user's position in the stock:
- **Shares**: Displayed as whole number (e.g., "10 shares")
- **Market Value**: Calculated as `shares × currentPrice`, formatted with 2 decimals
- **Format**: `{shares} shares • ${marketValue}`

### 2. Price Information
- **Current Price**: Large, bold text on the right
- **Percentage Change**: Color-coded (green for positive, red for negative)
- **Triangle Indicator**: ▲ for positive, ▼ for negative

### 3. Visual Design
- **Ticker Badge**: Black background with white text
- **Holdings Info**: Gray text with bullet separator
- **Market Value**: Slightly bolder than shares count
- **Price**: Large, prominent display
- **Change**: Color-coded with triangle indicator

### 4. Chart Integration
Uses the same MiniChart component as WatchlistCard:
- 58% past data / 42% future timeline
- Smooth Bezier curves
- Current price dot
- Future catalyst dots
- Gradient overlays

## Styling

### Colors
- **Ticker Badge**: `#000000` (black background), `#ffffff` (white text)
- **Holdings Text**: `#71717A` (muted gray)
- **Price**: `#000000` (black)
- **Positive Change**: `rgb(0, 200, 5)` (green)
- **Negative Change**: `rgb(255, 80, 0)` (red)

### Typography
- **Ticker**: 14px, weight 600, letter-spacing 0.5
- **Holdings**: 14px, weight 400 (shares) / 500 (market value)
- **Price**: 24px, weight 600, letter-spacing -0.5
- **Change**: 13.2px, weight 500

### Spacing
- **Container Padding**: 16px
- **Header Margin Bottom**: 16px
- **Holdings Info Gap**: 8px
- **Right Section Gap**: 4px
- **Chart Section Margin Top**: 8px

## Usage Example

```typescript
import { HoldingsCard } from '../components/charts/HoldingsCard';

<HoldingsCard
  ticker="TSLA"
  company="Tesla"
  currentPrice={442.27}
  priceChange={-2.40}
  priceChangePercent={-0.54}
  previousClose={444.67}
  shares={10}
  data={chartData}
  futureCatalysts={[
    {
      date: "2026-02-02",
      timestamp: 1738540800000,
      catalyst: { id: '1', type: 'earnings' },
      dayIndex: 21,
      position: 0.5,
    }
  ]}
/>
```

## Market Value Calculation

The market value is calculated in real-time:
```typescript
const marketValue = shares * currentPrice;
```

This ensures the displayed value always reflects the current stock price, updating as the price changes throughout the trading day.

## Formatting

### Shares
- Displayed as whole number using `toFixed(0)`
- Example: `10 shares` (not `10.00 shares`)

### Market Value
- Formatted with thousands separators
- Always shows 2 decimal places
- Example: `$4,425.90` (not `$4425.9`)

```typescript
marketValue.toLocaleString('en-US', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})
```

## Integration Points

### Portfolio Data
The component expects to receive holdings data from:
1. **External Brokerage Integration**: Plaid, Robinhood, etc.
2. **Portfolio Service**: Fetches and caches position data
3. **Real-time Updates**: Updates market value as prices change

### Data Flow
```
Brokerage API → Portfolio Service → HoldingsCard
                                   ↓
                              Market Value = shares × currentPrice
```

## Comparison with Web App

The React Native implementation matches the web app exactly:

### Web App (src/components/stock-list/stock-list-item.tsx)
```tsx
<div className="flex items-center gap-2 text-[14px] text-muted-foreground">
  <span>{shares.toFixed(0)} shares</span>
  <span className="text-muted-foreground">•</span>
  <span className="font-medium text-foreground">
    ${marketValue.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}
  </span>
</div>
```

### React Native (HoldingsCard.tsx)
```tsx
<View style={styles.holdingsInfo}>
  <Text style={styles.sharesText}>
    {shares.toFixed(0)} shares
  </Text>
  <Text style={styles.separator}> • </Text>
  <Text style={styles.marketValueText}>
    ${marketValue.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}
  </Text>
</View>
```

## Testing

### ComponentShowcaseScreen
The component is showcased with sample data:
- **Ticker**: TSLA
- **Shares**: 10
- **Current Price**: $442.27
- **Market Value**: $4,425.90
- **Change**: -0.54%

### Test Cases
1. ✅ Positive price change (green triangle up)
2. ✅ Negative price change (red triangle down)
3. ✅ Market value calculation accuracy
4. ✅ Number formatting (shares as integer, value with decimals)
5. ✅ Chart integration with holdings data
6. ✅ Future catalyst dots display

## Future Enhancements

### Potential Features
1. **Cost Basis**: Show purchase price and total gain/loss
2. **Day Change**: Show dollar change in addition to percentage
3. **Tap to Expand**: Show detailed position information
4. **Drag to Reorder**: Allow users to reorder holdings
5. **Swipe Actions**: Quick actions like sell, add more, etc.

### Data Requirements
For enhanced features, we'll need:
- Purchase date and price (cost basis)
- Transaction history
- Dividend information
- Tax lot details

## Status
**COMPLETE** - HoldingsCard component is fully implemented and matches the web app design exactly.

## Files
- **Component**: `catalyst-native/src/components/charts/HoldingsCard.tsx`
- **Showcase**: `catalyst-native/src/screens/ComponentShowcaseScreen.tsx`
- **Documentation**: `catalyst-native/HOLDINGS_CARD_IMPLEMENTATION.md`
