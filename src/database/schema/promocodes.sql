-- Update apply_promocode function with proper transaction handling
CREATE OR REPLACE FUNCTION apply_promocode(
    p_deposit_id UUID,
    p_promocode_id UUID
) RETURNS void AS $$
DECLARE
    v_deposit record;
    v_promocode record;
BEGIN
    -- Get deposit details first (outside transaction)
    SELECT * INTO v_deposit 
    FROM deposits 
    WHERE id = p_deposit_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit not found';
    END IF;

    -- Get promocode details
    SELECT * INTO v_promocode 
    FROM promocodes 
    WHERE id = p_promocode_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Promocode not found';
    END IF;

    -- Start transaction
    BEGIN
        -- Lock deposit row
        PERFORM FROM deposits 
        WHERE id = p_deposit_id 
        FOR UPDATE;

        -- Verify deposit is pending and promocode not already applied
        IF v_deposit.status != 'pending' THEN
            RAISE EXCEPTION 'Deposit must be in pending state';
        END IF;

        IF v_deposit.promocode_applied = true THEN
            RAISE EXCEPTION 'A promocode has already been applied to this deposit';
        END IF;

        -- Validate usage types
        IF v_promocode.type = 'multiplier' AND v_promocode.usage_type != 'deposit' THEN
            RAISE EXCEPTION 'Multiplier promocodes can only be used for deposits';
        END IF;
        
        IF v_promocode.type = 'cashback' AND v_promocode.usage_type != 'plan' THEN
            RAISE EXCEPTION 'Cashback promocodes can only be used for plans';
        END IF;

        -- Just mark deposit with promocode info
        UPDATE deposits 
        SET 
            promocode_applied = true,
            promocode_id = p_promocode_id,
            updated_at = NOW()
        WHERE id = p_deposit_id;

        -- For cashback type, verify plan subscription exists
        IF v_promocode.type = 'cashback' THEN
            PERFORM FROM plans_subscriptions WHERE deposit_id = p_deposit_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'No plan subscription found for this deposit';
            END IF;
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Update approve_deposit function to use multiplier_bonus column
CREATE OR REPLACE FUNCTION approve_deposit(deposit_id UUID)
RETURNS jsonb AS $$
DECLARE
    deposit_record RECORD;
    promocode_record RECORD;
    bonus_amount DECIMAL;
BEGIN
    -- Get deposit details
    SELECT d.*, p.promocode_id, p.promocode_applied 
    INTO deposit_record
    FROM deposits d
    LEFT JOIN deposits p ON p.id = deposit_id
    WHERE d.id = deposit_id;

    IF deposit_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit not found');
    END IF;

    IF deposit_record.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit is not in pending state');
    END IF;

    BEGIN
        -- If promocode was applied, get its details
        IF deposit_record.promocode_applied THEN
            SELECT * INTO promocode_record
            FROM promocodes
            WHERE id = deposit_record.promocode_id;

            -- Calculate bonus amount if multiplier type
            IF promocode_record.type = 'multiplier' THEN
                bonus_amount := deposit_record.amount; -- 100% bonus
            END IF;
        END IF;

        -- Update deposit status
        UPDATE deposits 
        SET status = 'approved',
            approved_at = NOW()
        WHERE id = deposit_id;

        -- Add deposit amount to withdrawal wallet and bonus to multiplier_bonus
        UPDATE profiles 
        SET 
            withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + deposit_record.amount,
            multiplier_bonus = COALESCE(multiplier_bonus, 0) + COALESCE(bonus_amount, 0)
        WHERE id = deposit_record.user_id;

        -- Record deposit transaction
        INSERT INTO transactions (
            id, user_id, amount, type, status, description, reference_id
        ) VALUES (
            gen_random_uuid(),
            deposit_record.user_id,
            deposit_record.amount,
            'deposit',
            'Completed',
            'Deposit approved',
            deposit_id
        );

        -- Record bonus transaction if applicable
        IF bonus_amount > 0 THEN
            INSERT INTO transactions (
                id, user_id, amount, type, status, description, reference_id
            ) VALUES (
                gen_random_uuid(),
                deposit_record.user_id,
                bonus_amount,
                'bonus',
                'Completed',
                format('2X Deposit bonus using promocode %s (credited to multiplier bonus)', promocode_record.code),
                deposit_id
            );
        END IF;

        RETURN jsonb_build_object('success', true, 'message', 'Deposit approved successfully');

    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on transactions if not already enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow promocode bonus transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;

-- Add RLS policy for promocode bonus/cashback transactions
CREATE POLICY "Allow promocode bonus and cashback transactions"
ON transactions FOR INSERT TO authenticated
WITH CHECK (
    -- For bonus transactions, verify deposit ownership
    (type = 'bonus' AND reference_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM deposits d
            WHERE d.user_id = auth.uid()
            AND d.id = reference_id::uuid
        )
    ) OR
    -- For cashback transactions, verify user matches
    (type = 'cashback' AND user_id = auth.uid())
);

-- Add general transaction policy for viewing
CREATE POLICY "Users can view their own transactions"
ON transactions FOR SELECT TO authenticated
USING (user_id = auth.uid());
