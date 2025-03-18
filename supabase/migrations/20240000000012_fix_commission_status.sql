-- Update commission transaction status handling to use lowercase
CREATE OR REPLACE FUNCTION process_investment_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_referrer_id uuid;
  current_level int := 1;
  commission_rate numeric;
  commission_amount numeric;
  max_level int := 10;
BEGIN
  -- Get initial referrer
  SELECT referrer_id INTO current_referrer_id
  FROM referral_relationships
  WHERE referred_id = NEW.user_id
  AND level = 1;

  -- Process commission for each level up to max_level
  WHILE current_referrer_id IS NOT NULL AND current_level <= max_level LOOP
    -- Get commission rate for current level
    SELECT percentage INTO commission_rate
    FROM commission_structures
    WHERE level = current_level;

    IF commission_rate IS NOT NULL THEN
      -- Calculate commission
      commission_amount := (NEW.amount * commission_rate) / 100;

      -- Update referrer's balances
      UPDATE profiles 
      SET balance = balance + commission_amount,
          commissions_balance = COALESCE(commissions_balance, 0) + commission_amount
      WHERE id = current_referrer_id;

      -- Create commission transaction with correct status
      INSERT INTO transactions (
        user_id,
        amount,
        type,
        status,
        reference_id,
        description
      ) VALUES (
        current_referrer_id,
        commission_amount,
        'commission',
        'completed',  -- Using lowercase status
        NEW.id,
        format('Level %s commission from investment of $%s', current_level, NEW.amount)
      );

      -- Get next level referrer
      SELECT referrer_id INTO current_referrer_id
      FROM referral_relationships
      WHERE referred_id = current_referrer_id
      AND level = 1;

      current_level := current_level + 1;
    ELSE
      EXIT; -- No commission rate found for this level
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update existing commission transactions to use correct status
UPDATE transactions
SET status = 'completed'
WHERE type = 'commission'
AND status != 'completed';
