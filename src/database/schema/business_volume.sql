-- Create business volume table
CREATE TABLE IF NOT EXISTS business_volumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    source_user_id UUID REFERENCES profiles(id),
    amount DECIMAL NOT NULL,
    subscription_id UUID REFERENCES plans_subscriptions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create function to get total business volume
CREATE OR REPLACE FUNCTION get_total_business_volume(p_user_id UUID)
RETURNS DECIMAL AS $$
BEGIN
    RETURN COALESCE((
        SELECT SUM(amount)
        FROM business_volumes
        WHERE user_id = p_user_id
    ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has minimum direct referrals
CREATE OR REPLACE FUNCTION has_minimum_direct_referrals(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_user_id 
        AND direct_count >= 2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update profiles.business_volume
CREATE OR REPLACE FUNCTION update_profile_business_volume()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update business_volume if user has minimum referrals based on direct_count
    UPDATE profiles 
    SET business_volume = CASE 
        WHEN direct_count >= 2 THEN get_total_business_volume(NEW.user_id)
        ELSE 0
    END
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS after_business_volume_change ON business_volumes;

-- Attach trigger to business_volumes table
CREATE TRIGGER after_business_volume_change
    AFTER INSERT OR DELETE OR UPDATE OF amount
    ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_business_volume();

-- Function to distribute business volume to upline
CREATE OR REPLACE FUNCTION distribute_business_volume(
    p_subscription_id UUID,
    p_investor_id UUID,
    p_amount DECIMAL
) RETURNS void AS $$
DECLARE
    current_user_id UUID;
    current_referrer_code TEXT;
BEGIN
    -- Get initial referrer code
    SELECT referred_by INTO current_referrer_code
    FROM profiles
    WHERE id = p_investor_id;

    -- Distribute business volume up the chain
    WHILE current_referrer_code IS NOT NULL LOOP
        -- Get referrer's ID
        SELECT id INTO current_user_id
        FROM profiles
        WHERE referral_code = current_referrer_code;

        IF current_user_id IS NOT NULL THEN
            -- Add business volume for tracking
            INSERT INTO business_volumes (
                user_id,
                source_user_id,
                amount,
                subscription_id
            ) VALUES (
                current_user_id,
                p_investor_id,
                p_amount,
                p_subscription_id
            );

            -- Update profile's business_volume only if they have minimum referrals
            UPDATE profiles p
            SET business_volume = CASE 
                WHEN p.direct_count >= 2 THEN get_total_business_volume(p.id)
                ELSE 0
            END
            WHERE p.id = current_user_id;

            -- Move up the chain
            SELECT referred_by INTO current_referrer_code
            FROM profiles 
            WHERE id = current_user_id;
        ELSE
            current_referrer_code = NULL;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
