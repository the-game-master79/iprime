-- Enable RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can create their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can update their own withdrawals" ON withdrawals;

-- Admins can do anything
CREATE POLICY "Admins can manage all withdrawals"
  ON withdrawals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Users can view their own withdrawals
CREATE POLICY "Users can view their own withdrawals"
  ON withdrawals
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own withdrawals
CREATE POLICY "Users can create their own withdrawals"
  ON withdrawals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own withdrawals
CREATE POLICY "Users can update their own withdrawals"
  ON withdrawals
  FOR UPDATE
  USING (user_id = auth.uid());
