-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION prevent_negative_withdrawal_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_margin DECIMAL;
BEGIN
    -- Calculate total margin from open trades
    SELECT COALESCE(SUM(
        CASE 
            WHEN t.pair LIKE 'BINANCE:%' THEN
                -- Crypto margin calculation
                (t.open_price * t.lots) / t.leverage
            ELSE
                -- Forex margin calculation
                (t.open_price * t.lots * 100000) / t.leverage
        END
    ), 0)
    INTO total_margin
    FROM trades t
    WHERE t.user_id = NEW.id 
    AND t.status = 'open';

    -- If margin meets or exceeds withdrawal balance, set balance to 0
    IF total_margin >= NEW.withdrawal_wallet THEN
        NEW.withdrawal_wallet := 0;
        -- Log margin call event
        INSERT INTO transaction_logs (
            user_id,
            type,
            description,
            old_balance,
            new_balance,
            created_at
        ) VALUES (
            NEW.id,
            'margin_call',
            format('Margin call triggered. Total margin: %s, Previous balance: %s', total_margin, NEW.withdrawal_wallet),
            NEW.withdrawal_wallet,
            0,
            NOW()
        );
    -- Otherwise check for negative balance as before
    ELSIF NEW.withdrawal_wallet < 0 THEN
        RAISE EXCEPTION 'Withdrawal wallet balance cannot be negative. Attempted balance: %', NEW.withdrawal_wallet;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS check_withdrawal_balance ON profiles;

-- Create the trigger
CREATE TRIGGER check_withdrawal_balance
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_withdrawal_balance();

-- Create transaction logs table if not exists
CREATE TABLE IF NOT EXISTS transaction_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    old_balance DECIMAL,
    new_balance DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
