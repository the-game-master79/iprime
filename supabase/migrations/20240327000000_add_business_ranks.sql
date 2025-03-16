-- Add rank related columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS business_volume numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS business_rank text DEFAULT 'Bronze';

-- Create function to calculate total business volume (self + downline)
CREATE OR REPLACE FUNCTION calculate_total_business_volume(user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_volume numeric := 0;
  active_investments numeric := 0;
BEGIN
  -- Get user's own active investments
  SELECT COALESCE(SUM(amount), 0) INTO active_investments
  FROM investments
  WHERE user_id = user_id 
  AND status = 'active';
  
  -- Set initial total volume from active investments
  total_volume := active_investments;
  
  -- Add total active investments from all downlines (all levels)
  WITH RECURSIVE downline AS (
    SELECT referred_id, 1 as level
    FROM referral_relationships
    WHERE referrer_id = user_id
    
    UNION ALL
    
    SELECT rr.referred_id, d.level + 1
    FROM referral_relationships rr
    INNER JOIN downline d ON rr.referrer_id = d.referred_id
    WHERE d.level < 10
  )
  SELECT total_volume + COALESCE(SUM(i.amount), 0) INTO total_volume
  FROM downline d
  JOIN investments i ON d.referred_id = i.user_id
  WHERE i.status = 'active';
  
  RETURN total_volume;
END;
$$;

-- Create function to determine rank based on business volume
CREATE OR REPLACE FUNCTION determine_business_rank(volume numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE
    WHEN volume >= 1000000 THEN 'Diamond'
    WHEN volume >= 500000 THEN 'Platinum'
    WHEN volume >= 100000 THEN 'Gold'
    WHEN volume >= 50000 THEN 'Silver'
    ELSE 'Bronze'
  END;
END;
$$;

-- Create function to update user's business volume and rank
CREATE OR REPLACE FUNCTION update_business_rank(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_volume numeric;
  new_rank text;
BEGIN
  -- Calculate new business volume
  new_volume := calculate_total_business_volume(user_id);
  
  -- Determine new rank
  new_rank := determine_business_rank(new_volume);
  
  -- Update user's profile
  UPDATE profiles
  SET 
    business_volume = new_volume,
    business_rank = new_rank
  WHERE id = user_id;
END;
$$;

-- Create trigger function to update ranks when investments change
CREATE OR REPLACE FUNCTION trigger_update_upline_ranks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_referrer_id uuid;
BEGIN
  -- Get the user's immediate referrer
  SELECT referrer_id INTO current_referrer_id
  FROM referral_relationships
  WHERE referred_id = NEW.id AND level = 1;
  
  -- Update ranks up the chain
  WHILE current_referrer_id IS NOT NULL LOOP
    -- Update rank for current referrer
    PERFORM update_business_rank(current_referrer_id);
    
    -- Move up the chain
    SELECT referrer_id INTO current_referrer_id
    FROM referral_relationships
    WHERE referred_id = current_referrer_id AND level = 1;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS update_ranks_on_investment ON profiles;
CREATE TRIGGER update_ranks_on_investment
  AFTER UPDATE OF total_invested
  ON profiles
  FOR EACH ROW
  WHEN (NEW.total_invested IS DISTINCT FROM OLD.total_invested)
  EXECUTE FUNCTION trigger_update_upline_ranks();

-- Create a trigger for investment changes
CREATE OR REPLACE FUNCTION trigger_update_ranks_on_investment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's total_invested in profiles
  UPDATE profiles 
  SET total_invested = (
    SELECT COALESCE(SUM(amount), 0)
    FROM investments
    WHERE user_id = NEW.user_id
    AND status = 'active'
  )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Add trigger for investments table
DROP TRIGGER IF EXISTS update_ranks_on_investment_change ON investments;
CREATE TRIGGER update_ranks_on_investment_change
  AFTER INSERT OR UPDATE OF status, amount
  ON investments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_ranks_on_investment_change();
