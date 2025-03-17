-- Add occupation and postal_code columns to kyc table
ALTER TABLE public.kyc
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS postal_code text;

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_kyc_occupation ON public.kyc(occupation);
CREATE INDEX IF NOT EXISTS idx_kyc_postal_code ON public.kyc(postal_code);

-- Update existing rows to have empty strings if needed
UPDATE public.kyc
SET 
  occupation = COALESCE(occupation, ''),
  postal_code = COALESCE(postal_code, '');
