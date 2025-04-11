-- Function to sync ranks for all eligible users
CREATE OR REPLACE FUNCTION sync_business_ranks()
RETURNS void AS $$
DECLARE
    user_rec RECORD;
    total_volume DECIMAL;
    new_rank TEXT;
BEGIN
    -- Loop through all users with 2+ direct referrals
    FOR user_rec IN (
        SELECT p.id, p.direct_count
        FROM profiles p
        WHERE p.direct_count >= 2
    ) LOOP
        -- Calculate total business volume
        WITH RECURSIVE team_volume AS (
            -- Base case: Direct referrals
            SELECT 
                rr.referred_id,
                COALESCE(bv.amount, 0) as amount
            FROM referral_relationships rr
            LEFT JOIN business_volumes bv ON bv.user_id = rr.referred_id
            WHERE rr.referrer_id = user_rec.id
            
            UNION ALL
            
            -- Recursive case: Indirect referrals
            SELECT 
                rr.referred_id,
                COALESCE(bv.amount, 0)
            FROM team_volume tv
            JOIN referral_relationships rr ON rr.referrer_id = tv.referred_id
            LEFT JOIN business_volumes bv ON bv.user_id = rr.referred_id
        )
        -- Get total volume including user's own volume
        SELECT COALESCE(SUM(amount), 0) + COALESCE((
            SELECT SUM(amount) 
            FROM business_volumes 
            WHERE user_id = user_rec.id
        ), 0) INTO total_volume
        FROM team_volume;

        -- Get appropriate rank based on volume
        SELECT title INTO new_rank
        FROM ranks
        WHERE business_amount <= total_volume
        ORDER BY business_amount DESC
        LIMIT 1;

        -- Update total_business_volumes with new rank and volume
        INSERT INTO total_business_volumes (user_id, total_amount, business_rank)
        VALUES (user_rec.id, total_volume, COALESCE(new_rank, 'New Member'))
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            total_amount = EXCLUDED.total_amount,
            business_rank = EXCLUDED.business_rank,
            updated_at = NOW();

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to run sync after business volume changes
CREATE OR REPLACE FUNCTION trigger_sync_ranks()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM sync_business_ranks();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on business_volumes table
DROP TRIGGER IF EXISTS sync_ranks_on_volume_change ON business_volumes;
CREATE TRIGGER sync_ranks_on_volume_change
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_sync_ranks();
