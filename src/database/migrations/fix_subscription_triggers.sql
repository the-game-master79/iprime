-- Drop existing triggers
DROP TRIGGER IF EXISTS update_upline_business_trigger ON plans_subscriptions;
DROP TRIGGER IF EXISTS after_subscription_change ON plans_subscriptions;

-- Recreate trigger without business_rank references
CREATE TRIGGER update_upline_business_trigger
    AFTER INSERT OR UPDATE OF status ON plans_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_upline_business();

-- Add approved_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'plans_subscriptions' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE plans_subscriptions 
        ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
END $$;
