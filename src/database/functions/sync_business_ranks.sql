-- Function to sync ranks for all eligible users
CREATE OR REPLACE FUNCTION sync_business_ranks()
RETURNS void AS $$
DECLARE
    user_rec RECORD;
    total_volume DECIMAL;
    new_rank TEXT;
BEGIN
    -- Loop through all users who have at least 2 direct referrals in referral_relationships (level 1)
    FOR user_rec IN (
        SELECT p.id
        FROM profiles p
        WHERE (
            SELECT COUNT(*) FROM referral_relationships rr
            WHERE rr.referrer_id = p.id AND rr.level = 1
        ) >= 2
    ) LOOP
        -- Calculate total business volume (team + self)
        -- Only include each user's own business volume once, and do not sum up the same volume up the tree
        WITH RECURSIVE team_users AS (
            -- Start with direct downlines only (not self)
            SELECT rr.referred_id AS user_id
            FROM referral_relationships rr
            WHERE rr.referrer_id = user_rec.id
            UNION
            -- Recursively add all downline users
            SELECT rr.referred_id AS user_id
            FROM referral_relationships rr
            JOIN team_users tu ON rr.referrer_id = tu.user_id
        )
        -- Sum only the business volumes of the direct and indirect downlines (not self, and only once per user)
        SELECT COALESCE(SUM(bv.amount), 0)
        INTO total_volume
        FROM business_volumes bv
        WHERE bv.user_id IN (
            SELECT DISTINCT user_id FROM team_users WHERE user_id <> user_rec.id
        );

        -- Add self business volume (only once)
        total_volume := total_volume + COALESCE((
            SELECT SUM(amount) FROM business_volumes WHERE user_id = user_rec.id
        ), 0);

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

-- No changes needed for business_volume in profiles
