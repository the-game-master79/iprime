-- Enable RLS on plans_subscriptions
ALTER TABLE plans_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON plans_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON plans_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON plans_subscriptions;
DROP POLICY IF EXISTS "Admin users can manage all subscriptions" ON plans_subscriptions;

-- Public policies
CREATE POLICY "Anyone can view all deposits"
ON plans_subscriptions
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can update deposits"
ON plans_subscriptions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Authenticated user policies
CREATE POLICY "Users can insert their own deposits"
ON plans_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deposits"
ON plans_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin policy with full access
CREATE POLICY "Admin users have full access"
ON plans_subscriptions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);
