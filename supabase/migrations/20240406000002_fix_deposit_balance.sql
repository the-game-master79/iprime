-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_deposit_status_change ON deposits;

-- Create/Replace the deposit status change function
CREATE OR REPLACE FUNCTION handle_deposit_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- If deposit is completed, add to user balance
  IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    -- Update user balance first
    UPDATE profiles 
    SET balance = COALESCE(balance, 0) + NEW.amount
    WHERE id = NEW.user_id;
    
    -- Create notification
    INSERT INTO notices (
      title,
      content,
      type,
      category,
      user_id,
      is_active
    ) VALUES (
      'Deposit Approved',
      'Your deposit of $' || NEW.amount || ' has been approved',
      'success',
      'system',
      NEW.user_id,
      true
    );
  -- If changing from completed to failed, remove from balance
  ELSIF OLD.status = 'Completed' AND NEW.status = 'Failed' THEN
    -- Revert the balance
    UPDATE profiles 
    SET balance = COALESCE(balance, 0) - NEW.amount
    WHERE id = NEW.user_id;
    
    -- Create notification
    INSERT INTO notices (
      title,
      content,
      type,
      category,
      user_id,
      is_active
    ) VALUES (
      'Deposit Failed',
      'Your deposit of $' || NEW.amount || ' has been rejected',
      'error',
      'system',
      NEW.user_id,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER on_deposit_status_change
  BEFORE UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION handle_deposit_status_change();
