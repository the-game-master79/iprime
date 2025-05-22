-- Replace the trigger-only function with a callable function

-- Drop the trigger and trigger function if they exist
DROP TRIGGER IF EXISTS trigger_plan_cancellation ON plans_subscriptions;
DROP FUNCTION IF EXISTS handle_plan_cancellation();

-- Create a callable function for plan cancellation
CREATE OR REPLACE FUNCTION handle_plan_cancellation(
  subscription_id UUID,
  user_id UUID
)
RETURNS VOID AS $$
DECLARE
    sub RECORD;
    forex_fee DECIMAL;
    admin_fee DECIMAL;
    refund_amount DECIMAL;
BEGIN
    -- Get the subscription record
    SELECT * INTO sub FROM plans_subscriptions WHERE id = subscription_id AND user_id = handle_plan_cancellation.user_id AND status = 'approved';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found or not approved';
    END IF;

    -- Update subscription status to cancelled
    UPDATE plans_subscriptions
    SET status = 'cancelled'
    WHERE id = subscription_id;

    -- Calculate deductions
    forex_fee := sub.amount * 0.10;
    admin_fee := sub.amount * 0.05;
    refund_amount := sub.amount - (forex_fee + admin_fee);

    -- Update user's withdrawal wallet and total invested
    UPDATE profiles
    SET
        withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + refund_amount,
        total_invested = COALESCE(total_invested, 0) - sub.amount,
        updated_at = NOW()
    WHERE id = handle_plan_cancellation.user_id;

    -- Create fee transaction records
    INSERT INTO transactions (
        id, user_id, amount, type, status, method, wallet_type, description, reference_id, created_at
    ) VALUES
    -- Forex fee transaction
    (
        gen_random_uuid(),
        handle_plan_cancellation.user_id,
        forex_fee,
        'deduction',
        'Completed',
        'system',
        'withdrawal',
        format('10%% forex fee for cancelling investment plan %s', subscription_id),
        subscription_id,
        NOW()
    ),
    -- Admin fee transaction
    (
        gen_random_uuid(),
        handle_plan_cancellation.user_id,
        admin_fee,
        'deduction',
        'Completed',
        'system',
        'withdrawal',
        format('5%% admin fee for cancelling investment plan %s', subscription_id),
        subscription_id,
        NOW()
    ),
    -- Refund transaction
    (
        gen_random_uuid(),
        handle_plan_cancellation.user_id,
        refund_amount,
        'refund',
        'Completed',
        'system',
        'withdrawal',
        format('Refund for cancelled investment plan (After fees: Original $%s, Forex -$%s, Admin -$%s)',
               sub.amount::numeric(10,2),
               forex_fee::numeric(10,2),
               admin_fee::numeric(10,2)),
        subscription_id,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
