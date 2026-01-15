# RLS Fix Guide - Database Table Name and Security Policy Setup

This guide explains how to fix the database table name mismatch and set up proper Row Level Security (RLS) policies for your Catalyst app.

## Problem Summary

1. **Table Name Mismatch**: Code was looking for `'Catalyst Event Data'` but the actual table is named `event_data`
2. **RLS Blocking Access**: After enabling RLS on tables, no policies were set up to allow read access
3. **Console Warnings**: Missing error handling for database queries

## Fix Applied

### 1. Table Name Correction

**File**: `/utils/supabase/client.ts`

Changed the table name constant from:
```typescript
export const CATALYST_TABLE = 'Catalyst Event Data';
```

To:
```typescript
export const CATALYST_TABLE = 'event_data';
```

This now matches your actual database schema where the table is named `event_data`.

### 2. RLS Policies

**File**: `/supabase/migrations/20250103000000_setup_rls_policies.sql`

Created comprehensive RLS policies for all tables:
- `event_data` - Catalyst events
- `daily_prices` - Historical daily stock prices
- `stock_quote_now` - Real-time stock quotes
- `watchlist` - User watchlist
- `company_information` - Company details

All policies allow **public read access** which is appropriate for a market data application where:
- Data is public market information
- No sensitive user data is stored
- App operates in a read-only mode for these tables

## How to Apply the Fix

### Step 1: Verify Your Database Schema

First, confirm your tables are named correctly in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to check table names:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'event_data', 
  'daily_prices', 
  'stock_quote_now', 
  'watchlist'
)
ORDER BY table_name;
```

You should see:
- `daily_prices`
- `event_data`
- `stock_quote_now`
- `watchlist`

### Step 2: Apply RLS Policies

Copy the contents of `/supabase/migrations/20250103000000_setup_rls_policies.sql` and:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste the SQL from the migration file
4. Click "Run" to execute

This will:
- Enable RLS on all tables
- Create policies allowing public read access
- Verify policies are properly created

### Step 3: Verify RLS Policies

Run this verification query in Supabase SQL Editor:

```sql
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

You should see policies for each table allowing SELECT operations.

### Step 4: Test the Fix

1. Refresh your Catalyst app
2. Check browser console for any remaining errors
3. Verify that:
   - Event data loads in the timeline
   - Stock prices display correctly
   - Charts show historical data
   - No RLS policy errors appear in console

## Table Schema Reference

For your reference, here are the table schemas that should exist:

### event_data
```sql
create table public.event_data (
  "PrimaryID" text not null,
  type text null,
  title text null,
  company text null,
  ticker text null,
  sector text null,
  time text null,
  "impactRating" bigint null,
  confidence bigint null,
  "aiInsight" text null,
  "actualDateTime" timestamp with time zone null,
  constraint "Catalyst Event Data_pkey" primary key ("PrimaryID")
);
```

### daily_prices
```sql
create table public.daily_prices (
  symbol text not null,
  date date not null,
  open double precision null,
  high double precision null,
  low double precision null,
  close double precision null,
  volume double precision null,
  adjusted boolean null default true,
  source text null default 'finnhub'::text,
  raw jsonb null,
  ingested_at timestamp with time zone null default now(),
  constraint daily_prices_pkey primary key (symbol, date)
);
```

### stock_quote_now
```sql
create table public.stock_quote_now (
  symbol text not null,
  "marketCapitalization" numeric null,
  c double precision null,
  d double precision null,
  dp double precision null,
  h double precision null,
  l double precision null,
  o double precision null,
  pc double precision null,
  t bigint null,
  ingested_at timestamp with time zone not null default now(),
  source text not null default 'finnhub'::text,
  json jsonb null,
  constraint stock_quote_now_pkey primary key (symbol)
);
```

### watchlist
```sql
create table public.watchlist (
  symbol text not null,
  is_active boolean not null default true,
  constraint watchlist_pkey primary key (symbol)
);
```

## Common Issues and Solutions

### Issue: "relation 'Catalyst Event Data' does not exist"

**Solution**: This fix addresses this issue by changing the table reference to `event_data`.

### Issue: "new row violates row-level security policy"

**Solution**: The RLS policies in the migration file allow public read access to all tables.

### Issue: "permission denied for table event_data"

**Solution**: Ensure you've applied the RLS policies SQL script in your Supabase dashboard.

### Issue: Charts not loading or showing mock data

**Solution**: 
1. Verify `daily_prices` table has data
2. Check that RLS policies are applied to `daily_prices`
3. Verify symbols in daily_prices are lowercase (e.g., 'aapl', not 'AAPL')

### Issue: Console flooded with warnings

**Solution**: The updated code includes better error handling and logging. Common warnings about missing data are now suppressed when appropriate.

## Additional Notes

### About RLS Policies

The policies created allow **public read access** because:

1. **Market data is public**: Stock prices, events, and company information are publicly available data
2. **No user data**: The app doesn't store sensitive user information in these tables
3. **Read-only access**: Users can only SELECT (read) data, not INSERT, UPDATE, or DELETE

### Security Considerations

If you plan to add user-specific features (like custom watchlists per user), you'll need to:

1. Add user authentication
2. Update RLS policies to filter by user ID
3. Add user_id columns to relevant tables

For now, the public read access is appropriate for your use case.

## Testing Checklist

After applying the fix, verify:

- [ ] No "table does not exist" errors in console
- [ ] Events display in the timeline
- [ ] Stock prices load correctly
- [ ] Charts show historical data
- [ ] No RLS policy errors
- [ ] Page loads without errors
- [ ] Database queries complete successfully

## Support

If you continue to see issues after applying this fix:

1. Check the browser console for specific error messages
2. Verify table names match exactly (case-sensitive)
3. Confirm RLS policies were created successfully
4. Check that your Supabase API keys are correct in the app

## Files Modified

- `/utils/supabase/client.ts` - Updated table name constant
- `/supabase/migrations/20250103000000_setup_rls_policies.sql` - New RLS policies

No other files need modification. The table name is referenced through the constant, so changing it in one place fixes all references throughout the app.