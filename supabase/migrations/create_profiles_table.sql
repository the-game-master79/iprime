-- Create a table for user profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  full_name text,
  email text,
  country text,
  status text default 'active',
  date_joined timestamp with time zone default timezone('utc'::text, now()),
  last_login timestamp with time zone,
  referral_code text,
  referred_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Add indexes for referral lookups
create index if not exists idx_profiles_referral_code on profiles (referral_code);
create index if not exists idx_profiles_referred_by on profiles (referred_by);

-- Ensure referral_code is unique
alter table profiles add constraint unique_referral_code unique (referral_code);

-- Update function to handle new user creation with referral code
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_referral_code text;
begin
  -- Generate a random referral code
  new_referral_code := upper(substring(md5(random()::text) from 1 for 8));
  
  insert into public.profiles (
    id,
    first_name,
    last_name,
    full_name,
    email,
    referral_code,
    referred_by,
    date_joined
  )
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'full_name',
    new.email,
    new_referral_code,
    new.raw_user_meta_data->>'referred_by',
    timezone('utc'::text, now())
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
