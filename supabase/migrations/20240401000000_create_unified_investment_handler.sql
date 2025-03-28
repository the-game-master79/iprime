-- Drop all existing investment-related triggers and functions
DROP TRIGGER IF EXISTS on_investment_insert ON investments;
DROP TRIGGER IF EXISTS on_investment_created ON investments;
DROP FUNCTION IF EXISTS handle_investment() CASCADE;
DROP FUNCTION IF EXISTS handle_investment_commission() CASCADE;
DROP FUNCTION IF EXISTS process_investment_commission() CASCADE;

-- Create new unified investment handler function
CREATE OR REPLACE FUNCTION handle_new_investment()
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
    -- Only create a single investment transaction per investment
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

            -- Update referrer's balances and business volume in a single update
            UPDATE profiles 
            SET commissions_balance = COALESCE(commissions_balance, 0) + commission_amount,
                business_volume = COALESCE(business_volume, 0) + NEW.amount
            WHERE id = current_referrer_id;

            -- Create commission transaction (only create it here, not in other triggers)
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

-- Create trigger for new investments
DROP TRIGGER IF EXISTS on_new_investment ON investments;
CREATE TRIGGER on_new_investment
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_investment();

-- Update any existing transactions to ensure consistent status casing
UPDATE transactions
SET status = 'Completed'  -- Changed from LOWER(status) to 'Completed'
WHERE status != 'Completed'
AND type IN ('investment', 'commission');
