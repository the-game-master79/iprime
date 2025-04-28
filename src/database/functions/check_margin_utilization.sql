CREATE OR REPLACE FUNCTION check_margin_utilization()
RETURNS TRIGGER AS $$
DECLARE
  v_total_margin DECIMAL;
  v_user_balance DECIMAL;
  v_total_pnl DECIMAL;
  v_liquidation_price DECIMAL;
  v_total_lots DECIMAL;
  v_price_move DECIMAL;
  v_standard_lot_size DECIMAL;
BEGIN
  -- Get total margin utilization for user
  SELECT COALESCE(SUM(margin_amount), 0)
  INTO v_total_margin
  FROM trades
  WHERE user_id = NEW.user_id 
  AND status IN ('open', 'pending')
  AND id != NEW.id;

  -- Add new trade's margin if applicable
  IF NEW.status IN ('open', 'pending') THEN
    v_total_margin := v_total_margin + NEW.margin_amount;
  END IF;

  -- Get user's current balance
  SELECT withdrawal_wallet
  INTO v_user_balance
  FROM profiles
  WHERE id = NEW.user_id;

  -- Check if total margin would exceed balance
  IF v_total_margin > v_user_balance THEN
    RAISE EXCEPTION 'Margin requirement (%.2f) exceeds available balance (%.2f)', 
      v_total_margin, v_user_balance;
  END IF;

  -- Calculate liquidation price if trade is opening
  IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
    -- Set standard lot size based on pair type
    v_standard_lot_size := CASE 
      WHEN NEW.pair LIKE 'BINANCE:%' THEN 1
      WHEN NEW.pair = 'FX:XAU/USD' THEN 100
      ELSE 100000
    END;
    
    -- Calculate price move needed to lose full wallet balance
    -- Price move = (Balance / (Lots * Standard lot size))
    v_price_move := v_user_balance / (NEW.lots * v_standard_lot_size);

    -- Set liquidation price at opposite side of trade
    NEW.liquidation_price := CASE
      WHEN NEW.type = 'buy' THEN
        -- For buy positions: Set lower liquidation price
        NEW.open_price - v_price_move
      ELSE
        -- For sell positions: Set higher liquidation price
        NEW.open_price + v_price_move
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
