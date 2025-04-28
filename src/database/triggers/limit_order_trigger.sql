-- Drop existing triggers first
DROP TRIGGER IF EXISTS check_limit_orders_crypto ON crypto_prices;
DROP TRIGGER IF EXISTS check_limit_orders_forex ON forex_prices;
DROP FUNCTION IF EXISTS execute_limit_orders() CASCADE;

-- Create function to handle limit order execution
CREATE OR REPLACE FUNCTION execute_limit_orders()
RETURNS TRIGGER AS $$
DECLARE
    v_trade RECORD;
    v_pair TEXT;
BEGIN
    -- Set pair prefix based on trigger source table
    IF TG_TABLE_NAME = 'crypto_prices' THEN
        v_pair := 'BINANCE:' || NEW.symbol;
    ELSE 
        v_pair := 'FX:' || substr(NEW.symbol, 1, 3) || '/' || substr(NEW.symbol, 4);
    END IF;

    -- Process buy limit orders
    FOR v_trade IN
        SELECT t.*
        FROM trades t
        WHERE t.pair = v_pair
        AND t.type = 'buy'
        AND t.status = 'pending'
        AND t.order_type = 'limit'
        AND CAST(t.limit_price AS DECIMAL) >= CAST(NEW.ask AS DECIMAL)
        FOR UPDATE OF t
    LOOP
        -- Update trade status only
        UPDATE trades 
        SET status = 'open',
            open_price = NEW.ask,
            executed_at = NOW()
        WHERE id = v_trade.id;

        -- Notify about execution
        PERFORM pg_notify(
            'trade_executed',
            json_build_object(
                'trade_id', v_trade.id,
                'execution_price', NEW.ask,
                'type', 'buy',
                'symbol', NEW.symbol
            )::text
        );
    END LOOP;

    -- Process sell limit orders
    FOR v_trade IN
        SELECT t.*
        FROM trades t
        WHERE t.pair = v_pair
        AND t.type = 'sell'
        AND t.status = 'pending'
        AND t.order_type = 'limit'
        AND CAST(t.limit_price AS DECIMAL) <= CAST(NEW.bid AS DECIMAL)
        FOR UPDATE OF t
    LOOP
        -- Update trade status only
        UPDATE trades 
        SET status = 'open',
            open_price = NEW.bid,
            executed_at = NOW()
        WHERE id = v_trade.id;

        -- Notify about execution
        PERFORM pg_notify(
            'trade_executed',
            json_build_object(
                'trade_id', v_trade.id,
                'execution_price', NEW.bid,
                'type', 'sell',
                'symbol', NEW.symbol
            )::text
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both crypto and forex price updates
CREATE TRIGGER check_limit_orders_crypto
    AFTER INSERT OR UPDATE ON crypto_prices
    FOR EACH ROW
    EXECUTE FUNCTION execute_limit_orders();

CREATE TRIGGER check_limit_orders_forex
    AFTER INSERT OR UPDATE ON forex_prices
    FOR EACH ROW
    EXECUTE FUNCTION execute_limit_orders();
