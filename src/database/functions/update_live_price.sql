-- First create live prices table
CREATE TABLE IF NOT EXISTS live_prices (
    symbol TEXT PRIMARY KEY,
    bid_price DECIMAL NOT NULL,
    ask_price DECIMAL NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('binance', 'tradermade')),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on last_updated
CREATE INDEX IF NOT EXISTS idx_live_prices_updated 
ON live_prices(last_updated);

-- First create a price history table
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    bid_price DECIMAL NOT NULL,
    ask_price DECIMAL NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on symbol and timestamp
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_time 
ON price_history(symbol, created_at);

-- Update the live price function to also record history
CREATE OR REPLACE FUNCTION update_live_price(
    p_symbol TEXT,
    p_bid_price DECIMAL,
    p_ask_price DECIMAL,
    p_source TEXT
)
RETURNS void AS $$
BEGIN
    -- Validate source
    IF p_source NOT IN ('binance', 'tradermade') THEN
        RAISE EXCEPTION 'Invalid source: %', p_source;
    END IF;

    -- Update live prices
    INSERT INTO live_prices (symbol, bid_price, ask_price, source, last_updated)
    VALUES (p_symbol, p_bid_price, p_ask_price, p_source, NOW())
    ON CONFLICT (symbol) DO UPDATE
    SET 
        bid_price = EXCLUDED.bid_price,
        ask_price = EXCLUDED.ask_price,
        last_updated = NOW();

    -- Record in history table if price changed
    INSERT INTO price_history (symbol, bid_price, ask_price, source)
    SELECT 
        p_symbol,
        p_bid_price,
        p_ask_price,
        p_source
    WHERE NOT EXISTS (
        SELECT 1 FROM price_history
        WHERE symbol = p_symbol
        AND bid_price = p_bid_price
        AND ask_price = p_ask_price
        AND created_at > NOW() - INTERVAL '1 second'
    );
END;
$$ LANGUAGE plpgsql;

-- Update the scheduler function
CREATE OR REPLACE FUNCTION schedule_price_updates()
RETURNS void AS $$
BEGIN
    -- Set statement timeout to 30 seconds
    SET LOCAL statement_timeout = '30s';
    
    WHILE true LOOP
        -- Delete old history entries
        DELETE FROM price_history 
        WHERE created_at < NOW() - INTERVAL '24 hours';
        
        -- Mark prices as stale if not updated recently
        UPDATE live_prices
        SET last_updated = NOW() - INTERVAL '2 seconds'
        WHERE last_updated < NOW() - INTERVAL '1 second';

        -- Sleep for 1 second
        PERFORM pg_sleep(1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to start the price updater
CREATE OR REPLACE FUNCTION start_price_updater()
RETURNS void AS $$
BEGIN
    -- Schedule the background worker if not already running
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_stat_activity 
        WHERE application_name = 'price_updater'
        AND query LIKE '%schedule_price_updates%'
    ) THEN
        PERFORM schedule_price_updates();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON live_prices TO PUBLIC;
GRANT SELECT, INSERT ON price_history TO PUBLIC;
GRANT EXECUTE ON FUNCTION update_live_price TO PUBLIC;
GRANT EXECUTE ON FUNCTION schedule_price_updates TO PUBLIC;
GRANT EXECUTE ON FUNCTION start_price_updater TO PUBLIC;
