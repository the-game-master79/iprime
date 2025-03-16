-- Create a unified function to handle balance changes
create or replace function modify_balance(
  user_id uuid,
  amount decimal,
  operation text -- 'add' or 'subtract'
)
returns decimal
language plpgsql
security definer
as $$
declare
  current_balance decimal;
  new_balance decimal;
begin
  -- Get current balance
  select balance into current_balance
  from profiles
  where id = user_id;
  
  -- Handle null balance
  current_balance := coalesce(current_balance, 0);
  
  -- Check if sufficient balance for subtraction
  if operation = 'subtract' and current_balance < amount then
    raise exception 'Insufficient balance';
  end if;
  
  -- Update balance based on operation
  update profiles
  set balance = case 
    when operation = 'add' then current_balance + amount
    when operation = 'subtract' then current_balance - amount
    else current_balance
  end
  where id = user_id
  returning balance into new_balance;
  
  return new_balance;
end;
$$;

-- Update deposit status change handler
create or replace function handle_deposit_status_change()
returns trigger as $$
begin
  -- Only handle status changes
  if OLD.status = NEW.status then
    return NEW;
  end if;

  -- If status changes to Completed
  if NEW.status = 'Completed' and OLD.status != 'Completed' then
    perform modify_balance(NEW.user_id, NEW.amount, 'add');
  end if;

  -- If status changes from Completed to something else
  if OLD.status = 'Completed' and NEW.status != 'Completed' then
    perform modify_balance(NEW.user_id, NEW.amount, 'subtract');
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Drop all existing balance modification functions to avoid conflicts
drop function if exists increment_balance(decimal, uuid);
drop function if exists increment_balance(uuid, decimal);
drop function if exists decrement_balance(decimal, uuid);
drop function if exists decrement_balance(uuid, decimal);

-- Create a single consistent increment_balance function
create or replace function increment_balance(user_id uuid, amount decimal)
returns decimal
language plpgsql
security definer
as $$
begin
  return modify_balance(user_id, amount, 'add');
end;
$$;

-- Create a single consistent decrement_balance function
create or replace function decrement_balance(user_id uuid, amount decimal)
returns decimal
language plpgsql
security definer
as $$
begin
  return modify_balance(user_id, amount, 'subtract');
end;
$$;

-- Create trigger for deposits
drop trigger if exists on_deposit_status_change on deposits;
create trigger on_deposit_status_change
  before update of status on deposits
  for each row
  execute function handle_deposit_status_change();
