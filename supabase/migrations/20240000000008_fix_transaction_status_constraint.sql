-- First remove the existing constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Update existing transaction statuses to lowercase
UPDATE transactions 
SET status = LOWER(status)
WHERE status != LOWER(status);

-- Update specific status values to match new constraint
UPDATE transactions 
SET status = 
  CASE status
    WHEN 'Completed' THEN 'completed'
    WHEN 'Pending' THEN 'pending'
    WHEN 'Failed' THEN 'failed'
    WHEN 'Cancelled' THEN 'cancelled'
    ELSE 'completed' -- Set default for any unknown status
  END;

-- Now add the constraint after data is fixed
ALTER TABLE transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));

-- Update all triggers to use correct status value
CREATE OR REPLACE FUNCTION handle_rank_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bonus_amount numeric;
    bonus_desc text;
    log_id uuid;
BEGIN
    -- ... existing code...

    -- Start transaction
    BEGIN
        -- ... existing code...

        -- Create transaction record with lowercase status
        INSERT INTO transactions (
            user_id,
            amount,
            type,
            status,
            description
        ) VALUES (
            NEW.id,
            bonus_amount,
            'rank_bonus',
            'completed',
            COALESCE(bonus_desc, 'Rank achievement bonus for ' || NEW.business_rank)
        );

        -- ... existing code...
    END;

    RETURN NEW;
END;
$$;
