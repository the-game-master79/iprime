import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { PriceData } from '@/types/trading';

interface CryptoPrice {
  symbol: string;
  bid: number;
  ask: number;
}

interface ForexPrice {
  symbol: string;
  bid: number;
  ask: number;
}

export function usePriceSubscriptions() {
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});

  useEffect(() => {
    let mounted = true;
    let cryptoSubscription: any;
    let forexSubscription: any;

    const initializeSubscriptions = async () => {
      // Fetch initial prices
      const { data: cryptoPrices } = await supabase
        .from('crypto_prices')
        .select('*');

      const { data: forexPrices } = await supabase
        .from('forex_prices')
        .select('*');

      if (!mounted) return;

      const prices: Record<string, PriceData> = {};

      // Format crypto prices
      cryptoPrices?.forEach(price => {
        prices[`BINANCE:${price.symbol}`] = {
          price: price.bid.toString(),
          bid: price.bid.toString(),
          ask: price.ask.toString(),
          change: '0.00'
        };
      });

      // Format forex prices  
      forexPrices?.forEach(price => {
        const symbol = `FX:${price.symbol.slice(0,3)}/${price.symbol.slice(3)}`;
        prices[symbol] = {
          price: price.bid.toString(),
          bid: price.bid.toString(),
          ask: price.ask.toString(),
          change: '0.00'
        };
      });

      setPairPrices(prices);

      // Setup subscriptions
      cryptoSubscription = supabase
        .channel('crypto-prices')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'crypto_prices' },
          (payload) => {
            const priceData = payload.new as CryptoPrice;
            if (!priceData || !mounted) return;

            setPairPrices(prev => ({
              ...prev,
              [`BINANCE:${priceData.symbol}`]: {
                price: priceData.bid.toString(),
                bid: priceData.bid.toString(),
                ask: priceData.ask.toString(),
                change: '0.00'
              }
            }));
          }
        )
        .subscribe();

      forexSubscription = supabase
        .channel('forex-prices')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'forex_prices' },
          (payload) => {
            const priceData = payload.new as ForexPrice;
            if (!priceData || !mounted) return;

            const symbol = `FX:${priceData.symbol.slice(0,3)}/${priceData.symbol.slice(3)}`;
            setPairPrices(prev => ({
              ...prev,
              [symbol]: {
                price: priceData.bid.toString(),
                bid: priceData.bid.toString(),
                ask: priceData.ask.toString(),
                change: '0.00'
              }
            }));
          }
        )
        .subscribe();
    };

    initializeSubscriptions();

    return () => {
      mounted = false;
      if (cryptoSubscription) supabase.removeChannel(cryptoSubscription);
      if (forexSubscription) supabase.removeChannel(forexSubscription);
    };
  }, []);

  return pairPrices;
}
