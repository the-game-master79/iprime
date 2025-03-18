-- Add unique constraint to ranks title if not exists
ALTER TABLE ranks
ADD CONSTRAINT ranks_title_unique UNIQUE (title);

-- Truncate existing ranks to start fresh
TRUNCATE TABLE ranks;

-- Insert all ranks with their correct values
INSERT INTO ranks (title, business_amount, bonus, bonus_description) VALUES 
('New Member', 0, 0, 'Welcome to the platform'),
('Amber', 2000, 50, 'Amber rank achievement bonus'),
('Jade', 5000, 125, 'Jade rank achievement bonus'),
('Pearl', 10000, 250, 'Pearl rank achievement bonus'),
('Sapphire', 25000, 625, 'Sapphire rank achievement bonus'),
('Topaz', 50000, 1250, 'Topaz rank achievement bonus'),
('Ruby', 75000, 1875, 'Ruby rank achievement bonus'),
('Emerald', 125000, 3125, 'Emerald rank achievement bonus'),
('Diamond', 350000, 8750, 'Diamond rank achievement bonus'),
('Platinum', 750000, 18750, 'Platinum rank achievement bonus'),
('Gold', 1200000, 30000, 'Gold rank achievement bonus'),
('Legend', 2500000, 62500, 'Legend rank achievement bonus'),
('Ultra Legend', 5000000, 125000, 'Ultra Legend rank achievement bonus'),
('The King', 10000000, 250000, 'The King rank achievement bonus'),
('Mastermind', 20000000, 500000, 'Mastermind rank achievement bonus'),
('Kohinoor', 50000000, 1250000, 'Kohinoor rank achievement bonus');

-- Update the default value for business_rank column
ALTER TABLE profiles 
ALTER COLUMN business_rank SET DEFAULT 'New Member';

-- Update determine_business_rank function to handle all ranks properly
CREATE OR REPLACE FUNCTION determine_business_rank(volume numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF volume = 0 THEN
        RETURN 'New Member';
    END IF;

    RETURN CASE
        WHEN volume >= 50000000 THEN 'Kohinoor'
        WHEN volume >= 20000000 THEN 'Mastermind'
        WHEN volume >= 10000000 THEN 'The King'
        WHEN volume >= 5000000 THEN 'Ultra Legend'
        WHEN volume >= 2500000 THEN 'Legend'
        WHEN volume >= 1200000 THEN 'Gold'
        WHEN volume >= 750000 THEN 'Platinum'
        WHEN volume >= 350000 THEN 'Diamond'
        WHEN volume >= 125000 THEN 'Emerald'
        WHEN volume >= 75000 THEN 'Ruby'
        WHEN volume >= 50000 THEN 'Topaz'
        WHEN volume >= 25000 THEN 'Sapphire'
        WHEN volume >= 10000 THEN 'Pearl'
        WHEN volume >= 5000 THEN 'Jade'
        WHEN volume >= 2000 THEN 'Amber'
        WHEN volume > 0 THEN 'New Member'
        ELSE 'New Member'
    END;
END;
$$;

-- Update existing profiles with correct ranks based on their business volume
UPDATE profiles 
SET business_rank = determine_business_rank(business_volume)
WHERE true;
