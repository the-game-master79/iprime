-- Add user_id column to notices table
ALTER TABLE public.notices
ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notices_user_id ON notices(user_id);

-- Update the deposit notification trigger function
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
      user_id,
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
