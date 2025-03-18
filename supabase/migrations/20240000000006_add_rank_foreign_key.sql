-- First ensure ranks table has unique constraint on title
ALTER TABLE ranks
ADD CONSTRAINT ranks_title_key UNIQUE (title);

-- Add foreign key constraint to profiles table
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_business_rank_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_business_rank_fkey
FOREIGN KEY (business_rank)
REFERENCES ranks(title)
ON UPDATE CASCADE;

-- Update any NULL business_ranks to the lowest rank
WITH lowest_rank AS (
    SELECT title 
    FROM ranks 
    ORDER BY business_amount ASC 
    LIMIT 1
)
UPDATE profiles 
SET business_rank = (SELECT title FROM lowest_rank)
WHERE business_rank IS NULL;

-- Make business_rank NOT NULL after setting defaults
ALTER TABLE profiles
ALTER COLUMN business_rank SET NOT NULL;
