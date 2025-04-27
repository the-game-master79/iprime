CREATE OR REPLACE FUNCTION validate_deposit()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than 0';
  END IF;

  -- Validate minimum deposit
  IF NEW.amount < 10 THEN
    RAISE EXCEPTION 'Minimum deposit amount is $10';
  END IF;

  -- Validate maximum deposit
  IF NEW.amount > 10000000 THEN
    RAISE EXCEPTION 'Maximum deposit amount is $10,000,000';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deposits table
DROP TRIGGER IF EXISTS validate_deposit_trigger ON deposits;
CREATE TRIGGER validate_deposit_trigger
  BEFORE INSERT OR UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION validate_deposit();
