CREATE OR REPLACE FUNCTION process_deposit_approval(
    p_deposit_id uuid,
    p_account_history_id uuid,
    p_new_status text,
    p_user_id uuid,
    p_amount numeric,
    p_approved boolean,
    p_timestamp timestamptz
) RETURNS json AS $$
DECLARE
    v_result json;
    v_account_history_status text;
    v_deposit_status text;
BEGIN
    -- First verify both records exist and are pending
    SELECT status INTO v_account_history_status
    FROM account_history
    WHERE id = p_account_history_id;

    IF v_account_history_status IS NULL THEN
        RAISE EXCEPTION 'Account history record not found';
    END IF;

    IF v_account_history_status != 'pending' THEN
        RAISE EXCEPTION 'Account history record is not pending';
    END IF;

    SELECT status INTO v_deposit_status
    FROM deposits
    WHERE id = p_deposit_id;

    IF v_deposit_status IS NULL THEN
        RAISE EXCEPTION 'Deposit record not found';
    END IF;

    IF v_deposit_status != 'pending' THEN
        RAISE EXCEPTION 'Deposit record is not pending';
    END IF;

    -- Begin updates now that we've verified everything
    UPDATE account_history
    SET 
        status = p_new_status,
        updated_at = p_timestamp
    WHERE id = p_account_history_id;

    UPDATE deposits
    SET 
        status = p_new_status,
        updated_at = p_timestamp
    WHERE id = p_deposit_id;

    -- If approved, update user's investment total
    IF p_approved THEN
        UPDATE profiles
        SET investment_total = COALESCE(investment_total, 0) + p_amount
        WHERE user_id = p_user_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'User profile not found';
        END IF;
    END IF;

    v_result := json_build_object(
        'success', true,
        'message', 'Deposit ' || p_new_status,
        'deposit_id', p_deposit_id
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to process deposit: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
