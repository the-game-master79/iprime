-- Function to update Binance prices
CREATE OR REPLACE FUNCTION update_binance_prices()
RETURNS void AS $$
DECLARE
    pair RECORD;
    api_response JSONB;
BEGIN
    -- Loop through crypto pairs
    FOR pair IN 
        SELECT symbol, REPLACE(symbol, 'BINANCE:', '') as clean_symbol 
        FROM trading_pairs 
        WHERE type = 'crypto' AND is_active = true 
    LOOP
        BEGIN
            -- Make API call to Binance
            SELECT content::jsonb INTO api_response
            FROM http_get('https://api.binance.com/api/v3/ticker/bookTicker?symbol=' || pair.clean_symbol);
            
            -- Update prices if API call successful
            IF api_response->>'bidPrice' IS NOT NULL AND api_response->>'askPrice' IS NOT NULL THEN
                UPDATE trading_pairs 
                SET bid_price = (api_response->>'bidPrice')::DECIMAL,
                    ask_price = (api_response->>'askPrice')::DECIMAL,
                    last_price_update = NOW(),
                    updated_at = NOW()
                WHERE symbol = pair.symbol;
                
                -- Log success
                RAISE NOTICE 'Updated prices for %: Bid=%, Ask=%', 
                    pair.symbol, 
                    api_response->>'bidPrice', 
                    api_response->>'askPrice';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Log error and continue with next pair
            RAISE WARNING 'Error updating % prices: %', pair.symbol, SQLERRM;
        END;
        
        -- Small delay to respect rate limits (100ms)
        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to run every second
SELECT cron.schedule(
    'update-binance-prices',     -- job name
    '* * * * * *',              -- run every second
    $$SELECT update_binance_prices()$$
);

-- Create index for faster price updates
CREATE INDEX IF NOT EXISTS idx_trading_pairs_crypto ON trading_pairs(type) WHERE type = 'crypto';
