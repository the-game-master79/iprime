-- Drop all existing triggers first
DROP TRIGGER IF EXISTS trigger_update_business_volume ON business_volumes;
DROP TRIGGER IF EXISTS update_business_volume_trigger ON business_volumes;
DROP TRIGGER IF EXISTS sync_ranks_on_volume_change ON business_volumes;
DROP TRIGGER IF EXISTS update_total_business_volume_trigger ON business_volumes;
DROP TRIGGER IF EXISTS update_total_volume_trigger ON business_volumes;
DROP TRIGGER IF EXISTS after_business_volume_change ON business_volumes;

-- Drop unused functions
DROP FUNCTION IF EXISTS trigger_update_business_volume() CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_ranks() CASCADE;
DROP FUNCTION IF EXISTS calculate_business_volume(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_update_rank() CASCADE;
DROP FUNCTION IF EXISTS manage_rank_eligibility() CASCADE;
DROP FUNCTION IF EXISTS sync_business_ranks() CASCADE;
DROP FUNCTION IF EXISTS update_user_rank(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_total_business_volume(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_user_rank_and_volume(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_business_volume(uuid) CASCADE;

-- Create single trigger for business volume updates
CREATE OR REPLACE FUNCTION update_total_business_volume()
RETURNS TRIGGER AS $$
DECLARE 
    direct_refs INTEGER;
    new_rank TEXT;
BEGIN
    -- Get direct referral count
    SELECT direct_count INTO direct_refs
    FROM profiles 
    WHERE id = NEW.user_id;

    -- Calculate new rank if eligible
    IF direct_refs >= 2 THEN
        SELECT title INTO new_rank
        FROM ranks
        WHERE business_amount <= (
            SELECT COALESCE(SUM(amount), 0)
            FROM business_volumes
            WHERE user_id = NEW.user_id
            AND source_user_id != NEW.user_id  -- Exclude self-purchases
        )
        ORDER BY business_amount DESC
        LIMIT 1;
    ELSE
        new_rank := 'New Member';
    END IF;

    -- Insert or update total business volume with rank
    INSERT INTO total_business_volumes (user_id, total_amount, business_rank)
    SELECT 
        NEW.user_id, 
        COALESCE(SUM(amount), 0),
        COALESCE(new_rank, 'New Member')
    FROM business_volumes
    WHERE user_id = NEW.user_id
    AND source_user_id != NEW.user_id  -- Exclude self-purchases
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_amount = EXCLUDED.total_amount,
        business_rank = EXCLUDED.business_rank,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep only one trigger
CREATE TRIGGER update_total_volume_trigger
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_total_business_volume();
