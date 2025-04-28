-- Add leverage_options column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_pairs' 
        AND column_name = 'leverage_options'
    ) THEN
        ALTER TABLE trading_pairs
        ADD COLUMN leverage_options INTEGER[];
    END IF;
END $$;

-- Helper function to generate leverage options array
CREATE OR REPLACE FUNCTION generate_leverage_options(p_max_leverage INTEGER) 
RETURNS INTEGER[] AS $$
DECLARE
    base_options INTEGER[] := ARRAY[1,2,5,10,20,50,100,200,500,1000,2000];
    result INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
    FOR i IN 1..array_length(base_options, 1) LOOP
        IF base_options[i] <= p_max_leverage THEN
            result := array_append(result, base_options[i]);
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update crypto pairs
UPDATE trading_pairs
SET leverage_options = generate_leverage_options(100)
WHERE type = 'crypto'
AND symbol LIKE 'BINANCE:%';

-- Update forex pairs
UPDATE trading_pairs
SET leverage_options = generate_leverage_options(2000)
WHERE type = 'forex'
AND symbol LIKE 'FX:%';

-- Special update for BTC/ETH with lower leverage
UPDATE trading_pairs
SET leverage_options = generate_leverage_options(20)
WHERE symbol IN ('BINANCE:BTCUSDT', 'BINANCE:ETHUSDT')
AND type = 'crypto';

-- Special update for JPY pairs
UPDATE trading_pairs
SET leverage_options = generate_leverage_options(500)
WHERE symbol LIKE 'FX:%JPY%'
AND type = 'forex';

-- Ensure min leverage is always 1
UPDATE trading_pairs SET min_leverage = 1;

-- Ensure max leverage matches highest option
UPDATE trading_pairs
SET max_leverage = (SELECT MAX(value) FROM unnest(leverage_options) as value);
