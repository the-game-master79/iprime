-- Function to process commissions
CREATE OR REPLACE FUNCTION process_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- When a commission is marked as approved
    IF (TG_OP = 'UPDATE' AND NEW.commission_status = 'approved' AND OLD.commission_status = 'pending') THEN
        -- Update referrer's balance
        UPDATE profiles 
        SET commissions_balance = commissions_balance + NEW.commissions
        WHERE id = NEW.referrer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for commission processing
DROP TRIGGER IF EXISTS on_commission_status_change ON referral_relationships;
CREATE TRIGGER on_commission_status_change
    AFTER UPDATE ON referral_relationships
    FOR EACH ROW
    WHEN (OLD.commission_status IS DISTINCT FROM NEW.commission_status)
    EXECUTE FUNCTION process_commission();
