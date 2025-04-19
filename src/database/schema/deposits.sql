-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount DECIMAL NOT NULL CHECK (amount > 0),
    crypto_name TEXT,
    crypto_symbol TEXT,
    network TEXT,
    transaction_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create timestamp trigger
CREATE OR REPLACE FUNCTION update_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deposits_timestamp
    BEFORE UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_deposits_updated_at();

-- Create function to handle deposit approval
CREATE OR REPLACE FUNCTION approve_deposit(deposit_id UUID)
RETURNS jsonb AS $$
DECLARE
    deposit_record RECORD;
BEGIN
    -- Get deposit details
    SELECT * INTO deposit_record
    FROM deposits
    WHERE id = deposit_id;
    
    IF deposit_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Deposit not found'
        );
    END IF;

    -- Check if deposit is in pending state
    IF deposit_record.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Deposit is not in pending state'
        );
    END IF;

    BEGIN
        -- Update deposit status
        UPDATE deposits 
        SET 
            status = 'approved',
            approved_at = NOW()
        WHERE id = deposit_id;

        -- Add amount to user's withdrawal wallet
        UPDATE profiles 
        SET withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + deposit_record.amount
        WHERE id = deposit_record.user_id;

        -- Create transaction record
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            wallet_type,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            deposit_record.user_id,
            deposit_record.amount,
            'deposit',
            'Completed',
            COALESCE(deposit_record.crypto_symbol, 'Unknown'),
            'withdrawal',
            format('Deposit of %s %s approved', 
                deposit_record.amount, 
                COALESCE(deposit_record.crypto_symbol, 'USD')),
            deposit_id,
            NOW()
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Deposit approved successfully'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error approving deposit: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error processing approval: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle deposit rejection
CREATE OR REPLACE FUNCTION reject_deposit(deposit_id UUID)
RETURNS jsonb AS $$
DECLARE
    deposit_record RECORD;
BEGIN
    -- Get deposit details
    SELECT * INTO deposit_record
    FROM deposits
    WHERE id = deposit_id;
    
    IF deposit_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Deposit not found'
        );
    END IF;

    -- Check if deposit is in pending state
    IF deposit_record.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Deposit is not in pending state'
        );
    END IF;

    BEGIN
        -- Update deposit status
        UPDATE deposits 
        SET status = 'rejected'
        WHERE id = deposit_id;

        -- Create failed transaction record
        INSERT INTO transactions (
            id,
            user_id,
            amount,
            type,
            status,
            method,
            wallet_type,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            deposit_record.user_id,
            deposit_record.amount,
            'deposit',
            'Failed',
            COALESCE(deposit_record.crypto_symbol, 'Unknown'),
            'withdrawal',
            format('Deposit of %s %s rejected', 
                deposit_record.amount, 
                COALESCE(deposit_record.crypto_symbol, 'USD')),
            deposit_id,
            NOW()
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Deposit rejected successfully'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error rejecting deposit: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error processing rejection: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users have full access" ON deposits;
DROP POLICY IF EXISTS "Users can view their own deposits" ON deposits;

-- Create updated policies
CREATE POLICY "Admin users have full access to deposits"
ON deposits FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "Users can view their own deposits"
ON deposits FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Create policy for admin selection with join
CREATE POLICY "Admin can view deposits with profiles"
ON deposits FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_created_at ON deposits(created_at DESC);

-- Grant necessary permissions
GRANT ALL ON deposits TO authenticated;
GRANT ALL ON deposits TO service_role;
