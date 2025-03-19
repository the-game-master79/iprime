-- Create business volume display table
create table if not exists business_volume_display (
  id uuid primary key default gen_random_uuid(),
  serial_number integer not null,
  name text not null,
  volume numeric(18,2) not null default 0,
  income numeric(18,2) not null default 0,
  rank text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create top recruiters display table
create table if not exists top_recruiters_display (
  id uuid primary key default gen_random_uuid(),
  serial_number integer not null,
  name text not null,
  referrals integer not null default 0,
  income numeric(18,2) not null default 0,
  rank text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add RLS policies
alter table business_volume_display enable row level security;
alter table top_recruiters_display enable row level security;

-- Allow public read access
create policy "Allow public read access to business_volume_display"
  on business_volume_display
  for select
  to public
  using (true);

create policy "Allow public read access to top_recruiters_display"
  on top_recruiters_display
  for select
  to public
  using (true);

-- Add function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add triggers
create trigger update_business_volume_display_updated_at
  before update on business_volume_display
  for each row
  execute function update_updated_at_column();

create trigger update_top_recruiters_display_updated_at
  before update on top_recruiters_display
  for each row
  execute function update_updated_at_column();
