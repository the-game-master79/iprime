-- Drop all existing investment-related triggers and functions
DROP TRIGGER IF EXISTS on_investment_insert ON investments;
DROP TRIGGER IF EXISTS on_investment_created ON investments;
DROP FUNCTION IF EXISTS handle_investment() CASCADE;
DROP FUNCTION IF EXISTS handle_investment_commission() CASCADE;
DROP FUNCTION IF EXISTS process_investment_commission() CASCADE;

-- Create new unified investment handler function
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
    -- First handle the investment transaction
    -- Update user's balance and total_invested
    UPDATE profiles 
    SET balance = balance - NEW.amount,
        total_invested = total_invested + NEW.amount
    WHERE id = NEW.user_id;

    -- Create investment transaction record
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

    -- Then handle commission distribution
    -- Get first level referrer
    SELECT referrer_id INTO current_referrer_id
    FROM referral_relationships
    WHERE referred_id = NEW.user_id
    AND level = 1;

    -- Process commission for each level while we have a referrer
    WHILE current_referrer_id IS NOT NULL AND current_level <= 10 LOOP
        -- Get commission rate for this level
        SELECT percentage INTO commission_rate
        FROM commission_structures
        WHERE level = current_level;

        -- Calculate and distribute commission if rate exists
        IF commission_rate IS NOT NULL THEN
            commission_amount := (NEW.amount * commission_rate) / 100;

            -- Update referrer's balances
            UPDATE profiles 
            SET balance = balance + commission_amount,
                commissions_balance = COALESCE(commissions_balance, 0) + commission_amount
            WHERE id = current_referrer_id;

            -- Create commission transaction
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

            -- Get next level referrer
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

-- Create single trigger for investments
CREATE TRIGGER handle_investment_trigger
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION handle_investment_and_commission();

-- Update any existing transactions to ensure consistent status casing
UPDATE transactions
SET status = LOWER(status)
WHERE status != LOWER(status)
AND type IN ('investment', 'commission');
