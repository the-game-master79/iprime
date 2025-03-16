create table if not exists "public"."transactions" (
    "id" uuid default uuid_generate_v4() primary key,
    "created_at" timestamptz default timezone('utc'::text, now()) not null,
    "user_id" uuid references auth.users(id) not null,
    "amount" decimal not null,
    "type" text not null check (type in ('deposit', 'withdrawal', 'commission', 'investment')),
    "status" text not null check (status in ('Pending', 'Processing', 'Completed', 'Failed')),
    "reference_id" uuid,
    "description" text,
    "method" text
);

-- Enable RLS
alter table "public"."transactions" enable row level security;

-- Create policies
create policy "Enable read access for authenticated users"
on "public"."transactions"
for select
using (auth.uid() = user_id);

create policy "Enable insert for authenticated users"
on "public"."transactions"
for insert
to authenticated
with check (auth.uid() = user_id);
