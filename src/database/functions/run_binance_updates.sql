-- Helper function to run and monitor Binance price updates
CREATE OR REPLACE FUNCTION run_binance_price_update()
RETURNS TABLE (
    symbol TEXT,
    old_bid DECIMAL,
    new_bid DECIMAL,
    old_ask DECIMAL,
    new_ask DECIMAL,
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
    SELECT symbol, bid_price, ask_price
    FROM trading_pairs
    WHERE type = 'crypto' AND is_active = true;
    
    -- Run the update
    PERFORM update_binance_prices();
    
    -- Record end time
    v_end_time := NOW();
    
    -- Return results comparing old and new prices
    RETURN QUERY
    SELECT 
        t.symbol,
        temp_old_prices.bid_price as old_bid,
        t.bid_price as new_bid,
        temp_old_prices.ask_price as old_ask,
        t.ask_price as new_ask,
        CASE 
            WHEN t.bid_price <> temp_old_prices.bid_price 
              OR t.ask_price <> temp_old_prices.ask_price THEN 'Updated'
            ELSE 'No change'
        END as status
    FROM trading_pairs t
    JOIN temp_old_prices ON t.symbol = temp_old_prices.symbol
    WHERE t.type = 'crypto' AND t.is_active = true
    ORDER BY t.symbol;
    
    -- Cleanup
    DROP TABLE temp_old_prices;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM run_binance_price_update();
