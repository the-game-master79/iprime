CREATE OR REPLACE FUNCTION claim_rank_bonus(rank_title TEXT)
RETURNS void AS $$
DECLARE
    current_user_id UUID;
    rank_details RECORD;
    user_data RECORD;
BEGIN
    -- Get current user ID from RLS context
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's data from total_business_volumes
    SELECT tbv.*, p.direct_count
    INTO user_data
    FROM total_business_volumes tbv
    JOIN profiles p ON p.id = tbv.user_id
    WHERE tbv.user_id = current_user_id;

    IF user_data.direct_count < 2 THEN
        RAISE EXCEPTION 'Minimum 2 direct referrals required';
    END IF;

    -- Get rank details
    SELECT * INTO rank_details
    FROM ranks
    WHERE title = rank_title;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid rank';
    END IF;

    -- Verify rank eligibility
    IF user_data.business_rank != rank_title THEN
        RAISE EXCEPTION 'You are not currently at this rank';
    END IF;

    -- Check if bonus already claimed
    IF EXISTS (
        SELECT 1 
        FROM transactions t
        WHERE t.user_id = current_user_id
        AND t.type = 'rank_bonus'
        AND t.description LIKE '%bonus for ' || rank_title || '%'
    ) THEN
        RAISE EXCEPTION 'Bonus already claimed for this rank';
    END IF;

    -- Begin transaction
    BEGIN
        -- Add rank bonus to withdrawal wallet
        UPDATE profiles 
        SET withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + rank_details.bonus
        WHERE id = current_user_id;

        -- Record the bonus transaction
        INSERT INTO transactions (
            user_id,
            amount,
            type,
            status,
            description
        ) VALUES (
            current_user_id,
            rank_details.bonus,
            'rank_bonus',
            'Completed',
            'Rank bonus for ' || rank_title
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
