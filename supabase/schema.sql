create table trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  pair varchar not null,
  type varchar not null check (type in ('buy', 'sell')),
  status varchar not null check (status in ('open', 'pending', 'closed')),
  open_price decimal not null,
  close_price decimal,
  lots decimal not null,
  leverage int not null,
  pnl decimal,
  order_type varchar not null check (order_type in ('market', 'limit')),
  limit_price decimal,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone
);

-- Add RLS policies
alter table trades enable row level security;

create policy "Users can view their own trades"
  on trades for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own trades"
  on trades for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own trades"
  on trades for update
  using ( auth.uid() = user_id );
