import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  status: 'pending' | 'open' | 'closed';
  pair: string;
  limitPrice?: number;
}

interface PriceData {
  bid: string;
  ask: string;
}

export function useLimitOrders(
  trades: Trade[],
  prices: Record<string, PriceData>,
  onExecute: (tradeId: string) => void
) {
  useEffect(() => {
    if (!trades.length) return;

    const checkLimitOrders = async () => {
      const pendingTrades = trades.filter(t => t.status === 'pending');
      
      for (const trade of pendingTrades) {
        if (!trade.limitPrice) continue;

        const currentPrice = prices[trade.pair];
        if (!currentPrice) continue;

        // For buy orders: Execute when ask price <= limit price
        // For sell orders: Execute when bid price >= limit price
        const shouldExecute = trade.type === 'buy'
          ? parseFloat(currentPrice.ask) <= trade.limitPrice
          : parseFloat(currentPrice.bid) >= trade.limitPrice;

        if (shouldExecute) {
          try {
            // Update trade status in database
            const { error } = await supabase
              .from('trades')
              .update({
                status: 'open',
                open_price: trade.limitPrice,
                executed_at: new Date().toISOString()
              })
              .eq('id', trade.id)
              .eq('status', 'pending');

            if (error) throw error;

            // Notify parent component
            onExecute(trade.id);

            toast({
              title: "Limit Order Executed",
              description: `${trade.type.toUpperCase()} order executed at $${trade.limitPrice}`,
            });
          } catch (error) {
            console.error('Error executing limit order:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to execute limit order"
            });
          }
        }
      }
    };

    // Check prices every 100ms
    const interval = setInterval(checkLimitOrders, 100);
    return () => clearInterval(interval);
  }, [trades, prices, onExecute]);
}
