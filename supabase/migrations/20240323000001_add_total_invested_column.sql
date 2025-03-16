-- Add total_invested column to profiles
alter table public.profiles
add column if not exists total_invested decimal(20,8) default 0;

-- Create function to handle investment
create or replace function handle_investment()
returns trigger as $$
begin
  -- Update user's balance and total_invested
  update profiles 
  set balance = balance - NEW.amount,
      total_invested = total_invested + NEW.amount
  where id = NEW.user_id;
  
  return NEW;
end;
$$ language plpgsql security definer;

-- Create investments table if not exists
create table if not exists public.investments (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    plan_id uuid references plans(id) not null,
    amount decimal(20,8) not null,
    status text check (status in ('active', 'completed', 'cancelled')) default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.investments enable row level security;

-- Create trigger for new investments
create trigger on_investment_created
    after insert on investments
    for each row
    execute function handle_investment();

-- Create policies
create policy "Users can view their own investments"
    on investments for select
    using (auth.uid() = user_id);

create policy "Users can create their own investments"
    on investments for insert
    with check (auth.uid() = user_id);

-- Create indexes
create index if not exists idx_investments_user_id on investments(user_id);
create index if not exists idx_investments_plan_id on investments(plan_id);
create index if not exists idx_profiles_total_invested on profiles(total_invested);
