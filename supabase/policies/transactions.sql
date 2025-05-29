-- 1. Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 2. Allow service_role to do anything (service_role bypasses RLS, but for clarity)
-- (No explicit policy needed, but you can add for documentation)
-- Example: (optional)
CREATE POLICY "Service role can do anything"
  ON transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Allow system/public to insert transactions (e.g., for triggers)
CREATE POLICY "System can insert transactions"
  ON transactions
  FOR INSERT
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. Allow system/public to update transactions (e.g., for triggers)
CREATE POLICY "System can update transactions"
  ON transactions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- 5. Allow users to view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- 6. Allow authenticated users to view their own transactions
CREATE POLICY "Users can view their own transactions (authenticated)"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 7. Allow admin users (from profiles.role) to manage all transactions
CREATE POLICY "Admin users can manage all transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
