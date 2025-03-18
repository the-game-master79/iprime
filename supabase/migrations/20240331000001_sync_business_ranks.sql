-- Update business ranks based on total business volume
WITH RECURSIVE downline AS (
    -- Get direct referrals
    SELECT 
        p.id as profile_id,
        rr.referred_id,
        1 as level,
        p.total_invested as self_invested
    FROM profiles p
    LEFT JOIN referral_relationships rr ON p.id = rr.referrer_id
    
    UNION ALL
    
    -- Get indirect referrals up to level 10
    SELECT 
        d.profile_id,
        rr.referred_id,
        d.level + 1,
        d.self_invested
    FROM referral_relationships rr
    INNER JOIN downline d ON rr.referrer_id = d.referred_id
    WHERE d.level < 10
),
total_business AS (
    -- Calculate total business volume for each profile
    SELECT 
        d.profile_id,
        d.self_invested + COALESCE(
            (SELECT SUM(p.total_invested)
             FROM profiles p
             WHERE p.id IN (
                 SELECT referred_id 
                 FROM downline d2 
                 WHERE d2.profile_id = d.profile_id
             )
            ), 0
        ) as total_volume
    FROM downline d
    GROUP BY d.profile_id, d.self_invested
)
-- Update profiles with correct business rank
UPDATE profiles p
SET business_rank = (
    SELECT r.title
    FROM ranks r
    WHERE r.business_amount <= COALESCE(tb.total_volume, p.total_invested)
    ORDER BY r.business_amount DESC
    LIMIT 1
)
FROM total_business tb
WHERE p.id = tb.profile_id
OR p.id NOT IN (SELECT profile_id FROM total_business);

-- Set 'New Member' rank for those with 0 business volume
UPDATE profiles
SET business_rank = 'New Member'
WHERE total_invested = 0
AND NOT EXISTS (
    SELECT 1 
    FROM referral_relationships rr
    JOIN profiles p2 ON rr.referred_id = p2.id
    WHERE rr.referrer_id = profiles.id
    AND p2.total_invested > 0
);
