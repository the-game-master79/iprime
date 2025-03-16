-- Drop existing triggers and function
DROP TRIGGER IF EXISTS handle_investment_trigger ON public.investments;
DROP TRIGGER IF EXISTS on_investment_created ON public.investments;
DROP FUNCTION IF EXISTS handle_investment() CASCADE;

-- Drop existing functions first
DROP FUNCTION IF EXISTS update_business_rank(uuid);
DROP FUNCTION IF EXISTS calculate_total_business_volume(uuid);

-- Create or replace function with explicit table references
CREATE OR REPLACE FUNCTION handle_investment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's balance and total_invested with explicit table references
  UPDATE public.profiles p
  SET balance = p.balance - NEW.amount,
      total_invested = p.total_invested + NEW.amount
  WHERE p.id = NEW.user_id;
  
  -- Create a transaction record with explicit user_id reference
  INSERT INTO public.transactions (
    user_id,
    amount,
    type,
    status,
    reference_id,
    description
  ) VALUES (
    NEW.user_id,
    NEW.amount,
    'investment',
    'Completed',
    NEW.id,
    'Investment in plan'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate both triggers
CREATE TRIGGER on_investment_created
  AFTER INSERT ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION handle_investment();

-- Update function with consistent parameter naming
CREATE OR REPLACE FUNCTION update_business_rank(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET
    business_volume = (
      SELECT COALESCE(SUM(i.amount), 0)
      FROM public.investments i
      WHERE i.user_id = update_business_rank.user_id
      AND i.status = 'active'
    )
  WHERE profiles.id = update_business_rank.user_id;
END;
$$;

-- Update related function with consistent parameter naming
CREATE OR REPLACE FUNCTION calculate_total_business_volume(user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(i.amount), 0)
    FROM public.investments i
    WHERE i.user_id = calculate_total_business_volume.user_id
    AND i.status = 'active'
  );
END;
$$;
