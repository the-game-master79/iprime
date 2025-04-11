-- Truncate existing data
TRUNCATE total_business_volumes;

-- Calculate and insert total business volumes
WITH unique_volumes AS (
    -- Get one entry per subscription for each referred user
    SELECT DISTINCT ON (bv.subscription_id) 
        rr.referrer_id as user_id,
        bv.amount
    FROM referral_relationships rr
    JOIN business_volumes bv ON bv.user_id = rr.referred_id
),
user_volumes AS (
    -- Sum up unique volumes per referrer
    SELECT 
        uv.user_id,
        COALESCE(SUM(uv.amount), 0) as total_amount,
        p.direct_count
    FROM unique_volumes uv
    JOIN profiles p ON p.id = uv.user_id
    GROUP BY uv.user_id, p.direct_count
)
INSERT INTO total_business_volumes (user_id, total_amount, business_rank)
SELECT 
    uv.user_id,
    CASE 
        WHEN uv.direct_count >= 2 THEN uv.total_amount
        ELSE 0
    END as total_amount,
    CASE 
        WHEN uv.direct_count >= 2 THEN (
            SELECT title 
            FROM ranks 
            WHERE business_amount <= uv.total_amount
            ORDER BY business_amount DESC 
            LIMIT 1
        )
        ELSE 'New Member'
    END as business_rank
FROM user_volumes uv;

-- Update any nulls to New Member
UPDATE total_business_volumes 
SET business_rank = 'New Member' 
WHERE business_rank IS NULL;
