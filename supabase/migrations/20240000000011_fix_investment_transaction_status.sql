-- Update the handle_investment function to use correct transaction status
CREATE OR REPLACE FUNCTION handle_investment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user's balance and total_invested 
  UPDATE profiles 
  SET balance = balance - NEW.amount,
      total_invested = total_invested + NEW.amount
  WHERE id = NEW.user_id;
  
  -- Create transaction record with correct lowercase status
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    status,  -- This was using 'Completed' before
    reference_id,
    description
  ) VALUES (
    NEW.user_id,
    NEW.amount,
    'investment',
    'completed',  -- Changed from 'Completed' to 'completed'
    NEW.id,
    'Investment in plan'
  );
  
  RETURN NEW;
END;
$$;

-- Update any existing investment transactions to match new format
UPDATE transactions
SET status = 'completed'
WHERE type = 'investment'
AND status != 'completed';
