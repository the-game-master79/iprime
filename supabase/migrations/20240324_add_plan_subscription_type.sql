-- First update any null or invalid types to 'deposit' to prevent constraint violation
UPDATE public.account_history
SET type = 'deposit'
WHERE type IS NULL OR type NOT IN ('deposit', 'withdraw', 'affiliate_income');

-- Drop existing constraint
ALTER TABLE public.account_history 
DROP CONSTRAINT IF EXISTS account_history_type_check;

-- Add new constraint with updated types
ALTER TABLE public.account_history
ADD CONSTRAINT account_history_type_check 
CHECK (type IN ('deposit', 'withdraw', 'affiliate_income', 'plan_subscription'));

-- Update related policies if needed
DROP POLICY IF EXISTS "Users can view their own account history" ON account_history;
CREATE POLICY "Users can view their own account history"
ON account_history FOR SELECT
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.account_history TO authenticated;
GRANT ALL ON public.account_history TO service_role;
