-- Drop existing function if exists
DROP FUNCTION IF EXISTS update_business_rank_from_total();

-- Create function to update business rank based on total business
CREATE OR REPLACE FUNCTION update_business_rank_from_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_rank text;
BEGIN
    -- Calculate total business (including referrals)
    WITH RECURSIVE downline AS (
        -- Get direct referrals
        SELECT referred_id, 1 as level
        FROM referral_relationships
        WHERE referrer_id = NEW.id
        
        UNION ALL
        
        -- Get indirect referrals up to level 10
        SELECT rr.referred_id, d.level + 1
        FROM referral_relationships rr
        INNER JOIN downline d ON rr.referrer_id = d.referred_id
        WHERE d.level < 10
    )
    SELECT determine_business_rank(
        COALESCE(NEW.total_invested, 0) + 
        COALESCE((
            SELECT SUM(p.total_invested)
            FROM downline d
            JOIN profiles p ON d.referred_id = p.id
        ), 0)
    ) INTO new_rank;

    -- Update business_rank if it would change
    IF COALESCE(NEW.business_rank, '') != new_rank THEN
        NEW.business_rank := new_rank;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create or replace trigger
DROP TRIGGER IF EXISTS update_rank_on_total_change ON profiles;
CREATE TRIGGER update_rank_on_total_change
    BEFORE UPDATE OF total_invested
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_business_rank_from_total();

-- Update all existing profiles to recalculate their ranks
UPDATE profiles 
SET total_invested = total_invested 
WHERE true;
