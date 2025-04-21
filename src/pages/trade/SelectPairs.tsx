import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, CandlestickChart, Globe, AlertTriangle } from "lucide-react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Topbar } from "@/components/shared/Topbar";
import { Badge } from "@/components/ui/badge";
import { isForexTradingTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { TradesSheet } from "@/components/shared/TradesSheet";
import { useToast } from "@/hooks/use-toast"; // Add this import

// Add TradingMade API Key from env
const tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY || '';

// Add helper functions for P&L calculation
const FOREX_PAIRS_JPY = ['USDJPY', 'EURJPY', 'GBPJPY'];

const isJPYPair = (pair: string): boolean => {
  const symbol = pair.replace('FX:', '').replace('/', '');
  return FOREX_PAIRS_JPY.includes(symbol);
};

const getPipValue = (pair: string) => {
  if (pair.includes('BINANCE:')) {
    return 0.00001; // Crypto uses 5 decimals standard
  }
  // Remove FX: prefix and /
  const symbol = pair.replace('FX:', '').replace('/', '');
  // JPY pairs use 0.01 as pip value, others use 0.0001
  return FOREX_PAIRS_JPY.includes(symbol) ? 0.01 : 0.0001;
};

const calculatePnL = (trade: Trade, currentPrice: number) => {
  const isCrypto = trade.pair.includes('BINANCE:');
  
  if (isCrypto) {
    // For crypto, calculate P&L in USDT terms
    // 1 lot = 1 unit of base currency
    const positionSize = trade.lots;
    const priceDifference = trade.type === 'buy' 
      ? currentPrice - trade.openPrice
      : trade.openPrice - currentPrice;
    return priceDifference * positionSize;
  }
  
  // For forex, calculate based on standard lot size and pip value
  // 1 standard lot = 100,000 units of base currency
  const standardLotSize = 100000;
  const totalUnits = trade.lots * standardLotSize;
  
  // Get pip value and calculate pip movement
  const pipValue = getPipValue(trade.pair);
  const priceDifference = trade.type === 'buy'
    ? currentPrice - trade.openPrice
    : trade.openPrice - currentPrice;
  const pips = priceDifference / pipValue;
  
  // Calculate P&L
  if (isJPYPair(trade.pair)) {
    return (totalUnits * pipValue * pips) / currentPrice;
  }
  return totalUnits * pipValue * pips;
};

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

const SelectPairs = () => {
  const { toast } = useToast(); // Add this hook
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const [priceAnimations, setPriceAnimations] = useState<Record<string, 'up' | 'down'>>({});
  const [isPageVisible, setIsPageVisible] = useState(document.visibilityState === 'visible');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [showTradesSheet, setShowTradesSheet] = useState(false);
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Move WebSocket references to component level
  let cryptoWs: WebSocket | null = null;
  let forexWs: WebSocket | null = null;
  let heartbeatInterval: NodeJS.Timeout | undefined;
  let priceRefreshInterval: NodeJS.Timeout | undefined;

  // Add effect to fetch trading pairs from database
  useEffect(() => {
    const fetchTradingPairs = async () => {
      try {
        const { data, error } = await supabase
          .from('trading_pairs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setTradingPairs(data);
        
        // Initialize WebSocket connections after getting pairs
        if (isPageVisible) {
          if (activeTab === "crypto") {
            initializeCryptoWebSocket();
          } else if (activeTab === "forex" && tradermadeApiKey) {
            initializeForexWebSocket();
          }
        }
      } catch (error) {
        console.error('Error fetching trading pairs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradingPairs();

    // Cleanup function
    return () => {
      if (cryptoWs?.readyState === WebSocket.OPEN) cryptoWs.close();
      if (forexWs?.readyState === WebSocket.OPEN) forexWs.close();
      clearInterval(heartbeatInterval);
      clearInterval(priceRefreshInterval);
    };
  }, []); // Empty dependency array since we only want to fetch once on mount

  const filteredPairs = useMemo(() => {
    return tradingPairs
      .filter(pair => pair.type === activeTab)
      .filter(pair => 
        pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pair.short_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [tradingPairs, activeTab, searchQuery]);

  const handlePairSelect = (pair: string) => {
    // Format the pair correctly for the URL
    const encodedPair = encodeURIComponent(pair);
    navigate(`/trade/chart/${encodedPair}`);
  };

  // Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
      
      if (visible) {
        // Reinitialize WebSockets when page becomes visible
        if (activeTab === "crypto") {
          initializeCryptoWebSocket();
        } else if (activeTab === "forex" && tradermadeApiKey) {
          initializeForexWebSocket();
        }
      } else {
        // Cleanup WebSockets when page is hidden
        if (cryptoWs?.readyState === WebSocket.OPEN) cryptoWs.close();
        if (forexWs?.readyState === WebSocket.OPEN) forexWs.close();
        clearInterval(heartbeatInterval);
        clearInterval(priceRefreshInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  // Add price animation effect
  useEffect(() => {
    const animations: Record<string, 'up' | 'down'> = {};
    Object.entries(pairPrices).forEach(([symbol, data]) => {
      const prevPrice = parseFloat(pairPrices[symbol]?.bid || '0');
      const newPrice = parseFloat(data.bid || '0');
      if (prevPrice !== newPrice) {
        animations[symbol] = newPrice > prevPrice ? 'up' : 'down';
      }
    });
    setPriceAnimations(animations);
    const timer = setTimeout(() => setPriceAnimations({}), 1000);
    return () => clearTimeout(timer);
  }, [pairPrices]);

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

  // Calculate P&L effect
  useEffect(() => {
    if (!trades.length) return;

    const total = trades.reduce((sum, trade) => {
      const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      if (!currentPrice) return sum;

      const pnl = calculatePnL(trade, currentPrice);
      return sum + (pnl || 0); 
    }, 0);

    setTotalPnL(total);
  }, [trades, pairPrices]);

  // WebSocket connection for price updates
  useEffect(() => {
    // Only initialize WebSocket if page is visible
    if (isPageVisible && tradingPairs.length > 0) {
      if (activeTab === "crypto") {
        initializeCryptoWebSocket();
      } else if (activeTab === "forex" && tradermadeApiKey) {
        initializeForexWebSocket();
      }
    }

    return () => {
      if (cryptoWs?.readyState === WebSocket.OPEN) cryptoWs.close();
      if (forexWs?.readyState === WebSocket.OPEN) forexWs.close();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (priceRefreshInterval) clearInterval(priceRefreshInterval);
    };
  }, [activeTab, isPageVisible, tradingPairs]); // Add tradingPairs to dependencies

  const initializeCryptoWebSocket = () => {
    if (cryptoWs?.readyState === WebSocket.OPEN || !isPageVisible) return;
    
    const cryptoPairs = tradingPairs
      .filter(pair => pair.type === 'crypto')
      .map(pair => pair.symbol.toLowerCase().replace('binance:', ''));

    // Only initialize if we have pairs to subscribe to
    if (cryptoPairs.length === 0) return;
      
    cryptoWs = new WebSocket('wss://stream.binance.com:9443/ws');

    let reconnectAttempt = 0;
    const maxReconnectAttempts = 5;
    
    const reconnect = () => {
      if (reconnectAttempt < maxReconnectAttempts && isPageVisible) {
        reconnectAttempt++;
        setTimeout(initializeCryptoWebSocket, Math.min(1000 * reconnectAttempt, 5000));
      }
    };

    cryptoWs.onopen = () => {
      // Wait for connection to be established
      setTimeout(() => {
        if (cryptoWs?.readyState === WebSocket.OPEN) {
          const subscribeMsg = {
            method: "SUBSCRIBE",
            params: cryptoPairs.map(symbol => `${symbol}@ticker`),
            id: 1
          };
          try {
            cryptoWs.send(JSON.stringify(subscribeMsg));
          } catch (err) {
            console.error('Failed to send subscription message:', err);
            // Attempt to reconnect on failure
            cryptoWs?.close();
            reconnect();
          }
        }
      }, 1000); // Add 1s delay to ensure connection is ready
    };

    // Add error handler
    cryptoWs.onerror = (error) => {
      console.error('WebSocket error:', error);
      reconnect();
    };

    // Add close handler with reconnect logic
    cryptoWs.onclose = () => {
      reconnect();
    };

    cryptoWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === '24hrTicker') {
          setPairPrices(prev => ({
            ...prev,
            [`BINANCE:${data.s}`]: {
              price: parseFloat(data.c).toFixed(5),
              bid: parseFloat(data.b).toFixed(5),
              ask: parseFloat(data.a).toFixed(5),
              change: parseFloat(data.P).toFixed(2)
            }
          }));
        }
      } catch (error) {
        console.error('Error handling crypto message:', error);
      }
    };
  };

  const initializeForexWebSocket = () => {
    if (forexWs?.readyState === WebSocket.OPEN || !isPageVisible) return;

    const forexPairs = tradingPairs
      .filter(pair => pair.type === 'forex')
      .map(pair => pair.symbol.replace('FX:', '').replace('/', ''));

    // Only initialize if we have pairs to subscribe to  
    if (forexPairs.length === 0) return;

    forexWs = new WebSocket('wss://marketdata.tradermade.com/feedadv');

    forexWs.onopen = async () => {
      // Initialize with API key
      forexWs.send(JSON.stringify({
        userKey: tradermadeApiKey,
        _type: "init"
      }));

      // Subscribe to pairs in batches of 10
      const forexPairs = tradingPairs
        .filter(pair => pair.type === 'forex')
        .map(pair => pair.symbol.replace('FX:', '').replace('/', ''));
      
      // Subscribe in batches of 10
      for (let i = 0; i < forexPairs.length; i += 10) {
        const batch = forexPairs.slice(i, i + 10);
        if (forexWs?.readyState === WebSocket.OPEN) {
          const subscribeMsg = {
            userKey: tradermadeApiKey,
            symbol: batch.join(','),
            _type: "subscribe"
          };
          forexWs.send(JSON.stringify(subscribeMsg));
        }
      }

      // Setup heartbeat and price refresh intervals
      heartbeatInterval = setInterval(() => {
        if (forexWs?.readyState === WebSocket.OPEN) {
          forexWs.send(JSON.stringify({ heartbeat: "1" }));
        }
      }, 30000);

      priceRefreshInterval = setInterval(() => {
        if (forexWs?.readyState === WebSocket.OPEN) {
          forexPairs.forEach((symbol, index) => {
            setTimeout(() => {
              forexWs?.send(JSON.stringify({
                userKey: tradermadeApiKey,
                symbol: symbol,
                _type: "quote"
              }));
            }, index * 50);
          });
        }
      }, 10000);
    };

    forexWs.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    forexWs.onclose = () => {
      setTimeout(initializeForexWebSocket, 2000); // Retry after 2s
    };

    forexWs.onmessage = (event) => {
      try {
        // Skip non-JSON messages like "Connected" and "User Key..."
        if (typeof event.data === 'string') {
          if (event.data.startsWith('Connected') || 
              event.data.startsWith('User Key') || 
              !event.data.startsWith('{')) {
            return;
          }
        }

        const data = JSON.parse(event.data);
        if (data.symbol && data.bid && data.ask) {
          const formattedSymbol = `FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`;
          setPairPrices(prev => {
            const change = ((data.bid - (prev[formattedSymbol]?.bid || data.bid)) / data.bid * 100);
            return {
              ...prev,
              [formattedSymbol]: {
                price: data.bid,
                bid: data.bid,
                ask: data.ask,
                change: change.toFixed(2)
              }
            };
          });
        }
      } catch (error) {
        // Silently handle expected non-JSON messages
        if (!(error instanceof SyntaxError)) {
          // Only log unexpected errors
          console.error('Error handling forex message:', error);
        }
      }
    };
  };

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

  // Add market status check
  const isForexClosed = !isForexTradingTime();
  const forexMarketStatus = isForexClosed ? "Closed" : "Open";

  // Add this helper function after the imports
  const getForexFlagUrl = (symbol: string) => {
    const cleanSymbol = symbol.replace('FX:', '').split('/');
    return `https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//${cleanSymbol[0].toLowerCase()}-${cleanSymbol[1].toLowerCase()}.svg`;
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

          <Tabs defaultValue="crypto" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl p-1">
              <TabsTrigger value="crypto" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <CandlestickChart className="h-4 w-4" />
                  <span className="font-medium">Crypto</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="forex" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Forex</span>
                  {activeTab === 'forex' && (
                    <Badge variant={isForexClosed ? "destructive" : "success"} 
                           className="ml-1.5 h-5">
                      {forexMarketStatus}
                    </Badge>
                  )}
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
                          {pair.symbol.includes('BINANCE:') ? (
                            <div className="relative h-10 w-10 rounded-full bg-primary/10 p-1.5">
                              <img 
                                src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${pair.short_name.toLowerCase()}.png`}
                                alt={pair.name}
                                className="h-full w-full"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                                }}
                              />
                            </div>
                          ) : (
                            <img 
                              src={getForexFlagUrl(pair.symbol)}
                              alt={pair.name}
                              className="h-10 w-10 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwb2x5bGluZSBwb2ludHM9IjIzIDYgMTMuNSAxNS41IDguNSAxMC41IDEgMTgiPjwvcG9seWxpbmU+PHBvbHlsaW5lIHBvaW50cz0iMTcgNiAyMyA2IDIzIDEyIj48L3BvbHlsaW5lPjwvc3ZnPg==';
                              }}
                            />
                          )}
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

