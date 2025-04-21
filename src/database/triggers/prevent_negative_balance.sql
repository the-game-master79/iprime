-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION prevent_negative_withdrawal_balance() 
RETURNS TRIGGER AS $$
BEGIN
    -- If withdrawal wallet would go negative, set it to 0
    IF NEW.withdrawal_wallet < 0 THEN
        NEW.withdrawal_wallet := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS check_withdrawal_balance ON profiles;

-- Create the trigger
CREATE TRIGGER check_withdrawal_balance
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_withdrawal_balance();
