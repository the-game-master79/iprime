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
    v_rows_updated INTEGER;
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
               REPLACE(REPLACE(t.short_name, 'FX:', ''), '/', '') as clean_symbol,
               t.last_price
        FROM trading_pairs t
        WHERE t.type = 'forex' AND t.is_active = true 
    LOOP
        BEGIN
            -- Store old price
            v_old_price := pair.last_price;
            
            RAISE NOTICE 'Processing pair %: Current price = %', pair.symbol, v_old_price;

            -- Make API call with explicit timeout
            SELECT content::jsonb INTO api_response
            FROM http_get(
                'https://marketdata.tradermade.com/api/v1/live?' || 
                'currency=' || pair.clean_symbol ||
                '&api_key=' || api_key,
                timeout := 10
            );

            -- Validate API response structure
            IF api_response IS NULL THEN
                RAISE EXCEPTION 'Empty API response received';
            END IF;

            -- Debug log the raw response
            RAISE NOTICE 'API Response for %: %', pair.symbol, api_response;

            -- Validate price data
            IF api_response->>'bid' IS NULL OR NOT (api_response->>'bid' ~ '^\d*\.?\d+$') THEN
                RAISE EXCEPTION 'Invalid or missing bid price in response';
            END IF;

            -- Update within a sub-transaction
            BEGIN
                UPDATE trading_pairs 
                SET last_price = (api_response->>'bid')::DECIMAL,
                    last_price_update = NOW(),
                    updated_at = NOW()
                WHERE symbol = pair.symbol
                RETURNING 1 INTO v_rows_updated;

                IF v_rows_updated IS NULL OR v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Update failed - no rows updated';
                END IF;

                -- Log successful update in results table
                INSERT INTO update_results (symbol, old_price, new_price, status)
                VALUES (
                    pair.symbol,
                    v_old_price,
                    (api_response->>'bid')::DECIMAL,
                    'Success'
                );
                
                -- Log successful update
                RAISE NOTICE 'Successfully updated % price from % to %', 
                    pair.symbol,
                    v_old_price,
                    (api_response->>'bid')::DECIMAL;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Database update failed for %: %', pair.symbol, SQLERRM;
                RAISE;
            END;

        EXCEPTION WHEN OTHERS THEN
            -- Log error in results with detailed message
            INSERT INTO update_results (symbol, old_price, new_price, status)
            VALUES (pair.symbol, v_old_price, NULL, 'Error: ' || SQLERRM);
            
            RAISE WARNING 'Error processing % (%): %', pair.symbol, pair.clean_symbol, SQLERRM;
        END;

        -- Add delay between requests
        PERFORM pg_sleep(1);
    END LOOP;

    -- Return results
    RETURN QUERY 
    SELECT * FROM update_results 
    ORDER BY 
        CASE WHEN update_results.status = 'Success' THEN 0 ELSE 1 END,
        update_results.symbol;
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
