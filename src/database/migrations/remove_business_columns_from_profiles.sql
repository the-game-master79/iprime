-- Drop business-related columns from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS business_rank,
DROP COLUMN IF EXISTS business_volume;

-- Drop related index
DROP INDEX IF EXISTS idx_profiles_business_rank;
