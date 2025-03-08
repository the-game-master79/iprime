-- Add minimum_deposit and maximum_deposit columns to plans table
ALTER TABLE public.plans
ADD COLUMN minimum_deposit DECIMAL(18,2) NOT NULL,
ADD COLUMN maximum_deposit DECIMAL(18,2) NOT NULL,
ADD CONSTRAINT check_minimum_deposit CHECK (minimum_deposit > 0),
ADD CONSTRAINT check_maximum_deposit CHECK (maximum_deposit >= minimum_deposit);

-- Update existing rows to have default values if needed
UPDATE public.plans
SET 
    minimum_deposit = 10,
    maximum_deposit = 1000000000
WHERE minimum_deposit IS NULL;

-- Create index for searching/filtering by deposit amounts
CREATE INDEX idx_plans_deposit_range 
ON public.plans(minimum_deposit, maximum_deposit);
