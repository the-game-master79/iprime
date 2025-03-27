-- Function to distribute investment commissions
create or replace function distribute_investment_commissions(
  investor_id uuid,
  investment_amount decimal
)
returns void
language plpgsql
security definer
as $$
declare
  current_referrer_id uuid;
  current_level int := 1;
  commission_rate decimal;
  commission_amount decimal;
  current_referrer_code text;
begin
  -- Get the referral code of the investor's referrer
  select p.referred_by into current_referrer_code
  from profiles p
  where p.id = investor_id;

  -- Get the referrer's ID from the referral code
  select p.id into current_referrer_id
  from profiles p
  where p.referral_code = current_referrer_code;
  
  -- Loop through the referral chain
  while current_referrer_id is not null and current_level <= (select max(level) from commission_structures) loop
    -- Get commission rate for current level
    select percentage into commission_rate
    from commission_structures
    where level = current_level;
    
    if commission_rate is not null then
      -- Calculate commission amount
      commission_amount := (investment_amount * commission_rate) / 100;
      
      -- Update referrer's balances
      update profiles 
      set 
        balance = balance + commission_amount,
        commissions_balance = coalesce(commissions_balance, 0) + commission_amount
      where id = current_referrer_id;

      -- Create commission transaction record
      insert into transactions (
        user_id,
        amount,
        type,
        status,
        reference_id,
        description
      ) values (
        current_referrer_id,
        commission_amount,
        'commission',
        'Completed',
        investor_id,
        format('Level %s commission from investment of $%s', current_level, investment_amount)
      );
      
      -- Get next referrer's referral code
      select p.referred_by into current_referrer_code
      from profiles p
      where p.id = current_referrer_id;

      -- Get next referrer's ID from referral code
      select p.id into current_referrer_id
      from profiles p
      where p.referral_code = current_referrer_code;
    end if;
    
    current_level := current_level + 1;
  end loop;
end;
$$;

-- Trigger function to handle new investments
create or replace function handle_new_investment()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Distribute commissions when a new investment is created
  perform distribute_investment_commissions(NEW.user_id, NEW.amount);
  return NEW;
end;
$$;

-- Create trigger for new investments
drop trigger if exists on_new_investment on investments;
create trigger on_new_investment
  after insert on investments
  for each row
  execute function handle_new_investment();

-- Drop the old function and trigger since they're replaced by the unified handler