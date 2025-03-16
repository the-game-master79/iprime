-- Function to distribute commissions to upline
create or replace function distribute_subscription_commissions(
  subscriber_id uuid,
  subscription_amount decimal
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
begin
  -- Start with the immediate referrer
  select referred_by into current_referrer_id
  from profiles
  where id = subscriber_id;
  
  -- Loop through the referral chain
  while current_referrer_id is not null and current_level <= (select max(level) from commission_structures) loop
    -- Get commission rate for current level
    select percentage into commission_rate
    from commission_structures
    where level = current_level;
    
    -- Calculate commission amount
    commission_amount := (subscription_amount * commission_rate) / 100;
    
    -- Update referral relationship and credit commission directly
    insert into referral_relationships (referrer_id, referred_id, level, commissions)
    values (current_referrer_id, subscriber_id, current_level, commission_amount)
    on conflict (referrer_id, referred_id)
    do update set 
      commissions = referral_relationships.commissions + commission_amount,
      level = current_level;

    -- Credit both commission balance and main balance
    update profiles 
    set 
      commissions_balance = commissions_balance + commission_amount,
      balance = balance + commission_amount
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
      NEW.id,
      format('Level %s commission from subscription #%s', current_level, NEW.id)
    );

    -- Move up the chain
    select referred_by into current_referrer_id
    from profiles
    where id = current_referrer_id;
    
    current_level := current_level + 1;
  end loop;
end;
$$;

-- Trigger function to handle new subscriptions
create or replace function handle_new_subscription()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Distribute commissions when a new subscription is created
  perform distribute_subscription_commissions(NEW.user_id, NEW.amount);
  return NEW;
end;
$$;

-- Create trigger for new subscriptions
drop trigger if exists on_new_subscription on subscriptions;
create trigger on_new_subscription
  after insert on subscriptions
  for each row
  execute function handle_new_subscription();
