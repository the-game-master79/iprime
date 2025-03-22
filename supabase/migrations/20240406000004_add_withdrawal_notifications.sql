-- Create trigger function for withdrawal notifications
CREATE OR REPLACE FUNCTION create_withdrawal_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO notices (
      title,
      content,
      type,
      category,
      user_id,
      reference_id,
      is_active
    ) VALUES (
      CASE 
        WHEN NEW.status = 'Completed' THEN 'Withdrawal Approved'
        WHEN NEW.status = 'Failed' THEN 'Withdrawal Rejected'
        ELSE 'Withdrawal Status Update'
      END,
      CASE 
        WHEN NEW.status = 'Completed' THEN 'Your withdrawal of $' || NEW.amount || ' has been approved and processed'
        WHEN NEW.status = 'Failed' THEN 'Your withdrawal of $' || NEW.amount || ' was rejected'
        ELSE 'Your withdrawal status has been updated to ' || NEW.status
      END,
      CASE 
        WHEN NEW.status = 'Completed' THEN 'success'
        WHEN NEW.status = 'Failed' THEN 'error'
        ELSE 'info'
      END,
      'system',
      NEW.user_id,
      NEW.id,
      true
    );
  -- When new withdrawal is created
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO notices (
      title,
      content,
      type,
      category,
      user_id,
      reference_id,
      is_active
    ) VALUES (
      'Withdrawal Request Placed',
      'Your withdrawal request for $' || NEW.amount || ' has been submitted',
      'info',
      'system',
      NEW.user_id,
      NEW.id,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_withdrawal_change ON withdrawals;

-- Create trigger for withdrawal status changes
CREATE TRIGGER on_withdrawal_change
  AFTER INSERT OR UPDATE OF status ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION create_withdrawal_notification();
