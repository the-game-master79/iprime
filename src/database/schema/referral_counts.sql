-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_referral_count ON referral_relationships;
DROP TRIGGER IF EXISTS after_referral_insert ON referral_relationships;
DROP TRIGGER IF EXISTS after_referral_delete ON referral_relationships;
DROP TRIGGER IF EXISTS after_referral_change ON referral_relationships;

-- Enhanced function to update direct referral count without system_logs dependency
CREATE OR REPLACE FUNCTION update_direct_referral_count()
RETURNS TRIGGER AS $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
    affected_id UUID;
BEGIN
    -- Determine which ID to use based on operation
    affected_id := CASE
        WHEN TG_OP = 'INSERT' THEN NEW.referrer_id
        WHEN TG_OP = 'DELETE' THEN OLD.referrer_id
        WHEN TG_OP = 'UPDATE' THEN 
            CASE 
                WHEN OLD.referrer_id = NEW.referrer_id THEN NEW.referrer_id
                ELSE OLD.referrer_id
            END
    END;

    -- Get old count for logging
    SELECT direct_count INTO old_count
    FROM profiles
    WHERE id = affected_id;

    -- Update the referrer's direct count
    WITH updated AS (
        UPDATE profiles 
        SET 
            direct_count = (
                SELECT COUNT(*) 
                FROM referral_relationships 
                WHERE referrer_id = affected_id
                AND level = 1
            ),
            updated_at = NOW()
        WHERE id = affected_id
        RETURNING direct_count
    )
    SELECT direct_count INTO new_count FROM updated;

    -- Notify about the update
    PERFORM pg_notify(
        'profile_direct_count_updated',
        json_build_object(
            'user_id', affected_id,
            'old_count', old_count,
            'new_count', new_count
        )::text
    );

    -- If this is an UPDATE and referrer changed, update the old referrer too
    IF TG_OP = 'UPDATE' AND OLD.referrer_id != NEW.referrer_id THEN
        PERFORM update_direct_referral_count(OLD.referrer_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update triggers to handle all operations
CREATE TRIGGER after_referral_change
    AFTER INSERT OR UPDATE OR DELETE ON referral_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_direct_referral_count();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer_level 
ON referral_relationships(referrer_id, level);

-- Function to fix/refresh direct counts
CREATE OR REPLACE FUNCTION fix_direct_counts(target_user_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    IF target_user_id IS NULL THEN
        -- Update all profiles
        UPDATE profiles p
        SET 
            direct_count = (
                SELECT COUNT(*)
                FROM referral_relationships r
                WHERE r.referrer_id = p.id
                AND r.level = 1
            ),
            updated_at = NOW()
        WHERE EXISTS (
            SELECT 1 
            FROM referral_relationships r 
            WHERE r.referrer_id = p.id
        );
    ELSE
        -- Update specific profile
        UPDATE profiles 
        SET 
            direct_count = (
                SELECT COUNT(*)
                FROM referral_relationships r
                WHERE r.referrer_id = id
                AND r.level = 1
            ),
            updated_at = NOW()
        WHERE id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to verify direct counts
CREATE OR REPLACE FUNCTION verify_direct_counts()
RETURNS TABLE (
    user_id UUID,
    stored_count INTEGER,
    actual_count BIGINT,
    is_correct BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.direct_count,
        COUNT(r.id)::BIGINT,
        p.direct_count = COUNT(r.id)
    FROM profiles p
    LEFT JOIN referral_relationships r ON r.referrer_id = p.id AND r.level = 1
    GROUP BY p.id, p.direct_count
    HAVING p.direct_count != COUNT(r.id)
    ORDER BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Function to create multilevel relationships with better error handling
CREATE OR REPLACE FUNCTION create_multilevel_relationships(
    p_referred_id UUID,
    p_referrer_code TEXT
)
RETURNS void AS $$
DECLARE
    current_referrer_id UUID;
    current_referrer_code TEXT;
    current_level INTEGER := 1;
    max_retries INTEGER := 3;
    current_retry INTEGER := 0;
BEGIN
    -- Wait for profile to be fully created (retry loop)
    WHILE current_retry < max_retries LOOP
        IF EXISTS (SELECT 1 FROM profiles WHERE id = p_referred_id) THEN
            EXIT;
        END IF;
        current_retry := current_retry + 1;
        PERFORM pg_sleep(1);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_referred_id) THEN
        RAISE EXCEPTION 'Profile not found for ID: %', p_referred_id;
    END IF;

    -- Remove any existing relationships for this user before rebuilding
    DELETE FROM referral_relationships WHERE referred_id = p_referred_id;

    -- Get initial referrer's ID from the referral code
    current_referrer_code := p_referrer_code;
    
    -- Create relationships up to 10 levels
    WHILE current_level <= 10 AND current_referrer_code IS NOT NULL LOOP
        current_retry := 0;
        LOOP
            SELECT id, referred_by INTO current_referrer_id, current_referrer_code
            FROM profiles
            WHERE referral_code = current_referrer_code;

            IF FOUND OR current_retry >= max_retries THEN
                EXIT;
            END IF;

            current_retry := current_retry + 1;
            PERFORM pg_sleep(1);
        END LOOP;

        EXIT WHEN current_referrer_id IS NULL;

        -- Create relationship if it doesn't exist
        INSERT INTO referral_relationships (
            referrer_id,
            referred_id,
            level,
            created_at
        )
        VALUES (
            current_referrer_id,
            p_referred_id,
            current_level,
            NOW()
        )
        ON CONFLICT (referrer_id, referred_id) DO NOTHING;

        current_level := current_level + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle profile referral updates with error handling
CREATE OR REPLACE FUNCTION handle_profile_referral_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Always (re)build referral relationships if referred_by is set (on insert or update)
    IF NEW.referred_by IS NOT NULL THEN
        -- Remove old relationships and rebuild
        PERFORM create_multilevel_relationships(NEW.id, NEW.referred_by);
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_profile_referral_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger for both insert and update of referred_by
DROP TRIGGER IF EXISTS after_profile_referral_change ON profiles;
CREATE TRIGGER after_profile_referral_change
    AFTER INSERT OR UPDATE OF referred_by ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_profile_referral_update();

-- Add index for referral lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code_referred_by 
ON profiles(referral_code, referred_by);

-- Add unique constraint for referrer relationships
ALTER TABLE referral_relationships 
ADD CONSTRAINT unique_referrer_referred 
UNIQUE (referrer_id, referred_id);
