import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react"; // Keep this one since it's used for alerts
import { MagnifyingGlass, ChartLine, Globe } from "@phosphor-icons/react"; // Update imports
import { Topbar } from "@/components/shared/Topbar";
import { Badge } from "@/components/ui/badge";
import { isForexTradingTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { TradesSheet } from "@/components/shared/TradesSheet";
import { useToast } from "@/hooks/use-toast";
import { calculatePnL } from "@/utils/trading"; // Add this import
import { wsManager } from '@/services/websocket-manager';

const tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY || '';

// Add interface for trading pair
interface TradingPair {
  symbol: string;
  name: string;
  short_name: string;
  type: 'crypto' | 'forex';
  min_leverage: number;
  max_leverage: number;
  leverage_options: number[];
  is_active: boolean;
  image_url: string; // Add this field
}

interface PriceData {
  price: string;
  change: string;
  bid?: string;
  ask?: string;
}

interface Trade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  status: 'open' | 'pending' | 'closed';
  openPrice: number;
  lots: number;
  leverage: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
  openTime: number;
}

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

const SelectPairs = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const [priceAnimations, setPriceAnimations] = useState<Record<string, 'up' | 'down'>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [showTradesSheet, setShowTradesSheet] = useState(false);
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);

  // Fetch trading pairs only once on mount
  useEffect(() => {
    const fetchTradingPairs = async () => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching trading pairs:', error);
        return;
      }
      setTradingPairs(data);

      // Watch all active pairs immediately after fetching
      if (data.length > 0) {
        const allPairs = data.map(pair => pair.symbol);
        wsManager.watchPairs(allPairs);
      }
    };

    fetchTradingPairs();

    // Cleanup function to unwatch all pairs
    return () => {
      if (tradingPairs.length > 0) {
        wsManager.unwatchPairs(tradingPairs.map(p => p.symbol));
      }
    };
  }, []);

  // Single WebSocket subscription for all price updates
  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      setPairPrices(prev => {
        const prevPrice = parseFloat(prev[symbol]?.bid || '0');
        const newPrice = parseFloat(data.bid || '0');
        
        if (prevPrice !== newPrice) {
          setPriceAnimations(prev => ({
            ...prev,
            [symbol]: newPrice > prevPrice ? 'up' : 'down'
          }));
        }

        return {
          ...prev,
          [symbol]: data
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Clear animations after delay
  useEffect(() => {
    const timer = setTimeout(() => setPriceAnimations({}), 1000);
    return () => clearTimeout(timer);
  }, [pairPrices]);

  // Update filteredPairs to handle both crypto and forex
  const filteredPairs = useMemo(() => {
    return tradingPairs
      .filter(pair => pair.type === activeTab)
      .filter(pair => 
        pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pair.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(pair => ({
        ...pair,
        currentPrice: pairPrices[pair.symbol]?.bid || '0',
        priceAnimation: priceAnimations[pair.symbol]
      }));
  }, [tradingPairs, activeTab, searchQuery, pairPrices, priceAnimations]);

  const handlePairSelect = (pair: string) => {
    // Format the pair correctly for the URL
    const encodedPair = encodeURIComponent(pair);
    navigate(`/trade/chart/${encodedPair}`);
  };

  // Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      if (visible) {
        // Fetch latest prices when page becomes visible
        fetchInitialPrices();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Add trades fetch effect
  useEffect(() => {
    const fetchTrades = async () => {
      const { data: { user } } = await supabase.auth.getUser(); 
      if (!user) return;

      const { data: userTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'open');

      if (userTrades) {
        setTrades(userTrades.map(trade => ({
          id: trade.id,
          pair: trade.pair,
          type: trade.type,
          status: trade.status,
          openPrice: trade.open_price,
          lots: trade.lots,
          leverage: trade.leverage,
          orderType: trade.order_type,
          limitPrice: trade.limit_price,
          openTime: new Date(trade.created_at).getTime()
        })));
      }
    };

    fetchTrades();
  }, []);

  // Update P&L calculation effect to use imported function
  useEffect(() => {
    if (!trades.length) return;

    const total = trades.reduce((sum, trade) => {
      const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      if (!currentPrice) return sum;
      return sum + calculatePnL(trade, currentPrice);
    }, 0);

    setTotalPnL(total);
  }, [trades, pairPrices]);

  // Add close trade handler
  const handleCloseTrade = async (tradeId: string) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      const closePrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      const pnl = calculatePnL(trade, closePrice);

      const { error: closeError } = await supabase
        .rpc('close_trade', {
          p_trade_id: tradeId,
          p_close_price: closePrice,
          p_pnl: pnl
        });

      if (closeError) throw closeError;

      // Update local state
      setTrades(prevTrades =>
        prevTrades.map(t =>
          t.id === tradeId ? { ...t, status: 'closed', pnl } : t
        )
      );

      toast({
        title: "Success",
        description: `Trade closed with P&L: $${pnl.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error closing trade:', error);
      toast({
        title: "Error",
        description: "Failed to close trade"
      });
    }
  };

  // Add/update market status check
  const isForexClosed = !isForexTradingTime();
  const forexMarketStatus = isForexClosed ? "Closed" : "Open";

  // Update tab change handler to prevent forex selection when closed
  const handleTabChange = (value: string) => {
    if (value === 'forex' && isForexClosed) {
      toast({
        title: "Market Closed",
        description: "Forex market is currently closed. Trading resumes during market hours.",
      });
      return;
    }
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <Topbar title="Markets" />
        
        {/* Stats Card */}
        <div className="px-4 py-3">
          <div 
            className="relative overflow-hidden bg-card rounded-xl border shadow-sm transition-all 
                     hover:shadow-md active:scale-[0.99] cursor-pointer"
            onClick={() => setShowTradesSheet(true)}
          >
            <div className="p-4 flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-muted-foreground">Positions</div>
                <div className="text-2xl font-bold tracking-tight">{trades.length}</div>
              </div>
              <div className="space-y-1.5 text-right">
                <div className="text-sm font-medium text-muted-foreground">Total P&L</div>
                <div className={cn(
                  "text-2xl font-bold font-mono tracking-tight",
                  totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-red-500" : ""
                )}>
                  ${totalPnL.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-4 pb-20">
        {activeTab === 'forex' && isForexClosed && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50/50 border border-yellow-200/50 backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-700">
                Forex market is closed. Trading resumes Monday.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              className="pl-9 h-11 rounded-xl bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs defaultValue="crypto" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl p-1">
              <TabsTrigger value="crypto" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <ChartLine className="h-4 w-4" weight="bold" />
                  <span className="font-medium">Crypto</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="forex" 
                className="rounded-lg"
                disabled={isForexClosed}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" weight="bold" />
                  <span className="font-medium">Forex</span>
                  <Badge variant={isForexClosed ? "destructive" : "success"} className="ml-1.5 h-5">
                    {forexMarketStatus}
                  </Badge>
                </div>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-280px)] mt-4 -mx-4 px-4">
              <div className="grid gap-3 pb-4">
                {filteredPairs.map((pair) => {
                  const priceData = pairPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                  const priceAnimation = priceAnimations[pair.symbol];
                  const isForexPair = pair.symbol.includes('FX:');
                  const isDisabled = isForexPair && isForexClosed;
                  
                  return (
                    <button
                      key={pair.symbol}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handlePairSelect(pair.symbol)}
                      className={cn(
                        "w-full text-left bg-card hover:bg-accent rounded-xl border p-4",
                        "transition-all duration-200 active:scale-[0.98]",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={pair.image_url}
                            alt={pair.name}
                            className="h-12 w-12 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg';
                            }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold truncate">{pair.name}</span>
                            <span className="text-sm text-muted-foreground">{pair.short_name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={cn(
                            "text-base font-semibold font-mono tracking-tight transition-colors duration-300",
                            priceAnimation === 'up' ? "text-green-500" : 
                            priceAnimation === 'down' ? "text-red-500" : 
                            "text-foreground"
                          )}>
                            {priceData.bid}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            parseFloat(priceData.change) < 0 
                              ? "bg-red-500/10 text-red-500" 
                              : "bg-green-500/10 text-green-500"
                          )}>
                            {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        <TradesSheet
          open={showTradesSheet}
          onOpenChange={setShowTradesSheet}
          trades={trades}
          pairPrices={pairPrices}
          onCloseTrade={handleCloseTrade}
          calculatePnL={calculatePnL}
        />
      </div>
    </div>
  );
};

export default SelectPairs;

