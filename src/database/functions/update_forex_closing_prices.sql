-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_forex_closing_prices CASCADE;

-- Create function to update forex closing prices
CREATE OR REPLACE FUNCTION update_forex_closing_prices()
RETURNS TABLE (
    symbol TEXT,
    old_price DECIMAL,
    new_price DECIMAL,
    status TEXT
) AS $$
DECLARE
    pair RECORD;
    api_response JSONB;
    api_key CONSTANT TEXT := 'Ch_i_UKqAhR3g2cq1wHi';
    v_old_price DECIMAL;
BEGIN
    -- Create temp table to store results
    CREATE TEMP TABLE update_results (
        symbol TEXT,
        old_price DECIMAL,
        new_price DECIMAL,
        status TEXT
    );

    -- Loop through active forex pairs
    FOR pair IN 
        SELECT t.symbol, 
               REPLACE(REPLACE(t.short_name, 'FX:', ''), '/', '') as clean_symbol
        FROM trading_pairs t
        WHERE t.type = 'forex' AND t.is_active = true 
    LOOP
        BEGIN
            -- Store old price
            SELECT last_price INTO v_old_price
            FROM trading_pairs
            WHERE symbol = pair.symbol;

            -- Make API call to TradeMade REST endpoint
            SELECT content::jsonb INTO api_response
            FROM http_get('https://marketdata.tradermade.com/api/v1/live?' || 
                         'currency=' || pair.clean_symbol ||
                         '&api_key=' || api_key);

            -- Debug log the raw response
            RAISE NOTICE 'API Response for %: %', pair.symbol, api_response;

            -- Update only last_price and last_price_update if API call successful
            IF api_response->>'bid' IS NOT NULL THEN
                UPDATE trading_pairs 
                SET last_price = (api_response->>'bid')::DECIMAL,
                    last_price_update = NOW()
                WHERE symbol = pair.symbol;

                -- Log the update in results table
                INSERT INTO update_results (symbol, old_price, new_price, status)
                VALUES (
                    pair.symbol,
                    v_old_price,
                    (api_response->>'bid')::DECIMAL,
                    'Success'
                );
                
                -- Log successful update
                RAISE NOTICE 'Updated % price from % to %', 
                    pair.symbol,
                    v_old_price,
                    (api_response->>'bid')::DECIMAL;
            ELSE
                -- Log failed update
                INSERT INTO update_results (symbol, old_price, new_price, status)
                VALUES (pair.symbol, v_old_price, NULL, 'No bid price received');
                RAISE WARNING 'No bid price received for %', pair.symbol;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Log error in results
            INSERT INTO update_results (symbol, old_price, new_price, status)
            VALUES (pair.symbol, v_old_price, NULL, 'Error: ' || SQLERRM);
            RAISE WARNING 'Error updating %: %', pair.symbol, SQLERRM;
        END;

        -- Add delay between requests
        PERFORM pg_sleep(0.5);
    END LOOP;

    -- Return results
    RETURN QUERY SELECT * FROM update_results ORDER BY symbol;
END;
$$ LANGUAGE plpgsql;

-- Drop existing job if exists
SELECT cron.unschedule('update-forex-closing-prices');

-- Create scheduled job to run at 18:30 UTC
SELECT cron.schedule(
    'update-forex-closing-prices',
    '30 18 * * 1-5',
    $$SELECT * FROM update_forex_closing_prices()$$
);

-- Create index for faster price updates if not exists
CREATE INDEX IF NOT EXISTS idx_trading_pairs_type_active 
ON trading_pairs(type, is_active) 
WHERE type = 'forex' AND is_active = true;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_forex_closing_prices() TO postgres;

-- Test the function manually and see results
SELECT * FROM update_forex_closing_prices();
