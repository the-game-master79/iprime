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
    -- Check if code exists and user is active
    SELECT p.id, p.status INTO v_referrer_id, v_status
    FROM profiles p
    WHERE p.referral_code = p_referral_code
    AND p.status = 'active';

    IF v_referrer_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            NULL::UUID,
            'Invalid or inactive referral code'::TEXT;
        RETURN;
    END IF;

    -- Check for max depth using level instead of path
    SELECT MAX(level) INTO v_max_level
    FROM referral_relationships
    WHERE referrer_id = v_referrer_id
    AND active = true;

    IF v_max_level >= 10 THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            NULL::UUID,
            'Network depth limit reached'::TEXT;
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
    NEW.status := COALESCE(NEW.status, 'Active');
    NEW.date_joined := COALESCE(NEW.date_joined, NOW());
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := COALESCE(NEW.updated_at, NOW());
    NEW.kyc_status := COALESCE(NEW.kyc_status, 'pending');
    NEW.level := COALESCE(NEW.level, 1);
    NEW.current_level := COALESCE(NEW.current_level, 1);
    NEW.total_invested := COALESCE(NEW.total_invested, 0);
    NEW.role := COALESCE(NEW.role, 'user');
    NEW.withdrawal_wallet := COALESCE(NEW.withdrawal_wallet, 0);
    NEW.investment_wallet := COALESCE(NEW.investment_wallet, 0);
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
RETURNS TRIGGER AS $$lize_profile
BEGINEFORE INSERT ON profiles
    -- Update the direct count for the referrer when a new user is referred
    IF NEW.referred_by IS NOT NULL THEN_fields();
        UPDATE profiles
        SET direct_count = (l_relationships
            SELECT COUNT(*)s
            FROM profiles
            WHERE referred_by = NEW.referred_by
            AND status = 'active'
        ) old triggers/functions
        WHERE referral_code = NEW.referred_by;ON profiles;
    END IF;ON IF EXISTS handle_new_referral();
    -- If referral code changes, update old referrer's count    IF TG_OP = 'UPDATE' AND OLD.referred_by IS DISTINCT FROM NEW.referred_by THEN        UPDATE profiles        SET direct_count = (            SELECT COUNT(*)            FROM profiles            WHERE referred_by = OLD.referred_by            AND status = 'active'        )        WHERE referral_code = OLD.referred_by;    END IF;    RETURN NEW;END;$$ LANGUAGE plpgsql;-- Create triggers with correct timingDROP TRIGGER IF EXISTS initialize_profile ON profiles;CREATE TRIGGER initialize_profile    BEFORE INSERT ON profiles    FOR EACH ROW    EXECUTE FUNCTION initialize_profile_fields();CREATE TRIGGER setup_referral_relationships    AFTER INSERT ON profiles    FOR EACH ROW    EXECUTE FUNCTION handle_referral_setup();-- Add trigger for direct count updatesDROP TRIGGER IF EXISTS update_direct_count_trigger ON profiles;CREATE TRIGGER update_direct_count_trigger    AFTER INSERT OR UPDATE OF referred_by, status ON profiles    FOR EACH ROW    EXECUTE FUNCTION update_direct_referral_count();-- Remove old triggers/functionsDROP TRIGGER IF EXISTS after_profile_creation ON profiles;DROP FUNCTION IF EXISTS handle_new_referral();