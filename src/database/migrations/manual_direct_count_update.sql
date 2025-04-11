BEGIN;

-- Function to update direct count for a specific user
CREATE OR REPLACE FUNCTION update_user_direct_count(user_id_param UUID)
RETURNS TABLE (
    referral_code TEXT,
    old_count INTEGER,
    new_count BIGINT,
    updated BOOLEAN
) AS $$
DECLARE
    current_referral_code TEXT;
BEGIN
    -- Get user's referral code with explicit table reference
    SELECT p.referral_code INTO current_referral_code
    FROM profiles p
    WHERE p.id = user_id_param;

    IF current_referral_code IS NULL THEN
        RAISE EXCEPTION 'User not found or has no referral code';
    END IF;

    RETURN QUERY
    WITH counts AS (
        SELECT COUNT(*) as actual_count
        FROM profiles p
        WHERE p.referred_by = current_referral_code
        AND p.status = 'active'
    ),
    updates AS (
        UPDATE profiles p
        SET direct_count = c.actual_count,
            updated_at = NOW()
        FROM counts c
        WHERE p.referral_code = current_referral_code
        AND (p.direct_count IS NULL OR p.direct_count != c.actual_count)
        RETURNING p.referral_code, p.direct_count as new_count
    )
    SELECT 
        current_referral_code,
        p.direct_count as old_count,
        COALESCE(u.new_count, c.actual_count) as new_count,
        u.referral_code IS NOT NULL as updated
    FROM profiles p
    CROSS JOIN counts c
    LEFT JOIN updates u ON p.referral_code = u.referral_code
    WHERE p.referral_code = current_referral_code;
END;
$$ LANGUAGE plpgsql;

-- Function to show direct count discrepancies
CREATE OR REPLACE FUNCTION show_direct_count_discrepancies()
RETURNS TABLE (
    user_id UUID,
    referral_code TEXT,
    stored_count INTEGER,
    actual_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.referral_code,
        p.direct_count,
        COUNT(r.id)::BIGINT as actual_count
    FROM profiles p
    LEFT JOIN profiles r ON r.referred_by = p.referral_code 
        AND r.status = 'active'
    WHERE p.referral_code IS NOT NULL
    GROUP BY p.id, p.referral_code, p.direct_count
    HAVING p.direct_count != COUNT(r.id)
    ORDER BY p.referral_code;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- To check discrepancies:
-- SELECT * FROM show_direct_count_discrepancies();

-- To update specific user's direct count:
-- SELECT * FROM update_user_direct_count('user-uuid-here');

COMMIT;
