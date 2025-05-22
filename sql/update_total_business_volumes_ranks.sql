-- Update business_rank in total_business_volumes for all users based on direct_count and business volume

UPDATE total_business_volumes tbv
SET business_rank = COALESCE((
    SELECT title
    FROM ranks r
    WHERE (
        SELECT COUNT(*) 
        FROM referral_relationships rr 
        WHERE rr.referrer_id = tbv.user_id AND rr.level = 1
    ) >= 2
      AND r.business_amount <= tbv.total_amount
    ORDER BY r.business_amount DESC
    LIMIT 1
), 'New Member');
