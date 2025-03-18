-- Update the referral commission trigger function to use correct status
CREATE OR REPLACE FUNCTION process_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- When a commission is marked as approved
    IF (TG_OP = 'UPDATE' AND NEW.commission_status = 'approved' AND OLD.commission_status = 'pending') THEN
        -- Update referrer's balance
        UPDATE profiles 
        SET commissions_balance = commissions_balance + NEW.commissions
        WHERE id = NEW.referrer_id;

        -- Create transaction record with correct lowercase status
        INSERT INTO transactions (
            user_id,
            amount,
            type,
            status,
            reference_id,
            description
        ) VALUES (
            NEW.referrer_id,
            NEW.commissions,
            'commission',
            'completed',  -- Changed from 'Completed' to 'completed'
            NEW.id,
            format('Level %s referral commission', NEW.level)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing commission transactions to use correct status
UPDATE transactions
SET status = 'completed'
WHERE type = 'commission'
AND status = 'Completed';
