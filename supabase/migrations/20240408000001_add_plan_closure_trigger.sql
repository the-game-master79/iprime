-- Create function to handle investment status changes
create or replace function handle_investment_status_change()
returns trigger as $$
begin
  -- If investment is being marked as inactive
  if (OLD.status = 'active' and NEW.status = 'inactive') then
    -- Stop investment returns by recording last payment date
    update investments
    set last_return_date = CURRENT_DATE
    where id = NEW.id;
    
    -- Record the closure transaction
    insert into transactions (
      user_id,
      amount,
      type,
      status,
      reference_id,
      description
    ) values (
      NEW.user_id,
      NEW.amount,
      'investment_closure',
      'Completed',
      NEW.id,
      'Investment plan closed and refunded'
    );
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger for investment status changes
drop trigger if exists on_investment_status_change on investments;
create trigger on_investment_status_change
  after update of status on investments
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function handle_investment_status_change();

-- Add new status to transactions type check
alter table transactions 
  drop constraint if exists transactions_type_check,
  add constraint transactions_type_check 
  check (type in ('deposit', 'withdrawal', 'commission', 'investment', 'investment_return', 'investment_closure'));
