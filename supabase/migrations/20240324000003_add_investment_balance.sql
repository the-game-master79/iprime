-- Add investment_balance column to profiles if not exists
alter table profiles 
add column if not exists investment_balance decimal(20,2) default 0;

-- Create function to increment investment balance
create or replace function increment_investment_balance(user_id uuid, amount decimal)
returns decimal
language plpgsql
security definer
as $$
declare
  new_balance decimal;
begin
  update profiles
  set investment_balance = coalesce(investment_balance, 0) + amount
  where id = user_id
  returning investment_balance into new_balance;
  
  return new_balance;
end;
$$;
