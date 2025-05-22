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
    IF (TG_OP = 'DELETE') THEN
        affected_user_id := OLD.user_id;
    ELSE
        affected_user_id := NEW.user_id;
    END IF;

    -- Calculate total volume for this user (sum all business_volumes where user_id = affected_user_id)
    SELECT COALESCE(SUM(amount), 0) INTO total_vol
    FROM business_volumes
    WHERE user_id = affected_user_id;

    -- Get direct referral count from referral_relationships (level 1)
    SELECT COUNT(*) INTO direct_refs
    FROM referral_relationships
    WHERE referrer_id = affected_user_id AND level = 1;

    -- Determine rank if qualified
    IF direct_refs >= 2 THEN
        SELECT title INTO new_rank
        FROM ranks
        WHERE business_amount <= total_vol
        ORDER BY business_amount DESC, id ASC
        LIMIT 1;

        IF new_rank IS NULL THEN
            new_rank := 'New Member';
        END IF;
    ELSE
        SELECT business_rank INTO new_rank
        FROM total_business_volumes
        WHERE user_id = affected_user_id;

        IF new_rank IS NULL THEN
            new_rank := 'New Member';
        END IF;
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

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists before creating it
DROP TRIGGER IF EXISTS update_total_business_volume_trigger ON business_volumes;

-- Create trigger for business volume changes
CREATE TRIGGER update_total_business_volume_trigger
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_total_business_volume();

-- Manually recalculate and upsert total business volumes for all users
INSERT INTO total_business_volumes (user_id, total_amount, business_rank, updated_at)
SELECT
    p.id AS user_id,
    COALESCE(SUM(bv.amount), 0) AS total_amount,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM referral_relationships rr
            WHERE rr.referrer_id = p.id AND rr.level = 1
        ) >= 2 THEN
            COALESCE((
                SELECT title
                FROM ranks
                WHERE business_amount <= COALESCE(SUM(bv.amount), 0)
                ORDER BY business_amount DESC, id ASC
                LIMIT 1
            ), 'New Member')
        ELSE
            'New Member'
    END AS business_rank,
    NOW() AS updated_at
FROM profiles p
LEFT JOIN business_volumes bv ON bv.user_id = p.id
GROUP BY p.id
ON CONFLICT (user_id) DO UPDATE
SET
    total_amount = EXCLUDED.total_amount,
    business_rank = EXCLUDED.business_rank,
    updated_at = EXCLUDED.updated_at;

-- In all queries that reference the ranks table, use business_amount and title as before.
-- The id column is not used for rank selection logic, but is included in ORDER BY for tie-breaking.
-- No changes needed to the business logic, as your queries already use:
--   SELECT title FROM ranks WHERE business_amount <= ... ORDER BY business_amount DESC, id ASC LIMIT 1;