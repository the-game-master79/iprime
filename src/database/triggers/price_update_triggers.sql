-- Drop triggers first
DROP TRIGGER IF EXISTS crypto_limit_orders_trigger ON crypto_prices;
DROP TRIGGER IF EXISTS forex_limit_orders_trigger ON forex_prices;

-- Drop the function
DROP FUNCTION IF EXISTS process_limit_orders();

-- Keep only the trade notifications functionality
CREATE OR REPLACE FUNCTION enable_trade_notifications()
RETURNS void AS $$
BEGIN
    LISTEN trade_executed;
END;
$$ LANGUAGE plpgsql;
