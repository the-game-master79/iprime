-- First ensure we have New Member rank
INSERT INTO ranks (title, business_amount, bonus, bonus_description)
VALUES ('New Member', 0, 0, 'Welcome to the platform')
ON CONFLICT (title) DO NOTHING;

-- Update determine_business_rank function to handle New Member rank
CREATE OR REPLACE FUNCTION determine_business_rank(volume numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rank_title text;
BEGIN
    -- If volume is 0, return New Member
    IF volume = 0 THEN
        RETURN 'New Member';
    END IF;

    -- Get appropriate rank based on volume
    SELECT title INTO rank_title
    FROM ranks
    WHERE business_amount <= volume
    AND title != 'New Member'  -- Exclude New Member from normal progression
    ORDER BY business_amount DESC
    LIMIT 1;

    -- Return New Member if no other rank found
    RETURN COALESCE(rank_title, 'New Member');
END;
$$;

-- Update any incorrect ranks
UPDATE profiles
SET business_rank = 
    CASE 
        WHEN business_volume = 0 THEN 'New Member'
        ELSE determine_business_rank(business_volume)
    END
WHERE business_rank != determine_business_rank(business_volume);

-- Clear credited_ranks for users whose rank was corrected
UPDATE profiles
SET credited_ranks = NULL
WHERE business_rank = 'New Member'
AND credited_ranks IS NOT NULL;
