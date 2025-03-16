create table if not exists public.withdrawals (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    amount decimal(20,8) not null,
    crypto_name text,
    crypto_symbol text,
    network text,
    wallet_address text not null,
    status text check (status in ('Pending', 'Processing', 'Completed', 'Failed')) default 'Pending',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.withdrawals enable row level security;

-- Create policy to allow users to view their own withdrawals
create policy "Users can view their own withdrawals"
    on public.withdrawals
    for select
    using (auth.uid() = user_id);

-- Create policy to allow users to create their own withdrawals
create policy "Users can create their own withdrawals"
    on public.withdrawals
    for insert
    with check (auth.uid() = user_id);

-- Create policy to allow authenticated users to view all withdrawals
create policy "Authenticated users can view all withdrawals"
    on public.withdrawals
    for select
    using (auth.uid() is not null);

-- Create policy to allow authenticated users to update withdrawals
create policy "Authenticated users can update withdrawals"
    on public.withdrawals
    for update
    using (auth.uid() is not null);

-- Create indexes
create index idx_withdrawals_user_id on public.withdrawals(user_id);
create index idx_withdrawals_status on public.withdrawals(status);
create index idx_withdrawals_created_at on public.withdrawals(created_at);
