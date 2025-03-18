-- Drop existing function and recreate with proper rank determination
CREATE OR REPLACE FUNCTION determine_business_rank(volume numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rank_title text;
BEGIN
    -- Get appropriate rank based on volume
    SELECT title INTO rank_title
    FROM ranks
    WHERE business_amount <= volume
    ORDER BY business_amount DESC
    LIMIT 1;

    -- Return lowest rank if no rank found
    RETURN COALESCE(rank_title, (SELECT title FROM ranks ORDER BY business_amount ASC LIMIT 1));
END;
$$;

-- Create a function to update rank based on business volume
CREATE OR REPLACE FUNCTION update_rank_from_volume()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_rank text;
BEGIN
    -- Determine new rank based on business volume
    SELECT determine_business_rank(NEW.business_volume) INTO new_rank;
    
    -- Only update if rank would change
    IF COALESCE(NEW.business_rank, '') != new_rank THEN
        NEW.business_rank := new_rank;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update rank when business volume changes
DROP TRIGGER IF EXISTS auto_update_rank ON profiles;
CREATE TRIGGER auto_update_rank
    BEFORE UPDATE OF business_volume
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_rank_from_volume();

-- Function to sync all users' ranks
CREATE OR REPLACE FUNCTION sync_all_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET business_rank = determine_business_rank(business_volume);
END;
$$;

-- Execute sync for all existing users
SELECT sync_all_ranks();
