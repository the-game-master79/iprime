-- Query to show users and their current ranks
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.business_rank,
    p.total_invested,
    COALESCE((
        SELECT SUM(p2.total_invested)
        FROM referral_relationships rr
        JOIN profiles p2 ON rr.referred_id = p2.id
        WHERE rr.referrer_id = p.id
    ), 0) as team_business,
    p.total_invested + COALESCE((
        SELECT SUM(p2.total_invested)
        FROM referral_relationships rr
        JOIN profiles p2 ON rr.referred_id = p2.id
        WHERE rr.referrer_id = p.id
    ), 0) as total_business_volume,
    r.business_amount as rank_requirement,
    r.bonus as rank_bonus
FROM profiles p
LEFT JOIN ranks r ON r.title = p.business_rank
ORDER BY total_business_volume DESC;
