-- Add available_balance column to profiles
alter table public.profiles
add column if not exists balance decimal(20,8) default 0;

-- Create index for balance lookups
create index if not exists idx_profiles_balance on profiles(balance);

-- Update existing rows to have default balance if needed
update public.profiles 
set balance = 0 
where balance is null;
