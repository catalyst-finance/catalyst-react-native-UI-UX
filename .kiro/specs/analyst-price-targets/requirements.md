# Requirements Document

## Introduction

This feature implements analyst price target visualization in the React Native Expo stock chart component. The feature displays dashed lines projecting from the current price to analyst-provided price targets (high, median, average, and low) fetched from MongoDB via the existing backend API. This mirrors the functionality already implemented in the web app version.

## Glossary

- **Price_Target**: A numerical price prediction made by a financial analyst for a stock's future value, typically with a 12-month horizon
- **Analyst_Firm**: The financial institution or research firm that publishes the price target
- **StockLineChart**: The React Native SVG-based chart component that displays stock price history and future catalysts
- **Price_Target_Service**: A service module that fetches price target data from the backend API which proxies requests to MongoDB
- **Dashed_Line**: A visual SVG line element with a stroke-dasharray pattern used to indicate projected/estimated values
- **Backend_API**: The DigitalOcean-hosted Node.js server that provides the `/api/price-targets/:symbol` endpoint

## Requirements

### Requirement 1: Price Target Data Fetching

**User Story:** As a user viewing a stock chart, I want the app to automatically fetch analyst price targets, so that I can see professional price predictions for the stock.

#### Acceptance Criteria

1. WHEN the StockLineChart component mounts with a valid ticker, THE Price_Target_Service SHALL fetch price targets from the backend API endpoint `/api/price-targets/:symbol`
2. WHEN multiple price targets exist for the same Analyst_Firm, THE Price_Target_Service SHALL keep only the most recent target per analyst based on published_date
3. IF the backend API returns an error or is unavailable, THEN THE Price_Target_Service SHALL return an empty array and not display any price target lines
4. THE Price_Target_Service SHALL cache the backend availability status to avoid repeated failed requests within a 60-second window

### Requirement 2: Price Target Calculations

**User Story:** As a user, I want to see aggregated price target statistics, so that I can understand the range of analyst opinions.

#### Acceptance Criteria

1. WHEN price targets are loaded, THE StockLineChart SHALL calculate the average price target from all valid targets
2. WHEN price targets are loaded, THE StockLineChart SHALL calculate the median price target from all valid targets
3. WHEN price targets are loaded, THE StockLineChart SHALL identify the highest price target (High)
4. WHEN price targets are loaded, THE StockLineChart SHALL identify the lowest price target (Low)
5. IF fewer than 1 valid price target exists, THEN THE StockLineChart SHALL not render any price target lines

### Requirement 3: Price Target Line Rendering

**User Story:** As a user, I want to see visual projections from the current price to analyst targets, so that I can quickly understand where analysts expect the stock to go.

#### Acceptance Criteria

1. WHEN the future section is visible (showUpcomingRange is true), THE StockLineChart SHALL render dashed lines from the last price point to each price target position
2. THE StockLineChart SHALL render the Average target line with color #3b82f6 (blue) and stroke width 2
3. THE StockLineChart SHALL render the Median target line with color #8b5cf6 (purple) and stroke width 1.5
4. THE StockLineChart SHALL render the High target line with color #22c55e (green) and stroke width 1.5
5. THE StockLineChart SHALL render the Low target line with color #ef4444 (red) and stroke width 1.5
6. THE StockLineChart SHALL use a stroke-dasharray pattern of "4,4" for all price target lines
7. WHEN a price target Y position would be outside the visible chart area, THE StockLineChart SHALL clamp the line endpoint to the chart boundaries

### Requirement 4: Price Target Labels

**User Story:** As a user, I want to see labels for each price target line, so that I can identify which line represents which target type and its value.

#### Acceptance Criteria

1. THE StockLineChart SHALL display a label at the end of each price target line showing the target type and price value
2. THE StockLineChart SHALL format labels as "{Type}: {Price}" (e.g., "Avg: 185", "High: 220")
3. WHEN price targets are below $10, THE StockLineChart SHALL display prices with 2 decimal places
4. WHEN price targets are $10 or above, THE StockLineChart SHALL display prices as whole numbers
5. WHEN multiple labels would overlap vertically, THE StockLineChart SHALL adjust label positions to maintain minimum 20px spacing
6. THE StockLineChart SHALL position labels at the right edge of the chart with appropriate padding

### Requirement 5: Mini Chart Exclusion

**User Story:** As a developer, I want price targets to only appear on full stock charts, so that mini charts remain clean and performant.

#### Acceptance Criteria

1. WHEN the chart is rendered in mini mode (miniMode prop is true), THE StockLineChart SHALL NOT fetch or display price targets
2. WHEN the chart is rendered in full mode, THE StockLineChart SHALL fetch and display price targets if available

### Requirement 6: Theme Support

**User Story:** As a user, I want price target labels to be readable in both light and dark modes, so that the feature works with my preferred theme.

#### Acceptance Criteria

1. WHEN dark mode is active, THE StockLineChart SHALL render price target labels with light text on semi-transparent dark background
2. WHEN light mode is active, THE StockLineChart SHALL render price target labels with dark text on semi-transparent light background
3. THE price target line colors SHALL remain consistent across both themes for visual continuity
