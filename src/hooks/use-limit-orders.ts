import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

// Trade interface
interface Trade {
  id: string;
  type: 'buy' | 'sell';
  status: 'pending' | 'open' | 'closed';
  pair: string;
  limitPrice?: number;
}

// useLimitOrders hook: listens for trade status updates (pending -> open) for limit orders
interface PriceData {
  bid: string;
  ask: string;
}

export function useLimitOrders(trades: Trade[], prices: Record<string, PriceData>, onExecution: (tradeId: string) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('limit-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: 'status=eq.open'
        },
        (payload) => {
          const trade = payload.new as Trade;
          if (trade.orderType === 'limit') {
            onExecution(trade.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onExecution]);
}
