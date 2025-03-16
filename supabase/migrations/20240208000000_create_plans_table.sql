create table if not exists "public"."plans" (
    "id" uuid default uuid_generate_v4() primary key,
    "created_at" timestamptz default timezone('utc'::text, now()) not null,
    "name" text not null,
    "description" text,
    "investment" numeric not null,
    "returns_percentage" numeric not null,
    "duration_days" integer not null,
    "benefits" text,
    "status" text default 'active'::text
);

-- Enable RLS
alter table "public"."plans" enable row level security;

-- Create policies
create policy "Enable read access for all users"
on "public"."plans"
for select
using (true);

create policy "Enable insert for authenticated users only"
on "public"."plans"
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on "public"."plans"
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
