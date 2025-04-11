-- Start transaction
BEGIN;

-- First drop triggers
DROP TRIGGER IF EXISTS after_referral_change ON referral_relationships;
DROP TRIGGER IF EXISTS after_profile_referral_change ON profiles;
DROP TRIGGER IF EXISTS update_referral_count ON referral_relationships;
DROP TRIGGER IF EXISTS after_referral_insert ON referral_relationships;
DROP TRIGGER IF EXISTS after_referral_delete ON referral_relationships;

-- Drop functions
DROP FUNCTION IF EXISTS update_direct_referral_count();
DROP FUNCTION IF EXISTS create_multilevel_relationships(UUID, TEXT);
DROP FUNCTION IF EXISTS handle_profile_referral_update();
DROP FUNCTION IF EXISTS fix_direct_counts(UUID);
DROP FUNCTION IF EXISTS verify_direct_counts();
DROP FUNCTION IF EXISTS update_referrer_direct_count();
DROP FUNCTION IF EXISTS refresh_direct_count(UUID);

-- Remove indexes
DROP INDEX IF EXISTS idx_referral_relationships_referrer_level;
DROP INDEX IF EXISTS idx_profiles_referral_code_referred_by;

-- Remove constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS referral_code_length;
ALTER TABLE referral_relationships DROP CONSTRAINT IF EXISTS unique_referrer_referred;

-- Drop the referral_relationships table
DROP TABLE IF EXISTS referral_relationships;

-- Clean up profiles table
ALTER TABLE profiles 
    DROP COLUMN IF EXISTS referred_by,
    DROP COLUMN IF EXISTS referral_code,
    DROP COLUMN IF EXISTS direct_count;

COMMIT;
