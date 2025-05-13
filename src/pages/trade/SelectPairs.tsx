import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagnifyingGlass, ChartLine, Globe, X, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { isForexTradingTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { calculatePnL } from "@/utils/trading";
import { wsManager, ConnectionMode } from '@/services/websocket-manager';
import { cryptoDecimals, forexDecimals } from "@/config/decimals";
import { NavigationFooter } from "@/components/shared/NavigationFooter";
import { motion, AnimatePresence } from "framer-motion";
import { TradesSheet } from "@/components/shared/TradesSheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { calculateRequiredMargin } from "@/utils/trading";
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import { useScreenTracker } from '@/contexts/ScreenTracker';
import { ScreenConflictOverlay } from '@/components/overlays/ScreenConflictOverlay';

const SelectPairs = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setActiveScreen, hasConflict } = useScreenTracker();
  
  // Add new states
  const [userBalance, setUserBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("forex"); // Default to "forex"
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const [priceAnimations, setPriceAnimations] = useState<Record<string, 'up' | 'down'>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [showTradesSheet, setShowTradesSheet] = useState(false);
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [quickTradeDialog, setQuickTradeDialog] = useState<{
    isOpen: boolean;
    pair: string;
    action: 'buy' | 'sell';
    lots: number;
  }>({
    isOpen: false,
    pair: '',
    action: 'buy',
    lots: 0.01,
  });
  const [expandedPair, setExpandedPair] = useState<{
    symbol: string;
    action: 'buy' | 'sell';
    lots: number;
  } | null>(null);
  const [defaultLeverage, setDefaultLeverage] = useState<number>(1);

  // Fetch trading pairs only once on mount and keep websocket connection alive
  useEffect(() => {
    const fetchTradingPairs = async () => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('*')
        .order('display_order', { ascending: true }); // Remove is_active filter to get all pairs

      if (error) {
        console.error('Error fetching trading pairs:', error);
        return;
      }
      setTradingPairs(data);

      // Watch all pairs immediately with FULL mode
      if (data.length > 0) {
        // Get all symbols regardless of type
        const allPairs = data.map(pair => pair.symbol);
        
        // Subscribe to all pairs at once
        wsManager.watchPairs(allPairs, ConnectionMode.FULL);
      }
    };

    fetchTradingPairs();
    
    // Cleanup function
    return () => {
      wsManager.disconnect();
    };
  }, []); // Empty dependency array to run only once

  // Single WebSocket subscription for all price updates
  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      if (!data?.bid) return; // Ignore invalid price updates
      
      setPairPrices(prev => {
        const prevPrice = parseFloat(prev[symbol]?.bid || '0');
        const newPrice = parseFloat(data.bid);
        
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
      .sort((a, b) => a.type === 'forex' ? -1 : 1) // Forex first, then Crypto
      .map(pair => ({
        ...pair,
        currentPrice: parseFloat(pairPrices[pair.symbol]?.bid || '0').toFixed(getDecimalPlaces(pair.symbol)),
        priceAnimation: priceAnimations[pair.symbol]
      }));
  }, [tradingPairs, activeTab, searchQuery, pairPrices, priceAnimations]);

  // Update visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && tradingPairs.length > 0) {
        const allPairs = tradingPairs.map(pair => pair.symbol);
        wsManager.watchPairs(allPairs, ConnectionMode.FULL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tradingPairs]); // Add tradingPairs as dependency

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

      const closePrice = trade.type === 'buy'
        ? parseFloat(pairPrices[trade.pair]?.bid || '0')
        : parseFloat(pairPrices[trade.pair]?.ask || '0');

      if (!closePrice) {
        throw new Error('No valid close price available');
      }

      // Calculate PnL
      const pnl = calculatePnL(trade, closePrice);

      // Call close_trade function
      const { data: newBalance, error } = await supabase.rpc('close_trade', {
        p_trade_id: tradeId,
        p_close_price: closePrice,
        p_pnl: pnl
      });

      if (error) throw error;

      // Update local state
      setTrades(prev => prev.filter(t => t.id !== tradeId));

      // Update balance
      if (typeof newBalance === 'number') {
        setUserBalance(newBalance);
      }

      toast({
        title: "Success", 
        description: `Trade closed with P&L: $${pnl.toFixed(2)}`
      });

    } catch (error: any) {
      console.error('Error closing trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to close trade"
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
        .select('withdrawal_wallet, multiplier_bonus, default_leverage')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
        setUserBalance(data.withdrawal_wallet + (data.multiplier_bonus || 0));
        // Set default leverage from profile
        setDefaultLeverage(data.default_leverage || 1);
      }
    };

    fetchUserBalance();
  }, []);

  // Add helper to get active trades for a pair
  const getActiveTrades = (pairSymbol: string) => {
    return trades.filter(t => t.pair === pairSymbol && t.status === 'open');
  };

  // Add grouping helper
  const groupTradesByDate = (trades: Trade[]) => {
    return trades.reduce((acc, trade) => {
      const date = new Date(trade.openTime);
      const dateKey = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          trades: [],
          totalPnL: 0,
        };
      }
      
      const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      const pnl = calculatePnL(trade, currentPrice);
      acc[dateKey].trades.push(trade);
      acc[dateKey].totalPnL += pnl;
      
      return acc;
    }, {} as Record<string, { trades: Trade[], totalPnL: number }>);
  };

  // Removed any WebSocket reconnection logic from tab change handler

  // Add margin calculation
  // Removed duplicate declaration of calculateQuickTradeMargin

  // Add function to handle pair expansion
  const handleExpandPair = (symbol: string, action: 'buy' | 'sell', e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedPair?.symbol === symbol && expandedPair?.action === action) {
      setExpandedPair(null);
    } else {
      const pair = tradingPairs.find(p => p.symbol === symbol);
      if (pair) {
        setExpandedPair({
          symbol,
          action,
          lots: 0.01
        });
      }
    }
  };

  // Update the quick trade handler to match ChartView implementation
  const handleQuickTrade = async (pair: string, action: 'buy' | 'sell', lots: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedPair = tradingPairs.find(p => p.symbol === pair);
      if (!selectedPair) throw new Error('Invalid pair');

      // Always use maximum leverage for quick trades
      const maxLeverage = selectedPair.max_leverage;

      const price = action === 'buy' 
        ? parseFloat(pairPrices[pair]?.ask || '0')
        : parseFloat(pairPrices[pair]?.bid || '0');

      // Calculate margin amount with max leverage
      const marginAmount = calculateRequiredMargin(
        price,
        lots,
        maxLeverage,
        pair.includes('BINANCE:'),
        pair
      );

      // Validate margin against balance
      if (marginAmount > userBalance) {
        throw new Error(`Insufficient balance. Required margin: $${marginAmount.toFixed(2)}`);
      }

      // Insert trade directly with order_type
      const { data: trade, error } = await supabase
        .from('trades')
        .insert([{
          user_id: user.id,
          pair: pair,
          type: action,
          status: 'open',
          open_price: price,
          lots: lots,
          leverage: maxLeverage,
          margin_amount: marginAmount,
          order_type: 'market' // Add this field
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local trades state
      setTrades(prev => [{
        id: trade.id,
        pair: trade.pair,
        type: trade.type,
        status: trade.status,
        openPrice: trade.open_price,
        lots: trade.lots,
        leverage: trade.leverage,
        margin_amount: trade.margin_amount,
        orderType: 'market',
        openTime: new Date(trade.created_at).getTime()
      }, ...prev]);

      // Fetch updated balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserBalance(profile.withdrawal_wallet);
      }

      toast({
        title: "Success",
        description: `${action.toUpperCase()} order executed at $${price}`
      });

      setExpandedPair(null);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Update the margin calculation
  const calculateQuickTradeMargin = (pair: string, lots: number) => {
    const selectedPair = tradingPairs.find(p => p.symbol === pair);
    if (!selectedPair) return 0;

    const price = expandedPair?.action === 'buy' 
      ? parseFloat(pairPrices[pair]?.ask || '0')
      : parseFloat(pairPrices[pair]?.bid || '0');

    // Use user's default leverage, but cap it at pair's max_leverage
    const effectiveLeverage = Math.min(defaultLeverage, selectedPair.max_leverage);

    return calculateRequiredMargin(
      price,
      lots,
      effectiveLeverage,
      pair.includes('BINANCE:'),
      pair
    );
  };

  // Add this effect to handle initial price loading and websocket connection
  useEffect(() => {
    const loadPricesAndConnect = async () => {
      try {
        // Connect WebSocket immediately for all trading pairs
        if (tradingPairs.length > 0) {
          wsManager.watchPairs(
            tradingPairs.map(p => p.symbol),
            ConnectionMode.FULL
          );
        }
      } catch (error) {
        console.error('Error connecting to price feed:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to connect to price feed"
        });
      }
    };

    loadPricesAndConnect();
  }, [tradingPairs]); // Depend on tradingPairs

  // Update the WebSocket subscription effect to initialize prices
  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      setPairPrices(prev => {
        const prevPrice = parseFloat(prev[symbol]?.bid || '0');
        const newPrice = parseFloat(data.bid);
        
        // Only update if we have valid new price data
        if (!isNaN(newPrice) && newPrice > 0) {
          // Set price animation
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
        }
        
        return prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Add helper to calculate max affordable lots based on user balance
  const getMaxAffordableLots = (pair: string, leverageValue: number) => {
    const selectedPair = tradingPairs.find(p => p.symbol === pair);
    if (!selectedPair) return 0;

    const price = parseFloat(pairPrices[pair]?.ask || '0');
    if (!price || !leverageValue || !userBalance) return 0;

    // Calculate total margin already used
    const marginUtilized = trades
      .filter(t => t.status === 'open')
      .reduce((total, trade) => total + (trade.margin_amount || 0), 0);

    // Available balance for new positions
    const availableBalance = userBalance - marginUtilized;
    if (availableBalance <= 0) return 0;

    // Calculate max affordable lots
    const maxAffordableLots = availableBalance * leverageValue / (
      pair.includes('BINANCE:') 
        ? price 
        : pair === 'FX:XAU/USD'
          ? price * 100
          : price * 100000
    );

    // Return the minimum between affordable lots and pair's max lots
    return Math.min(maxAffordableLots, selectedPair.max_lots);
  };

  // Update the UI click handler to do nothing
  const handleContainerClick = (e: React.MouseEvent) => {
    // Prevent any navigation
    e.preventDefault();
  };

  // Add helper to format symbol for TradingView
  const formatTradingViewSymbol = (symbol: string): string => {
    if (symbol.startsWith('BINANCE:')) {
      return symbol; // Binance symbols are already correctly formatted
    }
    if (symbol.startsWith('FX:')) {
      // Convert FX:EUR/USD to FX:EURUSD
      return symbol.replace('/', '');
    }
    return symbol;
  };

  // Update screen tracking effect
  useEffect(() => {
    // Set active screen immediately
    setActiveScreen('selectPairs');
    
    // Cleanup function to clear active screen
    return () => {
      setActiveScreen(null);
    };
  }, [setActiveScreen]);

  // Move the conflict check to the top of the component
  if (hasConflict) {
    return (
      <div className="min-h-screen">
        <ScreenConflictOverlay />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-16">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-[#525252]">
        {/* Balance Card */}
        <div className="px-4 pt-4">
          <div className="bg-[#141414] rounded-xl border border-[#525252]">
            <div className="p-4">
              <div className="flex flex-col gap-4">
                {/* Badges */}
                <div className="flex gap-2">
                  <Badge variant="outline" className="rounded-sm bg-[#282828] text-primary">Pro</Badge>
                  <Badge variant="outline" className="rounded-sm bg-[#282828] text-primary">MT5</Badge>
                  <Badge variant="outline" className="rounded-sm bg-[#282828] text-primary">Web</Badge>
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
            className="relative overflow-hidden bg-card rounded-xl border border-[#525252] shadow-sm transition-all 
                     hover:shadow-md active:scale-[0.99] cursor-pointer"
            onClick={() => setShowTradesSheet(true)}
          >
            <div className="p-4 flex items-center justify-between">
              <Badge variant="outline">
                Positions ({trades.filter(t => t.status === 'open').length})
              </Badge>
              <Badge 
                variant={totalPnL === 0 ? "outline" : totalPnL > 0 ? "success" : "destructive"}
                className={cn(
                  "font-mono",
                  totalPnL === 0 && "text-muted-foreground bg-muted"
                )}
              >
                {totalPnL === 0 ? 
                  '$0.00' : 
                  totalPnL > 0 ? 
                    `Profit +$${totalPnL.toFixed(2)}` : 
                    `Loss -$${Math.abs(totalPnL).toFixed(2)}`
                }
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
                  className="absolute inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border border-[#525252]"
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

            <Tabs defaultValue="forex" onValueChange={handleTabChange}>
              <div className="flex items-center justify-between">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="forex" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Forex
                  </TabsTrigger>
                  <TabsTrigger value="crypto" className="flex items-center gap-2">
                    <ChartLine className="h-4 w-4" />
                    Crypto
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

              <ScrollArea className="h-[calc(100vh-320px)] mt-4 -mx-4 px-4">
                <div className="grid gap-3 pb-4">
                  {filteredPairs.map((pair) => {
                    const priceData = pairPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                    const priceAnimation = priceAnimations[pair.symbol];
                    const isForexPair = pair.symbol.includes('FX:');
                    const isDisabled = isForexPair && !isForexTradingTime();
                    const activeTrades = getActiveTrades(pair.symbol);
                    
                    return (
                      <div
                        key={pair.symbol}
                        onClick={handleContainerClick}
                        className={cn(
                          "w-full text-left bg-card hover:bg-accent rounded-lg border border-[#525252] p-3",
                          "transition-all duration-200 active:scale-[0.98]",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          isDisabled && "opacity-50 cursor-not-allowed",
                          !isDisabled && "cursor-pointer"
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
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={(e) => handleExpandPair(pair.symbol, 'buy', e)}
                                >
                                  {expandedPair?.symbol === pair.symbol && expandedPair?.action === 'buy' 
                                    ? 'Cancel' 
                                    : 'Buy'}
                                </Button>
                                <Button
                                  size="sm" 
                                  className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white"
                                  onClick={(e) => handleExpandPair(pair.symbol, 'sell', e)}
                                >
                                  {expandedPair?.symbol === pair.symbol && expandedPair?.action === 'sell' 
                                    ? 'Cancel' 
                                    : 'Sell'}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Add expandable quick trade section */}
                          {expandedPair?.symbol === pair.symbol && (
                            <div className="mt-3 pt-3 border-t border-[#525252] space-y-4">
                              <div className="h-[300px] -mx-3 mb-4">
                                <TradingViewWidget 
                                  symbol={formatTradingViewSymbol(pair.symbol)}
                                  theme="dark"
                                  variant="minimal"  // Add this line
                                />
                              </div>
                              <div className="space-y-2">
                                {(() => {
                                  const maxLeverage = pair.max_leverage;
                                  const currentPrice = parseFloat(pairPrices[pair.symbol]?.ask || '0');
                                  const maxAffordable = getMaxAffordableLots(pair.symbol, maxLeverage);
                                  const margin = calculateRequiredMargin(
                                    currentPrice,
                                    expandedPair.lots,
                                    maxLeverage,
                                    pair.symbol.includes('BINANCE:'),
                                    pair.symbol
                                  );
                                  const isMarginAvailable = margin <= userBalance;
                          
                                  return (
                                    <>
                                      <div className="flex justify-between items-center text-sm">
                                        <label className="font-medium">
                                          Lots: {expandedPair.lots.toFixed(2)}
                                        </label>
                                        <span className="text-muted-foreground">
                                          Max: {maxAffordable.toFixed(2)}
                                        </span>
                                      </div>
                                      <Slider
                                        value={[expandedPair.lots]}
                                        min={pair.min_lots}
                                        max={maxAffordable}
                                        step={pair.lot_step}
                                        onValueChange={([value]) => 
                                          setExpandedPair(prev => prev ? { ...prev, lots: value } : null)
                                        }
                                        className={cn(
                                          "w-full",
                                          !isMarginAvailable && "opacity-50 cursor-not-allowed"
                                        )}
                                        disabled={!isMarginAvailable}
                                      />
                          
                                      <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-muted-foreground">Leverage:</span>
                                          <span className="text-red-500 font-medium">
                                            {maxLeverage}x (Max)
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-muted-foreground">Required Margin:</span>
                                          <span className={cn(
                                            "font-medium",
                                            !isMarginAvailable && "text-red-500"
                                          )}>
                                            ${margin.toFixed(2)}
                                          </span>
                                        </div>
                                        {!isMarginAvailable && (
                                          <div className="text-xs text-red-500">
                                            Insufficient balance for selected lots
                                          </div>
                                        )}
                                        <Button
                                          size="sm"
                                          className={cn(
                                            expandedPair.action === 'buy' 
                                              ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                              : "bg-red-600 hover:bg-red-700 text-white",
                                            "w-full mt-2"
                                          )}
                                          disabled={!isMarginAvailable}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickTrade(
                                              pair.symbol,
                                              expandedPair.action,
                                              expandedPair.lots
                                            );
                                          }}
                                        >
                                          Confirm {expandedPair.action === 'buy' ? 'Buy' : 'Sell'}
                                        </Button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {activeTrades.length > 0 && (
                            <div className="-mx-3 -mb-3 border-[#525252]">
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
                      </div>
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
          onCloseTrade={handleCloseTrade}
          calculatePnL={(trade, currentPrice) => calculatePnL(trade, currentPrice)}
          pairPrices={pairPrices}
        />

        <Dialog
          open={quickTradeDialog.isOpen}
          onOpenChange={(open) => setQuickTradeDialog(prev => ({ ...prev, isOpen: open }))}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Quick {quickTradeDialog.action === 'buy' ? 'Buy' : 'Sell'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Lots: {quickTradeDialog.lots.toFixed(2)}
                </label>
                <Slider
                  value={[quickTradeDialog.lots]}
                  min={0.01}
                  max={1.00}
                  step={0.01}
                  onValueChange={([value]) => 
                    setQuickTradeDialog(prev => ({ ...prev, lots: value }))
                  }
                  className="w-full"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Required Margin:</span>
                <span className="font-medium">
                  ${calculateQuickTradeMargin(
                    quickTradeDialog.pair,
                    quickTradeDialog.lots
                  ).toFixed(2)}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setQuickTradeDialog(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button
                className={quickTradeDialog.action === 'buy' 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-red-600 hover:bg-red-700"}
                onClick={() => handleQuickTrade(
                  quickTradeDialog.pair,
                  quickTradeDialog.action,
                  quickTradeDialog.lots
                )}
              >
                Confirm {quickTradeDialog.action === 'buy' ? 'Buy' : 'Sell'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <NavigationFooter />
      </div>
    </div>
  );
};

export default SelectPairs;

