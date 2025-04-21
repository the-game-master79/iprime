-- Add last_price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trading_pairs' 
        AND column_name = 'last_price'
    ) THEN
        ALTER TABLE trading_pairs 
        ADD COLUMN last_price DECIMAL DEFAULT 0;
    END IF;
END $$;

-- Create http extension if needed
CREATE EXTENSION IF NOT EXISTS http;

-- Create or replace the function to update last prices
CREATE OR REPLACE FUNCTION update_forex_last_prices()
RETURNS void AS $$
DECLARE
    pair RECORD;
    api_response JSONB;
    api_key TEXT := '9Mg9aPbHBv2jc83wfzis'; -- Hardcoded API key
BEGIN
    -- Loop through forex pairs
    FOR pair IN 
        SELECT symbol, short_name 
        FROM trading_pairs 
        WHERE type = 'forex' AND is_active = true
    LOOP
        -- Make API call to get current price
        SELECT content::jsonb INTO api_response
        FROM http_get('https://marketdata.tradermade.com/api/v1/live?' || 
                     'currency=' || replace(replace(pair.short_name, '/', ''), 'FX:', '') ||
                     '&api_key=' || api_key);

        -- Update last_price if API call successful
        IF api_response->>'bid' IS NOT NULL THEN
            UPDATE trading_pairs 
            SET last_price = (api_response->>'bid')::DECIMAL,
                updated_at = NOW()
            WHERE symbol = pair.symbol;
        END IF;

        -- Add delay to respect API rate limits
        PERFORM pg_sleep(1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop existing scheduled job if it exists
DO $$
BEGIN
    PERFORM cron.unschedule('update-forex-prices');
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
END $$;

-- Add new schedule using cron.schedule() instead of direct table insert
SELECT cron.schedule(
    'update-forex-prices',
    '30 6 * * 1-5',
    $$SELECT update_forex_last_prices()$$
);

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_forex_price_update()
RETURNS void AS $$
BEGIN
    PERFORM update_forex_last_prices();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_forex_last_prices() TO PUBLIC;
GRANT EXECUTE ON FUNCTION trigger_forex_price_update() TO PUBLIC;
