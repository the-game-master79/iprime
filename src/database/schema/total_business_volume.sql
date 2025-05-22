-- Create total business volumes table
CREATE TABLE IF NOT EXISTS total_business_volumes (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    total_amount DECIMAL NOT NULL DEFAULT 0,
    business_rank TEXT DEFAULT 'New Member',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_total_amount CHECK (total_amount >= 0)
);

-- Function to maintain total business volume and rank
CREATE OR REPLACE FUNCTION update_total_business_volume()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM sync_business_ranks();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists to avoid duplicate trigger error
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_total_volume_trigger'
        AND tgrelid = 'business_volumes'::regclass
    ) THEN
        DROP TRIGGER update_total_volume_trigger ON business_volumes;
    END IF;
END$$;

-- Create trigger on business_volumes
CREATE TRIGGER update_total_volume_trigger
    AFTER INSERT OR UPDATE OR DELETE ON business_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_total_business_volume();

-- No changes needed for business_volume or investment_wallet
