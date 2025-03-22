-- Create trigger function for KYC status notifications
CREATE OR REPLACE FUNCTION create_kyc_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle KYC status changes
  IF OLD.kyc_status = NEW.kyc_status THEN
    RETURN NEW;
  END IF;

  -- Create notification based on new status
  INSERT INTO notices (
    title,
    content,
    type,
    category,
    user_id,
    is_active
  ) VALUES (
    CASE 
      WHEN NEW.kyc_status = 'completed' THEN 'KYC Verification Approved'
      WHEN NEW.kyc_status = 'rejected' THEN 'KYC Verification Rejected'
      ELSE 'KYC Status Update'
    END,
    CASE 
      WHEN NEW.kyc_status = 'completed' THEN 'Your KYC verification has been approved. You now have full access to all features.'
      WHEN NEW.kyc_status = 'rejected' THEN 'Your KYC verification was rejected. Please submit new documents following the guidelines.'
      ELSE 'Your KYC verification status has been updated to ' || NEW.kyc_status
    END,
    CASE 
      WHEN NEW.kyc_status = 'completed' THEN 'success'
      WHEN NEW.kyc_status = 'rejected' THEN 'error'
      ELSE 'info'
    END,
    'system',
    NEW.id,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for KYC status changes
DROP TRIGGER IF EXISTS on_kyc_status_change ON profiles;
CREATE TRIGGER on_kyc_status_change
  AFTER UPDATE OF kyc_status ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_kyc_notification();
