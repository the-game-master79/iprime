-- Drop existing objects
DROP TRIGGER IF EXISTS after_business_volume_change ON business_volumes;
DROP TRIGGER IF EXISTS update_total_volume_trigger ON business_volumes;
DROP FUNCTION IF EXISTS update_profile_business_volume() CASCADE;
DROP FUNCTION IF EXISTS update_total_business_volume() CASCADE;
DROP FUNCTION IF EXISTS get_total_business_volume(UUID) CASCADE;
DROP FUNCTION IF EXISTS has_minimum_direct_referrals(UUID) CASCADE;


-- Create total_business_volumes table
CREATE TABLE IF NOT EXISTS total_business_volumes (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    total_amount DECIMAL NOT NULL DEFAULT 0,
    business_rank TEXT DEFAULT 'New Member',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update total business volume
CREATE OR REPLACE FUNCTION update_total_business_volume() 
RETURNS TRIGGER AS $$
DECLARE
    affected_user_id UUID;
    total_vol DECIMAL;
    direct_refs INTEGER;
    new_rank TEXT;
BEGIN
    -- Determine affected user
    affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Calculate total volume from unique subscriptions only
    WITH unique_volumes AS (
        SELECT DISTINCT ON (subscription_id) amount
        FROM business_volumes
        WHERE user_id = affected_user_id
    )
    SELECT COALESCE(SUM(amount), 0) INTO total_vol
    FROM unique_volumes;
    
    -- Get direct referral count
    SELECT direct_count INTO direct_refs
    FROM profiles 
    WHERE id = affected_user_id;
    
    -- Determine rank if qualified
    IF direct_refs >= 2 THEN
        SELECT title INTO new_rank
        FROM ranks
        WHERE business_amount <= total_vol
        ORDER BY business_amount DESC
        LIMIT 1;
        
        -- If no rank found, default to New Member
        new_rank := COALESCE(new_rank, 'New Member');
    ELSE
        new_rank := 'New Member';
    END IF;

    -- Update or insert total volumes
    INSERT INTO total_business_volumes (
        user_id,
        total_amount,
        business_rank,
        updated_at
    ) VALUES (
        affected_user_id,
        total_vol,
        new_rank,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE 
    SET 
        total_amount = EXCLUDED.total_amount,
        business_rank = EXCLUDED.business_rank,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for business volume changes
CREATE TRIGGER update_total_business_volume_trigger
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_total_business_volume();

-- Indexes for performance
CREATE INDEX idx_business_volumes_user_id ON business_volumes(user_id);
CREATE INDEX idx_business_volumes_subscription ON business_volumes(subscription_id);
CREATE INDEX idx_total_volumes_user ON total_business_volumes(user_id);
