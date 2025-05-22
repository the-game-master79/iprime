-- Drop the table if it exists before creating it
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

-- Add wallet_type column to plans_subscriptions
ALTER TABLE plans_subscriptions
ADD COLUMN IF NOT EXISTS wallet_type TEXT NOT NULL DEFAULT 'withdrawal'
CHECK (wallet_type IN ('withdrawal', 'investment'));

-- Recreate or modify the trigger function
CREATE OR REPLACE FUNCTION handle_plan_status_change()
RETURNS TRIGGER AS $$
DECLARE
    plan_investment NUMERIC;
    debug_msg TEXT;
BEGIN
    -- Always get the correct plan investment amount
    SELECT investment INTO plan_investment FROM plans WHERE id = NEW.plan_id;
    IF plan_investment IS NULL THEN
        RAISE EXCEPTION 'Invalid plan selected';
    END IF;

    -- Debug: log plan_investment and status transition
    RAISE NOTICE '[DEBUG] handle_plan_status_change: plan_id=%, plan_investment=%, status: % -> %', NEW.plan_id, plan_investment, OLD.status, NEW.status;

    -- Handle plan approval
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- Debug: log before profile update
        RAISE NOTICE '[DEBUG] Updating profile for user_id=%', NEW.user_id;

        UPDATE profiles 
        SET 
            withdrawal_wallet = CASE 
                WHEN NEW.wallet_type = 'withdrawal' 
                THEN COALESCE(withdrawal_wallet, 0) - plan_investment
                ELSE withdrawal_wallet
            END,
            updated_at = NOW()
        WHERE id = NEW.user_id;

        -- Debug: log after profile update
        RAISE NOTICE '[DEBUG] Profile updated for user_id=%', NEW.user_id;

        -- Create investment transaction record (use plan investment amount)
        RAISE NOTICE '[DEBUG] Inserting transaction for user_id=% amount=%', NEW.user_id, plan_investment;
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            wallet_type,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.user_id,
            plan_investment,
            'investment',
            'Completed',
            'system',
            NEW.wallet_type,
            'Investment plan subscription approved',
            NEW.id,
            NOW()
        );

        -- Debug: log after transaction insert
        RAISE NOTICE '[DEBUG] Transaction inserted for user_id=%', NEW.user_id;

        -- Call function to distribute business volume
        PERFORM distribute_business_volume(NEW.id, NEW.user_id, plan_investment);

    -- Handle plan rejection
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        RAISE NOTICE '[DEBUG] Plan rejected for user_id=%', NEW.user_id;
        -- Create transaction record for rejected investment (use plan investment amount)
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            wallet_type,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.user_id,
            plan_investment,
            'investment',
            'Failed',
            'system',
            NEW.wallet_type,
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

-- Add validation trigger function
CREATE OR REPLACE FUNCTION validate_plan_amount()
RETURNS TRIGGER AS $$
DECLARE
    plan_investment NUMERIC;
BEGIN
  -- Get the required investment amount for the plan
  SELECT investment INTO plan_investment FROM plans WHERE id = NEW.plan_id;
  IF plan_investment IS NULL THEN
    RAISE EXCEPTION 'Invalid plan selected';
  END IF;
  -- Check if amount matches the plan's investment exactly
  IF NEW.amount <> plan_investment THEN
    RAISE EXCEPTION 'Amount must match the plan''s investment amount';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate amount
CREATE TRIGGER check_plan_amount
  BEFORE INSERT OR UPDATE ON plans_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_plan_amount();

CREATE POLICY "Users can view their own deposits"
ON plans_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON plans_subscriptions TO authenticated;
GRANT ALL ON plans_subscriptions TO service_role;

-- Grant permissions for triggers and functions to insert/update transactions and profiles
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow service_role and triggers to bypass RLS for transactions and profiles
ALTER FUNCTION handle_plan_status_change() SECURITY DEFINER;

GRANT ALL ON transactions TO authenticated, service_role;
GRANT ALL ON profiles TO authenticated, service_role;

-- Policy to allow inserts/updates from triggers (for service_role)
CREATE POLICY "Allow service_role to insert/update for triggers"
ON transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role to update for triggers"
ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
