-- Create live_prices table for real-time price tracking
CREATE TABLE IF NOT EXISTS live_prices (
    symbol TEXT PRIMARY KEY,
    bid_price DECIMAL NOT NULL,
    ask_price DECIMAL NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('binance', 'tradermade')),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_live_prices_updated 
ON live_prices(last_updated);

-- Enable RLS
ALTER TABLE live_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access"
    ON live_prices FOR SELECT
    USING (true);

-- Grant permissions
GRANT ALL ON live_prices TO PUBLIC;

-- Create function to clean up old price data
CREATE OR REPLACE FUNCTION cleanup_old_prices()
RETURNS void AS $$
BEGIN
    DELETE FROM live_prices
    WHERE last_updated < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily
SELECT cron.schedule(
    'cleanup-old-prices',
    '0 0 * * *',  -- Run at midnight every day
    $$SELECT cleanup_old_prices()$$
);
