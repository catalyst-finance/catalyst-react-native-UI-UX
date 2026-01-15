-- ============================================================================
-- PART 1: List all scheduled functions (cron jobs)
-- ============================================================================

-- List all pg_cron jobs
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
ORDER BY jobid;

-- ============================================================================
-- PART 2: List all functions that might be doing aggregation
-- ============================================================================

-- List all functions with 'aggregate' or 'rollup' in the name
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (p.proname ILIKE '%aggregate%' OR p.proname ILIKE '%rollup%')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

-- ============================================================================
-- PART 3: Example updated aggregation functions with session column
-- ============================================================================

-- Example: Aggregate intraday_prices to one_minute_prices (with session)
CREATE OR REPLACE FUNCTION aggregate_to_one_minute()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO one_minute_prices (symbol, timestamp, open, high, low, close, volume, source)
  SELECT 
    symbol,
    date_trunc('minute', timestamp) as timestamp,
    (array_agg(price ORDER BY timestamp ASC))[1] as open,
    MAX(price) as high,
    MIN(price) as low,
    (array_agg(price ORDER BY timestamp DESC))[1] as close,
    SUM(volume) as volume,
    'intraday_aggregated' as source
  FROM intraday_prices
  WHERE timestamp >= NOW() - INTERVAL '2 hours'
    AND timestamp < date_trunc('minute', NOW())
  GROUP BY symbol, date_trunc('minute', timestamp)
  ON CONFLICT (symbol, timestamp) 
  DO UPDATE SET
    open = EXCLUDED.open,
    high = EXCLUDED.high,
    low = EXCLUDED.low,
    close = EXCLUDED.close,
    volume = EXCLUDED.volume;
  -- Note: session column is auto-generated, no need to insert it
END;
$$;

-- Example: Aggregate one_minute_prices to five_minute_prices (with session)
CREATE OR REPLACE FUNCTION aggregate_to_five_minute()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO five_minute_prices (symbol, timestamp, open, high, low, close, volume, source)
  SELECT 
    symbol,
    date_trunc('hour', timestamp) + 
      INTERVAL '5 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5) as timestamp,
    (array_agg(open ORDER BY timestamp ASC))[1] as open,
    MAX(high) as high,
    MIN(low) as low,
    (array_agg(close ORDER BY timestamp DESC))[1] as close,
    SUM(volume) as volume,
    'one_minute_aggregated' as source
  FROM one_minute_prices
  WHERE timestamp >= NOW() - INTERVAL '2 hours'
    AND timestamp < date_trunc('hour', NOW()) + 
      INTERVAL '5 minutes' * FLOOR(EXTRACT(MINUTE FROM NOW()) / 5)
  GROUP BY symbol, date_trunc('hour', timestamp) + 
    INTERVAL '5 minutes' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5)
  ON CONFLICT (symbol, timestamp) 
  DO UPDATE SET
    open = EXCLUDED.open,
    high = EXCLUDED.high,
    low = EXCLUDED.low,
    close = EXCLUDED.close,
    volume = EXCLUDED.volume;
  -- Note: session column is auto-generated, no need to insert it
END;
$$;

-- Example: Aggregate five_minute_prices to hourly_prices (with session)
CREATE OR REPLACE FUNCTION aggregate_to_hourly()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO hourly_prices (symbol, timestamp, open, high, low, close, volume, source)
  SELECT 
    symbol,
    date_trunc('hour', timestamp) as timestamp,
    (array_agg(open ORDER BY timestamp ASC))[1] as open,
    MAX(high) as high,
    MIN(low) as low,
    (array_agg(close ORDER BY timestamp DESC))[1] as close,
    SUM(volume) as volume,
    'five_minute_aggregated' as source
  FROM five_minute_prices
  WHERE timestamp >= NOW() - INTERVAL '2 days'
    AND timestamp < date_trunc('hour', NOW())
  GROUP BY symbol, date_trunc('hour', timestamp)
  ON CONFLICT (symbol, timestamp) 
  DO UPDATE SET
    open = EXCLUDED.open,
    high = EXCLUDED.high,
    low = EXCLUDED.low,
    close = EXCLUDED.close,
    volume = EXCLUDED.volume;
  -- Note: session column is auto-generated, no need to insert it
END;
$$;

-- Example: Aggregate hourly_prices to daily_prices
CREATE OR REPLACE FUNCTION aggregate_to_daily()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO daily_prices (symbol, date, open, high, low, close, volume, source)
  SELECT 
    symbol,
    DATE(timestamp AT TIME ZONE 'America/New_York') as date,
    (array_agg(open ORDER BY timestamp ASC))[1] as open,
    MAX(high) as high,
    MIN(low) as low,
    (array_agg(close ORDER BY timestamp DESC))[1] as close,
    SUM(volume) as volume,
    'hourly_aggregated' as source
  FROM hourly_prices
  WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND timestamp < date_trunc('day', NOW() AT TIME ZONE 'America/New_York')
  GROUP BY symbol, DATE(timestamp AT TIME ZONE 'America/New_York')
  ON CONFLICT (symbol, date) 
  DO UPDATE SET
    open = EXCLUDED.open,
    high = EXCLUDED.high,
    low = EXCLUDED.low,
    close = EXCLUDED.close,
    volume = EXCLUDED.volume;
END;
$$;

-- ============================================================================
-- PART 4: Schedule the aggregation functions (if not already scheduled)
-- ============================================================================

-- Run one_minute aggregation every minute
-- SELECT cron.schedule('aggregate-one-minute', '* * * * *', 'SELECT aggregate_to_one_minute()');

-- Run five_minute aggregation every 5 minutes
-- SELECT cron.schedule('aggregate-five-minute', '*/5 * * * *', 'SELECT aggregate_to_five_minute()');

-- Run hourly aggregation every hour
-- SELECT cron.schedule('aggregate-hourly', '0 * * * *', 'SELECT aggregate_to_hourly()');

-- Run daily aggregation once per day at 1 AM ET (6 AM UTC during EST, 5 AM UTC during EDT)
-- SELECT cron.schedule('aggregate-daily', '0 6 * * *', 'SELECT aggregate_to_daily()');

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The session column is GENERATED ALWAYS, so it's automatically calculated
--    when rows are inserted. You don't need to include it in INSERT statements.
--
-- 2. The aggregation functions above are examples. Your actual functions may
--    have different names or logic. Use PART 2 query to see your actual functions.
--
-- 3. After running PART 1 and PART 2, you can see what needs to be updated.
--    The key point is: you don't need to change aggregation logic for session,
--    it will be auto-calculated by the database.
--
-- 4. If you need to manually set session for existing data, you would need to
--    drop and recreate the column (since it's GENERATED), or create a new
--    column and migrate data.
