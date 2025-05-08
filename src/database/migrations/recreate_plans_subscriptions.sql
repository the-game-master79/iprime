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
BEGIN
    -- Handle plan approval
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- Deduct from specified wallet
        UPDATE profiles 
        SET 
            withdrawal_wallet = CASE 
                WHEN NEW.wallet_type = 'withdrawal' 
                THEN COALESCE(withdrawal_wallet, 0) - NEW.amount
                ELSE withdrawal_wallet
            END,
            investment_wallet = CASE 
                WHEN NEW.wallet_type = 'investment' 
                THEN COALESCE(investment_wallet, 0) - NEW.amount
                ELSE investment_wallet
            END,
            total_invested = COALESCE(total_invested, 0) + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.user_id;

        -- Create investment transaction record
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

-- Add validation trigger function
CREATE OR REPLACE FUNCTION validate_plan_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if amount is within plan's range
  IF NOT EXISTS (
    SELECT 1 FROM plans 
    WHERE id = NEW.plan_id 
    AND NEW.amount >= min_investment 
    AND NEW.amount <= max_investment
  ) THEN
    RAISE EXCEPTION 'Amount must be within plan''s investment range';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate amount
CREATE TRIGGER check_plan_amount
  BEFORE INSERT OR UPDATE ON plans_subscriptions
  FOR EACH ROW

CREATE POLICY "Users can view their own deposits"
ON plans_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON plans_subscriptions TO authenticated;
GRANT ALL ON plans_subscriptions TO service_role;
