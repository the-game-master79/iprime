-- Add balance column to profiles
alter table public.profiles
add column if not exists balance decimal(20,8) default 0;

-- Create function to update balance on deposit status change
create or replace function handle_deposit_status_change()
returns trigger as $$
begin
  -- Only handle status changes
  if OLD.status = NEW.status then
    return NEW;
  end if;

  -- If deposit is completed, add to user balance
  if NEW.status = 'Completed' then
    update profiles 
    set balance = balance + NEW.amount
    where id = NEW.user_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create function to update balance on withdrawal status change
create or replace function handle_withdrawal_status_change()
returns trigger as $$
begin
  -- Only handle status changes
  if OLD.status = NEW.status then
    return NEW;
  end if;

  -- If withdrawal is completed, subtract from user balance
  if NEW.status = 'Completed' then
    update profiles 
    set balance = balance - NEW.amount
    where id = NEW.user_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create triggers
drop trigger if exists on_deposit_status_change on deposits;
create trigger on_deposit_status_change
  before update of status on deposits
  for each row
  execute function handle_deposit_status_change();

drop trigger if exists on_withdrawal_status_change on withdrawals;
create trigger on_withdrawal_status_change
  before update of status on withdrawals
  for each row
  execute function handle_withdrawal_status_change();
