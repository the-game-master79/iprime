CREATE OR REPLACE FUNCTION public.manage_rank_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    direct_referrals INTEGER;
BEGIN
    -- Count direct referrals
    SELECT COUNT(*) INTO direct_referrals
    FROM referral_relationships
    WHERE referrer_id = NEW.user_id
    AND level = 1;

    -- Update business_volume in profile
    UPDATE profiles
    SET 
        business_volume = CASE 
            WHEN direct_referrals >= 2 THEN COALESCE(business_volume, 0)
            ELSE 0
        END
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after plan subscription status changes
CREATE TRIGGER check_rank_eligibility
AFTER INSERT OR UPDATE OF status ON plans_subscriptions
FOR EACH ROW
EXECUTE FUNCTION manage_rank_eligibility();
