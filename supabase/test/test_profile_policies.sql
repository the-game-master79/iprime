-- Test as regular user
SELECT * FROM profiles WHERE user_id = auth.uid();

-- Test as admin
SELECT * FROM profiles;

-- Test referral access
SELECT * FROM profiles WHERE referred_by = (SELECT referral_code FROM current_user_profile);
