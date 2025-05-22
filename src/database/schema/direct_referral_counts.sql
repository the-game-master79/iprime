-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_direct_count_trigger ON profiles;

-- Create function to manage direct referral counts
CREATE OR REPLACE FUNCTION update_direct_referral_count()
RETURNS TRIGGER AS $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    -- For new referrals or referral changes
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.referred_by IS NOT NULL THEN
        -- Get old count before update
        SELECT direct_count INTO old_count
        FROM profiles
        WHERE referral_code = NEW.referred_by;

        -- Update referrer's direct count by counting all active profiles that used their code
        UPDATE profiles
        SET 
            direct_count = (
                SELECT COUNT(*)
                FROM profiles referred
                WHERE referred.referred_by = profiles.referral_code
                AND referred.status = 'active'
                AND referred.id != profiles.id
            ),
            updated_at = NOW()
        WHERE referral_code = NEW.referred_by
        RETURNING direct_count INTO new_count;

        -- Notify about the count change
        IF FOUND AND (old_count IS DISTINCT FROM new_count) THEN
            PERFORM pg_notify(
                'direct_count_updated',
                json_build_object(
                    'referral_code', NEW.referred_by,
                    'old_count', COALESCE(old_count, 0),
                    'new_count', new_count,
                    'action', TG_OP
                )::text
            );
        END IF;
    END IF;

    -- If referral code changes or status changes, update old referrer's count too
    IF (
        (TG_OP = 'UPDATE' AND (OLD.referred_by IS DISTINCT FROM NEW.referred_by OR OLD.status IS DISTINCT FROM NEW.status))
        OR TG_OP = 'DELETE'
        OR (TG_OP = 'INSERT' AND NEW.referred_by IS NOT NULL)
    ) THEN

        -- Get old count before update
        SELECT direct_count INTO old_count
        FROM profiles
        WHERE referral_code = OLD.referred_by;

        -- Update old referrer's count
        UPDATE profiles
        SET 
            direct_count = (
                SELECT COUNT(*)
                FROM profiles referred
                WHERE referred.referred_by = profiles.referral_code
                AND referred.status = 'active'
                AND referred.id != profiles.id
            ),
            updated_at = NOW()
        WHERE referral_code = OLD.referred_by
        RETURNING direct_count INTO new_count;

        -- Notify about the count change for old referrer
        IF FOUND AND (old_count IS DISTINCT FROM new_count) THEN
            PERFORM pg_notify(
                'direct_count_updated',
                json_build_object(
                    'referral_code', OLD.referred_by,
                    'old_count', COALESCE(old_count, 0),
                    'new_count', new_count,
                    'action', TG_OP
                )::text
            );
        END IF;
    END IF;

    -- Always update new referrer's count if referred_by is present (for INSERT/UPDATE)
    IF (TG_OP IN ('INSERT', 'UPDATE')) AND NEW.referred_by IS NOT NULL THEN
        SELECT direct_count INTO old_count
        FROM profiles
        WHERE referral_code = NEW.referred_by;

        UPDATE profiles
        SET 
            direct_count = (
                SELECT COUNT(*)
                FROM profiles referred
                WHERE referred.referred_by = profiles.referral_code
                AND referred.status = 'active'
                AND referred.id != profiles.id
            ),
            updated_at = NOW()
        WHERE referral_code = NEW.referred_by
        RETURNING direct_count INTO new_count;

        IF FOUND AND (old_count IS DISTINCT FROM new_count) THEN
            PERFORM pg_notify(
                'direct_count_updated',
                json_build_object(
                    'referral_code', NEW.referred_by,
                    'old_count', COALESCE(old_count, 0),
                    'new_count', new_count,
                    'action', TG_OP
                )::text
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for direct count updates with expanded conditions
CREATE TRIGGER update_direct_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_direct_referral_count();

-- Function to refresh all direct counts
CREATE OR REPLACE FUNCTION refresh_all_direct_counts()
RETURNS void AS $$
BEGIN
    UPDATE profiles p
    SET 
        direct_count = (
            SELECT COUNT(*)
            FROM profiles referred
            WHERE referred.referred_by = p.referral_code
            AND referred.status = 'active'
            AND referred.id != p.id
        ),
        updated_at = NOW()
    WHERE p.referral_code IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_lookup 
ON profiles(referred_by, status) 
WHERE status = 'active';
