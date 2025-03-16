-- Add necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update profiles table
ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "current_level" smallint DEFAULT 1,
ADD COLUMN IF NOT EXISTS "referral_code" text UNIQUE,
ADD COLUMN IF NOT EXISTS "referred_by" text,
ADD COLUMN IF NOT EXISTS "commissions_balance" decimal DEFAULT 0;

-- Create referral_relationships table with proper relationships
DROP TABLE IF EXISTS "public"."referral_relationships";
CREATE TABLE "public"."referral_relationships" (
    "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now(),
    "referrer_id" uuid REFERENCES profiles(id),
    "referred_id" uuid REFERENCES profiles(id),
    "level" smallint,
    "commissions" decimal DEFAULT 0,
    UNIQUE("referrer_id", "referred_id")
);

-- Create or replace function to handle referral relationships with proper leveling
CREATE OR REPLACE FUNCTION handle_referral_relationship()
RETURNS TRIGGER AS $$
DECLARE
    referrer_user_id uuid;
    current_referrer_id uuid;
    current_level int := 1;
BEGIN
    -- If there's a referral code
    IF NEW.referred_by IS NOT NULL THEN
        -- Get the initial referrer's user ID
        SELECT id INTO referrer_user_id
        FROM profiles
        WHERE referral_code = NEW.referred_by;

        IF referrer_user_id IS NOT NULL THEN
            -- Insert direct (level 1) relationship
            INSERT INTO referral_relationships (referrer_id, referred_id, level)
            VALUES (referrer_user_id, NEW.id, 1);

            -- Insert indirect relationships up to level 10
            current_referrer_id := referrer_user_id;
            
            WHILE current_level < 10 AND current_referrer_id IS NOT NULL LOOP
                -- Find the referrer's referrer
                SELECT rr.referrer_id INTO current_referrer_id
                FROM referral_relationships rr
                WHERE rr.referred_id = current_referrer_id
                AND rr.level = 1;  -- Always look for direct relationship

                IF current_referrer_id IS NOT NULL THEN
                    current_level := current_level + 1;
                    
                    -- Insert the relationship with the correct level
                    INSERT INTO referral_relationships (referrer_id, referred_id, level)
                    VALUES (current_referrer_id, NEW.id, current_level);
                END IF;
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_referral_relationship();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer_id ON referral_relationships(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred_id ON referral_relationships(referred_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_commissions_balance ON profiles(commissions_balance);
