create table if not exists "public"."promotions" (
    "id" uuid default uuid_generate_v4() primary key,
    "created_at" timestamptz default timezone('utc'::text, now()) not null,
    "title" text not null,
    "image_url" text not null,
    "link" text not null,
    "status" text default 'active' check (status in ('active', 'inactive')),
    "updated_at" timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table "public"."promotions" enable row level security;

-- Create policies
create policy "Allow read access for all users"
    on "public"."promotions"
    for select
    using (true);

-- Modified policy to allow all authenticated users instead of just admins
create policy "Allow operations for authenticated users"
    on "public"."promotions"
    for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
