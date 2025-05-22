-- Drop existing function
DROP FUNCTION IF EXISTS validate_referral_code(TEXT, UUID);

-- Update validation function to remove path dependency
CREATE OR REPLACE FUNCTION validate_referral_code(
    p_referral_code TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    referrer_id UUID,
    message TEXT
) AS $$
DECLARE
    v_status TEXT;
    v_referrer_id UUID;
    v_max_level INTEGER;
BEGIN
    -- Check if code exists
    SELECT p.id, p.status INTO v_referrer_id, v_status
    FROM profiles p
    WHERE p.referral_code = p_referral_code;

    IF v_referrer_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            NULL::UUID,
            'Referral code does not exist'::TEXT;
        RETURN;
    END IF;

    -- Check if user is active
    IF v_status IS DISTINCT FROM 'active' THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            NULL::UUID,
            'Referral code exists but user is not active (status: ' || v_status || ')'::TEXT;
        RETURN;
    END IF;

    -- Check for max depth using level instead of path
    SELECT MAX(rr.level) INTO v_max_level
    FROM referral_relationships rr
    WHERE rr.referrer_id = v_referrer_id
    AND rr.active = true;

    IF v_max_level IS NOT NULL AND v_max_level >= 10 THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            NULL::UUID,
            'Network depth limit reached (max level: ' || v_max_level || ')'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        TRUE::BOOLEAN,
        v_referrer_id,
        'Valid referral code'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Update build_referral_relationships to remove path
CREATE OR REPLACE FUNCTION build_referral_relationships(
    p_referred_id UUID,
    p_referrer_code TEXT
)
RETURNS VOID AS $$
DECLARE
    current_referrer_id UUID;
    current_referrer_code TEXT;
    current_level INTEGER := 1;
    commission_rate DECIMAL;
BEGIN
    current_referrer_code := p_referrer_code;
    
    WHILE current_level <= (SELECT MAX(level) FROM commission_structures) 
        AND current_referrer_code IS NOT NULL LOOP
        
        -- Get referrer's ID
        SELECT id INTO current_referrer_id
        FROM profiles
        WHERE referral_code = current_referrer_code;
        
        EXIT WHEN current_referrer_id IS NULL;

        -- Get commission rate for this level
        SELECT percentage INTO commission_rate
        FROM commission_structures
        WHERE level = current_level;
        
        -- Create relationship without path
        INSERT INTO referral_relationships (
            referrer_id,
            referred_id,
            level,
            commission_rate,
            active,
            created_at
        )
        VALUES (
            current_referrer_id,
            p_referred_id,
            current_level,
            COALESCE(commission_rate, 0),
            true,
            NOW()
        )
        ON CONFLICT (referrer_id, referred_id) 
        DO UPDATE SET 
            level = EXCLUDED.level,
            commission_rate = EXCLUDED.commission_rate,
            active = true,
            updated_at = NOW();
        
        -- Update direct count if level 1
        IF current_level = 1 THEN
            UPDATE profiles p
            SET direct_count = (
                SELECT COUNT(*) 
                FROM referral_relationships rr
                WHERE rr.referrer_id = current_referrer_id 
                AND rr.level = 1
                AND rr.active = true
            )
            WHERE p.id = current_referrer_id;
        END IF;
        
        -- Get next referrer code
        SELECT referred_by INTO current_referrer_code
        FROM profiles
        WHERE id = current_referrer_id;
        
        current_level := current_level + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize profile fields
CREATE OR REPLACE FUNCTION initialize_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default values for required fields if not provided
    NEW.status := COALESCE(NEW.status, 'active');
    NEW.date_joined := COALESCE(NEW.date_joined, NOW());
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := COALESCE(NEW.updated_at, NOW());
    NEW.kyc_status := COALESCE(NEW.kyc_status, 'pending');
    NEW.level := COALESCE(NEW.level, 1);
    NEW.current_level := COALESCE(NEW.current_level, 1);
    NEW.total_invested := COALESCE(NEW.total_invested, 0);
    NEW.role := COALESCE(NEW.role, 'user');
    NEW.withdrawal_wallet := COALESCE(NEW.withdrawal_wallet, 0);
    NEW.direct_count := COALESCE(NEW.direct_count, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create separate function for building referral relationships
CREATE OR REPLACE FUNCTION handle_referral_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Build referral relationships after profile is created
    IF NEW.referred_by IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM profiles 
            WHERE referral_code = NEW.referred_by 
            AND status = 'active'
        ) THEN
            -- Directly call build_referral_relationships instead of notify
            PERFORM build_referral_relationships(NEW.id, NEW.referred_by);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add function to update direct referral count
CREATE OR REPLACE FUNCTION update_direct_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the direct count for the referrer when a new user is referred
    IF NEW.referred_by IS NOT NULL THEN
        UPDATE profiles
        SET direct_count = (
            SELECT COUNT(*)
            FROM profiles
            WHERE referred_by = NEW.referred_by
            AND status = 'active'
        )
        WHERE referral_code = NEW.referred_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
