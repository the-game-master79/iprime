-- Drop existing check constraint
ALTER TABLE "public"."transactions" 
DROP CONSTRAINT IF EXISTS "transactions_status_check";

-- Add new check constraint with lowercase values
ALTER TABLE "public"."transactions" 
ADD CONSTRAINT "transactions_status_check" 
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Update existing data to use lowercase status values
UPDATE "public"."transactions" 
SET status = LOWER(status) 
WHERE status != LOWER(status);
