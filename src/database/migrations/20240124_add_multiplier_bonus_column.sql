-- Add multiplier_bonus column to profiles table
DO $$ 
BEGIN
    -- Check if column exists first
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'multiplier_bonus'
    ) THEN
        -- Add the column allowing null values
        ALTER TABLE profiles 
        ADD COLUMN multiplier_bonus DECIMAL DEFAULT NULL;

        -- Add comment to document the column
        COMMENT ON COLUMN profiles.multiplier_bonus IS 'Optional multiplier bonus value for user rewards and commissions';
    END IF;
END $$;
