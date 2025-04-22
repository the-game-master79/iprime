-- Drop existing function if exists
DROP FUNCTION IF EXISTS validate_admin_credentials(TEXT, TEXT);

-- Create function to validate admin credentials
CREATE OR REPLACE FUNCTION validate_admin_credentials(
    admin_email TEXT,
    admin_password TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Hardcoded admin credentials check
    -- Note: In production, use proper password hashing
    RETURN admin_email = 'admin@cloudforex.club' AND admin_password = 'CloudF0rex@2024';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_admin_credentials TO authenticated;

-- Create RPC to validate admin
DROP FUNCTION IF EXISTS validate_admin;
CREATE OR REPLACE FUNCTION validate_admin(
    admin_email TEXT,
    admin_password TEXT
) RETURNS jsonb AS $$
BEGIN
    IF validate_admin_credentials(admin_email, admin_password) THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Admin validated successfully'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid admin credentials'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_admin TO authenticated;
