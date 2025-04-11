-- First clean up any existing data
TRUNCATE total_business_volumes;

-- Insert aggregated business volumes and ranks for all users
WITH user_volumes AS (
    SELECT 
        bv.user_id,
        COALESCE(SUM(bv.amount), 0) as total_amount,
        p.direct_count
    FROM business_volumes bv
    JOIN profiles p ON p.id = bv.user_id
    GROUP BY bv.user_id, p.direct_count
)
INSERT INTO total_business_volumes (user_id, total_amount, business_rank)
SELECT 
    uv.user_id,
    uv.total_amount,
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
FROM user_volumes uv
ON CONFLICT (user_id) 
DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    business_rank = EXCLUDED.business_rank,
    updated_at = NOW();
