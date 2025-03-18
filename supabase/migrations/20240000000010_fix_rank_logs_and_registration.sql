-- First, update existing rank_bonus_logs to have correct old_rank values
UPDATE rank_bonus_logs rbl
SET old_rank = 'New Member'
WHERE old_rank IS NULL 
OR old_rank = 'Bronze';

-- Modify handle_new_user function to set initial rank as New Member
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_referral_code text;
BEGIN
  -- Generate a random referral code
  new_referral_code := upper(substring(md5(random()::text) from 1 for 8));
  
  -- Insert with New Member as initial rank
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    full_name,
    email,
    referral_code,
    referred_by,
    date_joined,
    business_rank,  -- Add business_rank
    business_volume -- Add business_volume
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'full_name',
    new.email,
    new_referral_code,
    new.raw_user_meta_data->>'referred_by',
    timezone('utc'::text, now()),
    'New Member',  -- Set initial rank
    0             -- Set initial volume
  );
  
  -- Create initial rank log entry
  INSERT INTO rank_bonus_logs (
    user_id,
    old_rank,
    new_rank,
    credited,
    bonus_amount
  ) VALUES (
    new.id,
    NULL,
    'New Member',
    true,
    0
  );
  
  RETURN new;
END;
$$;
