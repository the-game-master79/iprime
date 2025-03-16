-- Add user_role column to profiles table
alter table public.profiles
add column if not exists user_role text default 'USER';

-- Create an enum constraint for user_role
alter table public.profiles
add constraint valid_user_role check (user_role in ('USER', 'ADMIN'));

-- Drop the recursive policy if it exists
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Create a new policy that checks the current user's role directly
create policy "Admins can view all profiles"
on public.profiles
for select
using (
  (select user_role from public.profiles where id = auth.uid()) = 'ADMIN'
);

-- Add an index to improve query performance
create index if not exists idx_profiles_user_role on public.profiles(user_role);
