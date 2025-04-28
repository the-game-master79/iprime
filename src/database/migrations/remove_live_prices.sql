-- Drop triggers first
DROP TRIGGER IF EXISTS update_crypto_trade_prices ON crypto_prices;
DROP TRIGGER IF EXISTS update_forex_trade_prices ON forex_prices;

-- Drop the function
DROP FUNCTION IF EXISTS update_trade_live_prices();

-- Remove columns from trades table
ALTER TABLE trades
    DROP COLUMN IF EXISTS live_bid,
    DROP COLUMN IF EXISTS live_ask;
