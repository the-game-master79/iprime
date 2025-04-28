-- Drop triggers first
DROP TRIGGER IF EXISTS track_crypto_trades ON crypto_prices;
DROP TRIGGER IF EXISTS track_forex_trades ON forex_prices;

-- Drop the function
DROP FUNCTION IF EXISTS update_trade_current_price();

-- Remove current_price column
ALTER TABLE trades
DROP COLUMN IF EXISTS current_price;

-- Revoke permissions
REVOKE ALL ON trades FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON trades TO PUBLIC;
