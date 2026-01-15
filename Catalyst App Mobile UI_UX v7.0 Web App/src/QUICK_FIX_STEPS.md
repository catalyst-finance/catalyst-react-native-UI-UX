# Quick Fix Steps - Catalyst Database Issues

## 🚀 3-Step Fix

### Step 1: Code Fix (Already Done ✅)
The table name has been corrected in `/utils/supabase/client.ts`:
- Changed from `'Catalyst Event Data'` to `event_data`

### Step 2: Apply RLS Policies (YOU MUST DO THIS)

1. Open Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the SQL below
4. Click "Run"

```sql
-- Setup RLS policies for all Catalyst tables

-- ====================
-- EVENT_DATA TABLE
-- ====================

ALTER TABLE public.event_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to event_data" ON public.event_data;
DROP POLICY IF EXISTS "Allow anon read access to event_data" ON public.event_data;

CREATE POLICY "Allow public read access to event_data"
ON public.event_data FOR SELECT TO public USING (true);

CREATE POLICY "Allow anon read access to event_data"
ON public.event_data FOR SELECT TO anon USING (true);

-- ====================
-- DAILY_PRICES TABLE
-- ====================

ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to daily_prices" ON public.daily_prices;
DROP POLICY IF EXISTS "Allow anon read access to daily_prices" ON public.daily_prices;

CREATE POLICY "Allow public read access to daily_prices"
ON public.daily_prices FOR SELECT TO public USING (true);

CREATE POLICY "Allow anon read access to daily_prices"
ON public.daily_prices FOR SELECT TO anon USING (true);

-- ====================
-- STOCK_QUOTE_NOW TABLE
-- ====================

ALTER TABLE public.stock_quote_now ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to stock_quote_now" ON public.stock_quote_now;
DROP POLICY IF EXISTS "Allow anon read access to stock_quote_now" ON public.stock_quote_now;

CREATE POLICY "Allow public read access to stock_quote_now"
ON public.stock_quote_now FOR SELECT TO public USING (true);

CREATE POLICY "Allow anon read access to stock_quote_now"
ON public.stock_quote_now FOR SELECT TO anon USING (true);

-- ====================
-- WATCHLIST TABLE
-- ====================

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Allow anon read access to watchlist" ON public.watchlist;

CREATE POLICY "Allow public read access to watchlist"
ON public.watchlist FOR SELECT TO public USING (true);

CREATE POLICY "Allow anon read access to watchlist"
ON public.watchlist FOR SELECT TO anon USING (true);

-- ====================
-- VERIFICATION
-- ====================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('event_data', 'daily_prices', 'stock_quote_now', 'watchlist')
ORDER BY tablename, policyname;
```

### Step 3: Test the App

1. Refresh your Catalyst app
2. Check that:
   - ✅ Events load in the timeline
   - ✅ Stock prices display
   - ✅ Charts show historical data
   - ✅ No console errors

## Expected Results

### ✅ Before Fix (ERRORS):
```
❌ relation "Catalyst Event Data" does not exist
❌ permission denied for table event_data
❌ new row violates row-level security policy
```

### ✅ After Fix (SUCCESS):
```
✅ Event data loaded successfully
✅ Stock prices loaded
✅ Charts rendered with historical data
✅ No database errors
```

## Troubleshooting

### Problem: Still seeing "table does not exist" errors
**Solution**: Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Problem: RLS policy errors persist
**Solution**: Verify the SQL ran successfully in Supabase. Check for any error messages in the SQL Editor.

### Problem: No data showing in app
**Solution**: 
1. Verify your tables have data:
   ```sql
   SELECT COUNT(*) FROM event_data;
   SELECT COUNT(*) FROM daily_prices;
   SELECT COUNT(*) FROM stock_quote_now;
   ```
2. Check Supabase API keys are correct in your app

## Need More Help?

See the detailed guides:
- `DATABASE_FIX_SUMMARY.md` - Complete fix explanation
- `RLS_FIX_GUIDE.md` - Comprehensive troubleshooting guide

## That's It!

The fix is complete once you run the SQL in Supabase. The code changes are already applied.