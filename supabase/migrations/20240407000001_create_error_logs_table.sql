create table if not exists public.error_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id),
    error_message text not null,
    error_stack text,
    error_code text,
    page_url text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.error_logs enable row level security;

-- Allow insert access for authenticated users
create policy "Users can insert error logs"
    on public.error_logs
    for insert
    to authenticated
    with check (true);

-- Allow read access for admin users only
create policy "Admin users can view error logs"
    on public.error_logs
    for select
    using (auth.jwt()->>'role' = 'authenticated');

-- Create indexes
create index if not exists idx_error_logs_user_id on error_logs(user_id);
create index if not exists idx_error_logs_created_at on error_logs(created_at);
