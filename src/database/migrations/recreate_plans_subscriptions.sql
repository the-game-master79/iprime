-- Drop existing table and dependencies
DROP TABLE IF EXISTS plans_subscriptions CASCADE;

-- Recreate plans_subscriptions table
CREATE TABLE plans_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    plan_id UUID NOT NULL REFERENCES plans(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_plans_subscriptions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_subscriptions_timestamp
    BEFORE UPDATE ON plans_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_plans_subscriptions_timestamp();

-- Create trigger function for handling plan status changes
CREATE OR REPLACE FUNCTION handle_plan_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle plan approval
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- Create transaction record for approved investment
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.user_id,
            NEW.amount,
            'investment',
            'Completed',
            'system',
            'Investment plan subscription approved',
            NEW.id,
            NOW()
        );

        -- Update total_invested in profiles
        UPDATE profiles 
        SET total_invested = COALESCE(total_invested, 0) + NEW.amount
        WHERE id = NEW.user_id;

        -- Call function to distribute business volume
        PERFORM distribute_business_volume(NEW.id, NEW.user_id, NEW.amount);
    
    -- Handle plan rejection
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        -- Create transaction record for rejected investment
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.user_id,
            NEW.amount,
            'investment',
            'Failed',
            'system',
            'Investment plan subscription rejected',
            NEW.id,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for plan status changes
CREATE TRIGGER on_plan_status_change
    AFTER UPDATE OF status ON plans_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_plan_status_change();

-- Recreate indexes
CREATE INDEX idx_plans_subscriptions_user ON plans_subscriptions(user_id);
CREATE INDEX idx_plans_subscriptions_status ON plans_subscriptions(status);
CREATE INDEX idx_plans_subscriptions_created ON plans_subscriptions(created_at DESC);

-- Enable RLS
ALTER TABLE plans_subscriptions ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Anyone can view all deposits"
ON plans_subscriptions FOR SELECT TO public
USING (true);

CREATE POLICY "Anyone can update deposits"
ON plans_subscriptions FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can insert their own deposits"
ON plans_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deposits"
ON plans_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON plans_subscriptions TO authenticated;
GRANT ALL ON plans_subscriptions TO service_role;
