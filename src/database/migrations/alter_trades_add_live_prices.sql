-- Add live price columns to trades table
ALTER TABLE trades
    ADD COLUMN IF NOT EXISTS live_bid DECIMAL NULL,
    ADD COLUMN IF NOT EXISTS live_ask DECIMAL NULL;

-- Create function to update live prices
CREATE OR REPLACE FUNCTION update_trade_live_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- Update live prices for pending limit orders
    IF TG_TABLE_NAME = 'crypto_prices' THEN
        UPDATE trades
        SET 
            live_bid = NEW.bid,
            live_ask = NEW.ask,
            updated_at = NOW()
        WHERE pair = 'BINANCE:' || NEW.symbol
        AND status = 'pending'
        AND order_type = 'limit';
    ELSE 
        UPDATE trades
        SET 
            live_bid = NEW.bid,
            live_ask = NEW.ask,
            updated_at = NOW()
        WHERE pair = 'FX:' || substr(NEW.symbol, 1, 3) || '/' || substr(NEW.symbol, 4)
        AND status = 'pending'
        AND order_type = 'limit';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both price tables
CREATE TRIGGER update_crypto_trade_prices
    AFTER UPDATE ON crypto_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_live_prices();

CREATE TRIGGER update_forex_trade_prices
    AFTER UPDATE ON forex_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_live_prices();
