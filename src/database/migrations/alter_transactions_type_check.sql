-- Drop existing check constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add updated check constraint with new types
ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
    'deposit', 
    'withdrawal', 
    'investment', 
    'commission', 
    'rank_bonus',
    'investment_return',
    'refund',
    'deduction',
    'adjustment'
));

-- Add comment documenting valid transaction types
COMMENT ON COLUMN transactions.type IS 'Valid types: deposit, withdrawal, investment, commission, rank_bonus, investment_return, refund, deduction, adjustment';
