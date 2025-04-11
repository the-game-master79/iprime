-- Start transaction
BEGIN;

-- Remove any invalid relationships first
DELETE FROM referral_relationships 
WHERE referrer_id IS NULL 
   OR referred_id IS NULL;

-- Clear remaining relationships
TRUNCATE TABLE referral_relationships;

CREATE OR REPLACE FUNCTION rebuild_referral_relationships()
RETURNS void AS $$
DECLARE
    user_rec RECORD;
    current_referrer_code TEXT;
    current_referrer_id UUID;
    current_level INTEGER;
    processed INTEGER := 0;
BEGIN
    -- Loop through all users with referrers
    FOR user_rec IN (
        SELECT DISTINCT ON (id) id, referred_by 
        FROM profiles 
        WHERE referred_by IS NOT NULL
        ORDER BY id
    ) LOOP
        BEGIN  -- Start sub-transaction for each user
            -- Reset for each user
            current_level := 1;
            current_referrer_code := user_rec.referred_by;
            
            -- Track progress
            processed := processed + 1;
            RAISE NOTICE 'Processing user % (count: %)', user_rec.id, processed;
            
            -- Build relationships up to 10 levels
            WHILE current_level <= 10 AND current_referrer_code IS NOT NULL LOOP
                -- Get referrer's ID
                SELECT DISTINCT ON (id) id, referred_by 
                INTO current_referrer_id, current_referrer_code
                FROM profiles
                WHERE referral_code = current_referrer_code;
                
                -- Exit if no referrer found
                EXIT WHEN current_referrer_id IS NULL;
                
                -- Skip self-referrals and circular references
                IF current_referrer_id = user_rec.id THEN
                    RAISE NOTICE 'Skipping self-referral for user %', user_rec.id;
                    EXIT;
                END IF;
                
                -- Create relationship if it doesn't exist
                BEGIN
                    INSERT INTO referral_relationships (
                        referrer_id,
                        referred_id,
                        level,
                        created_at
                    ) VALUES (
                        current_referrer_id,
                        user_rec.id,
                        current_level,
                        NOW()
                    );
                EXCEPTION 
                    WHEN unique_violation THEN
                        RAISE NOTICE 'Duplicate relationship found for referrer: %, referred: %', 
                            current_referrer_id, user_rec.id;
                        -- Continue processing
                END;
                
                -- Move up to next level
                current_level := current_level + 1;
            END LOOP;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with next user
            RAISE WARNING 'Error processing user %: %', user_rec.id, SQLERRM;
        END;
    END LOOP;
    
    -- Update direct counts
    UPDATE profiles p
    SET direct_count = (
        SELECT COUNT(*)
        FROM referral_relationships r
        WHERE r.referrer_id = p.id
        AND r.level = 1
    );
    
    RAISE NOTICE 'Processed % users total', processed;
END;
$$ LANGUAGE plpgsql;

-- Execute the rebuild
SELECT rebuild_referral_relationships();

-- Clean up
DROP FUNCTION rebuild_referral_relationships();

-- Verify results
SELECT COUNT(*) as total_relationships FROM referral_relationships;
SELECT COUNT(DISTINCT referred_id) as unique_referred FROM referral_relationships;

COMMIT;
