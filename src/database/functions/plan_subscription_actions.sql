-- Drop existing function first
DROP FUNCTION IF EXISTS distribute_business_volume(uuid,uuid,numeric);

-- Recreate function with proper parameter names
CREATE OR REPLACE FUNCTION distribute_business_volume(
    subscription_id UUID,
    user_id UUID,
    amount NUMERIC
) RETURNS void AS $$
DECLARE
    upline_user_id UUID;
BEGIN
    -- Insert business volumes for upline with full amount
    WITH RECURSIVE upline AS (
        -- Base case: direct referrer
        SELECT 
            r.id as referrer_id,
            r.referred_by as referrer_code,
            1 as level
        FROM profiles p
        JOIN profiles r ON r.referral_code = p.referred_by
        WHERE p.id = user_id
        
        UNION ALL
        
        -- Recursive case: get referrer's referrer
        SELECT 
            r.id,
            r.referred_by,
            u.level + 1
        FROM upline u
        JOIN profiles r ON r.referral_code = u.referrer_code
        WHERE u.level < 10
    )
    INSERT INTO business_volumes (
        user_id,
        source_user_id,
        subscription_id,
        amount
    )
    SELECT 
        u.referrer_id,
        user_id,
        subscription_id,
        amount
    FROM upline
    WHERE u.level > 0;

    -- Update total business volumes for all affected users
    FOR upline_user_id IN (
        WITH RECURSIVE affected_users AS (
            -- Base case: direct referrer
            SELECT r.id as user_id
            FROM profiles p
            JOIN profiles r ON r.referral_code = p.referred_by
            WHERE p.id = user_id
            
            UNION ALL
            
            -- Recursive case: get referrer's referrer
            SELECT r.id
            FROM affected_users au
            JOIN profiles p ON p.id = au.user_id
            JOIN profiles r ON r.referral_code = p.referred_by
            WHERE p.referred_by IS NOT NULL
        )
        SELECT user_id FROM affected_users
    ) LOOP
        -- Calculate total volume for each affected user
        WITH user_total AS (
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                p.direct_count
            FROM business_volumes bv
            JOIN profiles p ON p.id = upline_user_id
            WHERE bv.user_id = upline_user_id
            GROUP BY p.direct_count
        )
        INSERT INTO total_business_volumes (user_id, total_amount, business_rank)
        SELECT 
            upline_user_id,
            ut.total_amount,
            CASE 
                WHEN ut.direct_count >= 2 THEN (
                    SELECT title 
                    FROM ranks 
                    WHERE business_amount <= ut.total_amount
                    ORDER BY business_amount DESC 
                    LIMIT 1
                )
                ELSE 'New Member'
            END
        FROM user_total ut
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            total_amount = EXCLUDED.total_amount,
            business_rank = EXCLUDED.business_rank,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve plan subscription
CREATE OR REPLACE FUNCTION approve_plan_subscription(subscription_id UUID)
RETURNS jsonb AS $$
DECLARE
    subscription_record RECORD;
BEGIN
    -- Get subscription details and verify it exists
    SELECT * INTO subscription_record
    FROM plans_subscriptions
    WHERE id = subscription_id;
    
    IF subscription_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Subscription not found'
        );
    END IF;

    -- Check if subscription is in pending state
    IF subscription_record.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Subscription is not in pending state'
        );
    END IF;

    -- Begin transaction block
    BEGIN
        -- Update subscription status
        UPDATE plans_subscriptions
        SET status = 'approved',
            approved_at = NOW()
        WHERE id = subscription_id;

        -- Update user's total invested amount
        UPDATE profiles 
        SET total_invested = COALESCE(total_invested, 0) + subscription_record.amount
        WHERE id = subscription_record.user_id;

        -- Distribute business volumes (this is the only place where distribution should happen)
        PERFORM distribute_business_volume(
            subscription_id,
            subscription_record.user_id,
            subscription_record.amount
        );

        -- Create transaction record
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            wallet_type,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            subscription_record.user_id,
            subscription_record.amount,
            'investment',
            'Completed',
            'system',
            'investment',
            'Investment plan subscription approved',
            subscription_id,
            NOW()
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Subscription approved successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Only raise the notice and return error
        RAISE NOTICE 'Error approving subscription: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error processing approval: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject plan subscription
CREATE OR REPLACE FUNCTION reject_plan_subscription(subscription_id UUID)
RETURNS jsonb AS $$
DECLARE
    subscription_record RECORD;
BEGIN
    -- Get subscription details and verify it exists
    SELECT * INTO subscription_record
    FROM plans_subscriptions
    WHERE id = subscription_id;
    
    IF subscription_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Subscription not found'
        );
    END IF;

    -- Check if subscription is in pending state
    IF subscription_record.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Subscription is not in pending state'
        );
    END IF;

    -- Begin transaction
    BEGIN
        -- Update subscription status
        UPDATE plans_subscriptions
        SET status = 'rejected'
        WHERE id = subscription_id;

        -- Create transaction record
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            wallet_type,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            subscription_record.user_id,
            subscription_record.amount,
            'investment',
            'Failed',
            'system',
            'investment',
            'Investment plan subscription rejected',
            subscription_id,
            NOW()
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Subscription rejected successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Only raise the notice and return error
        RAISE NOTICE 'Error rejecting subscription: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error processing rejection: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
