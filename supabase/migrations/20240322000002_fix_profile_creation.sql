-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Recreate function with all required fields
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone,
    date_joined,
    kyc_status,
    status
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    now(),
    'pending',
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Fix existing profiles with missing data
update public.profiles
set
  first_name = coalesce(first_name, ''),
  last_name = coalesce(last_name, ''),
  full_name = coalesce(full_name, ''),
  phone = coalesce(phone, ''),
  status = coalesce(status, 'active'),
  kyc_status = coalesce(kyc_status, 'pending')
where id in (
  select id from auth.users
);
