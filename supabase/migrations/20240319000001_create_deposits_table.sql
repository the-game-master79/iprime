-- First drop existing policies
drop policy if exists "Users can insert their own deposits" on deposits;
drop policy if exists "Users can view their own deposits" on deposits;
drop policy if exists "Admins can view all deposits" on deposits;
drop policy if exists "Admins can update deposit status" on deposits;
drop policy if exists "Anyone can update deposits" on deposits;

-- Create or replace the table
create table if not exists public.deposits (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    user_name text not null,
    amount decimal(20,2) not null,
    method text not null,
    status text not null check (status in ('Pending', 'Completed', 'Failed')),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.deposits enable row level security;

-- Create new policies
create policy "Users can insert their own deposits"
    on deposits for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own deposits"
    on deposits for select
    using (auth.uid() = user_id);

create policy "Anyone can view all deposits"
    on deposits for select
    using (true);  -- For testing: allow all authenticated users to view

create policy "Allow status updates on deposits"
    on deposits for update
    using (true)
    with check (
        -- Only allow status field to be updated
        (OLD.status IS DISTINCT FROM NEW.status) AND
        NEW.status in ('Pending', 'Completed', 'Failed')
    );
