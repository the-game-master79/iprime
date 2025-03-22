-- Create trigger function for deposit notifications
CREATE OR REPLACE FUNCTION create_deposit_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- When deposit status changes
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO notices (
      title,
      content,
      type,
      category,
      created_by,
      is_active
    ) VALUES (
      CASE 
        WHEN NEW.status = 'Completed' THEN 'Deposit Approved'
        WHEN NEW.status = 'Failed' THEN 'Deposit Rejected'
        ELSE 'Deposit Status Update'
      END,
      CASE 
        WHEN NEW.status = 'Completed' THEN 'Your deposit of $' || NEW.amount || ' has been approved'
        WHEN NEW.status = 'Failed' THEN 'Your deposit of $' || NEW.amount || ' was rejected'
        ELSE 'Your deposit status has been updated to ' || NEW.status
      END,
      CASE 
        WHEN NEW.status = 'Completed' THEN 'success'
        WHEN NEW.status = 'Failed' THEN 'error'
        ELSE 'info'
      END,
      'system',
      NEW.user_id,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deposits
DROP TRIGGER IF EXISTS on_deposit_status_change ON deposits;
CREATE TRIGGER on_deposit_status_change
  AFTER UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION create_deposit_notification();
