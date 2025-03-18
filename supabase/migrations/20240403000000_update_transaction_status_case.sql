-- First drop the existing constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Update existing transaction statuses to capitalized values
UPDATE transactions 
SET status = 
  CASE LOWER(status)
    WHEN 'pending' THEN 'Pending'
    WHEN 'completed' THEN 'Completed'
    WHEN 'failed' THEN 'Failed'
    WHEN 'processing' THEN 'Processing'
    ELSE status
  END;

-- Add constraint with capitalized status values
ALTER TABLE transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('Pending', 'Completed', 'Failed', 'Processing'));

-- Update existing function to use capitalized status
CREATE OR REPLACE FUNCTION handle_investment_and_commission()
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
    -- Update user's balance
    UPDATE profiles 
    SET balance = balance - NEW.amount,
        total_invested = total_invested + NEW.amount
    WHERE id = NEW.user_id;

    -- Create investment transaction with capitalized status
    INSERT INTO transactions (
        user_id,
        amount,
        type,
        status,
        reference_id,
        description
    ) VALUES (
        NEW.user_id,
        NEW.amount,
        'investment',
        'Completed',
        NEW.id,
        'Investment in plan'
    );

    -- Get first level referrer
    SELECT referrer_id INTO current_referrer_id
    FROM referral_relationships
    WHERE referred_id = NEW.user_id
    AND level = 1;

    -- Process commission for each level
    WHILE current_referrer_id IS NOT NULL AND current_level <= 10 LOOP
        SELECT percentage INTO commission_rate
        FROM commission_structures
        WHERE level = current_level;

        IF commission_rate IS NOT NULL THEN
            commission_amount := (NEW.amount * commission_rate) / 100;

            -- Update referrer's balance
            UPDATE profiles 
            SET balance = balance + commission_amount,
                commissions_balance = COALESCE(commissions_balance, 0) + commission_amount
            WHERE id = current_referrer_id;

            -- Create commission transaction with capitalized status
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
                'Completed',
                NEW.id,
                format('Level %s commission from investment of $%s', current_level, NEW.amount)
            );

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
