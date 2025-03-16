-- First drop the dependent policy
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Then drop the column and index
alter table public.profiles 
drop column if exists user_role;

drop index if exists idx_profiles_user_role;
