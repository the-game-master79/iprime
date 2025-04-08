CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name text,
  last_name text,
  full_name text,
  email text,
  country text,
  status text DEFAULT 'active',
  date_joined timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  referral_code text UNIQUE,
  referred_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  kyc_status text DEFAULT 'pending',
  phone text,
  address text,
  city text,
  level integer DEFAULT 0,
  current_level smallint DEFAULT 0,
  total_invested numeric DEFAULT 0,
  business_volume numeric DEFAULT 0,
  business_rank text DEFAULT 'New Member',
  role text DEFAULT 'user',
  withdrawal_wallet numeric DEFAULT 0,
  investment_wallet numeric DEFAULT 0,
  direct_count integer DEFAULT 0,
  
  CONSTRAINT referral_code_length CHECK (char_length(referral_code) >= 6)
);

-- Add indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_business_rank ON profiles(business_rank);

-- Function to update direct referral count
CREATE OR REPLACE FUNCTION update_direct_referral_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET direct_count = (
        SELECT COUNT(*)
        FROM referral_relationships
        WHERE referrer_id = p_user_id
        AND level = 1
    )
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update direct_count when referral relationships change
CREATE OR REPLACE FUNCTION update_referrer_direct_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_direct_referral_count(NEW.referrer_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_direct_referral_count(OLD.referrer_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS after_referral_change ON referral_relationships;

CREATE TRIGGER after_referral_change
    AFTER INSERT OR DELETE ON referral_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_referrer_direct_count();

-- Function to manually update direct count for all profiles or a specific profile
CREATE OR REPLACE FUNCTION refresh_direct_count(specific_user_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    IF specific_user_id IS NULL THEN
        -- Update all profiles
        UPDATE profiles p
        SET direct_count = (
            SELECT COUNT(*)
            FROM referral_relationships r
            WHERE r.referrer_id = p.id
            AND r.level = 1
        );
    ELSE
        -- Update specific profile
        PERFORM update_direct_referral_count(specific_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql;
