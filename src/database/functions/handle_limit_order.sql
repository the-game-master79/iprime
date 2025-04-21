CREATE OR REPLACE FUNCTION handle_limit_order()
RETURNS TRIGGER AS $$
DECLARE
    v_current_price RECORD;
BEGIN
    -- Only proceed if this is a limit order
    IF NEW.order_type = 'limit' AND NEW.status = 'pending' THEN
        -- Get current price from live_prices table
        SELECT bid_price, ask_price 
        INTO v_current_price
        FROM live_prices
        WHERE symbol = NEW.pair;

        -- Execute order if price conditions are met
        IF (
            (NEW.type = 'buy' AND v_current_price.ask_price <= NEW.limit_price) OR 
            (NEW.type = 'sell' AND v_current_price.bid_price >= NEW.limit_price)
        ) THEN
            PERFORM execute_limit_order(NEW.id, 
                CASE 
                    WHEN NEW.type = 'buy' THEN v_current_price.ask_price
                    ELSE v_current_price.bid_price
                END
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on trades table
DROP TRIGGER IF EXISTS check_limit_order_price ON trades;
CREATE TRIGGER check_limit_order_price
    AFTER UPDATE OF bid_price, ask_price ON trades
    FOR EACH ROW
    EXECUTE FUNCTION handle_limit_order();

-- Create trigger that runs periodically to check limit orders
CREATE OR REPLACE FUNCTION check_pending_limit_orders()
RETURNS void AS $$
BEGIN
    -- Update trades with current prices
    UPDATE trades t
    SET 
        bid_price = p.bid_price,
        ask_price = p.ask_price
    FROM live_prices p
    WHERE t.pair = p.symbol
    AND t.status = 'pending'
    AND t.order_type = 'limit';
END;
$$ LANGUAGE plpgsql;

-- Schedule the check to run every minute
SELECT cron.schedule(
    'check-limit-orders',
    '* * * * *',
    'SELECT check_pending_limit_orders()'
);
