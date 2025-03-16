-- Add phone column to profiles table
alter table public.profiles
add column if not exists city text;

-- Create index for phone lookups
create index if not exists idx_profiles_city on profiles(city);
