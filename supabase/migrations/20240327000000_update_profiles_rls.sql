-- Drop all existing policies
drop policy if exists "Admins can update all profiles" on profiles;
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Allow insert during signup" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can view own profile" on profiles;

-- Admin Policies
create policy "Admins can view all profiles" on profiles
  for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can update all profiles" on profiles
  for update
  using (auth.jwt() ->> 'role' = 'admin');

-- User Policies
create policy "Users can view own profile" on profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Registration Policy
create policy "Allow insert during signup" on profiles
  for insert
  with check (auth.uid() = id);

-- Referral Validation Policy (allows users to search/validate referral codes)
create policy "Allow referral code validation" on profiles
  for select
  using (true);

-- Ensure RLS is enabled
alter table profiles enable row level security;
