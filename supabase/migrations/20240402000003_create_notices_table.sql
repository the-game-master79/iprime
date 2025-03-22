-- Create notices table
create table if not exists public.notices (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    content text not null,
    type text check (type in ('info', 'warning', 'success', 'error')) default 'info',
    is_active boolean default true,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null,
    created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.notices enable row level security;

-- Create policies for authenticated users
create policy "Allow read access for all users"
    on notices for select
    using (is_active = true);

create policy "Allow authenticated users to manage notices"
    on notices for all 
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
create or replace function update_notices_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger notices_updated_at
    before update on notices
    for each row
    execute function update_notices_updated_at();

-- Create index for better query performance
create index idx_notices_is_active on notices(is_active);
create index idx_notices_created_at on notices(created_at);
