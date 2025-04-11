-- Drop trigger first
DROP TRIGGER IF EXISTS update_total_volume_trigger ON business_volumes;

-- Drop function
DROP FUNCTION IF EXISTS update_total_business_volume() CASCADE;

-- Drop index
DROP INDEX IF EXISTS idx_total_volumes_user;

-- Drop table
DROP TABLE IF EXISTS total_business_volumes CASCADE;
