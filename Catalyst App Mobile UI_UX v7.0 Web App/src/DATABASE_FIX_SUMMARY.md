# Database Fix Summary - Catalyst App

## Overview

This document summarizes the fixes applied to resolve database table name mismatches and RLS (Row Level Security) configuration issues in the Catalyst app.

## Problems Fixed

### 1. ✅ Database Table Name Mismatch
**Issue**: Code was looking for table `'Catalyst Event Data'` but actual table is named `event_data`

**Error Message**: 
```
relation "Catalyst Event Data" does not exist
```

**Fix Applied**: Updated `/utils/supabase/client.ts` line 107
```typescript
// Before
export const CATALYST_TABLE = 'Catalyst Event Data';

// After  
export const CATALYST_TABLE = 'event_data';
```

**Impact**: All event data queries now correctly reference the `event_data` table.

### 2. ✅ RLS Policies Missing
**Issue**: RLS was enabled on tables but no policies were created to allow read access

**Error Message**:
```
new row violates row-level security policy
permission denied for table event_data
```

**Fix Applied**: Created `/supabase/migrations/20250103000000_setup_rls_policies.sql`

This migration file creates comprehensive RLS policies for all tables:
- `event_data` - Public read access for catalyst events
- `daily_prices` - Public read access for historical prices
- `stock_quote_now` - Public read access for real-time quotes
- `watchlist` - Public read access for watchlist
- `company_information` - Public read access for company data

All policies allow SELECT (read) operations for public and anonymous users, which is appropriate for market data applications.

## How to Apply the Fix

### Step 1: Verify the Code Change
The table name change has already been applied to `/utils/supabase/client.ts`. No action needed.

### Step 2: Apply RLS Policies to Supabase

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file `/supabase/migrations/20250103000000_setup_rls_policies.sql`
4. Copy all the SQL content
5. Paste into a new query in Supabase SQL Editor
6. Click "Run" to execute

The SQL will:
- Enable RLS on all required tables
- Create policies allowing public read access
- Drop any conflicting existing policies first
- Verify policies were created successfully

### Step 3: Verify the Fix

After applying the SQL, run this verification query in Supabase:

```sql
-- Verify all policies are in place
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('event_data', 'daily_prices', 'stock_quote_now', 'watchlist')
ORDER BY tablename, policyname;
```

You should see at least 2 policies per table (one for 'public' role, one for 'anon' role).

### Step 4: Test the App

1. Refresh your Catalyst app
2. Complete onboarding (if needed)
3. Verify:
   - ✅ Events display in the timeline
   - ✅ Stock prices load correctly
   - ✅ Charts show historical data
   - ✅ No console errors about missing tables
   - ✅ No RLS policy violations

## Additional Issues (Optional Fixes)

### React setState Warning in RobinhoodStyleChart

**Issue**: Console warning about calling setState during render

**Location**: `/components/robinhood-style-chart.tsx` lines 828-830

**Current Code**:
```typescript
if (lastPointRenderedY !== cy) {
  setLastPointRenderedY(cy);
}
```

**Issue**: This setState call happens inside the `dot` render callback, which React warns against.

**Fix** (if needed): Wrap the setState in `requestAnimationFrame`:
```typescript
if (lastPointRenderedY !== cy) {
  requestAnimationFrame(() => {
    setLastPointRenderedY(cy);
  });
}
```

**Status**: Not critical. Only causes a console warning, doesn't break functionality. Can be addressed later if desired.

### Daily Prices Console Warnings

**Issue**: Console may show warnings about missing daily price data for certain dates

**Status**: These are informational warnings, not errors. The app gracefully falls back to other data sources when daily prices aren't available.

**No fix needed**: The current warning system helps with debugging and doesn't affect functionality.

## Files Modified

1. **`/utils/supabase/client.ts`**
   - Changed `CATALYST_TABLE` constant from `'Catalyst Event Data'` to `'event_data'`
   - Added constants for `DAILY_PRICES_TABLE` and `WATCHLIST_TABLE`

2. **`/supabase/migrations/20250103000000_setup_rls_policies.sql`** (NEW)
   - Comprehensive RLS policies for all tables
   - Enables public read access
   - Includes verification query

3. **`/RLS_FIX_GUIDE.md`** (NEW)
   - Detailed guide for applying the fix
   - Troubleshooting information
   - Table schema reference

4. **`/DATABASE_FIX_SUMMARY.md`** (THIS FILE)
   - Quick reference for the fixes applied

## Table Name Reference

For your reference, here are the correct table names to use:

| Old Name (Incorrect) | New Name (Correct) | Purpose |
|---------------------|-------------------|----------|
| 'Catalyst Event Data' | `event_data` | Market catalyst events |
| N/A | `daily_prices` | Historical daily stock prices |
| N/A | `stock_quote_now` | Real-time stock quotes |
| N/A | `watchlist` | User watchlist |
| N/A | `company_information` | Company details |

## Expected Console Output After Fix

After applying the fix, you should see:

✅ **Success Messages**:
- `"📊 [getDailyPrices] {SYMBOL}: Got X days"` - Daily prices loading
- `"✅ Event data loaded successfully"` - Events loading
- No errors about missing tables
- No RLS policy violations

⚠️ **Acceptable Warnings** (not errors):
- `"⚠️ [getDailyPrices] {SYMBOL}: No data found"` - For symbols without historical data
- React DevTools performance suggestions
- Minor Recharts warnings about props

❌ **Should NOT See** (these indicate issues):
- `"relation does not exist"` - Table name mismatch
- `"permission denied"` - Missing RLS policies
- `"new row violates row-level security"` - RLS misconfiguration

## Testing Checklist

After applying all fixes:

- [ ] No table name errors in console
- [ ] Events load and display in timeline
- [ ] Stock prices show current data
- [ ] Charts render with historical data
- [ ] Catalyst dots appear on charts
- [ ] No RLS policy errors
- [ ] App loads within 3 seconds
- [ ] Data refreshes correctly

## Rollback Instructions

If you need to rollback these changes:

### Rollback Code Changes
```bash
# Restore old table name (not recommended)
# In /utils/supabase/client.ts line 107:
export const CATALYST_TABLE = 'Catalyst Event Data';
```

### Rollback RLS Policies
```sql
-- Disable RLS on all tables
ALTER TABLE public.event_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_quote_now DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist DISABLE ROW LEVEL SECURITY;

-- OR just drop the policies (keep RLS enabled)
DROP POLICY IF EXISTS "Allow public read access to event_data" ON public.event_data;
DROP POLICY IF EXISTS "Allow anon read access to event_data" ON public.event_data;
-- Repeat for other tables...
```

**Note**: Rollback is NOT recommended. The fixes correct the table names to match your actual schema.

## Support Resources

- **Table Schema**: See `RLS_FIX_GUIDE.md` for complete table schemas
- **RLS Policies**: See migration file for exact policy definitions
- **Troubleshooting**: See `RLS_FIX_GUIDE.md` "Common Issues" section

## Summary

The main fix is simple:
1. ✅ Table name corrected in code (`'Catalyst Event Data'` → `event_data`)
2. ✅ RLS policies SQL file created
3. ⏳ **YOU NEED TO**: Run the SQL file in your Supabase dashboard

After running the SQL in Supabase, your app should work correctly with no database errors.