-- Drop existing constraint and columns
ALTER TABLE plans DROP CONSTRAINT IF EXISTS min_less_than_max;
ALTER TABLE plans DROP COLUMN IF EXISTS min_investment;
ALTER TABLE plans DROP COLUMN IF EXISTS max_investment;

-- Recreate columns with proper defaults 
ALTER TABLE plans
ADD COLUMN min_investment NUMERIC NOT NULL DEFAULT 50,
ADD COLUMN max_investment NUMERIC NOT NULL DEFAULT 100000;

-- Add constraint with proper name and validation
ALTER TABLE plans
ADD CONSTRAINT min_less_than_max 
CHECK (min_investment >= 50 AND max_investment <= 100000 AND min_investment < max_investment);

-- Update existing plans with proper investment ranges
UPDATE plans SET 
  min_investment = GREATEST(50, investment * 0.5),
  max_investment = LEAST(100000, investment * 1.5)
WHERE investment IS NOT NULL;
