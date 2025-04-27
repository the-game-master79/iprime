-- Add earnings tracking columns to plans_subscriptions
ALTER TABLE plans_subscriptions
ADD COLUMN IF NOT EXISTS earnings_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_earning_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0 CHECK (total_earnings >= 0),
ADD COLUMN IF NOT EXISTS days_credited INTEGER DEFAULT 0 CHECK (days_credited >= 0),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_plans_subscriptions_earnings 
ON plans_subscriptions(status, earnings_started_at)
WHERE status = 'approved' AND earnings_started_at IS NOT NULL;

-- Update trigger function to track earnings start
CREATE OR REPLACE FUNCTION track_subscription_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Set earnings_started_at when subscription is first approved
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        NEW.earnings_started_at := NOW();
    END IF;

    -- Set completed_at when all earnings are distributed
    IF NEW.days_credited >= (
        SELECT duration_days 
        FROM plans 
        WHERE id = NEW.plan_id
    ) THEN
        NEW.completed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for earnings tracking
DROP TRIGGER IF EXISTS track_subscription_earnings_trigger ON plans_subscriptions;
CREATE TRIGGER track_subscription_earnings_trigger
    BEFORE UPDATE ON plans_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION track_subscription_earnings();
