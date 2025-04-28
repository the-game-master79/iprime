import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from "@/pages/admin/AdminLayout";
import { PageHeader } from "@/components/ui-components";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartLine } from "@phosphor-icons/react";

interface PriceData {
  id: string;
  symbol: string;
  bid: number;
  ask: number;
  created_at: string;
}

export default function LiveRates() {
  const [cryptoPrices, setCryptoPrices] = useState<PriceData[]>([]);
  const [forexPrices, setForexPrices] = useState<PriceData[]>([]);
  const [priceChanges, setPriceChanges] = useState<Record<string, 'up' | 'down'>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Initial fetch
    fetchCryptoPrices();
    fetchForexPrices();

    // Set up real-time subscriptions
    const cryptoSubscription = supabase
      .channel('crypto-prices-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'crypto_prices' },
        handleCryptoPriceChange
      )
      .subscribe();

    const forexSubscription = supabase
      .channel('forex-prices-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'forex_prices' },
        handleForexPriceChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cryptoSubscription);
      supabase.removeChannel(forexSubscription);
    };
  }, []);

  const fetchCryptoPrices = async () => {
    const { data, error } = await supabase
      .from('crypto_prices')
      .select('*')
      .order('symbol');

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch crypto prices"
      });
      return;
    }

    setCryptoPrices(data);
  };

  const fetchForexPrices = async () => {
    const { data, error } = await supabase
      .from('forex_prices')
      .select('*')
      .order('symbol');

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch forex prices"
      });
      return;
    }

    setForexPrices(data);
  };

  const handleCryptoPriceChange = (payload: any) => {
    const newPrice = payload.new as PriceData;
    const oldPrice = payload.old as PriceData;

    setCryptoPrices(prev => prev.map(price => {
      if (price.symbol === newPrice.symbol) {
        // Determine price movement
        const direction = newPrice.bid > oldPrice.bid ? 'up' : 'down';
        setPriceChanges(prev => ({ ...prev, [newPrice.symbol]: direction }));
        
        // Clear animation after 1 second
        setTimeout(() => {
          setPriceChanges(prev => {
            const next = { ...prev };
            delete next[newPrice.symbol];
            return next;
          });
        }, 1000);

        return newPrice;
      }
      return price;
    }));
  };

  const handleForexPriceChange = (payload: any) => {
    const newPrice = payload.new as PriceData;
    const oldPrice = payload.old as PriceData;

    setForexPrices(prev => prev.map(price => {
      if (price.symbol === newPrice.symbol) {
        // Determine price movement
        const direction = newPrice.bid > oldPrice.bid ? 'up' : 'down';
        setPriceChanges(prev => ({ ...prev, [newPrice.symbol]: direction }));
        
        // Clear animation after 1 second
        setTimeout(() => {
          setPriceChanges(prev => {
            const next = { ...prev };
            delete next[newPrice.symbol];
            return next;
          });
        }, 1000);

        return newPrice;
      }
      return price;
    }));
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleString();
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Live Rates" 
        description="Monitor real-time cryptocurrency and forex prices"
        icon={<ChartLine className="h-5 w-5" />}
      />
      <div className="container mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Crypto Prices Table */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Cryptocurrency Prices
                <Badge variant="outline">{cryptoPrices.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Ask</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cryptoPrices.map((price) => (
                      <TableRow key={price.id}>
                        <TableCell>{price.symbol}</TableCell>
                        <TableCell className={`font-mono transition-colors ${
                          priceChanges[price.symbol] === 'up' ? 'text-green-500' :
                          priceChanges[price.symbol] === 'down' ? 'text-red-500' : ''
                        }`}>
                          {formatPrice(price.bid)}
                        </TableCell>
                        <TableCell className="font-mono">{formatPrice(price.ask)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Forex Prices Table */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Forex Prices
                <Badge variant="outline">{forexPrices.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Ask</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forexPrices.map((price) => (
                      <TableRow key={price.id}>
                        <TableCell>{price.symbol}</TableCell>
                        <TableCell className={`font-mono transition-colors ${
                          priceChanges[price.symbol] === 'up' ? 'text-green-500' :
                          priceChanges[price.symbol] === 'down' ? 'text-red-500' : ''
                        }`}>
                          {formatPrice(price.bid)}
                        </TableCell>
                        <TableCell className="font-mono">{formatPrice(price.ask)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
