-- Drop existing function first
DROP FUNCTION IF EXISTS distribute_business_volume(uuid,uuid,numeric);

-- Recreate function: distribute_business_volume
-- This version uses referral_relationships to get the referral chain and distributes business volumes accordingly.
CREATE OR REPLACE FUNCTION distribute_business_volume(
    subscription_id UUID,
    user_id UUID,
    amount NUMERIC
) RETURNS void AS $$
DECLARE
    upline RECORD;
BEGIN
    -- For all uplines in the referral chain (ordered by level), insert a business_volumes row
    FOR upline IN
        SELECT referrer_id, level
        FROM referral_relationships
        WHERE referred_id = user_id
          AND active = true
        ORDER BY level ASC
    LOOP
        INSERT INTO business_volumes (
            user_id,
            source_user_id,
            subscription_id,
            amount,
            created_at
        ) VALUES (
            upline.referrer_id,
            user_id,
            subscription_id,
            amount,
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop approve_plan_subscription and reject_plan_subscription functions as they are not needed
DROP FUNCTION IF EXISTS approve_plan_subscription(uuid);
DROP FUNCTION IF EXISTS reject_plan_subscription(uuid);

-- To check if distribute_business_volume is working:

-- 1. Manually call the function with test data:
SELECT distribute_business_volume('<subscription_id>', '<user_id>', <amount>);

-- 2. Then, check the business_volumes table for new rows:
SELECT * FROM business_volumes WHERE subscription_id = '<subscription_id>';

-- 3. You should see rows for each active upline (referrer) of the user, with correct user_id, source_user_id, subscription_id, and amount.

-- 4. You can also check logs or add RAISE NOTICE statements inside the function for debugging if needed.
