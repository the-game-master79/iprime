-- Update transaction type check constraint to include 'adjustment'
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'commission', 'investment', 'adjustment'));
