import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { TradesSheet } from "@/components/shared/TradesSheet";
import { useLimitOrders } from '@/hooks/use-limit-orders';
import { AlertCircle, ChevronLeftCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { wsManager } from '@/services/websocket-manager';
import { calculatePnL, calculateRequiredMargin, calculatePipValue } from "@/utils/trading"; // Remove getPipValue as it's internal to calculatePipValue
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ForexCryptoSheet } from "@/components/shared/ForexCryptoSheet";
import { cn } from "@/lib/utils";

// Add helper function after imports
const getRiskLevel = (leverage: number): { label: string; color: string } => {
  if (leverage <= 20) {
    return { label: 'Low Risk', color: 'text-green-500' };
  } else if (leverage <= 100) {
    return { label: 'Medium Risk', color: 'text-yellow-500' };
  } else {
    return { label: 'High Risk', color: 'text-red-500' };
  }
};

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
  leverage_options: number[]; // Add leverage_options
  pip_value: number; // Add pip_value field
}

// Add margin call threshold constant (80%)
const MARGIN_CALL_THRESHOLD = 0.8;

export const ChartView = ({ openTrades = 0, totalPnL: initialTotalPnL = 0, leverage = 100 }: ChartViewProps) => {
  const { pair } = useParams<{ pair?: string }>();
  const navigate = useNavigate();

  // Add new state for trading pair info
  const [pairInfo, setPairInfo] = useState<TradingPairInfo | null>(null);
  const [pipValue, setPipValue] = useState("0.00");
  const [showForexCryptoSheet, setShowForexCryptoSheet] = useState(false);
  const [defaultLeverage, setDefaultLeverage] = useState(leverage);
  const [selectedLeverage, setSelectedLeverage] = useState(leverage.toString());

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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [showTradesSheet, setShowTradesSheet] = useState(false);
  const [marginUtilized, setMarginUtilized] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  
  const [marginCallAlerts, setMarginCallAlerts] = useState<{[key: string]: boolean}>({});
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [isPriceLoaded, setIsPriceLoaded] = useState(false);

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
    setIsPriceLoaded(false); // Reset on new connection

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
              setIsPriceLoaded(true);
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
              setIsPriceLoaded(true);
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
      if (trade.status === 'open') {
        acc.openTradesCount++;
        const currentPrice = parseFloat(pairPrices[trade.pair]?.price || '0');
        const pnl = calculatePnL(trade, currentPrice);
        acc.totalPnL += pnl;
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

  // Update pip value calculation with proper lot size handling
  useEffect(() => {
    if (!defaultPair || !pairInfo) return;

    const lotSize = parseFloat(lots) || 0;
    const price = parseFloat(pairPrices[defaultPair]?.price || '0');
    
    if (price && lotSize && pairInfo.pip_value) {
      let pipValue;
      if (defaultPair.includes('BINANCE:')) {
        // For crypto: pipValue = lots * pip_value
        pipValue = lotSize * pairInfo.pip_value;
      } else if (defaultPair === 'FX:XAU/USD') {
        // For gold: pipValue = (pip_value / price) * (lots * 100)
        pipValue = (pairInfo.pip_value / price) * (lotSize * 100);
      } else {
        // For forex: pipValue = (pip_value / price) * (lots * 100000)
        pipValue = (pairInfo.pip_value / price) * (lotSize * 100000);
      }
      setPipValue(pipValue.toFixed(2));
    } else {
      setPipValue('0.00');
    }
  }, [defaultPair, lots, pairPrices[defaultPair]?.price, pairInfo]); // Only recalculate when these values change

  // Add handleLotsChange function before the return statement
  const handleLotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty input or decimal point
    if (value === '' || value === '.') {
      setLots(value);
      return;
    }

    // Remove any non-numeric characters except decimal point
    const sanitizedValue = value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    if ((sanitizedValue.match(/\./g) || []).length > 1) return;
    
    // Allow decimal input up to 2 places
    const [whole, decimal] = sanitizedValue.split('.');
    if (decimal && decimal.length > 2) return;

    // Validate numeric input
    const numValue = parseFloat(sanitizedValue);
    if (isNaN(numValue)) return;

    // If value exceeds max lots, set to max lots
    if (numValue > effectiveMaxLots) {
      setLots(effectiveMaxLots.toFixed(2));
      return;
    }

    // Set the value, preserving decimal places during typing
    if (sanitizedValue.includes('.')) {
      setLots(sanitizedValue);
    } else {
      setLots(numValue.toString());
    }
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

  const handleTradeClick = (type: 'buy' | 'sell') => {
    if (showPanel && type === tradeType) {
      setShowPanel(false);
      setTradeType(null);
    } else {
      setTradeType(type);
      setShowPanel(true);
    }
  };

  const formatPrice = (price: string | undefined) => {
    if (!price) return '0.00000';
    const value = parseFloat(price);
    
    if (defaultPair.includes('FX:')) {
      const symbol = defaultPair.replace('FX:', '').replace('/', '');
      if (FOREX_PAIRS_3_DECIMALS.includes(symbol)) {
        return value.toFixed(3);
      }
      return value.toFixed(5);
    }
    
    return value > 1 ? value.toFixed(2) : value.toFixed(5);
  };

  // Update close trade handler to use imported calculatePnL
  const handleCloseTrade = async (tradeId: string) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

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

  // Update the handler for executed trades
  const handleLimitOrderExecuted = useCallback(async (tradeId: string) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      const currentPrice = trade.type === 'buy' 
        ? parseFloat(pairPrices[trade.pair]?.ask || '0')
        : parseFloat(pairPrices[trade.pair]?.bid || '0');

      // Call the execute_limit_order stored procedure
      const { data, error } = await supabase.rpc('execute_limit_order', {
        p_trade_id: tradeId,
        p_execution_price: currentPrice
      });

      if (error) throw error;

      // Update local state
      setTrades(prev => prev.map(t => 
        t.id === tradeId ? {
          ...t,
          status: 'open',
          openPrice: currentPrice,
          margin_amount: data.margin_required
        } : t
      ));

      // Update user balance
      setUserBalance(data.withdrawal_wallet);

      toast({
        title: "Success",
        description: `Limit order executed at $${currentPrice}`,
      });

    } catch (error) {
      console.error('Error executing limit order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to execute limit order",
      });
    }
  }, [trades, pairPrices]);

  // Use the limit orders hook
  useLimitOrders(trades, pairPrices, handleLimitOrderExecuted);

  // Update handleTrade function to include limit order handling
  async function handleTrade(type: 'buy' | 'sell') {
    if (!isPriceLoaded) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please wait for price data to load",
      });
      return;
    }

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

      const lotSize = parseFloat(lots);
      const price = type === 'buy' 
        ? parseFloat(pairPrices[defaultPair]?.ask || '0')
        : parseFloat(pairPrices[defaultPair]?.bid || '0');
      const leverageValue = parseFloat(selectedLeverage);

      // Calculate margin amount for the new trade
      const marginAmount = calculateRequiredMargin(
        price,
        lotSize,
        leverageValue,
        defaultPair.includes('BINANCE:'),
        defaultPair
      );

      // Get current margin utilization from existing trades
      const currentMarginUtilization = calculateTotalMarginUtilization(trades);
      
      // Check if total margin would exceed balance
      if (currentMarginUtilization + marginAmount > userBalance) {
        toast({
          variant: "destructive",
          title: "Insufficient Margin",
          description: `Total margin (${(currentMarginUtilization + marginAmount).toFixed(2)}) would exceed available balance (${userBalance.toFixed(2)}). Please close some positions first.`
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

      // Validate margin
      const marginError = validateMargin(lotSize, price, leverageValue);
      if (marginError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: marginError,
        });
        return;
      }

      const tradeData: Partial<Trade> = {
        pair: defaultPair,
        type,
        status: orderType === 'limit' ? 'pending' : 'open',
        openPrice: orderType === 'limit' ? parseFloat(limitPrice) : price,
        lots: lotSize,
        leverage: leverageValue,
        orderType,
        limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : null,
        openTime: Date.now(),
        margin_amount: marginAmount
      };

      const { data: trade, error } = await supabase
        .from('trades')
        .insert([{
          user_id: user.id,
          pair: defaultPair,
          type,
          status: orderType === 'limit' ? 'pending' : 'open',
          open_price: orderType === 'limit' ? parseFloat(limitPrice) : price,
          lots: lotSize,
          leverage: leverageValue,
          order_type: orderType,
          limit_price: orderType === 'limit' ? parseFloat(limitPrice) : null,
          margin_amount: marginAmount
        }])
        .select()
        .single();

      if (error) throw error;

      // Add trade to local state
      setTrades(prev => [{
        ...tradeData,
        id: trade.id,
        pnl: 0,
        margin_amount: marginAmount
      } as Trade, ...prev]);

      // Only deduct margin for market orders
      const margin = calculateRequiredMargin(price, lotSize, leverageValue, defaultPair.includes('BINANCE:'), defaultPair);
      setUserBalance(prev => prev - margin);

      // Add order type specific message
      toast({
        title: "Success",
        description: orderType === 'limit' 
          ? `Limit order placed at $${limitPrice}`
          : `Market order executed at $${price}`,
      });

      // Reset form
      if (orderType === 'limit') {
        setLimitPrice('');
      }
      setShowPanel(false);
      setTradeType(null);
      
    } catch (error) {
      console.error("Error placing trade:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place trade",
      });
    }
  }

  // Update fetchPairInfo effect
  useEffect(() => {
    const fetchPairInfo = async () => {
      if (!defaultPair) return;
      
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('symbol, name, min_leverage, max_leverage, max_lots, leverage_options, pip_value')
        .eq('symbol', defaultPair)
        .single();

      if (error) {
        console.error('Error fetching pair info:', error);
        return;
      }

      setPairInfo(data);
      setSelectedLeverage(data.min_leverage.toString()); // Set default leverage to min_leverage
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

  // Add handler for limit tab click
  const handleLimitTabClick = () => {
    toast({
      title: "Coming Soon",
      description: "Limit orders will be available in the next update",
    });
  };

  const handlePairSelect = (pair: string) => {
    navigate(`/trade/${encodeURIComponent(pair)}`);
    setShowForexCryptoSheet(false);
  };

  function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
  }

  // Add effect to fetch default leverage
  useEffect(() => {
    const fetchDefaultLeverage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('default_leverage')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching default leverage:', error);
        return;
      }

      if (data?.default_leverage) {
        setDefaultLeverage(data.default_leverage);
        setSelectedLeverage(data.default_leverage.toString());
      }
    };

    fetchDefaultLeverage();
  }, []);

  // Add function to update leverage in profile
  const updateProfileLeverage = async (newLeverage: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          default_leverage: newLeverage,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setDefaultLeverage(newLeverage);
      toast({
        title: "Success",
        description: "Leverage preference saved"
      });
    } catch (error) {
      console.error('Error updating leverage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save leverage preference"
      });
    }
  };

  // Update Dialog close handler
  const handleLeverageDialogClose = async () => {
    const newLeverage = parseInt(selectedLeverage);
    await updateProfileLeverage(newLeverage);
    setShowLeverageDialog(false);
  };

  return (
    <div className="h-screen bg-background flex flex-col">
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

      {/* ForexCryptoSheet Component */}
      <ForexCryptoSheet
        open={showForexCryptoSheet}
        onOpenChange={setShowForexCryptoSheet}
        onPairSelect={handlePairSelect}
      />

      {/* Stats Card */}
      <div className="px-4 pt-3">
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
                  `-$${Math.abs(totalPnL).toFixed(2)}`
              }
            </Badge>
          </div>
        </div>
      </div>

      
      {/* Add back button, pair name, and FX icon */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/trade/select')}
            className="h-8 px-2"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              <ChevronLeftCircle className="h-4 w-4" />
            </div>
          </Button>
          <span className="text-lg font-semibold">{formattedPairName}</span>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setShowForexCryptoSheet(true)}
          className="h-8 px-2"
        >
          All FX
        </Button>
      </div>

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
      
      <TradesSheet
        open={showTradesSheet}
        onOpenChange={setShowTradesSheet}
        trades={trades}
        pairPrices={pairPrices}
        onCloseTrade={handleCloseTrade}
        calculatePnL={calculatePnL}
      />

      <div className="container mx-auto px-4 flex-1">
        <div className="flex flex-col h-full relative rounded-xl mt-4">
          {/* Chart container */}
          <div className="flex-1 min-h-0 pb-[calc(1rem+240px)] rounded-xl overflow-hidden"> {/* Added rounded corners */}
            <TradingViewWidget symbol={formattedSymbol} />
          </div>

          {/* Trading Controls */}
          <div className="absolute bottom-0 inset-x-0">
            <div className="container mx-auto px-4 pb-5">
              <div className="backdrop-blur-sm border border-[#525252] rounded-xl shadow-lg"> {/* Removed white background */}
                <div className="p-4 space-y-4">
                  {/* Removed symbol display */}
                  
                  {/* Trade Info Panel */}
                  <div className="flex gap-2">
                    <Badge variant="outline" className="flex-1 text-center border-[#525252]">
                      Margin: ${marginRequired}
                    </Badge>
                    <Badge variant="outline" className="flex-1 text-center border-[#525252]">
                      Max Lots: {effectiveMaxLots.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="flex-1 text-center border-[#525252]">
                      Leverage: {defaultLeverage}x
                    </Badge>
                  </div>

                  {/* Lots Input with touch-friendly increment/decrement buttons */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={lots}
                        onChange={handleLotsChange}
                        placeholder="Enter size"
                        className="w-full text-right pr-[120px] font-mono"
                        min={0}
                        max={effectiveMaxLots}
                        step={0.01}
                      />
                      <div className="absolute right-0 top-0 h-full flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentValue = parseFloat(lots) || 0;
                            const newValue = Math.max(0, currentValue - 0.01);
                            setLots(newValue.toFixed(2));
                          }}
                          className="h-full px-3 min-w-[40px] hover:bg-accent rounded-none"
                        >
                          -
                        </Button>
                        <div className="px-2 text-sm text-muted-foreground">
                          lots
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentValue = parseFloat(lots) || 0;
                            const newValue = Math.min(effectiveMaxLots, currentValue + 0.01);
                            setLots(newValue.toFixed(2));
                          }}
                          className="h-full px-3 min-w-[40px] hover:bg-accent rounded-none"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Trade Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1 h-12 shadow-sm text-white border-red-600 bg-red-600 hover:bg-red-700 hover:border-red-700"
                      onClick={() => handleTrade('sell')}
                      disabled={!isPriceLoaded}
                    >
                      <div className="flex flex-col">
                        <span>Sell</span>
                        <span className="text-xs font-mono">
                          {!isPriceLoaded ? 'Loading...' : `$${formatPrice(pairPrices[defaultPair]?.bid)}`}
                        </span>
                      </div>
                    </Button>
                    <Button 
                      className="flex-1 h-12 shadow-sm bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => handleTrade('buy')}
                      disabled={!isPriceLoaded}
                    >
                      <div className="flex flex-col">
                        <span>Buy</span>
                        <span className="text-xs font-mono">
                          {!isPriceLoaded ? 'Loading...' : `$${formatPrice(pairPrices[defaultPair]?.ask)}`}
                        </span>
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
