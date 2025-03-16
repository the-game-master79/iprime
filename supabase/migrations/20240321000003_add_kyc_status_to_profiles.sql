-- Add kyc_status column with check constraint
alter table public.profiles
add column if not exists kyc_status text 
default 'pending'
check (kyc_status in ('pending', 'completed', 'rejected'));

-- Create index for faster queries
create index if not exists idx_profiles_kyc_status on profiles(kyc_status);

-- Update existing rows to have default status if needed
update public.profiles 
set kyc_status = 'pending' 
where kyc_status is null;
