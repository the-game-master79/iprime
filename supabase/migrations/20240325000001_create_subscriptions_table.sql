create table if not exists "public"."subscriptions" (
    "id" uuid default uuid_generate_v4() primary key,
    "created_at" timestamptz default timezone('utc'::text, now()) not null,
    "user_id" uuid references auth.users(id) not null,
    "plan_id" uuid references plans(id) not null,
    "amount" decimal not null,
    "status" text default 'active'::text,
    "expiry_date" timestamptz not null
);

-- Enable RLS
alter table "public"."subscriptions" enable row level security;

-- Create policies
create policy "Enable read access for all users"
on "public"."subscriptions"
for select
using (true);

create policy "Enable insert for authenticated users only"
on "public"."subscriptions"
for insert
to authenticated
with check (auth.role() = 'authenticated');
