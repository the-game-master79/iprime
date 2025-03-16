create table if not exists "public"."user_plans" (
    "id" uuid default uuid_generate_v4() primary key,
    "created_at" timestamptz default timezone('utc'::text, now()) not null,
    "user_id" uuid references auth.users(id) not null,
    "plan_id" uuid references plans(id) not null,
    "status" text default 'active'::text,
    unique(user_id, plan_id)
);

-- Enable RLS
alter table "public"."user_plans" enable row level security;

-- Create policies
create policy "Users can view their own subscriptions"
on "public"."user_plans"
for select
using (auth.uid() = user_id);

create policy "Users can create their own subscriptions"
on "public"."user_plans"
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
on "public"."user_plans"
for update
using (auth.uid() = user_id);
