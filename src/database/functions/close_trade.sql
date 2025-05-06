-- Drop existing functions first
DROP FUNCTION IF EXISTS close_trade(UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS auto_close_trades_on_zero_balance() CASCADE;

CREATE OR REPLACE FUNCTION close_trade(
  p_trade_id UUID,  
  p_close_price DECIMAL,
  p_pnl DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  v_trade RECORD;
  v_withdrawal_wallet DECIMAL;
  v_adjusted_pnl DECIMAL;
BEGIN
  -- Get trade details and lock the row
  SELECT t.*, p.withdrawal_wallet, p.id as profile_id 
  INTO v_trade
  FROM trades t
  JOIN profiles p ON p.id = t.user_id
  WHERE t.id = p_trade_id
  AND t.status IN ('open', 'pending')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found or already closed';
  END IF;

  -- Calculate adjusted PnL (no scaling needed now since calculatePnL handles it)
  v_adjusted_pnl := p_pnl;

  -- Update trade status with original PnL for display
  UPDATE trades
  SET 
    status = 'closed',
    close_price = p_close_price,
    pnl = p_pnl,
    closed_at = NOW()
  WHERE id = p_trade_id;

  -- Release margin and update user's balance with ONLY the adjusted PnL
  UPDATE profiles p
  SET 
    withdrawal_wallet = p.withdrawal_wallet + v_adjusted_pnl, -- Remove margin_amount
    updated_at = NOW()
  WHERE id = v_trade.user_id
  RETURNING withdrawal_wallet INTO v_withdrawal_wallet;

  RETURN v_withdrawal_wallet;
END;
$$ LANGUAGE plpgsql;

-- Create or replace notification function
CREATE OR REPLACE FUNCTION notify_trade_close()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'trade_closed',
    json_build_object(
      'trade_id', NEW.id,
      'close_price', NEW.close_price,
      'pnl', NEW.pnl
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notifications
DROP TRIGGER IF EXISTS trade_close_notification ON trades;
CREATE TRIGGER trade_close_notification
  AFTER UPDATE OF status ON trades
  FOR EACH ROW
  WHEN (NEW.status = 'closed')
  EXECUTE FUNCTION notify_trade_close();
