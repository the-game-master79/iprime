-- Modify rank determination to use only business_volume
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

    -- Get appropriate rank based on business_volume only
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

-- Update trigger function to handle business_volume changes
CREATE OR REPLACE FUNCTION update_business_rank_from_volume()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_rank text;
BEGIN
    -- Determine new rank based solely on business_volume
    SELECT determine_business_rank(NEW.business_volume) INTO new_rank;
    
    -- Only update if rank would change
    IF COALESCE(NEW.business_rank, '') != new_rank THEN
        NEW.business_rank := new_rank;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger and create new one for business_volume
DROP TRIGGER IF EXISTS update_rank_on_total_change ON profiles;
CREATE TRIGGER update_rank_on_business_volume_change
    BEFORE UPDATE OF business_volume
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_business_rank_from_volume();

-- Re-sync all profiles with correct ranks based on business_volume
UPDATE profiles 
SET business_rank = determine_business_rank(business_volume)
WHERE true;

-- Clean up any inconsistencies
UPDATE profiles
SET credited_ranks = NULL
WHERE business_rank = 'New Member'
AND credited_ranks IS NOT NULL;
