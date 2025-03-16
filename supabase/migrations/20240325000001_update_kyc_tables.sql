-- Update kyc status check constraint in profiles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_kyc_status_check 
CHECK (kyc_status IN ('pending', 'processing', 'completed', 'rejected'));

-- Add new columns to kyc table
ALTER TABLE public.kyc
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS document_type text CHECK (document_type IN ('passport', 'national_id', 'driving_license')),
ADD COLUMN IF NOT EXISTS document_number text;

-- Update existing rows to have pending status if needed
UPDATE public.profiles 
SET kyc_status = 'pending' 
WHERE kyc_status NOT IN ('pending', 'processing', 'completed', 'rejected');
