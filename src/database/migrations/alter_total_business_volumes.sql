-- Add business_rank column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_business_volumes' 
        AND column_name = 'business_rank'
    ) THEN
        ALTER TABLE total_business_volumes 
        ADD COLUMN business_rank TEXT DEFAULT 'New Member';
    END IF;
END $$;

-- Update existing records with correct ranks
UPDATE total_business_volumes tbv
SET business_rank = CASE 
    WHEN p.direct_count >= 2 THEN (
        SELECT title 
        FROM ranks 
        WHERE business_amount <= tbv.total_amount
        ORDER BY business_amount DESC 
        LIMIT 1
    )
    ELSE 'New Member'
END
FROM profiles p
WHERE tbv.user_id = p.id;
