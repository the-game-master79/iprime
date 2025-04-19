import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, TrendingUp, CandlestickChart, Globe, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/shared/Topbar";
import { Badge } from "@/components/ui/badge";
import { isForexTradingTime } from "@/lib/utils";

// Add TradingMade API Key from env
const tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY || '';

// Replace the TRADING_PAIRS constant
const TRADING_PAIRS = {
  crypto: [
    { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', shortName: 'BTC' },
    { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', shortName: 'ETH' },
    { symbol: 'BINANCE:SOLUSDT', name: 'Solana', shortName: 'SOL' },
    { symbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin', shortName: 'DOGE' },
    { symbol: 'BINANCE:ADAUSDT', name: 'Cardano', shortName: 'ADA' },
    { symbol: 'BINANCE:BNBUSDT', name: 'BNB', shortName: 'BNB' },
    { symbol: 'BINANCE:DOTUSDT', name: 'Polkadot', shortName: 'DOT' },
    { symbol: 'BINANCE:TRXUSDT', name: 'TRON', shortName: 'TRX' },
  ],
  forex: [
    { symbol: 'FX:EUR/USD', name: 'EUR/USD', shortName: 'EURUSD' },
    { symbol: 'FX:USD/JPY', name: 'USD/JPY', shortName: 'USDJPY' },
    { symbol: 'FX:GBP/USD', name: 'GBP/USD', shortName: 'GBPUSD' },
    { symbol: 'FX:AUD/USD', name: 'AUD/USD', shortName: 'AUDUSD' },
    { symbol: 'FX:USD/CAD', name: 'USD/CAD', shortName: 'USDCAD' },
    { symbol: 'FX:USD/CHF', name: 'USD/CHF', shortName: 'USDCHF' },
    { symbol: 'FX:GBP/JPY', name: 'GBP/JPY', shortName: 'GBPJPY' },
    { symbol: 'FX:EUR/JPY', name: 'EUR/JPY', shortName: 'EURJPY' },
    { symbol: 'FX:EUR/GBP', name: 'EUR/GBP', shortName: 'EURGBP' },
    { symbol: 'FX:EUR/CHF', name: 'EUR/CHF', shortName: 'EURCHF' },
  ]
};

interface PriceData {
  price: string;
  change: string;
  bid?: string;
  ask?: string;
}

const SelectPairs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const [priceAnimations, setPriceAnimations] = useState<Record<string, 'up' | 'down'>>({});
  const [isPageVisible, setIsPageVisible] = useState(document.visibilityState === 'visible');

  const filteredPairs = TRADING_PAIRS[activeTab as keyof typeof TRADING_PAIRS].filter(pair =>
    pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pair.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // WebSocket connection for price updates
  let cryptoWs: WebSocket | null = null;

  let heartbeatInterval: NodeJS.Timeout | undefined;
  let priceRefreshInterval: NodeJS.Timeout | undefined;

  useEffect(() => {
    let forexWs: WebSocket | null = null;
    let priceRefreshInterval: NodeJS.Timeout | undefined;

    // Only initialize WebSocket if page is visible
    if (isPageVisible) {
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
  }, [activeTab, isPageVisible]); // Add isPageVisible as dependency

  const initializeCryptoWebSocket = () => {
    if (cryptoWs?.readyState === WebSocket.OPEN || !isPageVisible) return;
    
    cryptoWs = new WebSocket('wss://stream.binance.com:9443/ws');

    let reconnectAttempt = 0;
    const maxReconnectAttempts = 5;
    
    const reconnect = () => {
      if (reconnectAttempt < maxReconnectAttempts && isPageVisible) {
        reconnectAttempt++;
        setTimeout(initializeCryptoWebSocket, Math.min(1000 * reconnectAttempt, 5000));
      }
    };

    const cryptoPairs = TRADING_PAIRS.crypto.map(pair => 
      pair.symbol.toLowerCase().replace('binance:', '')
    );

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
    let forexWs: WebSocket | null = null; // Declare forexWs within the function scope
    if (forexWs?.readyState === WebSocket.OPEN || !isPageVisible) return;

    forexWs = new WebSocket('wss://marketdata.tradermade.com/feedadv');

    forexWs.onopen = async () => {
      // Initialize with API key
      forexWs.send(JSON.stringify({
        userKey: tradermadeApiKey,
        _type: "init"
      }));

      // Subscribe to pairs in batches of 10
      const forexPairs = TRADING_PAIRS.forex.map(pair => 
        pair.symbol.replace('FX:', '').replace('/', '')
      );
      
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

  // Add market status check
  const isForexClosed = !isForexTradingTime();
  const forexMarketStatus = isForexClosed ? "Closed" : "Open";

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Select Market" />
      
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'forex' && isForexClosed && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-yellow-700">
              Forex market is closed during weekends. Trading will resume on Monday.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search markets..."
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs defaultValue="crypto" onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="crypto" className="flex items-center gap-2">
                  <CandlestickChart className="h-4 w-4" />
                  Cryptocurrency
                </TabsTrigger>
                <TabsTrigger value="forex" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Forex
                  {activeTab === 'forex' && (
                    <Badge variant={isForexClosed ? "destructive" : "success"} className="ml-2">
                      {forexMarketStatus}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[calc(100vh-280px)] mt-4">
              <div className="grid gap-2">
                {filteredPairs.map((pair) => {
                  const priceData = pairPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                  const priceAnimation = priceAnimations[pair.symbol];
                  const isForexPair = pair.symbol.includes('FX:');
                  const isDisabled = isForexPair && isForexClosed;
                  
                  return (
                    <Button
                      key={pair.symbol}
                      variant="outline"
                      className={cn(
                        "h-auto p-4 w-full",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => !isDisabled && handlePairSelect(pair.symbol)}
                      disabled={isDisabled}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          {pair.symbol.includes('BINANCE:') ? (
                            <img 
                              src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${pair.shortName.toLowerCase()}.png`}
                              alt={pair.name}
                              className="h-8 w-8"
                              onError={(e) => {
                                e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                              }}
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-medium">{pair.name}</span>
                            <span className="text-sm text-muted-foreground">{pair.shortName}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={cn(
                            "font-mono font-medium transition-colors duration-300",
                            priceAnimation === 'up' ? "text-green-500" : 
                            priceAnimation === 'down' ? "text-red-500" : 
                            "text-foreground"
                          )}>
                            {priceData.bid}
                          </span>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            parseFloat(priceData.change) < 0 
                              ? "bg-red-500/10 text-red-500" 
                              : "bg-green-500/10 text-green-500"
                          )}>
                            {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
                          </span>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SelectPairs;
