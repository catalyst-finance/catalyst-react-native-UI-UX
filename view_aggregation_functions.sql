-- ============================================================================
-- View the actual aggregation function definitions
-- ============================================================================

-- View aggregate_one_minute_prices function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'aggregate_one_minute_prices';

-- View aggregate_five_minute_prices function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'aggregate_five_minute_prices';

21qwww-- View aggregate_hourly_prices function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'aggregate_hourly_prices';

-- View aggregate_daily_prices_from_hourly function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'aggregate_daily_prices_from_hourly';

-- View refresh_ten_minute_prices function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'refresh_ten_minute_prices';

-- ============================================================================
-- Summary of your scheduled jobs:
-- ============================================================================
-- 
-- Job 64: aggregate_one_minute_prices_v2 - Every minute during market hours
--         Schedule: * 13-23,0-1 * * 1-6 (8 AM - 8 PM ET, Mon-Sat)
--
-- Job 63: aggregate_five_minute_prices - Every 5 minutes during market hours
--         Schedule: */5 13-23,0-1 * * 1-6 (8 AM - 8 PM ET, Mon-Sat)
--
-- Job 62: aggregate_hourly_prices - Every hour at :05 during market hours
--         Schedule: 5 13-23,0-1 * * 1-6 (8 AM - 8 PM ET, Mon-Sat)
--
-- Job 46: aggregate_daily_prices_from_hourly - Daily at 4:05 PM ET
--         Schedule: 5 21 * * 1-5 (Mon-Fri)
--
-- Job 58: refresh_ten_minute_prices - Every 5 minutes
--         Schedule: */5 * * * *
--
-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
--
-- 1. Since you've added the 'session' column as a GENERATED column, your
--    existing aggregation functions should work WITHOUT modification.
--
-- 2. The session will be automatically calculated when data is inserted into:
--    - one_minute_prices
--    - five_minute_prices
--    - hourly_prices
--
-- 3. You do NOT need to modify the INSERT statements in your functions.
--    The database will automatically compute the session based on the timestamp.
--
-- 4. To verify the functions work correctly after adding the session column:
--    a) Run the add_session_columns.sql script
--    b) Wait for the next scheduled run of each aggregation
--    c) Query the tables to verify session values are populated:
--
--       SELECT symbol, timestamp, session, close 
--       FROM five_minute_prices 
--       WHERE symbol = 'AAPL' 
--       ORDER BY timestamp DESC 
--       LIMIT 20;
--
-- 5. If you want to backfill session data for existing rows, the GENERATED
--    column will automatically populate when you run the ALTER TABLE command.
--    No additional backfill is needed!
--
-- ============================================================================
