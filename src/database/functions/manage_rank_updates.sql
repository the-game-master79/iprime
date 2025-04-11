-- Function to calculate and update user rank
CREATE OR REPLACE FUNCTION update_user_rank(user_id UUID)
RETURNS void AS $$
DECLARE
    total_volume DECIMAL;
    direct_refs INTEGER;
    new_rank TEXT;
BEGIN
    -- Get user's direct referral count
    SELECT direct_count INTO direct_refs
    FROM profiles
    WHERE id = user_id;

    -- Only proceed if user has minimum referrals
    IF direct_refs >= 2 THEN
        -- Calculate total business volume
        SELECT COALESCE(SUM(amount), 0) INTO total_volume
        FROM business_volumes
        WHERE user_id = user_id;

        -- Determine rank based on business volume
        SELECT title INTO new_rank
        FROM ranks
        WHERE business_amount <= total_volume
        ORDER BY business_amount DESC
        LIMIT 1;

        -- Update user's rank in profile
        UPDATE profiles
        SET 
            business_rank = COALESCE(new_rank, 'New Member'),
            business_volume = total_volume
        WHERE id = user_id;
    ELSE
        -- Reset rank and volume if minimum referrals not met
        UPDATE profiles
        SET 
            business_rank = 'New Member',
            business_volume = 0
        WHERE id = user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to handle business volume changes
CREATE OR REPLACE FUNCTION trigger_update_rank()
RETURNS TRIGGER AS $$
BEGIN
    -- Call rank update function
    PERFORM update_user_rank(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on business_volumes table
DROP TRIGGER IF EXISTS after_business_volume_change ON business_volumes;
CREATE TRIGGER after_business_volume_change
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_rank();
