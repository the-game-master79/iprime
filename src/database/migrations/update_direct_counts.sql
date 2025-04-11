-- Start transaction
BEGIN;

-- Create function to validate and fix direct counts
CREATE OR REPLACE FUNCTION validate_and_fix_direct_counts()
RETURNS TABLE (
    profile_id UUID,
    old_count INT,
    new_count BIGINT,
    was_updated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH current_counts AS (
        SELECT 
            p.id,
            p.direct_count as old_count,
            COUNT(r.id) as actual_count
        FROM profiles p
        LEFT JOIN profiles r ON r.referred_by = p.referral_code 
            AND r.status = 'active'
        WHERE p.referral_code IS NOT NULL
        GROUP BY p.id, p.direct_count
    ),
    updates AS (
        UPDATE profiles p
        SET 
            direct_count = cc.actual_count,
            updated_at = NOW()
        FROM current_counts cc
        WHERE p.id = cc.id 
        AND (p.direct_count IS NULL OR p.direct_count != cc.actual_count)
        RETURNING p.id, cc.old_count, cc.actual_count
    )
    SELECT 
        cc.id,
        cc.old_count,
        cc.actual_count,
        u.id IS NOT NULL as was_updated
    FROM current_counts cc
    LEFT JOIN updates u ON cc.id = u.id;
END;
$$ LANGUAGE plpgsql;

-- Execute update and show results
SELECT * FROM validate_and_fix_direct_counts();

-- Clean up
DROP FUNCTION validate_and_fix_direct_counts();

COMMIT;
