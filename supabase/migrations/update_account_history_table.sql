-- Add policy for updating account history
create policy "Service role can update account history"
    on account_history
    for update
    using (auth.role() = 'service_role');

-- First drop existing column if it exists
ALTER TABLE public.account_history 
DROP COLUMN IF EXISTS deposit_id;

-- Add deposit_id column with proper foreign key
ALTER TABLE public.account_history
ADD COLUMN deposit_id uuid,
ADD CONSTRAINT fk_account_history_deposit
FOREIGN KEY (deposit_id) 
REFERENCES public.deposits(id)
ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_account_history_deposit_id 
ON public.account_history(deposit_id);

-- Update existing policy to include deposit relationship
DROP POLICY IF EXISTS "Users can view their own account history" ON account_history;
CREATE POLICY "Users can view their own account history"
ON account_history FOR SELECT
USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
        SELECT d.user_id 
        FROM deposits d 
        WHERE d.id = account_history.deposit_id
    )
);
