CREATE OR REPLACE FUNCTION get_default_leverage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_default_leverage INTEGER;
BEGIN
    -- Retrieve the default leverage for the user
    SELECT default_leverage
    INTO v_default_leverage
    FROM default_leverages
    WHERE user_id = p_user_id;

    -- Return the default leverage or a fallback value (e.g., 1)
    RETURN COALESCE(v_default_leverage, 1);
END;
$$ LANGUAGE plpgsql;
