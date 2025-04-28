CREATE OR REPLACE FUNCTION check_liquidation(
  p_trade_id UUID,
  p_current_price DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
  v_total_pnl DECIMAL;
  v_user_balance DECIMAL;
  v_standard_lot_size DECIMAL;
BEGIN
  -- Get trade details and user balance
  SELECT t.*, p.withdrawal_wallet
  INTO v_trade
  FROM trades t
  JOIN profiles p ON p.id = t.user_id
  WHERE t.id = p_trade_id
  AND t.status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if price has crossed liquidation price for this trade
  IF (v_trade.type = 'buy' AND p_current_price <= v_trade.liquidation_price) OR
     (v_trade.type = 'sell' AND p_current_price >= v_trade.liquidation_price) THEN
    
    -- Close just this trade at liquidation price
    UPDATE trades
    SET 
      status = 'closed',
      close_price = v_trade.liquidation_price,
      pnl = CASE
        WHEN type = 'buy' THEN
          (v_trade.liquidation_price - open_price) * lots * 
          CASE 
            WHEN pair LIKE 'BINANCE:%' THEN 1
            WHEN pair = 'FX:XAU/USD' THEN 100
            ELSE 100000
          END
        ELSE
          (open_price - v_trade.liquidation_price) * lots *
          CASE 
            WHEN pair LIKE 'BINANCE:%' THEN 1
            WHEN pair = 'FX:XAU/USD' THEN 100
            ELSE 100000
          END
        END,
      closed_at = NOW()
    WHERE id = p_trade_id;

    -- Update user's balance with this trade's PnL
    UPDATE profiles
    SET withdrawal_wallet = withdrawal_wallet + (
      SELECT pnl FROM trades WHERE id = p_trade_id
    )
    WHERE id = v_trade.user_id;

    RETURN TRUE;
  END IF;

  -- Calculate total PnL across all open trades for this user
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'buy' THEN
        (p_current_price - open_price) * lots
      ELSE
        (open_price - p_current_price) * lots
    END
  ), 0)
  INTO v_total_pnl
  FROM trades
  WHERE user_id = v_trade.user_id
  AND status = 'open';

  -- Check if total losses would exceed wallet balance
  IF (v_trade.withdrawal_wallet + v_total_pnl <= 0) THEN
    -- Close all open trades at current price
    UPDATE trades t
    SET 
      status = 'closed',
      close_price = p_current_price,
      pnl = CASE
        WHEN type = 'buy' THEN
          (p_current_price - open_price) * lots
        ELSE
          (open_price - p_current_price) * lots
        END,
      closed_at = NOW()
    WHERE user_id = v_trade.user_id
    AND status = 'open';

    -- Update user's balance with total PnL
    UPDATE profiles
    SET withdrawal_wallet = withdrawal_wallet + v_total_pnl
    WHERE id = v_trade.user_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
