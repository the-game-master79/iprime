CREATE OR REPLACE FUNCTION process_withdrawal(
  withdrawal_id UUID,
  user_id UUID,
  amount DECIMAL
) RETURNS void AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Update user's withdrawal wallet balance
    UPDATE profiles 
    SET 
      withdrawal_wallet = withdrawal_wallet - amount,
      updated_at = NOW()
    WHERE id = user_id AND withdrawal_wallet >= amount;
    
    -- If the update affected no rows, the user has insufficient balance
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update withdrawal status
    UPDATE withdrawals 
    SET 
      status = 'Completed',
      updated_at = NOW()
    WHERE id = withdrawal_id;

    -- Commit transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on any error
      ROLLBACK;
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;
