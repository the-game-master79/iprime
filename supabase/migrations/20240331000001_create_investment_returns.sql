-- Function to credit investment returns
create or replace function credit_investment_returns(p_user_id uuid default null)
returns decimal
language plpgsql
security definer
as $$
declare
  investment record;
  total_credited decimal := 0;
begin
  -- Get active investments with their plan details for all active user plans
  for investment in
    select 
      i.id,
      i.user_id,
      i.amount,
      i.created_at,
      i.plan_id,
      p.returns_percentage,
      p.duration_days,
      extract(day from now() - i.created_at)::integer as elapsed_days,
      exists (
        select 1 from user_plans up2 
        where up2.user_id = i.user_id 
        and up2.plan_id = i.plan_id 
        and up2.created_at < i.created_at 
        and up2.status = 'active'
      ) as is_valid_plan
    from investments i
    join plans p on i.plan_id = p.id
    where i.status = 'active'
    and (p_user_id is null or i.user_id = p_user_id)
  loop
    -- Only process if the investment was made after subscribing to the plan
    if investment.is_valid_plan then
      declare
        daily_return decimal;
        total_return decimal;
      begin
        -- Calculate daily return amount based on plan percentage
        -- Example: $1000 investment at 1% daily = $10 per day
        daily_return := (investment.amount * investment.returns_percentage / 100);
        
        -- Only credit returns up to the plan duration
        if investment.elapsed_days <= investment.duration_days then
          -- Credit one day's worth of returns
          total_return := daily_return;
          total_credited := total_credited + total_return;
          
          -- Update user balance
          update profiles
          set balance = balance + total_return
          where id = investment.user_id;

          -- Record the transaction
          insert into transactions (
            user_id,
            amount,
            type,
            status,
            reference_id,
            description
          ) values (
            investment.user_id,
            total_return,
            'investment_return',
            'Completed',
            investment.id,
            format('Daily return from $%s investment at %s%% rate', 
              investment.amount::text,
              investment.returns_percentage::text
            )
          );

          -- Mark investment as completed if duration is reached
          if investment.elapsed_days = investment.duration_days then
            update investments 
            set status = 'completed'
            where id = investment.id;
          end if;
        end if;
      end;
    end if;
  end loop;
  
  return total_credited;
end;
$$;

-- Create cron job to run daily at midnight
select cron.schedule(
  'credit-investment-returns',
  '0 0 * * *',
  $$select credit_investment_returns();$$
);
