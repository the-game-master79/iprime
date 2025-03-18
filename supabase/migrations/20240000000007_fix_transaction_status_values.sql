-- Drop existing status check constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Add new status check constraint with standardized values
ALTER TABLE transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));

-- Update handle_rank_achievement function with correct status value
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
    -- Only proceed if business_rank has changed
    IF OLD.business_rank = NEW.business_rank THEN
        RETURN NEW;
    END IF;

    -- Insert log entry
    INSERT INTO rank_bonus_logs (user_id, old_rank, new_rank, credited)
    VALUES (NEW.id, OLD.business_rank, NEW.business_rank, false)
    RETURNING id INTO log_id;

    -- Get the rank details
    SELECT bonus, bonus_description 
    INTO bonus_amount, bonus_desc
    FROM ranks 
    WHERE title = NEW.business_rank;

    -- Check if rank details were found
    IF bonus_amount IS NULL THEN
        UPDATE rank_bonus_logs 
        SET error_message = 'Rank not found in ranks table'
        WHERE id = log_id;
        RETURN NEW;
    END IF;

    -- Check if this rank was already credited
    IF NEW.business_rank = ANY(NEW.credited_ranks) THEN
        UPDATE rank_bonus_logs 
        SET error_message = 'Rank bonus already credited'
        WHERE id = log_id;
        RETURN NEW;
    END IF;

    -- Start transaction
    BEGIN
        -- Credit the bonus to user's balance
        UPDATE profiles
        SET 
            balance = COALESCE(balance, 0) + bonus_amount,
            credited_ranks = array_append(COALESCE(credited_ranks, ARRAY[]::text[]), NEW.business_rank)
        WHERE id = NEW.id;

        -- Create transaction record with correct status value
        INSERT INTO transactions (
            user_id,
            amount,
            type,
            status,  -- Using standardized status value
            description
        ) VALUES (
            NEW.id,
            bonus_amount,
            'rank_bonus',
            'completed',  -- Changed from 'Completed' to 'completed'
            COALESCE(bonus_desc, 'Rank achievement bonus for ' || NEW.business_rank)
        );

        -- Update log to show success
        UPDATE rank_bonus_logs 
        SET 
            credited = true,
            bonus_amount = handle_rank_achievement.bonus_amount
        WHERE id = log_id;

        -- If any of the above fails, it will roll back automatically
        EXCEPTION WHEN OTHERS THEN
            UPDATE rank_bonus_logs 
            SET error_message = SQLERRM
            WHERE id = log_id;
            RAISE EXCEPTION 'Failed to process rank bonus: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Update any existing rank bonus transactions to match new status format
UPDATE transactions 
SET status = 'completed' 
WHERE type = 'rank_bonus' 
AND status = 'Completed';