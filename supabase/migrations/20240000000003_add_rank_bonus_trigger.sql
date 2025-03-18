-- Add column to profiles to track credited ranks
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credited_ranks text[] DEFAULT array[]::text[];

-- Add debug logging table
CREATE TABLE IF NOT EXISTS public.rank_bonus_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    old_rank text,
    new_rank text,
    bonus_amount numeric,
    credited boolean,
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- Function to handle rank achievement and bonus
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

        -- Create transaction record for the bonus
        INSERT INTO transactions (
            user_id,
            amount,
            type,
            status,
            description,
            created_at
        ) VALUES (
            NEW.id,
            bonus_amount,
            'rank_bonus',
            'completed',
            COALESCE(bonus_desc, 'Rank achievement bonus for ' || NEW.business_rank),
            NOW()
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_rank_achievement ON profiles;
CREATE TRIGGER on_rank_achievement
    AFTER UPDATE OF business_rank
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_rank_achievement();

-- Function to retroactively check and credit missing rank bonuses
CREATE OR REPLACE FUNCTION check_missing_rank_bonuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT 
            p.id,
            p.business_rank,
            p.credited_ranks
        FROM profiles p
        WHERE p.business_rank IS NOT NULL
        AND (
            p.credited_ranks IS NULL 
            OR NOT (p.business_rank = ANY(p.credited_ranks))
        )
    LOOP
        -- Simulate rank update to trigger bonus
        UPDATE profiles
        SET 
            business_rank = user_record.business_rank
        WHERE id = user_record.id;
    END LOOP;
END;
$$;
