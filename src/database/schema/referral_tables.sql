-- Drop existing objects
DROP TRIGGER IF EXISTS referral_relationship_trigger ON referral_relationships;
DROP FUNCTION IF EXISTS handle_referral_relationship CASCADE;
DROP FUNCTION IF EXISTS build_referral_path CASCADE;
DROP TABLE IF EXISTS referral_relationships;

-- Create simplified referral relationships table without path
CREATE TABLE IF NOT EXISTS referral_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES profiles(id),
    referred_id UUID NOT NULL REFERENCES profiles(id),
    level INTEGER NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_referrer_referred UNIQUE (referrer_id, referred_id),
    CONSTRAINT valid_level CHECK (level <= 10)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer ON referral_relationships(referrer_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred ON referral_relationships(referred_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_referral_relationships_level ON referral_relationships(level) WHERE active = true;
