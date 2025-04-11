-- Add business_volume column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'business_volume'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN business_volume NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Create function to calculate and update business volume
CREATE OR REPLACE FUNCTION calculate_business_volume(user_id_param UUID)
RETURNS void AS $$
BEGIN
    -- Update user's business volume
    UPDATE profiles 
    SET business_volume = COALESCE((
        SELECT SUM(amount) 
        FROM business_volumes 
        WHERE user_id = user_id_param
    ), 0)
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update business volume on changes
CREATE OR REPLACE FUNCTION trigger_update_business_volume()
RETURNS TRIGGER AS $$
DECLARE
    affected_user_id UUID;
BEGIN
    affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
    PERFORM calculate_business_volume(affected_user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on business_volumes table
DROP TRIGGER IF EXISTS update_business_volume_trigger ON business_volumes;
CREATE TRIGGER update_business_volume_trigger
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_business_volume();

-- Initialize business volumes for existing users
DO $$
DECLARE
    user_rec RECORD;
BEGIN
    FOR user_rec IN SELECT id FROM profiles LOOP
        PERFORM calculate_business_volume(user_rec.id);
    END LOOP;
END $$;
