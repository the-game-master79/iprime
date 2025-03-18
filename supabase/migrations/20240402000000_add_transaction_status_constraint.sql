-- First drop the existing constraint if it exists
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Update existing transaction statuses to lowercase
UPDATE transactions 
SET status = LOWER(status)
WHERE status != LOWER(status);

-- Add constraint to enforce lowercase status values
ALTER TABLE transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'processing'));

-- Update all existing triggers to use lowercase status values
DROP TRIGGER IF EXISTS handle_investment_trigger ON investments;
DROP FUNCTION IF EXISTS handle_investment_and_commission();

-- Recreate the unified investment handler with lowercase status
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

    -- Create investment transaction with lowercase status
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
        'completed',
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

            -- Create commission transaction with lowercase status
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
                'completed',
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

-- Recreate the trigger
CREATE TRIGGER handle_investment_trigger
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION handle_investment_and_commission();
