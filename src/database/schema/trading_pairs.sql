-- Drop existing objects in correct order
DROP TRIGGER IF EXISTS update_trading_pairs_timestamp ON trading_pairs;
DROP FUNCTION IF EXISTS update_trading_pairs_updated_at() CASCADE;
DROP POLICY IF EXISTS "Allow public read access" ON trading_pairs;
DROP POLICY IF EXISTS "Allow public write access" ON trading_pairs;
DROP TABLE IF EXISTS trading_pairs CASCADE;

-- Create trading pairs table
CREATE TABLE IF NOT EXISTS trading_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    short_name TEXT, -- Made optional by removing NOT NULL
    type TEXT NOT NULL CHECK (type IN ('crypto', 'forex')),
    is_active BOOLEAN DEFAULT true,
    min_lots DECIMAL DEFAULT 0.01,
    max_lots DECIMAL DEFAULT 100,
    lot_step DECIMAL DEFAULT 0.01,
    pip_value DECIMAL,
    base_currency TEXT,
    quote_currency TEXT,
    min_leverage INTEGER DEFAULT 1,
    max_leverage INTEGER DEFAULT 2000,
    leverage_options INTEGER[] DEFAULT '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    display_order INTEGER DEFAULT 0,
    image_url TEXT,
    last_price DECIMAL DEFAULT 0 -- Add new column for last price
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON trading_pairs(type);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_active ON trading_pairs(is_active);

-- Add timestamp trigger
CREATE OR REPLACE FUNCTION update_trading_pairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trading_pairs_timestamp
    BEFORE UPDATE ON trading_pairs
    FOR EACH ROW
    EXECUTE FUNCTION update_trading_pairs_updated_at();

