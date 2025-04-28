import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Topbar } from "@/components/shared/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { TradesSheet } from "@/components/shared/TradesSheet";
import { useLimitOrders } from '@/hooks/use-limit-orders';
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { wsManager } from '@/services/websocket-manager';
import { calculatePnL, calculateRequiredMargin, calculatePipValue } from "@/utils/trading"; // Add calculatePipValue
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PriceData {
  price: string;
  change: string;
  bid?: string;
  ask?: string;
}

interface ChartViewProps {
  openTrades?: number;
  totalPnL?: number;
  leverage?: number;
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
  pnl?: number;
  margin_amount?: number;
}

interface PairPrices {
  [key: string]: PriceData;
}

const tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const RECONNECT_DELAY = 5000;
const MAX_RETRIES = 3;

const FOREX_PAIRS_5_DECIMALS = ['EURUSD', 'GBPUSD', 'AUDUSD', 'EURGBP'];
const FOREX_PAIRS_3_DECIMALS = ['USDJPY', 'EURJPY', 'GBPJPY'];

const groupTradesByDate = (trades: Trade[]) => {
  const groups = trades.reduce((acc, trade) => {
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
    
    acc[dateKey].trades.push(trade);
    acc[dateKey].totalPnL += trade.pnl || 0;
    
    return acc;
  }, {} as Record<string, { trades: Trade[], totalPnL: number }>);

  return Object.entries(groups).sort((a, b) => 
    new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );
};

// Update interface
interface TradingPairInfo {
  symbol: string;
  name: string;
  min_leverage: number;
  max_leverage: number;
  max_lots: number;
}

// Add margin call threshold constant (80%)
const MARGIN_CALL_THRESHOLD = 0.8;

