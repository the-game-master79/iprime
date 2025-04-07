-- Add role column to profiles table
alter table profiles 
add column if not exists role text not null default 'user'
check (role in ('user', 'admin'));

-- Update existing profiles to have 'user' role
update profiles set role = 'user' where role is null;
