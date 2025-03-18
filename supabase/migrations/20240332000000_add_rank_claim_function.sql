-- Function to handle rank bonus claims
CREATE OR REPLACE FUNCTION claim_rank_bonus(rank_title text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_rank text;
    user_volume numeric;
    rank_bonus numeric;
    rank_amount numeric;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's current rank and business volume
    SELECT business_rank, business_volume
    INTO user_rank, user_volume
    FROM profiles
    WHERE id = current_user_id;

    -- Get rank requirements
    SELECT business_amount, bonus
    INTO rank_amount, rank_bonus
    FROM ranks
    WHERE title = rank_title;

    -- Verify eligibility
    IF user_volume < rank_amount THEN
        RAISE EXCEPTION 'Insufficient business volume for this rank';
    END IF;

    -- Check if bonus was already claimed
    IF EXISTS (
        SELECT 1 
        FROM transactions 
        WHERE user_id = current_user_id 
        AND type = 'rank_bonus'
        AND description LIKE '%' || rank_title || '%'
    ) THEN
        RAISE EXCEPTION 'Bonus already claimed for this rank';
    END IF;

    -- Start transaction
    BEGIN
        -- Credit the bonus to user's balance
        UPDATE profiles
        SET balance = COALESCE(balance, 0) + rank_bonus
        WHERE id = current_user_id;

        -- Create transaction record
        INSERT INTO transactions (
            user_id,
            amount,
            type,
            status,
            description
        ) VALUES (
            current_user_id,
            rank_bonus,
            'rank_bonus',
            'completed',
            'Rank achievement bonus for ' || rank_title
        );

        -- Update credited ranks array
        UPDATE profiles
        SET credited_ranks = array_append(COALESCE(credited_ranks, ARRAY[]::text[]), rank_title)
        WHERE id = current_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process rank bonus: %', SQLERRM;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_rank_bonus(text) TO authenticated;
