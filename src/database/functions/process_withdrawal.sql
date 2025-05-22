CREATE OR REPLACE FUNCTION process_withdrawal(
  user_id UUID,
  amount DECIMAL,
  withdrawal_id UUID DEFAULT NULL,
  p_crypto_name TEXT DEFAULT NULL,
  p_crypto_symbol TEXT DEFAULT NULL,
  p_network TEXT DEFAULT NULL,
  p_wallet_address TEXT DEFAULT NULL,
  withdrawal_status TEXT DEFAULT 'Pending'
) RETURNS UUID AS $$
DECLARE
  withdrawal_record RECORD;
  v_withdrawal_id UUID;
BEGIN
  IF withdrawal_status = 'Pending' THEN
    -- Create new withdrawal request
    INSERT INTO withdrawals (
      id, user_id, amount, crypto_name, crypto_symbol, 
      network, wallet_address, status
    ) VALUES (
      COALESCE(withdrawal_id, gen_random_uuid()),
      user_id, amount, p_crypto_name, p_crypto_symbol,
      p_network, p_wallet_address, withdrawal_status
    ) RETURNING id INTO v_withdrawal_id;

    -- Ensure a transaction record for this withdrawal (avoid duplicates)
    IF NOT EXISTS (
      SELECT 1 FROM transactions WHERE reference_id = v_withdrawal_id AND type = 'withdrawal'
    ) THEN
      INSERT INTO transactions (
        id, user_id, amount, type, status, method,
        wallet_type, description, reference_id, created_at
      ) VALUES (
        gen_random_uuid(),
        user_id,
        amount,
        'withdrawal',
        'Pending',
        COALESCE(p_crypto_symbol, 'Unknown'),
        'withdrawal',
        format('Withdrawal request submitted - %s %s', 
          amount,
          COALESCE(p_crypto_symbol, 'USD')),
        v_withdrawal_id,
        NOW()
      );
    END IF;

  ELSE
    -- Get existing withdrawal details
    SELECT * INTO withdrawal_record
    FROM withdrawals
    WHERE id = withdrawal_id;

    IF withdrawal_record IS NULL THEN
      RAISE EXCEPTION 'Withdrawal not found';
    END IF;

    -- For completion, check and update balance
    IF withdrawal_status = 'Completed' THEN
      UPDATE profiles 
      SET withdrawal_wallet = withdrawal_wallet - amount,
          updated_at = NOW()
      WHERE id = user_id AND withdrawal_wallet >= amount;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance';
      END IF;
    END IF;

    -- Update withdrawal status
    UPDATE withdrawals 
    SET status = withdrawal_status,
        updated_at = NOW()
    WHERE id = withdrawal_id;
    
    v_withdrawal_id := withdrawal_id;

    -- Ensure a transaction exists for this withdrawal (if not, insert it)
    IF NOT EXISTS (
      SELECT 1 FROM transactions WHERE reference_id = v_withdrawal_id AND type = 'withdrawal'
    ) THEN
      INSERT INTO transactions (
        id, user_id, amount, type, status, method,
        wallet_type, description, reference_id, created_at
      ) VALUES (
        gen_random_uuid(),
        user_id,
        amount,
        'withdrawal',
        withdrawal_status,
        COALESCE(p_crypto_symbol, withdrawal_record.crypto_symbol, 'Unknown'),
        'withdrawal',
        format('Withdrawal request - %s %s', 
          amount,
          COALESCE(NULLIF(p_crypto_symbol, ''), withdrawal_record.crypto_symbol, 'USD')),
        v_withdrawal_id,
        NOW()
      );
    END IF;

    -- Update transaction status if withdrawal status changes
    IF withdrawal_status != 'Pending' THEN
      UPDATE transactions
      SET status = withdrawal_status,
          description = format('Withdrawal %s - %s %s', 
            CASE withdrawal_status 
              WHEN 'Completed' THEN 'completed'
              WHEN 'Failed' THEN 'rejected'
              ELSE 'status updated'
            END,
            amount,
            COALESCE(NULLIF(p_crypto_symbol, ''), withdrawal_record.crypto_symbol, 'USD')),
          updated_at = NOW()
      WHERE reference_id = v_withdrawal_id AND type = 'withdrawal';
    END IF;
  END IF;

  RETURN COALESCE(v_withdrawal_id, withdrawal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
