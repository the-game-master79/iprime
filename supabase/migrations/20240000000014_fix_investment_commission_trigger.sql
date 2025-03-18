-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_investment_insert ON investments;
DROP FUNCTION IF EXISTS process_investment_commission();

-- Recreate function with corrected status values
CREATE OR REPLACE FUNCTION handle_investment_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_referrer_id uuid;
  current_level int := 1;
  commission_rate decimal;
  commission_amount decimal;
BEGIN
  -- Get first level referrer
  SELECT referrer_id INTO current_referrer_id
  FROM referral_relationships
  WHERE referred_id = NEW.user_id
  AND level = 1;

  -- Process commission for each level while we have a referrer
  WHILE current_referrer_id IS NOT NULL AND current_level <= 10 LOOP
    -- Get commission rate for this level
    SELECT percentage INTO commission_rate
    FROM commission_structures
    WHERE level = current_level;

    -- Calculate and distribute commission if rate exists
    IF commission_rate IS NOT NULL THEN
      commission_amount := (NEW.amount * commission_rate) / 100;

      -- Update referrer's balances
      UPDATE profiles 
      SET balance = balance + commission_amount,
          commissions_balance = COALESCE(commissions_balance, 0) + commission_amount
      WHERE id = current_referrer_id;

      -- Create commission transaction with lowercase status
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
        'completed',
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
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_investment_insert
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION handle_investment_commission();

-- Fix any existing commission transaction statuses
UPDATE transactions
SET status = LOWER(status)
WHERE type = 'commission' AND status != LOWER(status);
