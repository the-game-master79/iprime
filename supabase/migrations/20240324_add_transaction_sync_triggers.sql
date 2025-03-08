-- Create trigger function for deposits
CREATE OR REPLACE FUNCTION sync_deposit_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account_history when deposit status changes
    UPDATE account_history
    SET 
        status = NEW.status,
        updated_at = CURRENT_TIMESTAMP
    WHERE deposit_id = NEW.id 
    AND type = 'deposit'
    AND status != NEW.status; -- Only update if status is different
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update withdrawal trigger function to use foreign key
CREATE OR REPLACE FUNCTION sync_withdrawal_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account_history when withdrawal status changes
    UPDATE account_history
    SET 
        status = NEW.status,
        updated_at = CURRENT_TIMESTAMP
    WHERE withdrawal_id = NEW.id 
    AND type = 'withdraw'
    AND status != NEW.status;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS deposit_status_sync ON deposits;
DROP TRIGGER IF EXISTS withdrawal_status_sync ON withdrawals;

-- Create trigger for deposits
CREATE TRIGGER deposit_status_sync
    AFTER UPDATE OF status ON deposits
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_deposit_status();

-- Create trigger for withdrawals
CREATE TRIGGER withdrawal_status_sync
    AFTER UPDATE OF status ON withdrawals
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_withdrawal_status();

-- Add updated_at column to account_history if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'account_history' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE account_history
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_deposit_status() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_withdrawal_status() TO authenticated;
