-- Drop the unique constraint first
ALTER TABLE ranks DROP CONSTRAINT IF EXISTS unique_rank_order;

-- Remove the order column
ALTER TABLE ranks DROP COLUMN IF EXISTS "order";
