-- Create total business volumes table
CREATE TABLE IF NOT EXISTS total_business_volumes (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    total_amount DECIMAL NOT NULL DEFAULT 0,
    business_rank TEXT DEFAULT 'New Member',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_total_amount CHECK (total_amount >= 0)
);

-- Function to maintain total business volume and rank
CREATE OR REPLACE FUNCTION update_total_business_volume()
RETURNS TRIGGER AS $$
DECLARE 
    direct_refs INTEGER;
    new_rank TEXT;
    affected_user_id UUID;
    total_vol DECIMAL;
BEGIN
    -- Determine affected user
    affected_user_id := COALESCE(NEW.user_id, OLD.user_id);

    -- Get direct referral count
    SELECT direct_count INTO direct_refs
    FROM profiles 
    WHERE id = affected_user_id;

    -- Calculate total volume from direct referrals only (no recursive)
    SELECT COALESCE(SUM(bv.amount), 0) INTO total_vol
    FROM referral_relationships rr
    JOIN business_volumes bv ON bv.user_id = rr.referred_id
    WHERE rr.referrer_id = affected_user_id;

    -- Only assign rank if user has 2+ direct referrals
    IF direct_refs >= 2 THEN
        -- Get appropriate rank based on volume
        SELECT title INTO new_rank
        FROM ranks
        WHERE business_amount <= total_vol
        ORDER BY business_amount DESC
        LIMIT 1;
    ELSE
        -- Keep track of volume but set displayed amount to 0 and rank to New Member
        INSERT INTO total_business_volumes (user_id, total_amount, business_rank)
        VALUES (
            affected_user_id,
            0,
            'New Member'
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            total_amount = 0,
            business_rank = 'New Member',
            updated_at = NOW();
            
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Update total_business_volumes for qualified users
    INSERT INTO total_business_volumes (user_id, total_amount, business_rank)
    VALUES (
        affected_user_id,
        total_vol,
        COALESCE(new_rank, 'New Member')
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_amount = EXCLUDED.total_amount,
        business_rank = EXCLUDED.business_rank,
        updated_at = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on business_volumes
CREATE TRIGGER update_total_volume_trigger
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_total_business_volume();
