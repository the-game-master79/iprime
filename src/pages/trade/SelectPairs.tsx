import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react"; 
import { MagnifyingGlass, ChartLine, Globe, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { isForexTradingTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { TradesSheet } from "@/components/shared/TradesSheet";
import { useToast } from "@/hooks/use-toast";
import { calculatePnL } from "@/utils/trading";
import { wsManager } from '@/services/websocket-manager';
import { cryptoDecimals, forexDecimals } from "@/config/decimals";
import { NavigationFooter } from "@/components/shared/NavigationFooter";
import { motion, AnimatePresence } from "framer-motion";

const SelectPairs = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  // Add new states
  const [userBalance, setUserBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const [priceAnimations, setPriceAnimations] = useState<Record<string, 'up' | 'down'>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [showTradesSheet, setShowTradesSheet] = useState(false);
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Fetch trading pairs only once on mount and keep websocket connection alive
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

      // Watch all active pairs immediately and persistently
      if (data.length > 0) {
        const allPairs = data.map(pair => pair.symbol);
        wsManager.watchPairs(allPairs, true); // Pass true to indicate persistent connection
      }
    };

    fetchTradingPairs();

    // Only unwatchPairs on component unmount
    return () => {
      if (tradingPairs.length > 0) {
        wsManager.unwatchPairs(tradingPairs.map(p => p.symbol));
      }
    };
  }, []); // Empty dependency array to run only once

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

  // Add helper function for decimal places
  const getDecimalPlaces = (symbol: string): number => {
    if (symbol.includes('BINANCE:')) {
      const base = symbol.replace('BINANCE:', '');
      return cryptoDecimals[base] ?? 5;
    }
    if (symbol.includes('FX:')) {
      const base = symbol.replace('FX:', '').replace('/', '');
      return forexDecimals[base] ?? 5;
    }
    return 5; // Default fallback
  };

  // Update filteredPairs to include decimal places
  const filteredPairs = useMemo(() => {
    return tradingPairs
      .filter(pair => pair.type === activeTab)
      .filter(pair => 
        pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pair.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(pair => ({
        ...pair,
        currentPrice: parseFloat(pairPrices[pair.symbol]?.bid || '0').toFixed(getDecimalPlaces(pair.symbol)),
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

  // Remove any WebSocket reconnection logic from tab change handler
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Add effect to fetch user balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('withdrawal_wallet, multiplier_bonus')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
        setUserBalance(data.withdrawal_wallet + (data.multiplier_bonus || 0));
      }
    };

    fetchUserBalance();
  }, []);

  // Add helper to get active trades for a pair
  const getActiveTrades = (pairSymbol: string) => {
    return trades.filter(t => t.pair === pairSymbol && t.status === 'open');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-16">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        {/* Balance Card */}
        <div className="px-4 pt-4">
          <div className="bg-primary rounded-xl border-gray-200">
            <div className="p-4">
              <div className="flex flex-col gap-4">
                {/* Badges */}
                <div className="flex gap-2">
                  <Badge variant="outline" className="rounded-sm bg-white text-primary">Pro</Badge>
                  <Badge variant="outline" className="rounded-sm bg-white text-primary">MT5</Badge>
                  <Badge variant="outline" className="rounded-sm bg-white text-primary">Web</Badge>
                </div>
                
                {/* Balance */}
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-white">
                    ${userBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="px-4 py-3">
          <div 
            className="relative overflow-hidden bg-card rounded-xl border shadow-sm transition-all 
                     hover:shadow-md active:scale-[0.99] cursor-pointer"
            onClick={() => setShowTradesSheet(true)}
          >
            <div className="p-4 flex items-center justify-between">
              <Badge variant="outline">
                Positions ({trades.filter(t => t.status === 'open').length})
              </Badge>
              <Badge 
                variant={totalPnL > 0 ? "success" : "destructive"}
                className="font-mono"
              >
                {totalPnL > 0 ? `Profit +$${totalPnL.toFixed(2)}` : `Loss -$${Math.abs(totalPnL).toFixed(2)}`}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-4 pb-6">
        <div className="space-y-4">
          <div className="relative">
            <AnimatePresence>
              {showSearch && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border"
                >
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search markets..."
                      className="h-12 pl-10 pr-10 border-none focus-visible:ring-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowSearch(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Tabs defaultValue="crypto" onValueChange={handleTabChange}>
              <div className="flex items-center justify-between">
                <TabsList className="grid w-[calc(100%-44px)] grid-cols-2 h-12 rounded-xl p-1">
                  <TabsTrigger value="crypto" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <ChartLine className="h-4 w-4" weight="bold" />
                      <span className="font-medium">Crypto</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="forex" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" weight="bold" />
                      <span className="font-medium">Forex</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
                
                <Button
                  variant="ghost" 
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setShowSearch(true)}
                >
                  <MagnifyingGlass className="h-5 w-5" />
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-280px)] mt-4 -mx-4 px-4">
                <div className="grid gap-3 pb-4">
                  {filteredPairs.map((pair) => {
                    const priceData = pairPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                    const priceAnimation = priceAnimations[pair.symbol];
                    const isForexPair = pair.symbol.includes('FX:');
                    const isDisabled = isForexPair && !isForexTradingTime();
                    const activeTrades = getActiveTrades(pair.symbol);
                    
                    return (
                      <button
                        key={pair.symbol}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && handlePairSelect(pair.symbol)}
                        className={cn(
                          "w-full text-left bg-card hover:bg-accent rounded-lg border p-3",
                          "transition-all duration-200 active:scale-[0.98]",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <img 
                                src={pair.image_url}
                                alt={pair.name}
                                className="h-8 w-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg';
                                }}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate text-sm">{pair.name}</span>
                                <span className="text-xs text-muted-foreground">{pair.short_name}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={cn(
                                "text-sm font-medium font-mono tracking-tight transition-colors duration-300",
                                priceAnimation === 'up' ? "text-green-500" : 
                                priceAnimation === 'down' ? "text-red-500" : 
                                "text-foreground"
                              )}>
                                {parseFloat(priceData.bid).toFixed(getDecimalPlaces(pair.symbol))}
                              </span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                parseFloat(priceData.change) < 0 
                                  ? "bg-red-500/10 text-red-500" 
                                  : "bg-green-500/10 text-green-500"
                              )}>
                                {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
                              </span>
                            </div>
                          </div>

                          {activeTrades.length > 0 && (
                            <div className="-mx-3 -mb-3 border-t">
                              <div className={cn(
                                "px-3 py-2 flex items-center justify-between text-xs",
                                activeTrades.reduce((sum, trade) => {
                                  const price = parseFloat(pairPrices[trade.pair]?.bid || '0');
                                  return sum + calculatePnL(trade, price);
                                }, 0) > 0 
                                  ? "bg-green-500/5 text-green-500" 
                                  : "bg-red-500/5 text-red-500"
                              )}>
                                <span>Positions ({activeTrades.length})</span>
                                <span className="font-mono font-medium">
                                  {(() => {
                                    const pairPnL = activeTrades.reduce((sum, trade) => {
                                      const price = parseFloat(pairPrices[trade.pair]?.bid || '0');
                                      return sum + calculatePnL(trade, price);
                                    }, 0);
                                    return pairPnL > 0 
                                      ? `+$${pairPnL.toFixed(2)}` 
                                      : `-$${Math.abs(pairPnL).toFixed(2)}`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        <TradesSheet
          open={showTradesSheet}
          onOpenChange={setShowTradesSheet}
          trades={trades}
          pairPrices={pairPrices}
          onCloseTrade={handleCloseTrade}
          calculatePnL={calculatePnL}
        />

        <NavigationFooter />
      </div>
    </div>
  );
};

export default SelectPairs;

function fetchInitialPrices() {
  throw new Error("Function not implemented.");
}

