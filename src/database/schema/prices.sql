CREATE TABLE live_prices (
    symbol TEXT PRIMARY KEY,
    bid_price DECIMAL,
    ask_price DECIMAL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    source TEXT CHECK (source IN ('binance', 'tradermade'))
);

-- Add index for faster price lookups
CREATE INDEX idx_live_prices_updated ON live_prices(last_updated);

-- Function to update prices
CREATE OR REPLACE FUNCTION update_live_prices()
RETURNS void AS $$
DECLARE
    pair RECORD;
    api_response JSONB;
BEGIN
    -- Update Binance crypto prices
    FOR pair IN 
        SELECT symbol, REPLACE(symbol, 'BINANCE:', '') as clean_symbol 
        FROM trading_pairs 
        WHERE type = 'crypto' AND is_active = true 
    LOOP
        BEGIN
            SELECT content::jsonb INTO api_response
            FROM http_get('https://api.binance.com/api/v3/ticker/bookTicker?symbol=' || pair.clean_symbol);
            
            IF api_response->>'bidPrice' IS NOT NULL THEN
                INSERT INTO live_prices (symbol, bid_price, ask_price, source)
                VALUES (
                    pair.symbol, -- Use original symbol with BINANCE: prefix
                    (api_response->>'bidPrice')::DECIMAL,
                    (api_response->>'askPrice')::DECIMAL,
                    'binance'
                )
                ON CONFLICT (symbol) DO UPDATE
                SET 
                    bid_price = EXCLUDED.bid_price,
                    ask_price = EXCLUDED.ask_price,
                    last_updated = NOW();
            END IF;
        EXCEPTION 
            WHEN OTHERS THEN
                -- Log error and continue with next pair
                RAISE NOTICE 'Error fetching price for %: %', pair.symbol, SQLERRM;
                CONTINUE;
        END;
    END LOOP;

    -- Update TradeMade forex prices
    FOR pair IN 
        SELECT 
            symbol,
            REPLACE(REPLACE(REPLACE(symbol, 'FX:', ''), '/', ''), ' ', '') as clean_symbol
        FROM trading_pairs 
        WHERE type = 'forex' AND is_active = true 
    LOOP
        BEGIN
            SELECT content::jsonb INTO api_response
            FROM http_get('https://marketdata.tradermade.com/api/v1/live?' || 
                         'currency=' || pair.clean_symbol ||
                         '&api_key=' || current_setting('app.tradermade_api_key'));

            IF api_response->>'bid' IS NOT NULL THEN
                INSERT INTO live_prices (symbol, bid_price, ask_price, source)
                VALUES (
                    pair.symbol, -- Use original symbol with FX: prefix
                    (api_response->>'bid')::DECIMAL,
                    (api_response->>'ask')::DECIMAL,
                    'tradermade'
                )
                ON CONFLICT (symbol) DO UPDATE
                SET 
                    bid_price = EXCLUDED.bid_price,
                    ask_price = EXCLUDED.ask_price,
                    last_updated = NOW();
            END IF;
        EXCEPTION 
            WHEN OTHERS THEN
                -- Log error and continue with next pair
                RAISE NOTICE 'Error fetching price for %: %', pair.symbol, SQLERRM;
                CONTINUE;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Remove old schedule if exists
SELECT cron.unschedule('update-market-prices');

-- Create function to schedule updates every 2 seconds
CREATE OR REPLACE FUNCTION schedule_price_updates() 
RETURNS void AS $$
BEGIN
    -- Run price update
    PERFORM update_live_prices();
    
    -- Wait 2 seconds
    PERFORM pg_sleep(2);
    
    -- Schedule next update
    PERFORM schedule_price_updates();
END;
$$ LANGUAGE plpgsql;

-- Schedule the background worker
SELECT cron.schedule(
    'update-market-prices',
    '* * * * *', -- Start every minute
    $$SELECT schedule_price_updates()$$
);
