-- Function to create referral signup notification
CREATE OR REPLACE FUNCTION create_referral_signup_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if there's a referral code
  IF NEW.referred_by IS NOT NULL THEN
    -- Create notification for the referrer
    INSERT INTO notices (
      title,
      content,
      type,
      category,
      user_id,
      is_active
    ) 
    SELECT 
      'New referral signup',
      format('Congratulations! Your friend %s %s has joined using your referral code', NEW.first_name, NEW.last_name),
      'success',
      'referral',
      id,
      true
    FROM profiles
    WHERE referral_code = NEW.referred_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create commission notification
CREATE OR REPLACE FUNCTION create_commission_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for referral commission
  IF NEW.type = 'commission' AND NEW.status = 'completed' THEN
    INSERT INTO notices (
      title,
      content,
      type,
      category,
      user_id,
      reference_id,
      is_active
    ) VALUES (
      'Commission Received',
      format('You have received a commission of $%s', NEW.amount),
      'success',
      'referral',
      NEW.user_id,
      NEW.id,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for referral signup notifications
DROP TRIGGER IF EXISTS on_referral_signup ON profiles;
CREATE TRIGGER on_referral_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_signup_notification();

-- Create trigger for commission notifications
DROP TRIGGER IF EXISTS on_commission_received ON transactions;
CREATE TRIGGER on_commission_received
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_commission_notification();
