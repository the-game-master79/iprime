-- Drop existing objects
DROP TRIGGER IF EXISTS after_profile_creation ON profiles;
DROP TRIGGER IF EXISTS after_profile_referral_update ON profiles;
DROP FUNCTION IF EXISTS handle_referral_update() CASCADE;
DROP FUNCTION IF EXISTS create_referral_relationship() CASCADE;
DROP FUNCTION IF EXISTS generate_mlm_path() CASCADE;
DROP FUNCTION IF EXISTS add_to_network() CASCADE;
DROP TABLE IF EXISTS referral_relationships;

-- Create enhanced referral relationships table
CREATE TABLE referral_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES profiles(id),
    referred_id UUID NOT NULL REFERENCES profiles(id),
    level INTEGER NOT NULL,
    path UUID[] NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_referrer_referred UNIQUE (referrer_id, referred_id),
    CONSTRAINT valid_level CHECK (array_length(path, 1) <= 10)
);

-- Create indices for performance
CREATE INDEX idx_referral_relationships_referrer ON referral_relationships(referrer_id) WHERE active = true;
CREATE INDEX idx_referral_relationships_referred ON referral_relationships(referred_id) WHERE active = true;
CREATE INDEX idx_referral_relationships_path ON referral_relationships USING GIN (path) WHERE active = true;
CREATE INDEX idx_referral_relationships_level ON referral_relationships(level) WHERE active = true;

-- Function to handle referral relationship creation
CREATE OR REPLACE FUNCTION create_referral_relationship(
    p_referred_id UUID,
    p_referrer_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
    v_path UUID[];
    v_level INTEGER := 1;
BEGIN
    -- Get referrer ID from code
    SELECT id INTO v_referrer_id
    FROM profiles 
    WHERE referral_code = p_referrer_code
    AND status = 'active';

    IF v_referrer_id IS NULL THEN
        RAISE EXCEPTION 'Invalid referrer code';
    END IF;

    -- Create initial path
    v_path := ARRAY[p_referred_id, v_referrer_id];

    -- Insert direct relationship
    INSERT INTO referral_relationships (
        referrer_id,
        referred_id,
        level,
        path,
        commission_rate
    ) VALUES (
        v_referrer_id,
        p_referred_id,
        v_level,
        v_path,
        COALESCE((SELECT percentage FROM commission_structures WHERE level = 1), 0)
    );

    -- Update referrer's direct count
    UPDATE profiles
    SET direct_count = (
        SELECT COUNT(*)
        FROM referral_relationships
        WHERE referrer_id = v_referrer_id
        AND level = 1
        AND active = true
    )
    WHERE id = v_referrer_id;

    RETURN true;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating referral relationship: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to handle profile referral updates
CREATE OR REPLACE FUNCTION handle_profile_referral_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        PERFORM create_referral_relationship(NEW.id, NEW.referred_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER after_profile_creation
    AFTER INSERT ON profiles
    FOR EACH ROW
    WHEN (NEW.referred_by IS NOT NULL)
    EXECUTE FUNCTION handle_profile_referral_update();

CREATE TRIGGER after_profile_referral_update
    AFTER UPDATE OF referred_by ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_profile_referral_update();
