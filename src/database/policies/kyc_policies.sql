-- Enable RLS
ALTER TABLE kyc ENABLE ROW LEVEL SECURITY;

-- Users can insert their own KYC records
CREATE POLICY "Users can insert their own KYC records"
ON kyc FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own KYC records
CREATE POLICY "Users can view their own KYC records"
ON kyc FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own KYC records
CREATE POLICY "Users can update their own KYC records"
ON kyc FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin policy
CREATE POLICY "Admin users have full access to KYC records"
ON kyc FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Grant necessary permissions
GRANT ALL ON kyc TO authenticated;
GRANT ALL ON kyc TO service_role;
