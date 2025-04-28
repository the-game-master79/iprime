import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/shared/Navbar";
import { Hero } from "@/components/shared/Hero";
import { Calculator } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";
import { isForexTradingTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';
const tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY;

const FOREX_PAIRS_JPY = ['USDJPY', 'EURJPY', 'GBPJPY'];

const isJPYPair = (symbol: string): boolean => {
  const cleanSymbol = symbol.replace('FX:', '').replace('/', '');
  return FOREX_PAIRS_JPY.includes(cleanSymbol);
};

const getPipValue = (symbol: string) => {
  if (symbol.includes('BINANCE:')) {
    return 0.00001; // Crypto uses 5 decimals standard
  }
  // JPY pairs use 0.01 as pip value, others use 0.0001
  return isJPYPair(symbol) ? 0.01 : 0.0001;
};

const getStandardLotSize = (symbol: string) => {
  if (symbol.includes('BINANCE:')) {
    return 1; // Crypto standard lot size
  }
  return 100000; // Forex standard lot size
};

interface TradingPair {
  symbol: string;
  name: string;
  type: 'crypto' | 'forex';
  min_leverage: number;
  max_leverage: number;
}

export const MarginCalculator = () => {
  const [category, setCategory] = useState<'crypto' | 'forex'>('crypto');
  const [selectedPair, setSelectedPair] = useState<string>("");
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [lots, setLots] = useState("");
  const [leverage, setLeverage] = useState("100");
  const [leverageRange, setLeverageRange] = useState({ min: 1, max: 100 });
  const [isLoading, setIsLoading] = useState(false);
  const [price, setPrice] = useState<string | null>(null);

  const [calculationResults, setCalculationResults] = useState({
    margin: 0,
    pipValue: 0,
    commission: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const isForexClosed = !isForexTradingTime();
  const forexMarketStatus = isForexClosed ? "Closed" : "Open";

  useEffect(() => {
    const fetchTradingPairs = async () => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('symbol, name, type, min_leverage, max_leverage')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching trading pairs:', error);
        return;
      }

      setTradingPairs(data);
      if (data.length > 0) {
        const firstPair = data.find(pair => pair.type === category);
        if (firstPair) {
          setSelectedPair(firstPair.symbol);
          setLeverageRange({
            min: firstPair.min_leverage,
            max: firstPair.max_leverage
          });
        }
      }
    };

    fetchTradingPairs();
  }, []);

  useEffect(() => {
    if (selectedPair) {
      connectWebSocket(selectedPair);
    }

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [selectedPair, category]);

  const handlePairChange = (value: string) => {
    setSelectedPair(value);
    setPrice(null); // Reset price when pair changes
    setIsLoading(true); // Show loading state
    const pair = tradingPairs.find(p => p.symbol === value);
    if (pair) {
      setLeverageRange({
        min: pair.min_leverage,
        max: pair.max_leverage
      });
      const currentLev = parseInt(leverage);
      if (currentLev < pair.min_leverage || currentLev > pair.max_leverage) {
        setLeverage(pair.min_leverage.toString());
      }
      // Connect WebSocket to new pair
      connectWebSocket(value);
    }
  };

  const connectWebSocket = (symbol: string) => {
    // Close existing connection if any
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    if (category === 'crypto') {
      connectBinanceWebSocket(symbol);
    } else {
      connectForexWebSocket(symbol);
    }
  };

  const connectBinanceWebSocket = (symbol: string) => {
    const cleanSymbol = symbol.replace('BINANCE:', '').toLowerCase();
    wsRef.current = new WebSocket(BINANCE_WS_URL);

    wsRef.current.onopen = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('Binance WebSocket connected, subscribing to:', cleanSymbol);
        wsRef.current.send(JSON.stringify({
          method: "SUBSCRIBE",
          params: [`${cleanSymbol}@ticker`],
          id: 1
        }));
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === '24hrTicker') {
          const newPrice = data.c;
          setPrice(newPrice);
          setIsLoading(false);
          if (lots) {
            calculateMargin(newPrice, lots);
          }
        }
      } catch (error) {
        console.error('Error handling Binance message:', error);
        setIsLoading(false);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('Binance WebSocket closed');
      reconnectTimeout.current = setTimeout(() => connectBinanceWebSocket(symbol), 5000);
    };
  };

  const connectForexWebSocket = (symbol: string) => {
    if (!tradermadeApiKey) return;

    const cleanSymbol = symbol.replace('FX:', '').replace('/', '');
    wsRef.current = new WebSocket(TRADERMADE_WS_URL);

    wsRef.current.onopen = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('Forex WebSocket connected');
        
        // Initialize connection
        wsRef.current.send(JSON.stringify({
          userKey: tradermadeApiKey,
          _type: "init"
        }));

        // Subscribe to symbol
        wsRef.current.send(JSON.stringify({
          userKey: tradermadeApiKey,
          symbol: cleanSymbol,
          _type: "subscribe"
        }));

        // Setup heartbeat
        heartbeatInterval.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ heartbeat: "1" }));
          }
        }, 30000);
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          if (event.data.startsWith('Connected') || 
              event.data.startsWith('User Key') || 
              !event.data.startsWith('{')) {
            return;
          }
        }

        const data = JSON.parse(event.data);
        if (data.symbol && data.bid && data.ask) {
          const newPrice = data.bid;
          setPrice(newPrice);
          setIsLoading(false);
          if (lots) {
            calculateMargin(newPrice, lots);
          }
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          console.error('Error handling forex message:', error);
        }
        setIsLoading(false);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('Forex WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('Forex WebSocket closed');
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      reconnectTimeout.current = setTimeout(() => connectForexWebSocket(symbol), 5000);
    };
  };

  const handleLotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLots(value);
    if (price) {
      calculateMargin(price, value);
    }
  };

  const handleLeverageChange = (value: string) => {
    setLeverage(value);
    if (price && lots) {
      calculateMargin(price, lots);
    }
  };

  const calculateMargin = useCallback((priceValue: number, lotsValue: number) => {
    const isCrypto = category === 'crypto';
    
    let margin;
    let pipValue;
    
    if (isCrypto) {
      margin = (priceValue * lotsValue) / leverageValue;
      pipValue = calculatePipValue(lotsValue, priceValue, selectedPair);
    } else {
      const standardLot = getStandardLotSize(selectedPair);
      margin = (priceValue * lotsValue * standardLot) / leverageValue;
      pipValue = calculatePipValue(lotsValue, priceValue, selectedPair);
    }

    const commission = margin * 0.001;

    setCalculationResults({
      margin,
      pipValue,
      commission
    });
  }, [leverage, category, selectedPair]);

  useEffect(() => {
    if (price && lots) {
      calculateMargin(price, lots);
    }
  }, [price, lots, leverage, calculateMargin]);

  const filteredPairs = tradingPairs.filter(pair => pair.type === category);

  return (
    <div className="min-h-screen bg-[#F3F4F6] relative">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-slower" 
          style={{ animation: 'pulse-gradient 8s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse-slowest"
          style={{ animation: 'pulse-gradient 12s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-[1]">
        <Navbar />
        <Hero 
          badge={{
            icon: <Calculator className="h-5 w-5" />,
            text: "Trading Tools"
          }}
          title="Margin Calculator"
          description="Calculate the required margin for your trades with our advanced margin calculator"
        />

        <div className="container max-w-4xl mx-auto px-4 pb-24">
          <div className="bg-white p-2 rounded-xl border shadow-sm">
            <div className="border rounded-xl p-6">
              <div className="flex gap-6">
                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Tabs defaultValue={category} onValueChange={(v) => setCategory(v as 'crypto' | 'forex')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="crypto">Cryptocurrency</TabsTrigger>
                        <TabsTrigger value="forex" disabled={isForexClosed}>
                          <div className="flex items-center gap-2">
                            Forex
                            <Badge variant={isForexClosed ? "destructive" : "success"}>
                              {forexMarketStatus}
                            </Badge>
                          </div>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {category === 'forex' && isForexClosed && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-700">
                        Forex market is closed during weekends. Trading will resume on Monday.
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instrument</label>
                    <Select value={selectedPair} onValueChange={handlePairChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trading pair" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPairs.map((pair) => (
                          <SelectItem key={pair.symbol} value={pair.symbol}>
                            {pair.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Price</label>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-mono text-lg">
                        {isLoading ? (
                          <span className="text-muted-foreground">Loading...</span>
                        ) : price ? (
                          `$${parseFloat(price).toFixed(category === 'forex' ? 5 : 2)}`
                        ) : (
                          <span className="text-muted-foreground">Select a pair</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Size (Lots)</label>
                    <Input
                      type="number"
                      value={lots}
                      onChange={handleLotsChange}
                      placeholder="Enter size in lots"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Leverage ({leverageRange.min}x - {leverageRange.max}x)
                    </label>
                    <Select value={leverage} onValueChange={handleLeverageChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leverage" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: Math.floor(Math.log2(leverageRange.max)) + 1 }, (_, i) => {
                          const value = Math.pow(2, i);
                          return value >= leverageRange.min && value <= leverageRange.max ? (
                            <SelectItem key={value} value={value.toString()}>
                              {value}x
                            </SelectItem>
                          ) : null;
                        }).filter(Boolean)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-auto" />

                <div className="w-72 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Required Margin</label>
                      <div className="text-2xl font-semibold">
                        ${calculationResults.margin.toFixed(2)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Pip Value</label>
                      <div className="text-lg font-medium">
                        ${calculationResults.pipValue.toFixed(2)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Commission (0.1%)</label>
                      <div className="text-lg font-medium">
                        ${calculationResults.commission.toFixed(2)}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Swap Long</label>
                      <div className="text-lg font-medium">0 USD</div>
                    </div>

                    <div className="space-y-2"></div>
                      <label className="text-sm text-muted-foreground">Swap Short</label>
                      <div className="text-lg font-medium">0 USD</div>
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

export default MarginCalculator;
