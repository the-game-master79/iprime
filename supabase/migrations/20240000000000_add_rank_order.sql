-- Add order column to ranks table
ALTER TABLE ranks ADD COLUMN IF NOT EXISTS "order" INTEGER;

-- Update existing ranks with order based on business_amount
WITH ranked_rows AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY 
      CASE WHEN title = 'New Member' THEN 0 ELSE 1 END,
      business_amount ASC
    ) as new_order
  FROM ranks
)
UPDATE ranks
SET "order" = ranked_rows.new_order
FROM ranked_rows
WHERE ranks.id = ranked_rows.id;

-- Make order column NOT NULL after setting initial values
ALTER TABLE ranks ALTER COLUMN "order" SET NOT NULL;

-- Add a unique constraint to ensure no duplicate orders
ALTER TABLE ranks ADD CONSTRAINT unique_rank_order UNIQUE ("order");
