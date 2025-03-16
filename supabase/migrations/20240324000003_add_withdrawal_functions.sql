-- Create a function to safely decrement balance for withdrawals
create or replace function handle_withdrawal_status_change()
returns trigger as $$
begin
  -- Only handle status changes
  if OLD.status = NEW.status then
    return NEW;
  end if;

  -- If status changes to Completed, subtract from balance
  if NEW.status = 'Completed' and OLD.status != 'Completed' then
    perform modify_balance(NEW.user_id, NEW.amount, 'subtract');
  end if;

  -- If status changes from Completed to something else, add back to balance
  if OLD.status = 'Completed' and NEW.status != 'Completed' then
    perform modify_balance(NEW.user_id, NEW.amount, 'add');
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any
drop trigger if exists on_withdrawal_status_change on withdrawals;

-- Create trigger for withdrawals
create trigger on_withdrawal_status_change
  before update of status on withdrawals
  for each row
  execute function handle_withdrawal_status_change();
