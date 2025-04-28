-- Drop all dependent triggers first
DROP TRIGGER IF EXISTS crypto_limit_orders_trigger ON crypto_prices;
DROP TRIGGER IF EXISTS forex_limit_orders_trigger ON forex_prices;
DROP TRIGGER IF EXISTS prices_limit_orders_trigger ON prices;

-- Then drop the function
DROP FUNCTION IF EXISTS process_limit_orders();
