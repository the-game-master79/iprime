-- Add bid_price and ask_price columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trading_pairs' 
        AND column_name = 'bid_price'
    ) THEN
        ALTER TABLE trading_pairs 
        ADD COLUMN bid_price DECIMAL DEFAULT 0,
        ADD COLUMN ask_price DECIMAL DEFAULT 0,
        ADD COLUMN last_price_update TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create function to update crypto prices
CREATE OR REPLACE FUNCTION update_crypto_price(
    p_symbol TEXT,
    p_bid_price DECIMAL,
    p_ask_price DECIMAL
)
RETURNS void AS $$
BEGIN
    UPDATE trading_pairs
    SET 
        bid_price = p_bid_price,
        ask_price = p_ask_price,
        last_price_update = NOW()
    WHERE symbol = p_symbol;
END;
$$ LANGUAGE plpgsql;
