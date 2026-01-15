-- FIX SESSION LABELS
-- Problem: Data at 9:30 AM and later is incorrectly labeled as "pre-market"
-- The market opens at 9:30:00 AM ET, so anything >= 9:30:00 should be "regular"

-- First, let's see the current session calculation logic that's likely wrong:
-- WRONG: timestamp_et::time < '09:30:00'  (should use <=)
-- WRONG: timestamp_et::time >= '09:30:00' AND timestamp_et::time < '16:00:00' (should use <=)

-- The CORRECT logic should be:
-- pre-market:   timestamp_et::time < '09:30:00'
-- regular:      timestamp_et::time >= '09:30:00' AND timestamp_et::time < '16:00:00'  
-- after-hours:  timestamp_et::time >= '16:00:00'

-- If the session column exists and has wrong data, we need to update it.
-- But first, let's check if intraday_prices even has a session column:

-- Check if session column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'intraday_prices' 
AND table_schema = 'public'
AND column_name = 'session';

-- If the column exists but is computed incorrectly, the fix is likely in:
-- 1. A database trigger
-- 2. A generated column definition  
-- 3. Application code that inserts the data

-- To fix existing data (if session column exists):
UPDATE public.intraday_prices
SET session = CASE
  WHEN (timestamp AT TIME ZONE 'America/New_York')::time < '09:30:00' THEN 'pre-market'
  WHEN (timestamp AT TIME ZONE 'America/New_York')::time >= '09:30:00' 
   AND (timestamp AT TIME ZONE 'America/New_York')::time < '16:00:00' THEN 'regular'
  WHEN (timestamp AT TIME ZONE 'America/New_York')::time >= '16:00:00' 
   AND (timestamp AT TIME ZONE 'America/New_York')::time < '20:00:00' THEN 'after-hours'
  ELSE 'closed'
END
WHERE session IS NOT NULL;

-- Or if session is a generated column, we need to alter the table:
-- ALTER TABLE public.intraday_prices 
-- DROP COLUMN session;
--
-- ALTER TABLE public.intraday_prices 
-- ADD COLUMN session text GENERATED ALWAYS AS (
--   CASE
--     WHEN (timestamp AT TIME ZONE 'America/New_York')::time < '09:30:00' THEN 'pre-market'
--     WHEN (timestamp AT TIME ZONE 'America/New_York')::time >= '09:30:00' 
--      AND (timestamp AT TIME ZONE 'America/New_York')::time < '16:00:00' THEN 'regular'
--     WHEN (timestamp AT TIME ZONE 'America/New_York')::time >= '16:00:00' 
--      AND (timestamp AT TIME ZONE 'America/New_York')::time < '20:00:00' THEN 'after-hours'
--     ELSE 'closed'
--   END
-- ) STORED;