-- Insert initial trading pairs
INSERT INTO trading_pairs (symbol, name, short_name, type, pip_value, base_currency, quote_currency, display_order, max_lots, min_leverage, max_leverage, leverage_options, image_url)
VALUES 
    -- Crypto pairs (lower max lots due to higher value, lower leverage options)
    ('BINANCE:BTCUSDT', 'Bitcoin', 'BTC', 'crypto', 0.00001, 'BTC', 'USDT', 1, 10, 1, 100, '{1,2,5,10,20,50,100}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/btc.svg'),
    ('BINANCE:ETHUSDT', 'Ethereum', 'ETH', 'crypto', 0.00001, 'ETH', 'USDT', 2, 20, 1, 100, '{1,2,5,10,20,50,100}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/eth.svg'),
    ('BINANCE:SOLUSDT', 'Solana', 'SOL', 'crypto', 0.00001, 'SOL', 'USDT', 3, 50, 1, 200, '{1,2,5,10,20,50,100,200}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/sol.svg'),
    ('BINANCE:DOGEUSDT', 'Dogecoin', 'DOGE', 'crypto', 0.00001, 'DOGE', 'USDT', 4, 100, 1, 500, '{1,2,5,10,20,50,100,200,500}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/doge.svg'),
    ('BINANCE:ADAUSDT', 'Cardano', 'ADA', 'crypto', 0.00001, 'ADA', 'USDT', 5, 100, 1, 500, '{1,2,5,10,20,50,100,200,500}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/ada.svg'),
    ('BINANCE:BNBUSDT', 'BNB', 'BNB', 'crypto', 0.00001, 'BNB', 'USDT', 6, 20, 1, 100, '{1,2,5,10,20,50,100}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/bnb.svg'),
    ('BINANCE:DOTUSDT', 'Polkadot', 'DOT', 'crypto', 0.00001, 'DOT', 'USDT', 7, 50, 1, 200, '{1,2,5,10,20,50,100,200}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/dot.svg'),
    ('BINANCE:TRXUSDT', 'TRON', 'TRX', 'crypto', 0.00001, 'TRX', 'USDT', 8, 100, 1, 500, '{1,2,5,10,20,50,100,200,500}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/trx.svg'),
    
    -- Forex pairs (full leverage options)
    ('FX:EUR/USD', 'EUR/USD', 'EURUSD', 'forex', 0.0001, 'EUR', 'USD', 1, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/eur-usd.svg'),
    ('FX:USD/JPY', 'USD/JPY', 'USDJPY', 'forex', 0.01, 'USD', 'JPY', 2, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/usd-jpy.svg'),
    ('FX:GBP/USD', 'GBP/USD', 'GBPUSD', 'forex', 0.0001, 'GBP', 'USD', 3, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/gbp-usd.svg'),
    ('FX:AUD/USD', 'AUD/USD', 'AUDUSD', 'forex', 0.0001, 'AUD', 'USD', 4, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/aud-usd.svg'),
    ('FX:USD/CAD', 'USD/CAD', 'USDCAD', 'forex', 0.0001, 'USD', 'CAD', 5, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/usd-cad.svg'),
    ('FX:USD/CHF', 'USD/CHF', 'USDCHF', 'forex', 0.0001, 'USD', 'CHF', 6, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/usd-chf.svg'),
    ('FX:GBP/JPY', 'GBP/JPY', 'GBPJPY', 'forex', 0.01, 'GBP', 'JPY', 7, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/gbp-jpy.svg'),
    ('FX:EUR/JPY', 'EUR/JPY', 'EURJPY', 'forex', 0.01, 'EUR', 'JPY', 8, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/eur-jpy.svg'),
    ('FX:EUR/GBP', 'EUR/GBP', 'EURGBP', 'forex', 0.0001, 'EUR', 'GBP', 9, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/eur-gbp.svg'),
    ('FX:EUR/CHF', 'EUR/CHF', 'EURCHF', 'forex', 0.0001, 'EUR', 'CHF', 10, 200, 1, 2000, '{1,2,5,10,20,50,100,200,500,1000,2000}'::INTEGER[], 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/eur-chf.svg')
ON CONFLICT (symbol) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    type = EXCLUDED.type,
    pip_value = EXCLUDED.pip_value,
    base_currency = EXCLUDED.base_currency,
    quote_currency = EXCLUDED.quote_currency,
    display_order = EXCLUDED.display_order,
    max_lots = EXCLUDED.max_lots,
    min_leverage = EXCLUDED.min_leverage,
    max_leverage = EXCLUDED.max_leverage,
    leverage_options = EXCLUDED.leverage_options,
    image_url = EXCLUDED.image_url;

-- Enable RLS
ALTER TABLE trading_pairs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access"
    ON trading_pairs FOR SELECT
    USING (true);

CREATE POLICY "Allow public write access"
    ON trading_pairs FOR ALL
    USING (true);

-- Grant permissions to public
GRANT ALL ON trading_pairs TO PUBLIC;

-- Function to update last price for forex pairs
CREATE OR REPLACE FUNCTION update_forex_last_prices()
RETURNS void AS $$
DECLARE
    pair RECORD;
    api_response JSONB;
BEGIN
    -- Loop through forex pairs
    FOR pair IN 
        SELECT symbol, short_name 
        FROM trading_pairs 
        WHERE type = 'forex' AND is_active = true
    LOOP
        -- Make API call to get current price
        SELECT content::jsonb INTO api_response
        FROM http_get('https://marketdata.tradermade.com/api/v1/live?' || 
                     'currency=' || replace(replace(pair.short_name, '/', ''), 'FX:', '') ||
                     '&api_key=' || current_setting('app.tradermade_api_key'));

        -- Update last_price if API call successful
        IF api_response->>'bid' IS NOT NULL THEN
            UPDATE trading_pairs 
            SET last_price = (api_response->>'bid')::DECIMAL,
                updated_at = NOW()
            WHERE symbol = pair.symbol;
        END IF;

        -- Add delay to respect API rate limits
        PERFORM pg_sleep(1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run at 12 PM IST (6:30 AM UTC)
SELECT cron.schedule(
    'update-forex-prices', -- job name
    '30 6 * * *',         -- cron schedule (6:30 AM UTC = 12:00 PM IST)
    $$SELECT update_forex_last_prices()$$
);

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;

-- Store TradeMade API key in database settings
ALTER DATABASE acvzuxvssuovhiwtdmtj SET app.tradermade_api_key = 'wsBKO0DDr7uN79MRA-Ow';

-- Add function to update prices
CREATE OR REPLACE FUNCTION update_binance_trading_pairs()
RETURNS void AS $$
BEGIN
    -- Update last_updated timestamp for touched records
    UPDATE trading_pairs
    SET updated_at = NOW()
    WHERE type = 'crypto' 
    AND updated_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run every 5 minutes
SELECT cron.schedule(
    'update-binance-pairs',
    '*/5 * * * *',
    $$SELECT update_binance_trading_pairs()$$
);
