create table if not exists public.new_users_marquee (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    country text not null,
    joined_time timestamp with time zone default timezone('utc'::text, now()),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.new_users_marquee enable row level security;

-- Create policy to allow anyone to view new users
create policy "New users marquee is viewable by everyone"
    on public.new_users_marquee
    for select
    using (true);

-- Create an index for better query performance
create index idx_new_users_marquee_joined_time 
    on public.new_users_marquee(joined_time);

-- Create a trigger to automatically remove entries older than 7 days
create or replace function cleanup_old_marquee_entries()
returns trigger as $$
begin
  delete from public.new_users_marquee
  where joined_time < now() - interval '7 days';
  return new;
end;
$$ language plpgsql security definer;

create trigger cleanup_old_marquee_entries_trigger
  after insert on public.new_users_marquee
  execute procedure cleanup_old_marquee_entries();
