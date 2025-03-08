create table if not exists public.account_history (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    amount decimal not null,
    type text check (type in ('deposit', 'withdraw', 'affiliate_income')) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    description text,
    status text check (status in ('pending', 'rejected', 'completed')) not null
);

-- Add RLS policies
alter table public.account_history enable row level security;

create policy "Users can view their own account history"
    on public.account_history
    for select
    using (auth.uid() = user_id);

create policy "Service role can manage all account history"
    on public.account_history
    using (auth.role() = 'service_role');
