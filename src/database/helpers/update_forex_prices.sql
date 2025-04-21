-- Helper function to run and monitor price updates
CREATE OR REPLACE FUNCTION run_forex_price_update()
RETURNS TABLE (
    symbol TEXT,
    old_price DECIMAL,
    new_price DECIMAL,
    status TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- Record start time
    v_start_time := NOW();
    
    -- Create temp table to store old prices
    CREATE TEMP TABLE temp_old_prices AS
    SELECT symbol, last_price
    FROM trading_pairs
    WHERE type = 'forex' AND is_active = true;
    
    -- Run the update
    PERFORM trigger_forex_price_update();
    
    -- Record end time
    v_end_time := NOW();
    
    -- Return results comparing old and new prices
    RETURN QUERY
    SELECT 
        t.symbol,
        temp_old_prices.last_price as old_price,
        t.last_price as new_price,
        CASE 
            WHEN t.last_price <> temp_old_prices.last_price THEN 'Updated'
            ELSE 'No change'
        END as status
    FROM trading_pairs t
    JOIN temp_old_prices ON t.symbol = temp_old_prices.symbol
    WHERE t.type = 'forex' AND t.is_active = true
    ORDER BY t.symbol;
    
    -- Cleanup
    DROP TABLE temp_old_prices;
END;
$$ LANGUAGE plpgsql;