export const ChartView = ({ openTrades = 0, totalPnL: initialTotalPnL = 0, leverage = 100 }: ChartViewProps) => {
  const { pair } = useParams<{ pair?: string }>();
  const navigate = useNavigate();

  // Add new state for trading pair info
  const [pairInfo, setPairInfo] = useState<TradingPairInfo | null>(null);

  useEffect(() => {
    if (!pair) {
      navigate('/trade/select');
    }
  }, [pair]);

  if (!pair) {
    return <div>Loading...</div>;
  }

  const defaultPair = useMemo(() => {
    return decodeURIComponent(pair);
  }, [pair]);

  useEffect(() => {
    console.log('Chart loading with pair:', {
      rawPair: pair,
      decoded: defaultPair
    });
  }, [pair, defaultPair]);

  const formattedPairName = useMemo(() => {
    if (defaultPair.includes('BINANCE:')) {
      const symbol = defaultPair.replace('BINANCE:', '');
      return symbol.replace('USDT', '/USDT');
    }
    
    if (defaultPair.includes('FX:')) {
      return defaultPair.replace('FX:', '');
    }
    
    return defaultPair;
  }, [defaultPair]);

  const formattedSymbol = useMemo(() => {
    if (defaultPair.includes('FX:')) {
      return defaultPair.replace('FX:', '').replace('/', '');
    }
    return defaultPair;
  }, [defaultPair]);

  const [pairPrices, setPairPrices] = useState<PairPrices>({});
  const [activePairs, setActivePairs] = useState<Set<string>>(new Set());
  const [showPanel, setShowPanel] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | null>(null);
  const [lots, setLots] = useState('0.01');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [showSLInput, setShowSLInput] = useState(false);
  const [showTPInput, setShowTPInput] = useState(false);
  const [showLeverageDialog, setShowLeverageDialog] = useState(false);
  const [selectedLeverage, setSelectedLeverage] = useState(leverage.toString());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [showTradesSheet, setShowTradesSheet] = useState(false);
  const [marginUtilized, setMarginUtilized] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [marginCallAlerts, setMarginCallAlerts] = useState<{[key: string]: boolean}>({});
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [pipValue, setPipValue] = useState('0.00');

  useEffect(() => {
    const fetchUserBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserBalance(data.withdrawal_wallet || 0);
      }
    };

    fetchUserBalance();
  }, []);

  useEffect(() => {
    const fetchTrades = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTrades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      const formattedTrades: Trade[] = userTrades.map(trade => ({
        id: trade.id,
        pair: trade.pair,
        type: trade.type,
        status: trade.status,
        openPrice: trade.open_price,
        lots: trade.lots,
        leverage: trade.leverage,
        orderType: trade.order_type,
        limitPrice: trade.limit_price,
        openTime: new Date(trade.created_at).getTime(),
        pnl: trade.pnl || 0,
        margin_amount: trade.margin_amount || 0
      }));

      setTrades(formattedTrades);
    };

    fetchTrades();
  }, []);

  useEffect(() => {
    const pairs = new Set(trades.filter(t => t.status === 'open').map(t => t.pair));
    pairs.add(defaultPair);
    setActivePairs(pairs);
  }, [trades, defaultPair]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isPageVisible) return;

    let connections: { [key: string]: WebSocket } = {};
    let heartbeats: { [key: string]: NodeJS.Timeout } = {};

    // Get all unique pairs from open trades and current chart
    const getAllPairs = () => {
      const pairs = new Set<string>();
      pairs.add(defaultPair);
      trades.forEach(trade => {
        if (trade.status === 'open' || trade.status === 'pending') {
          pairs.add(trade.pair);
        }
      });
      return Array.from(pairs);
    };

    const connectWebSocket = (pair: string) => {
      if (connections[pair]?.readyState === WebSocket.OPEN) {
        connections[pair].close();
        if (heartbeats[pair]) clearInterval(heartbeats[pair]);
      }

      if (pair.includes('BINANCE:')) {
        const ws = new WebSocket('wss://stream.binance.com:9443/ws');
        const symbol = pair.replace('BINANCE:', '').toLowerCase();
        
        ws.onopen = () => {
          ws.send(JSON.stringify({
            method: "SUBSCRIBE",
            params: [`${symbol}@ticker`],
            id: 1
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.e === '24hrTicker') {
              setPairPrices(prev => ({
                ...prev,
                [pair]: {
                  price: data.c,
                  bid: data.b,
                  ask: data.a,
                  change: data.P
                }
              }));
            }
          } catch (error) {
            console.error('Error handling crypto message:', error);
          }
        };

        connections[pair] = ws;
      } else if (pair.includes('FX:')) {
        const ws = new WebSocket('wss://marketdata.tradermade.com/feedadv');
        const symbol = pair.replace('FX:', '').replace('/', '');

        ws.onopen = () => {
          ws.send(JSON.stringify({
            userKey: tradermadeApiKey,
            symbol: symbol,
            _type: "subscribe"
          }));

          heartbeats[pair] = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ heartbeat: "1" }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            if (!event.data.startsWith('{')) return;
            const data = JSON.parse(event.data);
            if (data.symbol && data.bid && data.ask) {
              setPairPrices(prev => ({
                ...prev,
                [`FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`]: {
                  price: data.mid || data.bid,
                  bid: data.bid,
                  ask: data.ask,
                  change: prev[`FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`]?.change || '0.00'
                }
              }));
            }
          } catch (error) {
            console.error('Error handling forex message:', error);
          }
        };

        connections[pair] = ws;
      }
    };

    // Connect to all required pairs
    getAllPairs().forEach(pair => {
      connectWebSocket(pair);
    });

    // Cleanup function
    return () => {
      Object.values(connections).forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      Object.values(heartbeats).forEach(clearInterval);
    };
  }, [trades, defaultPair, isPageVisible]); // Added trades to dependencies

  useEffect(() => {
    const total = trades
      .filter(t => t.status === 'open')
      .reduce((acc, trade) => {
        const price = parseFloat(pairPrices[trade.pair]?.price || '0');
        return acc + calculateRequiredMargin(
          price, 
          trade.lots, 
          trade.leverage, 
          trade.pair.includes('BINANCE:'),
          trade.pair
        );
      }, 0);
    
    setMarginUtilized(total);
  }, [trades, pairPrices]);

  // Update all PnL calculations to use imported function
  const { totalPnL, openTradesCount } = useMemo(() => {
    return trades.reduce((acc, trade) => {
      if (trade.status === 'open') { // Only calculate PnL for open trades
        acc.openTradesCount++;
        const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
        acc.totalPnL += calculatePnL(trade, currentPrice);
      } else if (trade.status === 'pending') {
        acc.openTradesCount++; // Still count pending trades but don't add to PnL
      }
      return acc;
    }, { totalPnL: 0, openTradesCount: 0 });
  }, [trades, pairPrices]);

  const marginRequired = useMemo(() => {
    const lotSize = parseFloat(lots) || 0;
    const price = parseFloat(pairPrices[defaultPair]?.price || '0');
    const leverageValue = parseFloat(selectedLeverage);
    const isCrypto = defaultPair.includes('BINANCE:');
    
    return calculateRequiredMargin(price, lotSize, leverageValue, isCrypto, defaultPair).toFixed(2);
  }, [lots, pairPrices, selectedLeverage, defaultPair]);

  // Add handleLotsChange function before the return statement
  const handleLotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty input or decimal point
    if (value === '' || value === '.') {
      setLots(value);
      return;
    }

    // Validate numeric input
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // Get margin utilization from open trades
    const existingMargin = trades
      .filter(t => t.status === 'open' || t.status === 'pending')
      .reduce((total, trade) => total + (trade.margin_amount || 0), 0);

    // Calculate margin for new position
    const price = parseFloat(pairPrices[defaultPair]?.price || '0');
    const leverageValue = parseFloat(selectedLeverage);
    const newPositionMargin = calculateRequiredMargin(
      price,
      numValue,
      leverageValue,
      defaultPair.includes('BINANCE:'),
      defaultPair
    );

    // Check if total margin would exceed balance
    if (existingMargin + newPositionMargin > userBalance) {
      // Set to maximum affordable lots
      setLots(getMaxAffordableLots.toFixed(2));
      return;
    }

    setLots(value);
  };

  // Update the getMaxAffordableLots calculation
  const getMaxAffordableLots = useMemo(() => {
    const price = parseFloat(pairPrices[defaultPair]?.price || '0');
    const leverageValue = parseFloat(selectedLeverage);
    const isCrypto = defaultPair.includes('BINANCE:');
    
    if (!price || !leverageValue || !userBalance) return 0;

    // Calculate total margin already used
    const marginUtilized = trades
      .filter(t => t.status === 'open' || t.status === 'pending')
      .reduce((total, trade) => total + (trade.margin_amount || 0), 0);

    // Available balance for new positions
    const availableBalance = userBalance - marginUtilized;
    if (availableBalance <= 0) return 0;

    // Calculate max affordable lots
    const maxAffordableLots = availableBalance * leverageValue / (
      isCrypto 
        ? price 
        : defaultPair === 'FX:XAU/USD'
          ? price * 100
          : price * 100000
    );

    return maxAffordableLots;
  }, [pairPrices, selectedLeverage, defaultPair, userBalance, trades]);

  // Add effective max lots calculation
  const effectiveMaxLots = useMemo(() => {
    const maxByBalance = getMaxAffordableLots;
    const maxByPair = pairInfo?.max_lots || 0;
    return Math.min(maxByBalance, maxByPair);
  }, [getMaxAffordableLots, pairInfo]);

  const handleTrade = async (type: 'buy' | 'sell') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "User not authenticated",
        });
        return;
      }

      // Validate lots
      const lotsError = validateLots(lots);
      if (lotsError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: lotsError,
        });
        return;
      }

      // Get effective price based on order type and trade direction
      const currentPrice = type === 'buy' 
        ? parseFloat(pairPrices[defaultPair]?.ask || '0')
        : parseFloat(pairPrices[defaultPair]?.bid || '0');

      const effectivePrice = orderType === 'limit' 
        ? parseFloat(limitPrice)
        : currentPrice;

      // Validate margin
      const marginError = validateMargin(parseFloat(lots), effectivePrice, parseFloat(selectedLeverage));
      if (marginError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: marginError,
        });
        return;
      }

      // Calculate margin amount
      const marginAmount = calculateRequiredMargin(
        effectivePrice,
        parseFloat(lots),
        parseFloat(selectedLeverage),
        defaultPair.includes('BINANCE:'),
        defaultPair
      );

      // Create trade
      const { data: trade, error } = await supabase
        .from('trades')
        .insert([{
          user_id: user.id,
          pair: defaultPair,
          type,
          status: orderType === 'limit' ? 'pending' : 'open',
          open_price: effectivePrice,
          lots: parseFloat(lots),
          leverage: parseFloat(selectedLeverage),
          order_type: orderType,
          limit_price: orderType === 'limit' ? effectivePrice : null,
          margin_amount: marginAmount
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTrades(prev => [{
        id: trade.id,
        pair: defaultPair,
        type,
        status: orderType === 'limit' ? 'pending' : 'open',
        openPrice: effectivePrice,
        lots: parseFloat(lots),
        leverage: parseFloat(selectedLeverage),
        orderType,
        limitPrice: orderType === 'limit' ? effectivePrice : null,
        openTime: Date.now(),
        pnl: 0,
        margin_amount: marginAmount
      }, ...prev]);

      // Reset form
      setLimitPrice('');
      setLots('0.01');

      toast({
        title: "Success",
        description: orderType === 'limit'
          ? `Limit order placed at $${effectivePrice}`
          : `Market order executed at $${effectivePrice}`
      });

    } catch (error) {
      console.error('Error placing trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place trade"
      });
    }
  }

  // Update close trade handler to use imported calculatePnL
  const handleCloseTrade = async (tradeId: string) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      // If trade is pending, just mark as cancelled without PnL calculation
      if (trade.status === 'pending') {
        const { error } = await supabase
          .from('trades')
          .update({ status: 'cancelled' })
          .eq('id', tradeId);

        if (error) throw error;

        // Update local state
        setTrades(prevTrades =>
          prevTrades.map(t =>
            t.id === tradeId ? { ...t, status: 'cancelled' } : t
          )
        );

        toast({
          title: "Success",
          description: "Order cancelled successfully"
        });

        return;
      }

      // Handle open trade closure with PnL calculation
      const closePrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      const pnl = calculatePnL(trade, closePrice);

      // Call the close_trade stored procedure instead of direct update
      const { data: { withdrawal_wallet }, error: closeError } = await supabase
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

      // Update user balance
      setUserBalance(withdrawal_wallet);

      toast({
        title: "Success",
        description: `Trade closed with P&L: $${pnl.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error closing trade:', error);
      toast({
        variant: "destructive", 
        title: "Error",
        description: "Failed to close trade",
      });
    }
  };
  
  const handleCloseAllTrades = async () => {
    try {
      const openTrades = trades.filter(t => t.status === 'open');
      for (const trade of openTrades) {
        const closePrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
        const pnl = calculatePnL(trade, closePrice);
        await handleCloseTrade(trade.id);
      }
      
      toast({
        title: "Success",
        description: "All trades closed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close all trades"
      });
    }
  };

  // Add proper validation checks
  const validateLots = (value: string) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      return "Lots must be greater than 0";
    }

    if (numValue > effectiveMaxLots) {
      if (effectiveMaxLots < (pairInfo?.max_lots || 0)) {
        return `Maximum ${effectiveMaxLots.toFixed(2)} lots allowed with current balance`;
      }
      return `Maximum ${pairInfo?.max_lots} lots allowed for this pair`;
    }

    return null;
  };

  const validateMargin = (lots: number, price: number, leverage: number) => {
    const isCrypto = defaultPair.includes('BINANCE:');
    const margin = calculateRequiredMargin(price, lots, leverage, isCrypto, defaultPair);
    
    if (margin > userBalance) {
      return `Insufficient balance. Required margin: $${margin.toFixed(2)}`;
    }

    return null;
  };

  // Update the useLimitOrders hook implementation 
  useEffect(() => {
    const channel = supabase
      .channel('limit-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `status=eq.open`,
        },
        async (payload) => {
          try {
            const executedTrade = payload.new as Trade;
            if (executedTrade.orderType === 'limit') {
              // Update local state
              setTrades(prev => prev.map(t => 
                t.id === executedTrade.id ? {
                  ...t,
                  status: 'open',
                  openPrice: executedTrade.openPrice,
                  margin_amount: executedTrade.margin_amount
                } : t
              ));

              // Update user balance since margin will be deducted
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data } = await supabase
                  .from('profiles')
                  .select('withdrawal_wallet')
                  .eq('id', user.id)
                  .single();
                
                if (data) {
                  setUserBalance(data.withdrawal_wallet);
                }
              }

              toast({
                title: "Limit Order Executed",
                description: `Order executed at $${executedTrade.openPrice}`,
              });
            }
          } catch (error) {
            console.error('Error handling limit order execution:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ...existing code...

  // Update fetchPairInfo effect
  useEffect(() => {
    const fetchPairInfo = async () => {
      if (!defaultPair) return;
      
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('symbol, name, min_leverage, max_leverage, max_lots')
        .eq('symbol', defaultPair)
        .single();

      if (error) {
        console.error('Error fetching pair info:', error);
        return;
      }

      setPairInfo(data);
    };

    fetchPairInfo();
  }, [defaultPair]);

  // Update the effect to check margin levels
  useEffect(() => {
    const checkMarginLevels = () => {
      const alerts: {[key: string]: boolean} = {};
      const totalMargin = calculateTotalMarginUtilization(trades);
      
      if (totalMargin >= (userBalance * MARGIN_CALL_THRESHOLD)) {
        trades
          .filter(t => t.status === 'open')
          .forEach(trade => {
            alerts[trade.id] = true;
          });
      }

      setMarginCallAlerts(alerts);
    };

    // Check margin levels every 5 seconds
    const interval = setInterval(checkMarginLevels, 5000);
    return () => clearInterval(interval);
  }, [trades, pairPrices, userBalance]);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, priceData) => {
      setPairPrices(prev => ({
        ...prev,
        [symbol]: priceData
      }));
    });

    // Watch required pairs
    const pairsToWatch = Array.from(activePairs);
    if (pairsToWatch.length > 0) {
      wsManager.watchPairs(pairsToWatch);
    }

    return () => {
      unsubscribe();
      wsManager.unwatchPairs(pairsToWatch);
    };
  }, [activePairs]);

  function formatPrice(price: string | undefined): React.ReactNode {
    if (!price) return "0.00";
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) return "0.00";
    return parsedPrice.toFixed(2);
  }
  return (
    <div className="h-screen bg-background flex flex-col">
      <Topbar title={formattedPairName} />
      
      {/* Add margin call alerts */}
      {Object.keys(marginCallAlerts).length > 0 && (
        <div className="bg-red-50 border-b border-red-100">
          <div className="container mx-auto px-4 py-2">
            <Alert variant="destructive" className="border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                Warning: One or more positions are nearing margin call level. Consider adding funds or reducing position sizes.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      <div className="bg-muted/30">
        <div className="container mx-auto px-4 mt-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center justify-between w-full gap-4">
              <div 
                className="bg-muted rounded-lg px-4 py-2 flex flex-col cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => setShowTradesSheet(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg font-mono font-medium">
                    ${formatPrice(pairPrices[defaultPair]?.price)}
                  </div>
                  <Badge 
                    variant={parseFloat(pairPrices[defaultPair]?.change || '0') < 0 ? "destructive" : "success"} 
                    className="h-6"
                  >
                    {parseFloat(pairPrices[defaultPair]?.change || '0') > 0 ? '+' : ''}{pairPrices[defaultPair]?.change}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Open</span>
                  <Badge variant="outline" className="h-5 text-xs">
                    {openTradesCount} trades
                  </Badge>
                </div>
              </div>

              <div className="bg-muted rounded-lg px-4 py-2 cursor-pointer hover:bg-muted/70 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">P&L (Live)</div>
                  {openTradesCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent sheet from opening
                        handleCloseAllTrades();
                      }}
                      className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Close All
                    </Button>
                  )}
                </div>
                <div
                  className={cn(
                    "text-2xl font-mono font-medium text-center",
                    totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-red-500" : ""
                  )}
                  onClick={() => setShowTradesSheet(true)}
                >
                  ${totalPnL.toFixed(2)}
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

            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 flex-1">
        <div className="flex flex-col h-full relative bg-white rounded-xl mt-4">
          {/* Chart container */}
          <div className="flex-1 min-h-0 pb-[calc(1rem+240px)]"> {/* Add padding bottom to account for controls */}
            <TradingViewWidget symbol={formattedSymbol} />
          </div>

          {/* Trading Controls */}
          <div className="absolute bottom-0 inset-x-0">
            <div className="container mx-auto px-4 pb-5">
              <div className="bg-background/80 backdrop-blur-sm border rounded-xl shadow-lg">
                <div className="p-4 space-y-4">
                  {/* Order Type Selector */}
                  <Tabs value={orderType} onValueChange={(value) => setOrderType(value as 'market' | 'limit')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="market">Market Order</TabsTrigger>
                      <TabsTrigger value="limit">Limit Order</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Trade Info Panel */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div className="flex justify-between items-center">
                        <span>Margin</span>
                        <span className="font-mono text-foreground">${marginRequired}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Pip Value</span>
                        <span className="font-mono text-foreground">
                          ${pipValue}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Max Lots</span>
                        <span className="font-mono text-foreground">
                          {effectiveMaxLots.toFixed(2)}
                          {effectiveMaxLots < (pairInfo?.max_lots || 0) && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (Balance limited)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Lots Input */}
                    <div className="w-full space-y-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={lots}
                          onChange={handleLotsChange}
                          placeholder="Enter size"
                          className="w-full text-right pr-16 font-mono"
                          min={0}
                          max={effectiveMaxLots}
                          step={0.01}
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-sm text-muted-foreground">
                          lots
                        </div>
                      </div>

                      {/* Limit Price Input - only show for limit orders */}
                      {orderType === 'limit' && (
                        <div className="relative">
                          <Input
                            type="number"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            placeholder="Enter limit price"
                            className="w-full text-right pr-16 font-mono"
                            min={0}
                            step={0.00001}
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-sm text-muted-foreground">
                            price
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trade Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1 h-12 shadow-sm text-white border-red-600 bg-red-600 hover:bg-red-700 hover:border-red-700"
                      onClick={() => handleTrade('sell')}
                    >
                      <div className="flex flex-col">
                        <span>Sell</span>
                        <span className="text-xs font-mono">${formatPrice(pairPrices[defaultPair]?.bid)}</span>
                      </div>
                    </Button>
                    <Button 
                      className="flex-1 h-12 shadow-sm bg-primary hover:bg-primary/90"
                      onClick={() => handleTrade('buy')}
                    >
                      <div className="flex flex-col">
                        <span>Buy</span>
                        <span className="text-xs font-mono">${formatPrice(pairPrices[defaultPair]?.ask)}</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const calculateTotalMarginUtilization = (trades: Trade[]) => {
  return trades
    .filter(t => t.status === 'open' || t.status === 'pending')
    .reduce((total, trade) => total + (trade.margin_amount || 0), 0);
};
