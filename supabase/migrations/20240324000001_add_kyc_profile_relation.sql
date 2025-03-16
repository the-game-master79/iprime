-- Drop existing foreign key if it exists (to auth.users)
alter table public.kyc
drop constraint if exists kyc_user_id_fkey;

-- Add foreign key constraint to profiles
alter table public.kyc
add constraint kyc_user_id_fkey
foreign key (user_id)
references public.profiles(id)
on delete cascade;

-- Create index for the foreign key if it doesn't exist
create index if not exists idx_kyc_user_id
on public.kyc(user_id);
