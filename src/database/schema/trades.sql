-- Drop existing objects first
DROP TRIGGER IF EXISTS check_margin_before_trade ON trades;
DROP FUNCTION IF EXISTS check_margin_utilization() CASCADE;

-- Add user_id foreign key reference
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;
ALTER TABLE trades 
  ADD CONSTRAINT trades_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Add margin amount column
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS margin_amount DECIMAL DEFAULT 0;

-- Add proper indices
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);

-- Add margin utilization tracking trigger
CREATE OR REPLACE FUNCTION check_margin_utilization()
RETURNS TRIGGER AS $$
DECLARE
  v_total_margin DECIMAL;
  v_user_balance DECIMAL;
BEGIN
  -- Get user's current margin utilization excluding current trade
  SELECT COALESCE(SUM(t.margin_amount), 0)
  INTO v_total_margin
  FROM trades t
  WHERE t.user_id = NEW.user_id 
  AND t.status IN ('open', 'pending')
  AND t.id != NEW.id;

  -- Get user's withdrawal balance with proper join
  SELECT p.withdrawal_wallet
  INTO v_user_balance
  FROM profiles p
  WHERE p.id = NEW.user_id;

  -- Only add margin for new positions
  IF NEW.status = 'open' OR NEW.status = 'pending' THEN
    v_total_margin := v_total_margin + NEW.margin_amount;
  END IF;

  -- Check if total margin would exceed balance
  IF v_total_margin > v_user_balance THEN
    RAISE EXCEPTION 'Total margin ($%.2f) would exceed available balance ($%.2f)', 
      v_total_margin, 
      v_user_balance;
  END IF;

  -- If validation passes, allow trade
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER check_margin_before_trade
  BEFORE INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION check_margin_utilization();

-- Add index on margin_amount for faster calculations
CREATE INDEX IF NOT EXISTS idx_trades_margin
ON trades(user_id, status, margin_amount)
WHERE status IN ('open', 'pending');
