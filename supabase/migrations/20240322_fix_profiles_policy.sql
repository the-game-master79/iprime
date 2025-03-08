-- First create a view for current user's profile
CREATE OR REPLACE VIEW current_user_profile AS (
    SELECT 
        user_id,
        role,
        referral_code
    FROM profiles 
    WHERE user_id = auth.uid()
);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;

-- Create new policies using the view
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR -- Can view own profile
    (SELECT role FROM current_user_profile) = 'admin' OR -- Admins can view all
    referred_by = (SELECT referral_code FROM current_user_profile) -- Can view referrals
);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role has full access to profiles"
ON profiles FOR ALL
TO service_role
USING (true);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
