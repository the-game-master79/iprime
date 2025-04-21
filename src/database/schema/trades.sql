-- Remove redundant columns if they exist
ALTER TABLE trades 
DROP COLUMN IF EXISTS execution_price,
DROP COLUMN IF EXISTS bid_price,
DROP COLUMN IF EXISTS ask_price;

-- Drop old index
DROP INDEX IF EXISTS idx_trades_limit_prices;

-- Keep single focused index for limit orders
CREATE INDEX IF NOT EXISTS idx_limit_orders
ON trades(status, order_type, limit_price) 
WHERE status = 'pending' AND order_type = 'limit';
