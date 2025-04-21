-- Begin transaction
BEGIN;

-- Update all negative balances to 0
UPDATE profiles SET withdrawal_wallet = 0 WHERE withdrawal_wallet < 0;

-- Commit transaction
COMMIT;

-- Report results
SELECT COUNT(*) as corrected_accounts
FROM profiles
WHERE withdrawal_wallet = 0;
