-- Drop the table if it already exists
DROP TABLE IF EXISTS default_leverages CASCADE;

-- Create the default_leverages table
CREATE TABLE default_leverages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    default_leverage INTEGER NOT NULL CHECK (default_leverage >= 1 AND default_leverage <= 2000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a unique constraint to ensure one default leverage per user
ALTER TABLE default_leverages ADD CONSTRAINT unique_user_id UNIQUE (user_id);

-- Add a trigger to update the updated_at column on row updates
CREATE OR REPLACE FUNCTION update_default_leverages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_default_leverages_timestamp
BEFORE UPDATE ON default_leverages
FOR EACH ROW
EXECUTE FUNCTION update_default_leverages_updated_at();

-- Enable RLS for the table
ALTER TABLE default_leverages ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow users to manage their own default leverage
CREATE POLICY "Allow user to manage their default leverage"
ON default_leverages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant select, insert, update, and delete permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON default_leverages TO authenticated;
