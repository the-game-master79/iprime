ALTER TABLE trades
ADD COLUMN IF NOT EXISTS liquidation_price DECIMAL NULL;

-- Add index for faster liquidation checks
CREATE INDEX IF NOT EXISTS idx_trades_liquidation
ON trades(pair, status, liquidation_price)
WHERE status = 'open';

-- Drop and recreate existing triggers to use new margin check
DROP TRIGGER IF EXISTS check_margin_before_trade ON trades;
CREATE TRIGGER check_margin_before_trade
  BEFORE INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION check_margin_utilization();
