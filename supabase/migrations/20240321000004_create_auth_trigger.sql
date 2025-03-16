-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    date_joined,
    kyc_status
  ) values (
    new.id,
    new.email,
    now(),
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- One-time script to create profiles for existing users
insert into public.profiles (id, email, date_joined, kyc_status)
select 
  id,
  email,
  created_at as date_joined,
  'pending' as kyc_status
from auth.users
where id not in (select id from public.profiles);
