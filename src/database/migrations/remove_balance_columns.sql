-- First transfer existing balances to withdrawal_wallet if not null
UPDATE profiles 
SET withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + COALESCE(balance, 0) + COALESCE(commissions_balance, 0)
WHERE balance IS NOT NULL OR commissions_balance IS NOT NULL;

-- Then drop the columns
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS balance,
  DROP COLUMN IF EXISTS commissions_balance;

-- Add a comment to document the change
COMMENT ON TABLE profiles IS 'User profiles table. Balance tracking moved to withdrawal_wallet';
