CREATE OR REPLACE FUNCTION execute_limit_order(
  p_trade_id UUID,
  p_execution_price DECIMAL
)
RETURNS RECORD AS $$
DECLARE
  v_trade RECORD;
  v_result RECORD;
  v_margin_required DECIMAL;
  v_user_balance DECIMAL;
BEGIN
  -- Get the trade details and lock the row
  SELECT t.*, p.withdrawal_wallet, p.id as profile_id
  INTO v_trade
  FROM trades t
  JOIN profiles p ON p.user_id = t.user_id
  WHERE t.id = p_trade_id AND t.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found or not in pending status';
  END IF;

  -- Calculate required margin
  v_margin_required := CASE 
    WHEN v_trade.pair LIKE 'BINANCE:%' THEN
      -- Crypto margin calculation
      (p_execution_price * v_trade.lots) / v_trade.leverage
    ELSE
      -- Forex margin calculation (standard lot size 100,000)
      (p_execution_price * v_trade.lots * 100000) / v_trade.leverage
  END;

  -- Check if user has enough balance
  IF v_trade.withdrawal_wallet < v_margin_required THEN
    RAISE EXCEPTION 'Insufficient balance for margin requirement';
  END IF;

  -- Update trade status and price
  UPDATE trades
  SET 
    status = 'open',
    open_price = p_execution_price,
    executed_at = NOW()
  WHERE id = p_trade_id;

  -- Deduct margin from user's balance
  UPDATE profiles
  SET withdrawal_wallet = withdrawal_wallet - v_margin_required
  WHERE id = v_trade.profile_id
  RETURNING withdrawal_wallet INTO v_user_balance;

  -- Return the updated trade and balance
  SELECT 
    t.*,
    p.withdrawal_wallet,
    v_margin_required as margin_required
  INTO v_result
  FROM trades t
  JOIN profiles p ON p.user_id = t.user_id
  WHERE t.id = p_trade_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback will happen automatically
    RAISE;
END;
$$ LANGUAGE plpgsql;
