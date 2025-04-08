-- Drop the constraints first
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_wallet_type_matches_type;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_wallet_type_check;

-- Drop existing triggers and functions in correct order
DROP TRIGGER IF EXISTS investment_commission_distribution ON investments;
DROP TRIGGER IF EXISTS plan_subscription_commission_distribution ON plans_subscriptions;
DROP FUNCTION IF EXISTS distribute_commissions() CASCADE;
DROP FUNCTION IF EXISTS distribute_subscription_commissions() CASCADE;

-- Function to distribute commissions
CREATE OR REPLACE FUNCTION distribute_commissions() 
RETURNS TRIGGER AS $$
DECLARE
    current_referrer_id uuid;
    current_level int := 1;
    commission_rate decimal;
    commission_amount decimal;
    current_referrer_code text;
    direct_referral_count integer;
BEGIN
    -- Only process when status changes to 'Approved'
    IF (TG_OP = 'UPDATE' AND NEW.status = 'Approved' AND OLD.status != 'Approved') OR
       (TG_OP = 'INSERT' AND NEW.status = 'Approved') THEN
        
        -- Get the referral code of the investor's referrer
        SELECT p.referred_by INTO current_referrer_code
        FROM profiles p
        WHERE p.id = NEW.user_id;

        -- Get the referrer's ID from the referral code  
        SELECT p.id INTO current_referrer_id
        FROM profiles p
        WHERE p.referral_code = current_referrer_code;

        -- Loop through the referral chain
        WHILE current_referrer_id IS NOT NULL AND current_level <= (SELECT max(level) FROM commission_structures) LOOP
            -- Check if referrer has at least 2 direct referrals
            SELECT COUNT(*) INTO direct_referral_count
            FROM referral_relationships
            WHERE referrer_id = current_referrer_id
            AND level = 1;

            -- Only distribute commission if referrer has at least 2 direct referrals
            IF direct_referral_count >= 2 THEN
                -- Get commission rate for current level
                SELECT percentage INTO commission_rate
                FROM commission_structures 
                WHERE level = current_level;

                IF commission_rate IS NOT NULL THEN
                    -- Calculate commission amount
                    commission_amount := (NEW.amount * commission_rate) / 100;

                    -- Update referrer's withdrawal wallet balance
                    UPDATE profiles 
                    SET withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + commission_amount
                    WHERE id = current_referrer_id;

                    -- Create commission transaction record with all required fields
                    INSERT INTO transactions (
                        id,
                        user_id,
                        amount,
                        type,
                        status,
                        method,
                        wallet_type,
                        description,
                        reference_id,
                        created_at
                    ) VALUES (
                        gen_random_uuid(),
                        current_referrer_id,
                        commission_amount,
                        'commission',
                        'Completed',
                        'system',
                        'earnings',  -- Changed from commission_wallet to earnings
                        format('Level %s commission from investment of $%s', current_level, NEW.amount),
                        NEW.id,  -- Reference to the investment
                        NOW()
                    );
                END IF;
            END IF;

            -- Get next referrer's referral code
            SELECT p.referred_by INTO current_referrer_code
            FROM profiles p
            WHERE p.id = current_referrer_id;

            -- Get next referrer's ID from referral code
            SELECT p.id INTO current_referrer_id
            FROM profiles p
            WHERE p.referral_code = current_referrer_code;
            
            current_level := current_level + 1;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for investment updates
CREATE TRIGGER investment_commission_distribution
    AFTER INSERT OR UPDATE OF status ON investments
    FOR EACH ROW
    EXECUTE FUNCTION distribute_commissions();

-- Function to distribute commissions for plan subscriptions
CREATE OR REPLACE FUNCTION distribute_subscription_commissions() 
RETURNS TRIGGER AS $$
DECLARE
    current_referrer_id uuid;
    current_level int := 1;
    commission_rate decimal;
    commission_amount decimal;
    current_referrer_code text;
    direct_referral_count integer;
BEGIN
    -- Only process when status changes to 'approved'
    IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') OR
       (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
        
        -- Create initial investment transaction
        INSERT INTO transactions (
            id, user_id, amount, type, status, method, wallet_type, description, reference_id, created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.user_id,
            NEW.amount,
            'investment',
            'Completed',
            'system',
            'investment',
            format('Investment in plan subscription of $%s', NEW.amount),
            NEW.id,
            NOW()
        );

        -- Get the referral code of the subscriber's referrer
        SELECT referred_by INTO current_referrer_code
        FROM profiles
        WHERE id = NEW.user_id;

        -- Start distributing commissions through the referral chain
        WHILE current_referrer_code IS NOT NULL AND current_level <= 10 LOOP
            -- Get referrer's ID from the referral code
            SELECT id INTO current_referrer_id
            FROM profiles
            WHERE referral_code = current_referrer_code;

            EXIT WHEN current_referrer_id IS NULL;

            -- Check if referrer has at least 2 direct referrals
            SELECT COUNT(*) INTO direct_referral_count
            FROM referral_relationships
            WHERE referrer_id = current_referrer_id
            AND level = 1;

            -- Only distribute commission if referrer has at least 2 direct referrals
            IF direct_referral_count >= 2 THEN
                -- Get commission rate for current level
                SELECT percentage INTO commission_rate
                FROM commission_structures 
                WHERE level = current_level;

                IF commission_rate IS NOT NULL THEN
                    -- Calculate commission amount
                    commission_amount := (NEW.amount * commission_rate) / 100;

                    -- Create commission transaction
                    INSERT INTO transactions (
                        id, user_id, amount, type, status, method, wallet_type, description, reference_id, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        current_referrer_id,
                        commission_amount,
                        'commission',
                        'Completed',
                        'system',
                        'earnings',
                        format('Level %s commission from plan subscription of $%s', current_level, NEW.amount),
                        NEW.id,
                        NOW()
                    );

                    -- Update referrer's withdrawal wallet balance
                    UPDATE profiles 
                    SET withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + commission_amount
                    WHERE id = current_referrer_id;
                END IF;
            END IF;

            -- Get next referrer in chain
            SELECT referred_by INTO current_referrer_code
            FROM profiles
            WHERE referral_code = current_referrer_code;

            current_level := current_level + 1;
        END LOOP;

        -- Update profiles total_invested amount
        UPDATE profiles 
        SET total_invested = COALESCE(total_invested, 0) + NEW.amount
        WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for plan subscription updates
CREATE TRIGGER plan_subscription_commission_distribution
    AFTER INSERT OR UPDATE ON plans_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION distribute_subscription_commissions();
