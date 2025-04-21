-- Helper function to listen for price changes
CREATE OR REPLACE FUNCTION listen_price_changes() 
RETURNS void AS $$
BEGIN
    LISTEN price_changes;
    RAISE NOTICE 'Listening for price changes...';
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT listen_price_changes();
-- Will print notifications when prices change
