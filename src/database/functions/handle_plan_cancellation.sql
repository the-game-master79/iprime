CREATE OR REPLACE FUNCTION handle_plan_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    forex_fee DECIMAL;
    admin_fee DECIMAL;
    refund_amount DECIMAL;
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status = 'approved' THEN
        -- Start a transaction block
        BEGIN
            -- Calculate deductions
            forex_fee := OLD.amount * 0.10; -- 10% forex fee
            admin_fee := OLD.amount * 0.05; -- 5% admin fee
            refund_amount := OLD.amount - (forex_fee + admin_fee);

            -- Update user's withdrawal wallet with refund amount and reduce total invested
            UPDATE profiles 
            SET 
                withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + refund_amount,
                total_invested = COALESCE(total_invested, 0) - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.user_id;

            -- Create fee transaction records
            INSERT INTO transactions (
                id, user_id, amount, type, status, method, wallet_type, description, reference_id, created_at
            ) VALUES
            -- Forex fee transaction
            (
                gen_random_uuid(),
                OLD.user_id,
                forex_fee,
                'deduction',
                'Completed',
                'system',
                'withdrawal',
                format('10%% forex fee for cancelling investment plan %s', OLD.id),
                OLD.id,
                NOW()
            ),
            -- Admin fee transaction
            (
                gen_random_uuid(),
                OLD.user_id,
                admin_fee,
                'deduction',
                'Completed',
                'system',
                'withdrawal',
                format('5%% admin fee for cancelling investment plan %s', OLD.id),
                OLD.id,
                NOW()
            ),
            -- Refund transaction
            (
                gen_random_uuid(),
                OLD.user_id,
                refund_amount,
                'refund',
                'Completed',
                'system',
                'withdrawal',
                format('Refund for cancelled investment plan (After fees: Original $%s, Forex -$%s, Admin -$%s)',
                       OLD.amount::numeric(10,2),
                       forex_fee::numeric(10,2),
                       admin_fee::numeric(10,2)),
                OLD.id,
                NOW()
            );

        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to process plan cancellation: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_plan_cancellation ON plans_subscriptions;
CREATE TRIGGER trigger_plan_cancellation
    AFTER UPDATE OF status ON plans_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_plan_cancellation();
