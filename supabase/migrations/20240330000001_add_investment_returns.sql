create schema if not exists cron;
create extension if not exists pg_cron with schema cron;

-- Drop existing function if it exists
drop function if exists credit_investment_returns(uuid);

-- Create function to credit investment returns
create or replace function credit_investment_returns(p_user_id uuid)
returns decimal
language plpgsql
security definer
as $$
declare
  total_credited decimal := 0;
  investment record;
begin
  -- Get ALL active investments across ALL active plans for the user
  for investment in
    select 
      i.id,
      i.amount,
      i.created_at,
      p.returns_percentage,
      p.duration_days,
      extract(day from now() - i.created_at)::integer as elapsed_days
    from investments i
    join plans p on i.plan_id = p.id
    join user_plans up on up.plan_id = i.plan_id and up.user_id = i.user_id
    where i.user_id = p_user_id
    and i.status = 'active'
    and up.status = 'active'
    and i.created_at >= up.created_at  -- Ensure investment was made after plan subscription
  loop
    declare
      daily_return decimal;
    begin
      -- Calculate return amount
      daily_return := (investment.amount * investment.returns_percentage / 100);
      
      -- Only credit if within duration period
      if investment.elapsed_days <= investment.duration_days then
        -- Update user balance
        update profiles
        set balance = balance + daily_return
        where id = p_user_id;

        -- Record transaction for this plan's return
        insert into transactions (
          user_id,
          amount,
          type,
          status,
          reference_id,
          description
        ) values (
          p_user_id,
          daily_return,
          'investment_return',
          'Completed',
          investment.id,
          format('Daily return from $%s investment at %s%% rate (Investment Date: %s)', 
            investment.amount::text,
            investment.returns_percentage::text,
            to_char(investment.created_at, 'YYYY-MM-DD')
          )
        );

        total_credited := total_credited + daily_return;
      end if;
    end;
  end loop;
  
  return total_credited;
end;
$$;