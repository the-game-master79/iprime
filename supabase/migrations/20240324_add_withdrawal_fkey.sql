-- Add withdrawal_id column to account_history
ALTER TABLE public.account_history
ADD COLUMN withdrawal_id uuid,
ADD CONSTRAINT fk_account_history_withdrawal
FOREIGN KEY (withdrawal_id) 
REFERENCES public.withdrawals(id)
ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_account_history_withdrawal_id 
ON public.account_history(withdrawal_id);

-- Update existing withdrawal records
UPDATE public.account_history ah
SET withdrawal_id = w.id
FROM public.withdrawals w
WHERE ah.user_id = w.user_id 
AND ah.amount = w.amount
AND ah.type = 'withdraw'
AND ah.created_at = w.created_at;
