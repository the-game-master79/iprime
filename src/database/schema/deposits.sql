-- Drop old objects if they exist
DROP TRIGGER IF EXISTS trigger_insert_pending_deposit_transaction ON deposits;
DROP FUNCTION IF EXISTS insert_pending_deposit_transaction CASCADE;
DROP FUNCTION IF EXISTS approve_deposit CASCADE;
DROP FUNCTION IF EXISTS reject_deposit CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;

-- Create deposits table
CREATE TABLE deposits (
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

-- Timestamp trigger for updated_at
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

-- Insert a transaction when a deposit is created (pending)
CREATE OR REPLACE FUNCTION insert_pending_deposit_transaction()
RETURNS TRIGGER AS $$
BEGIN
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
        NEW.user_id,
        NEW.amount,
        'deposit',
        'Pending',
        COALESCE(NEW.crypto_symbol, 'Unknown'),
        'withdrawal',
        format('Deposit of %s %s pending', NEW.amount, COALESCE(NEW.crypto_symbol, 'USD')),
        NEW.id,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_insert_pending_deposit_transaction
AFTER INSERT ON deposits
FOR EACH ROW
EXECUTE FUNCTION insert_pending_deposit_transaction();

-- Approve deposit: update deposit, update transaction, credit wallet
CREATE OR REPLACE FUNCTION approve_deposit(deposit_id UUID)
RETURNS jsonb AS $$
DECLARE
    deposit_record RECORD;
BEGIN
    SELECT * INTO deposit_record FROM deposits WHERE id = deposit_id;
    IF deposit_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit not found');
    END IF;
    IF deposit_record.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit is not in pending state');
    END IF;

    UPDATE deposits 
    SET status = 'approved', approved_at = NOW()
    WHERE id = deposit_id;

    UPDATE profiles 
    SET withdrawal_wallet = COALESCE(withdrawal_wallet, 0) + deposit_record.amount
    WHERE id = deposit_record.user_id;

    UPDATE transactions
    SET status = 'Completed',
        description = format('Deposit of %s %s approved', deposit_record.amount, COALESCE(deposit_record.crypto_symbol, 'USD'))
    WHERE reference_id = deposit_id AND type = 'deposit';

    RETURN jsonb_build_object('success', true, 'message', 'Deposit approved successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject deposit: update deposit, update transaction
CREATE OR REPLACE FUNCTION reject_deposit(deposit_id UUID)
RETURNS jsonb AS $$
DECLARE
    deposit_record RECORD;
BEGIN
    SELECT * INTO deposit_record FROM deposits WHERE id = deposit_id;
    IF deposit_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit not found');
    END IF;
    IF deposit_record.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit is not in pending state');
    END IF;

    UPDATE deposits 
    SET status = 'rejected'
    WHERE id = deposit_id;

    UPDATE transactions
    SET status = 'Failed',
        description = format('Deposit of %s %s rejected', deposit_record.amount, COALESCE(deposit_record.crypto_symbol, 'USD'))
    WHERE reference_id = deposit_id AND type = 'deposit';

    RETURN jsonb_build_object('success', true, 'message', 'Deposit rejected successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admin users have full access" ON deposits;
DROP POLICY IF EXISTS "Users can view their own deposits" ON deposits;
DROP POLICY IF EXISTS "Admin can view deposits with profiles" ON deposits;
DROP POLICY IF EXISTS "Users can insert their own deposits" ON deposits;

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

CREATE POLICY "Admin can view deposits with profiles"
ON deposits FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "Users can insert their own deposits"
ON deposits FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_created_at ON deposits(created_at DESC);

-- Permissions
GRANT ALL ON deposits TO authenticated;
GRANT ALL ON deposits TO service_role;
