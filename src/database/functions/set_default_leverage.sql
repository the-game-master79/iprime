CREATE OR REPLACE FUNCTION set_default_leverage(p_user_id UUID, p_default_leverage INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Check if the user already has a default leverage
    IF EXISTS (SELECT 1 FROM default_leverages WHERE user_id = p_user_id) THEN
        -- Update the existing default leverage
        UPDATE default_leverages
        SET default_leverage = p_default_leverage
        WHERE user_id = p_user_id;
    ELSE
        -- Insert a new default leverage
        INSERT INTO default_leverages (user_id, default_leverage)
        VALUES (p_user_id, p_default_leverage);
    END IF;
END;
$$ LANGUAGE plpgsql;
