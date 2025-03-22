-- Drop existing function first
DROP FUNCTION IF EXISTS credit_investment_returns(uuid);
DROP FUNCTION IF EXISTS credit_investment_returns(); -- Also drop no-argument version if it exists

-- Modify the credit_investment_returns function to better handle daily returns
CREATE OR REPLACE FUNCTION credit_investment_returns(p_user_id uuid DEFAULT NULL)
RETURNS table (
  total_credited decimal,
  transactions_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  investment record;
  v_total_credited decimal := 0;
  v_transactions_count integer := 0;
BEGIN
  -- Get active investments that haven't exceeded their duration
  FOR investment IN 
    SELECT 
      i.id,
      i.user_id,
      i.amount,
      i.created_at,
      p.returns_percentage,
      p.duration_days,
      EXTRACT(day FROM now() - i.created_at)::integer as elapsed_days,
      (
        SELECT MAX(created_at)::date 
        FROM transactions 
        WHERE reference_id = i.id 
        AND type = 'investment_return'
      ) as last_return_date
    FROM investments i
    JOIN plans p ON i.plan_id = p.id
    WHERE i.status = 'active'
    AND (p_user_id IS NULL OR i.user_id = p_user_id)
  LOOP
    -- Only credit if within duration and not already credited today
    IF investment.elapsed_days <= investment.duration_days 
    AND (investment.last_return_date IS NULL OR investment.last_return_date < CURRENT_DATE) THEN
      DECLARE
        daily_return decimal;
      BEGIN
        daily_return := (investment.amount * investment.returns_percentage / 100);
        
        -- Update user balance
        UPDATE profiles
        SET balance = balance + daily_return
        WHERE id = investment.user_id;

        -- Record transaction
        INSERT INTO transactions (
          user_id,
          amount,
          type,
          status,
          reference_id,
          description
        ) VALUES (
          investment.user_id,
          daily_return,
          'investment_return',
          'Completed',
          investment.id,
          format('Daily return of %s%% on $%s investment', 
            investment.returns_percentage::text,
            investment.amount::text
          )
        );

        v_total_credited := v_total_credited + daily_return;
        v_transactions_count := v_transactions_count + 1;
        
        -- If investment duration is complete, mark as completed
        IF investment.elapsed_days = investment.duration_days THEN
          UPDATE investments 
          SET status = 'completed'
          WHERE id = investment.id;
        END IF;
      END;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_total_credited, v_transactions_count;
END;
$$;

-- Schedule the function to run daily at midnight UTC
SELECT cron.schedule(
  'process-investment-returns',
  '0 0 * * *',  -- Run at midnight every day
  $$SELECT credit_investment_returns();$$
);
