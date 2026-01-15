# Stock Detail Screen - Executives & Ownership Implementation Plan

## Overview
Adding the Executives and Ownership sections to the Stock Detail Screen, matching the web app implementation exactly.

## Reference
- Web App Components:
  - `Catalyst App Mobile UI_UX v7.0 (2)/src/components/company-ownership.tsx`
  - `Catalyst App Mobile UI_UX v7.0 (2)/src/components/company-executives.tsx`
- Mobile Implementation: `src/screens/StockDetailScreen.tsx`

## Data Requirements

### API Methods to Add to StockAPI.ts
1. `getCompanyOwnership(symbol: string, limit: number = 100): Promise<CompanyOwnership[]>`
2. `getCompanyExecutives(symbol: string, limit: number = 100): Promise<CompanyExecutive[]>`

### Type Definitions to Add
```typescript
export interface CompanyOwnership {
  id: number;
  symbol: string;
  name: string;
  share: number | null;
  change: number | null;
  filing_date: string | null;
  fetched_at: string;
}

export interface CompanyExecutive {
  id: number;
  symbol: string;
  name: string;
  position: string | null;
  age: number | null;
  compensation: number | null;
  currency: string | null;
  sex: string | null;
  since: string | null;
  fetched_at: string;
  raw: any | null;
}
```

## Implementation Tasks

### 1. Add API Methods to StockAPI.ts
- Add `getCompanyOwnership()` method
- Add `getCompanyExecutives()` method
- Include caching support
- Handle offline state

### 2. Create CompanyOwnership Component
**Features:**
- Display top 5 owners by default
- Show rank, name, and ownership percentage
- "View Top N Owners" button to open modal
- Modal with full list (up to 100 owners)
- Sort by rank or date toggle in modal
- Show market value and shares in expanded view
- Show filing date and change percentage
- Handle missing data gracefully

**Layout:**
- Compact view: Rank # | Name | Percentage + Market Value
- Expanded view: Rank # | Name (with market value, shares, filing date, change %)

### 3. Create CompanyExecutives Component
**Features:**
- Toggle between "Executives" and "Board" views
- Display top 5 in each view by default
- "View All N Executives/Board Members" button
- Modal with full list
- Show name, position, and "since" date
- Filter executives vs board members by position keywords
- Handle missing data gracefully

**Layout:**
- Compact view: Name | Position
- Expanded view: Name | Position | Since date

### 4. Add Sections to StockDetailScreen
- Place after Financials section
- Add Ownership section first
- Add Executives section second
- Load data on mount
- Handle loading states
- Handle error states

### 5. Styling
- Match web app card styling
- Use theme colors
- Responsive layout
- Smooth animations
- Modal styling with proper header

## Section Order in StockDetailScreen
1. Stock Chart
2. Events
3. Company Information
4. Key Statistics
5. Financials
6. **Company Ownership** ← NEW
7. **Executives & Board** ← NEW

## Success Criteria
- ✅ Matches web app layout exactly
- ✅ All data displays correctly
- ✅ Proper formatting for numbers
- ✅ Toggle between executives/board works
- ✅ Modals open/close properly
- ✅ Sort functionality works in ownership modal
- ✅ Handles missing data gracefully
- ✅ Loading states work correctly
- ✅ Pull-to-refresh updates all data
