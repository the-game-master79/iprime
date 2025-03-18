-- Add bonus_description column to ranks table
ALTER TABLE ranks ADD COLUMN IF NOT EXISTS bonus_description TEXT;

-- Update existing ranks with default description
UPDATE ranks 
SET bonus_description = CONCAT('Receive $', bonus::TEXT, ' bonus when reaching this rank')
WHERE bonus_description IS NULL;

-- Make bonus_description NOT NULL
ALTER TABLE ranks ALTER COLUMN bonus_description SET NOT NULL;
