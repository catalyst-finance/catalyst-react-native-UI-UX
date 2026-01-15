-- Add session column to one_minute_prices table
-- Session is determined by ET time: pre-market (4:00-9:30), regular (9:30-16:00), after-hours (16:00-20:00)
-- We calculate ET time directly from timestamp using AT TIME ZONE
ALTER TABLE public.one_minute_prices 
ADD COLUMN session text GENERATED ALWAYS AS (
  CASE 
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 240 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 570 
    THEN 'pre-market'
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 570 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 960 
    THEN 'regular'
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 960 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 1200 
    THEN 'after-hours'
    ELSE 'closed'
  END
) STORED;

-- Create index on session column for one_minute_prices
CREATE INDEX IF NOT EXISTS idx_one_minute_prices_symbol_session 
ON public.one_minute_prices USING btree (symbol, session, timestamp DESC);

-- Add session column to five_minute_prices table
ALTER TABLE public.five_minute_prices 
ADD COLUMN session text GENERATED ALWAYS AS (
  CASE 
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 240 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 570 
    THEN 'pre-market'
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 570 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 960 
    THEN 'regular'
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 960 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 1200 
    THEN 'after-hours'
    ELSE 'closed'
  END
) STORED;

-- Create index on session column for five_minute_prices
CREATE INDEX IF NOT EXISTS idx_five_minute_prices_symbol_session 
ON public.five_minute_prices USING btree (symbol, session, timestamp DESC);

-- Add session column to hourly_prices table
ALTER TABLE public.hourly_prices 
ADD COLUMN session text GENERATED ALWAYS AS (
  CASE 
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 240 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 570 
    THEN 'pre-market'
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 570 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 960 
    THEN 'regular'
    WHEN EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) >= 960 
         AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/New_York')) * 60 + 
         EXTRACT(MINUTE FROM (timestamp AT TIME ZONE 'America/New_York')) < 1200 
    THEN 'after-hours'
    ELSE 'closed'
  END
) STORED;

-- Create index on session column for hourly_prices
CREATE INDEX IF NOT EXISTS idx_hourly_prices_symbol_session 
ON public.hourly_prices USING btree (symbol, session, timestamp DESC);

-- Note: intraday_prices table already has a session column, so no changes needed
