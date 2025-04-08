CREATE OR REPLACE FUNCTION public.update_upline_business() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if the status is changing to approved
    IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') OR 
       (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
        
        -- Update investor's total_invested
        UPDATE profiles 
        SET total_invested = COALESCE(total_invested, 0) + NEW.amount
        WHERE id = NEW.user_id;

        -- Distribute business volume to upline
        PERFORM distribute_business_volume(NEW.id, NEW.user_id, NEW.amount);

    -- Handle rejections
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND OLD.status = 'approved') THEN
        -- Update investor's total_invested
        UPDATE profiles 
        SET total_invested = COALESCE(total_invested, 0) - NEW.amount
        WHERE id = NEW.user_id;

        -- Remove business volume entries for this subscription
        DELETE FROM business_volumes 
        WHERE subscription_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger is created/updated
DROP TRIGGER IF EXISTS update_upline_business_trigger ON plans_subscriptions;
CREATE TRIGGER update_upline_business_trigger
    AFTER INSERT OR UPDATE OF status ON plans_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_upline_business();
