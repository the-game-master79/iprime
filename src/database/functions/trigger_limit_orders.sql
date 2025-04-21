-- Create trigger function for limit orders
CREATE OR REPLACE FUNCTION check_limit_order_conditions() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate state transitions
    IF NEW.status = 'open' AND OLD.status = 'pending' THEN
        -- Ensure limit price exists when opening a pending order
        IF NEW.limit_price IS NULL THEN
            RAISE EXCEPTION 'Cannot open limit order without price';
        END IF;
        
        -- Set the open price to the limit price
        NEW.open_price := NEW.limit_price;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on trades table
DROP TRIGGER IF EXISTS check_limit_orders_trigger ON trades;
CREATE TRIGGER check_limit_orders_trigger
    BEFORE UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION check_limit_order_conditions();
