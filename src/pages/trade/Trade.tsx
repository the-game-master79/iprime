import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagnifyingGlass, TrendUp, ChartLine, Globe, X } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { TradingLayout } from "@/components/layout/TradingLayout";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { isForexTradingTime } from "@/lib/utils";
import { TrendingUp, Menu, AlertTriangle } from "lucide-react";

// Add these interfaces near the top after existing imports
interface TradingPair {
  symbol: string;
  name: string;
  short_name: string;
  type: 'crypto' | 'forex';
  min_leverage: number;
  max_leverage: number;
  leverage_options: number[];
  is_active: boolean;
  max_lots: number;
  image_url?: string;
}

// Change process.env to import.meta.env
const tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY || '';

// Add this helper function at the top level
const parseMessage = (message: string) => {
  const messageRegex = /~m~(\d+)~m~(.*)/;
  const matches = message.match(messageRegex);
  if (!matches) return null;
  
  try {
    return JSON.parse(matches[2]);
  } catch {
    // If it's a ping message, return the number
    if (matches[2].startsWith('~h~')) {
      return { type: 'ping', number: matches[2].replace('~h~', '') };
    }
    return null;
  }
};

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds for Tradermade heartbeat
const PRICE_REFRESH_INTERVAL = 1000; // 1 second for price updates

const formatForexSymbol = (symbol: string) => {
  // Remove FX: prefix and handle special cases for metals
  const cleaned = symbol.replace('FX:', '').replace('/', '');
  // For XAU/USD and XAG/USD, no special formatting needed as they're already in correct format
  return cleaned;
};

interface PriceData {
  price: string;
  change: string;
  bid?: string;
  ask?: string;
}

// Add these interfaces near the top after existing interfaces
interface Trade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  status: 'open' | 'pending' | 'closed';
  openPrice: number;
  lots: number;
  currentPrice?: number;
  pnl?: number;
  leverage: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
  openTime: number;
}

// Add these constants at the top with other constants
const FOREX_PAIRS_JPY = ['USDJPY', 'EURJPY', 'GBPJPY'];

// Add helper to check if pair is JPY
const isJPYPair = (pair: string): boolean => {
  const symbol = pair.replace('FX:', '').replace('/', '');
  return FOREX_PAIRS_JPY.includes(symbol);
};

// Add this helper function to get pip value
const getPipValue = (pair: string) => {
  if (pair.includes('BINANCE:')) {
    return 0.00001; // Crypto uses 5 decimals standard
  }
  // Remove FX: prefix and /
  const symbol = pair.replace('FX:', '').replace('/', '');
  // JPY pairs use 0.01 as pip value, others use 0.0001
  return FOREX_PAIRS_JPY.includes(symbol) ? 0.01 : 0.0001;
};

// Update calculateRequiredMargin function
const calculateRequiredMargin = (price: number, lots: number, leverage: number, isCrypto: boolean, pair: string) => {
  // Double leverage for JPY pairs
  const effectiveLeverage = isJPYPair(pair) ? leverage * 2 : leverage;
  
  if (isCrypto) {
    const positionSize = price * lots;
    // Cap crypto margin at 100000 per lot
    const cappedPositionSize = Math.min(positionSize, 100000 * lots);
    return cappedPositionSize / effectiveLeverage;
  } else {
    // For forex, standard lot size of 100000 per lot
    const positionSize = price * lots * 100000;
    // Cap forex margin at 100000 per lot
    const cappedPositionSize = Math.min(positionSize, 100000 * lots * 100000);
    return cappedPositionSize / effectiveLeverage;
  }
};

// Update calculatePnL function
const calculatePnL = (trade: Trade, currentPrice: number) => {
  const isCrypto = trade.pair.includes('BINANCE:');
  
  if (isCrypto) {
    // For crypto, calculate P&L in USDT terms
    // 1 lot = 1 unit of base currency
    const positionSize = trade.lots; // Direct lot size as position size
    const priceDifference = trade.type === 'buy' 
      ? currentPrice - trade.openPrice
      : trade.openPrice - currentPrice;
    // P&L = position size * price difference (in USDT)
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
  // For USD pairs: P&L = (total units * pip value * pips)
  // For JPY pairs: P&L = (total units * pip value * pips) / current price
  if (isJPYPair(trade.pair)) {
    return (totalUnits * pipValue * pips) / currentPrice;
  }
  return totalUnits * pipValue * pips;
};

const TradeSidebar = ({ 
  selectedPair, 
  onPairSelect,
  isOpen,
  pairPrices,
  isMobile = false,
  tradingPairs
}: { 
  selectedPair: string, 
  onPairSelect: (pair: string) => void,
  isOpen: boolean,
  pairPrices: Record<string, PriceData>,
  isMobile?: boolean,
  tradingPairs: TradingPair[]
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");

  // Add price animation state
  const [priceAnimations, setPriceAnimations] = useState<Record<string, 'up' | 'down'>>({});

  // Update price animation effect
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

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Select first pair when tab changes
    const firstPair = tradingPairs.find(p => p.type === tab)?.symbol;
    if (firstPair) {
      onPairSelect(firstPair);
    }
  };

  const filteredPairs = tradingPairs.filter(pair =>
    pair.type === activeTab &&
    (pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pair.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const navigate = useNavigate();
  const handlePairSelect = (pair: string) => {
    if (isMobile) {
      navigate(`/trade/${encodeURIComponent(pair)}`);
    } else {
      onPairSelect(pair);
    }
  };

  return (
    <div className={cn(
      "bg-white border-r shadow-sm transition-all duration-300",
      isMobile ? "w-full h-[calc(100vh-3.5rem)]" : (
        "absolute left-0 top-14 bottom-0 w-72 " + (isOpen ? "translate-x-0" : "-translate-x-full")
      )
    )}>
      <div className="flex flex-col h-full">
        <div className="p-3 border-b">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search markets..."
              className="pl-9 h-9 text-sm bg-muted/30 border-0 focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="crypto" className="flex-1 flex flex-col">
          <TabsList className="h-11 p-1 bg-muted/30 border-b">
            <TabsTrigger value="crypto" onClick={() => handleTabChange("crypto")} className="flex-1 text-xs">
              <ChartLine className="h-3.5 w-3.5 mr-2" />
              Crypto
            </TabsTrigger>
            <TabsTrigger value="forex" onClick={() => handleTabChange("forex")} className="flex-1 text-xs">
              <Globe className="h-3.5 w-3.5 mr-2" />
              Forex
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-1.5 py-2">
            <TabsContent value="crypto" className="m-0">
              <div className="space-y-1">
                {filteredPairs.map((pair) => {
                  const priceData = pairPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                  const symbol = pair.symbol.replace('BINANCE:', '').replace('USDT', '').toLowerCase();
                  const priceAnimation = priceAnimations[pair.symbol];
                  
                  return (
                    <Button
                      key={pair.symbol}
                      variant={selectedPair === pair.symbol ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-between h-14 px-3 transition-colors rounded-lg",
                        selectedPair === pair.symbol ? "bg-muted" : "hover:bg-muted/50"
                      )}
                      onClick={() => handlePairSelect(pair.symbol)}
                    >
                      <div className="flex items-center gap-3">
                        {pair.image_url ? (
                          <img 
                            src={pair.image_url}
                            alt={pair.name}
                            className="h-8 w-8"
                            onError={(e) => {
                              e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                            }}
                          />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-primary" />
                        )}
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-semibold">{pair.name}</span>
                          <span className="text-xs text-muted-foreground">{pair.short_name}</span>
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
                          "text-xs font-medium px-1.5 py-0.5 rounded-full",
                          parseFloat(priceData.change) < 0 
                            ? "bg-red-500/10 text-red-500" 
                            : "bg-green-500/10 text-green-500"
                        )}>
                          {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="forex" className="m-0">
              <div className="space-y-1">
                {filteredPairs.map((pair) => {
                  const priceData = pairPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                  const priceAnimation = priceAnimations[pair.symbol];
                  return (
                    <Button
                      key={pair.symbol}
                      variant={selectedPair === pair.symbol ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-between h-14 px-3 transition-colors rounded-lg",
                        selectedPair === pair.symbol ? "bg-muted" : "hover:bg-muted/50"
                      )}
                      onClick={() => handlePairSelect(pair.symbol)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          {pair.image_url ? (
                            <img 
                              src={pair.image_url}
                              alt={pair.name}
                              className="h-6 w-6"
                            />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-semibold">{pair.name}</span>
                          <span className="text-xs text-muted-foreground">{pair.short_name}</span>
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
                          "text-xs font-medium px-1.5 py-0.5 rounded-full",
                          parseFloat(priceData.change) < 0 
                            ? "bg-red-500/10 text-red-500" 
                            : "bg-green-500/10 text-green-500"
                        )}>
                          {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};

// Update the TradingPanel component to remove flex-col and h-full since parent will control height
interface TradingPanelProps {
  selectedPair: string;
  pairPrices: Record<string, PriceData>;
  onTrade: (params: {
    type: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    lots: string;
    leverage: string;
    limitPrice?: string;
  }) => void;
  userBalance: number;
  tradingPairs: TradingPair[];
}

const TradingPanel = ({ 
  selectedPair, 
  pairPrices,
  onTrade,
  userBalance,
  tradingPairs
}: TradingPanelProps) => {
  const [lots, setLots] = useState("0.01");
  const [lotsError, setLotsError] = useState("");
  const [marginRequired, setMarginRequired] = useState(0);
  const [leverage, setLeverage] = useState("100");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [showLeverageDialog, setShowLeverageDialog] = useState(false);
  const [selectedLeverage, setSelectedLeverage] = useState(leverage);
  const [marginError, setMarginError] = useState<string | null>(null);

  const isForexPair = selectedPair.includes('FX:');
  const isTradeDisabled = isForexPair && !isForexTradingTime();
  const disabledMessage = isTradeDisabled ? "Forex trading is closed during weekends" : "";

  const isForexClosed = isForexPair && !isForexTradingTime();

  // Remove the WebSocket connection and use pairPrices directly
  const priceData = pairPrices[selectedPair] || { price: '0', change: '0', bid: '0', ask: '0' };

  // Update margin calculation to use leverage
  const calculateMargin = useCallback(() => {
    const lotSize = parseFloat(lots) || 0;
    const price = parseFloat(priceData.price) || 0;
    const leverageRatio = parseFloat(leverage) || 1;
    const isCrypto = selectedPair.includes('BINANCE:');
    
    // Calculate margin requirement (margin = position size / leverage)
    const positionSize = isCrypto ? price * lotSize : price * lotSize * 100000; // Standard lot size of 100,000 for forex
    const margin = positionSize / leverageRatio;
    
    setMarginRequired(margin);
  }, [lots, priceData.price, leverage, selectedPair]);

  // Update margin calculation to include validation
  const validateMargin = useCallback(() => {
    const lotSize = parseFloat(lots) || 0;
    const price = parseFloat(priceData.price) || 0;
    const leverageRatio = parseFloat(leverage) || 1;
    const isCrypto = selectedPair.includes('BINANCE:');
    
    const requiredMargin = calculateRequiredMargin(price, lotSize, leverageRatio, isCrypto, selectedPair);
    setMarginRequired(requiredMargin);

    // Check if user has enough balance
    if (requiredMargin > userBalance) {
      setMarginError(`Insufficient balance. Required margin: $${requiredMargin.toFixed(2)}`);
      return false;
    }
    
    setMarginError(null);
    return true;
  }, [lots, priceData.price, leverage, userBalance, selectedPair]);

  useEffect(() => {
    calculateMargin();
  }, [lots, priceData.price, calculateMargin]);

  useEffect(() => {
    validateMargin();
  }, [lots, priceData.price, leverage, validateMargin]);

  // Add lots validation
  const validateLots = (value: string) => {
    const numValue = parseFloat(value);
    const isCrypto = selectedPair.includes('BINANCE:');
    
    if (isNaN(numValue) || numValue <= 0) {
      setLotsError("Lots must be greater than 0");
      return false;
    }

    // Different max lots for crypto and forex
    const maxLots = isCrypto ? 100 : 200; // Lower max for crypto due to higher values
    if (numValue > maxLots) {
      setLotsError(`Maximum ${maxLots} lots allowed`);
      return false;
    }

    setLotsError("");
    return true;
  };

  const handleLotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLots(value);
    validateLots(value);
  };

  // Add limit price validation
  const validateLimitPrice = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return false;
    }
    return true;
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || validateLimitPrice(value)) {
      setLimitPrice(value);
    }
  };

  // Remove the WebSocket effect and only keep the limit price initialization
  useEffect(() => {
    if (orderType === "limit") {
      const currentPrice = selectedPair.includes('FX:')
        ? parseFloat(priceData.ask || '0').toFixed(5)
        : parseFloat(priceData.ask || '0').toFixed(2);
      setLimitPrice(currentPrice.toString());
    }
  }, [orderType]); // Remove selectedPair and priceData.ask dependencies to keep price static

  const handleTrade = (type: 'buy' | 'sell') => {
    if (!validateMargin()) {
      toast({
        variant: "destructive",
        title: "Trading Error",
        description: marginError,
      });
      return;
    }

    if (lotsError) {
      toast({
        variant: "destructive",
        title: "Trading Error",
        description: lotsError,
      });
      return;
    }

    onTrade({
      type,
      orderType,
      lots,
      leverage,
      limitPrice: orderType === 'limit' ? limitPrice : undefined
    });
  };

  // Get current pair's leverage options and limits
  const currentPair = useMemo(() => 
    tradingPairs.find(p => p.symbol === selectedPair), 
    [selectedPair, tradingPairs]
  );

  return (
    <div className="w-80 border-l bg-white flex flex-col">
      {isForexClosed && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50/50 border border-yellow-200/50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-yellow-700">
              Forex market is closed. Trading resumes Monday.
            </span>
          </div>
        </div>
      )}
      
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium">{selectedPair.split(':')[1]}</h2>
          <div className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            parseFloat(priceData.change) < 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          )}>
            {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Ask</div>
            <div className="font-mono text-sm">
              ${selectedPair.includes('FX:')
                ? parseFloat(priceData.ask || '0').toLocaleString('en-US', { minimumFractionDigits: 5 })
                : parseFloat(priceData.ask || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Bid</div>
            <div className="font-mono text-sm">
              ${selectedPair.includes('FX:')
                ? parseFloat(priceData.bid || '0').toLocaleString('en-US', { minimumFractionDigits: 5 })
                : parseFloat(priceData.bid || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Order Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Order Type</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={orderType === "market" ? "default" : "outline"}
              onClick={() => setOrderType("market")}
              className="h-9 text-sm"
            >
              Market
            </Button>
            <Button
              variant={orderType === "limit" ? "default" : "outline"}
              onClick={() => setOrderType("limit")}
              className="h-9 text-sm"
            >
              Limit
            </Button>
          </div>
        </div>

        {/* Limit Price Input - Only show for limit orders */}
        {orderType === "limit" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Limit Price</label>
            </div>
            <Input
              type="number"
              value={limitPrice}
              onChange={handleLimitPriceChange}
              step={selectedPair.includes('FX:') ? "0.00001" : "0.01"}
              min="0"
              className="text-right font-mono"
            />
          </div>
        )}

        {/* Leverage Selector */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Volume (Lots)</label>
            <span className="text-xs text-muted-foreground">Max: {currentPair?.max_lots || 0}</span>
          </div>
          <div className="relative">
            <Input
              type="number"
              value={lots}
              onChange={handleLotsChange}
              step="0.01"
              min="0.01"
              max="200"
              className={cn(
                "text-right font-mono pr-16",
                lotsError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setShowLeverageDialog(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 h-auto"
            >
              <span className="text-xs font-medium text-primary">{leverage}x</span>
            </Button>
          </div>
          {lotsError && (
            <p className="text-xs text-red-500 mt-1">{lotsError}</p>
          )}
        </div>

        {/* Add leverage dialog */}
        <Dialog open={showLeverageDialog} onOpenChange={setShowLeverageDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Leverage</DialogTitle>
              <DialogDescription>
                Choose your preferred leverage level. Higher leverage means higher risk.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {currentPair && (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <h4 className="font-medium">Available Leverage</h4>
                      <p className="text-sm text-muted-foreground">
                        {currentPair.min_leverage}x - {currentPair.max_leverage}x
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {currentPair.leverage_options.map((value) => (
                      <Button
                        key={value}
                        variant={selectedLeverage === value.toString() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedLeverage(value.toString())}
                      >
                        {value}x
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={() => {
                  setLeverage(selectedLeverage);
                  setShowLeverageDialog(false);
                }}
                className="w-[200px]"
              >
                Confirm Leverage
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Trade Info */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Margin Required</span>
            <span className="font-medium">
              ${marginRequired.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Trading Fee</span>
            <span className="text-sm">0.1%</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t bg-white">
        {isTradeDisabled && (
          <p className="text-xs text-red-500 mb-2">{disabledMessage}</p>
        )}
        <div className="space-y-2 mb-4">
          {marginError && (
            <p className="text-xs text-red-500">{marginError}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-14 font-medium bg-green-600 hover:bg-green-700"
            disabled={!!marginError || !!lotsError || !lots || (orderType === "limit" && !limitPrice) || isTradeDisabled}
            onClick={() => handleTrade('buy')}
          >
            <div className="space-y-0.5">
              <div className="text-sm">{orderType === "market" ? "Buy Market" : "Buy Limit"}</div>
              <div className="text-xs opacity-90">
                ${orderType === "market" 
                  ? (selectedPair.includes('FX:')
                    ? parseFloat(priceData.ask || '0').toLocaleString('en-US', { minimumFractionDigits: 5 })
                    : parseFloat(priceData.ask || '0').toLocaleString('en-US', { minimumFractionDigits: 2 }))
                  : parseFloat(limitPrice || '0').toLocaleString('en-US', { minimumFractionDigits: selectedPair.includes('FX:') ? 5 : 2 })}
              </div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-14 font-medium border-red-600 text-red-600 hover:bg-red-50"
            disabled={!!marginError || !!lotsError || !lots || (orderType === "limit" && !limitPrice) || isTradeDisabled}
            onClick={() => handleTrade('sell')}
          >
            <div className="space-y-0.5">
              <div className="text-sm">{orderType === "market" ? "Sell Market" : "Sell Limit"}</div>
              <div className="text-xs opacity-90">
                ${orderType === "market"
                  ? (selectedPair.includes('FX:')
                    ? parseFloat(priceData.bid || '0').toLocaleString('en-US', { minimumFractionDigits: 5 })
                    : parseFloat(priceData.bid || '0').toLocaleString('en-US', { minimumFractionDigits: 2 }))
                  : parseFloat(limitPrice || '0').toLocaleString('en-US', { minimumFractionDigits: selectedPair.includes('FX:') ? 5 : 2 })}
              </div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

const CHART_OVERRIDES = {
  "mainSeriesProperties.candleStyle.upColor": "#22c55e",
  "mainSeriesProperties.candleStyle.downColor": "#ef4444",
  "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
  "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
  "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
  "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
  "paneProperties.background": "#ffffff",
  "paneProperties.vertGridProperties.color": "#f1f5f9",
  "paneProperties.horzGridProperties.color": "#f1f5f9",
  "symbolWatermarkProperties.transparency": 90,
  "scalesProperties.textColor": "#64748b",
  "mainSeriesProperties.showCountdown": true,
};

// Add this before the Trade component
const getChartConfiguration = (pair: string, container: string) => {
  // Determine if it's a crypto or forex pair
  const isCrypto = pair.includes('BINANCE:');
  
  return {
    autosize: true,
    symbol: pair,
    interval: "1",
    container: container,
    library_path: "/charting_library/",
    locale: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    theme: "light",
    enabled_features: [
      "hide_left_toolbar_by_default",
      "use_localstorage_for_settings",
      "create_volume_indicator_by_default",
    ],
    disabled_features: [
      "header_symbol_search",
      "header_settings",
      "header_compare",
      "header_undo_redo",
      "show_logo_on_all_charts",
      "header_screenshot",
    ],
    charts_storage_url: "https://saveload.tradingview.com",
    charts_storage_api_version: "1.1",
    client_id: "tradingview.com",
    user_id: "public_user_id",
    fullscreen: false,
    overrides: CHART_OVERRIDES,
    loading_screen: { backgroundColor: "#ffffff" },
    studies_overrides: {
      "volume.volume.color.0": "#ef4444",
      "volume.volume.color.1": "#22c55e",
    },
    time_frames: [
      { text: "1D", resolution: "1D" },
      { text: "4H", resolution: "240" },
      { text: "1H", resolution: "60" },
      { text: "30m", resolution: "30" },
      { text: "15m", resolution: "15" },
      { text: "5m", resolution: "5" },
      { text: "1m", resolution: "1" },
    ],
  };
};

const TradingActivity = ({ 
  trades, 
  currentPrices,
  onCloseTrade
}: { 
  trades: Trade[]; 
  currentPrices: Record<string, PriceData>;
  onCloseTrade: (tradeId: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [height, setHeight] = useState(200);
  const [isLoading, setIsLoading] = useState(false);
  const minHeight = 100;
  const maxHeight = 400;

  const handleMouseDown = (e: React.MouseEvent) => {
    // ...existing resize handler code...
  };

  // This filters trades based on status, so closed trades appear in closed tab
  const filteredTrades = useMemo(() => {
    return trades
      .filter(trade => trade.status === activeTab)
      .sort((a, b) => b.openTime - a.openTime) // Show newest first
      .map(trade => {
        const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
        // Only calculate P&L for open/closed trades, set to 0 for pending
        const pnl = trade.status === 'pending' ? 0 : 
                   trade.status === 'closed' ? trade.pnl || 0 :
                   calculatePnL(trade, currentPrice);
        return { ...trade, currentPrice, pnl };
      });
  }, [trades, activeTab, currentPrices]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Trade ID copied to clipboard",
    });
  };

  // Calculate total and today's P&L
  const { totalPnL, todayPnL } = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return trades.reduce((acc, trade) => {
      // Only include closed trades
      if (trade.status === 'closed') {
        acc.totalPnL += trade.pnl || 0;
        
        // Check if trade was closed today
        const closeDate = new Date(trade.openTime);
        if (closeDate >= startOfDay) {
          acc.todayPnL += trade.pnl || 0;
        }
      }
      return acc;
    }, { totalPnL: 0, todayPnL: 0 });
  }, [trades]);

  return (
    <div style={{ height }} className="relative bg-white border-t">
      <div 
        className="absolute -top-1 left-0 right-0 h-1 cursor-row-resize hover:bg-primary/10" 
        onMouseDown={handleMouseDown}
      />
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2 px-3 border-b bg-muted/30">
          <div className="flex items-center gap-1">
            <Button 
              variant={activeTab === 'open' ? "secondary" : "ghost"}
              onClick={() => setActiveTab('open')}
              className="h-7 text-xs px-2.5"
            >
              Open ({trades.filter(t => t.status === 'open').length})
            </Button>
            <Button 
              variant={activeTab === 'pending' ? "secondary" : "ghost"}
              onClick={() => setActiveTab('pending')}
              className="h-7 text-xs px-2.5"
            >
              Pending ({trades.filter(t => t.status === 'pending').length})
            </Button>
            <Button 
              variant={activeTab === 'closed' ? "secondary" : "ghost"}
              onClick={() => setActiveTab('closed')}
              className="h-7 text-xs px-2.5"
            >
              Closed ({trades.filter(t => t.status === 'closed').length})
            </Button>
          </div>

          {activeTab === 'closed' && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total P&L:</span>
                <span className={cn(
                  "font-mono font-medium",
                  totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  ${totalPnL.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Today's P&L:</span>
                <span className={cn(
                  "font-mono font-medium",
                  todayPnL > 0 ? "text-green-500" : todayPnL < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  ${todayPnL.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50">
                <tr className="text-xs font-medium text-muted-foreground"
                  ><th className="text-left p-2 pl-4">Symbol</th
                  ><th className="text-right p-2">Type</th
                  ><th className="text-right p-2">Size</th
                  ><th className="text-left p-2">Open Price</th
                  ><th className="text-right p-2">Current</th
                  ><th className="text-left p-2">Position ID</th
                  ><th className="text-left p-2">Open Time</th
                  ><th className="text-right p-2 pr-4">P&L</th
                  ><th className="w-10"></th
                ></tr>
              </thead>
              <tbody className="text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center p-4 text-muted-foreground">
                      Loading trades...
                    </td>
                  </tr>
                ) : filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-4 text-muted-foreground">
                      No {activeTab} trades found
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
                    const pnl = trade.status === 'open' ? calculatePnL(trade, currentPrice) : trade.pnl || 0;
                    
                    return (
                      <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="p-2 pl-4 font-medium">{trade.pair.split(':')[1]}</td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              trade.type === 'buy' ? "bg-blue-500" : "bg-red-500"
                            )} />
                            {trade.type.toUpperCase()}
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono">{trade.lots}</td>
                        <td className="p-2 text-left font-mono">${trade.openPrice.toFixed(5)}</td>
                        <td className="p-2 text-right font-mono">${currentPrice.toFixed(5)}</td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyId(trade.id)}
                            className="h-6 font-mono text-xs hover:bg-muted"
                          >
                            {trade.id.slice(0, 8)}...
                          </Button>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {formatTime(trade.openTime)}
                        </td>
                        <td className={cn("p-2 pr-4 text-right font-medium font-mono",
                          pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : "text-muted-foreground"
                        )}>
                          ${pnl.toFixed(2)}
                        </td>
                        <td className="w-10 p-2">
                          {trade.status === 'open' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-500"
                              onClick={() => onCloseTrade(trade.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

const Trade = () => {
  const { isMobile } = useBreakpoints();
  const { pair } = useParams();
  const location = useLocation();

  // If on mobile root trade route, redirect to select page
  if (isMobile && location.pathname === '/trade') {
    return <Navigate to="/trade/select" replace />;
  }

  // Initialize selected pair state
  const [selectedPair, setSelectedPair] = useState(
    pair ? decodeURIComponent(pair) : ''
  );
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile); // Update initial state
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [trades, setTrades] = useState<Trade[]>([]);

  // Add new state for trading pairs
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add WebSocket handling logic
  useEffect(() => {
    let cryptoWs: WebSocket | null = null;
    let forexWs: WebSocket | null = null;
    let heartbeatInterval: NodeJS.Timeout;

    const initializeCryptoWebSocket = () => {
      if (cryptoWs?.readyState === WebSocket.OPEN) return;

      cryptoWs = new WebSocket(BINANCE_WS_URL);
      const cryptoPairs = tradingPairs.filter(pair => pair.type === 'crypto').map(pair => 
        pair.symbol.toLowerCase().replace('binance:', '')
      );

      cryptoWs.onopen = () => {
        const subscribeMsg = {
          method: "SUBSCRIBE",
          params: cryptoPairs.map(symbol => `${symbol}@ticker`),
          id: 1
        };
        cryptoWs.send(JSON.stringify(subscribeMsg));
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
          console.error('Error parsing crypto data:', error);
        }
      };

      cryptoWs.onclose = () => {
        setTimeout(initializeCryptoWebSocket, 5000); // Attempt to reconnect after 5 seconds
      };
    };

    // Initialize WebSocket connections
    initializeCryptoWebSocket();

    // Initialize forex WebSocket with batch processing only
    if (tradermadeApiKey) {
      forexWs = new WebSocket(TRADERMADE_WS_URL);
      const forexPairs = tradingPairs.filter(pair => pair.type === 'forex').map(pair => formatForexSymbol(pair.symbol));

      forexWs.onopen = () => {
        console.log('Forex WebSocket opened');
        
        // Subscribe to all pairs in single batch
        const subscribeMsg = {
          userKey: tradermadeApiKey,
          symbol: forexPairs.join(','),
          _type: "subscribe"
        };
        forexWs.send(JSON.stringify(subscribeMsg));

        // Setup heartbeat only
        heartbeatInterval = setInterval(() => {
          if (forexWs?.readyState === WebSocket.OPEN) {
            forexWs.send(JSON.stringify({ heartbeat: "1" }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      forexWs.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && !event.data.startsWith('{')) {
            return;
          }

          const data = JSON.parse(event.data);
          
          if (data.type === "HEARTBEAT") return;
          
          // Handle subscription confirmations
          if (data.type === "SUBSCRIPTION_STATUS") {
            console.log('Forex subscription status:', data);
            return;
          }

          // Handle price updates
          if (data.symbol && data.bid && data.ask) {
            const formattedSymbol = `FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`;
            
            setPairPrices(prev => {
              const oldBid = parseFloat(prev[formattedSymbol]?.bid || data.bid);
              const newBid = parseFloat(data.bid);
              // Calculate percentage change
              const change = oldBid ? ((newBid - oldBid) / oldBid * 100) : 0;
              
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
          console.error('Error handling forex message:', error);
        }
      };

      forexWs.onerror = (error) => {
        console.error('Forex WebSocket error:', error);
      };

      forexWs.onclose = () => {
        console.log('Forex WebSocket closed');
      };
    }

    return () => {
      if (cryptoWs?.readyState === WebSocket.OPEN) cryptoWs.close();
      if (forexWs?.readyState === WebSocket.OPEN) forexWs.close();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [tradingPairs]);

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
        setUserBalance(data.withdrawal_wallet);
      }
    };

    fetchUserBalance();
  }, []);

  // Initialize TradingView widget
  useEffect(() => {
    const initializeWidget = () => {
      const container = document.getElementById('chart_container');
      if (!container || !window.TradingView) {
        return;
      }

      // Clear any existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }

      try {
        // Get configuration based on the selected pair
        const config = getChartConfiguration(selectedPair, "chart_container");
        chartInstanceRef.current = new window.TradingView.widget(config);
      } catch (err) {
        console.error('Failed to initialize TradingView widget:', err);
      }
    };

    // Load TradingView script
    const loadTradingViewScript = () => {
      return new Promise((resolve) => {
        if (window.TradingView) {
          resolve(window.TradingView);
          return;
        }

        const script = document.createElement('script');
        script.id = 'tradingview-widget';
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => resolve(window.TradingView);
        document.head.appendChild(script);
      });
    };

    // Initialize chart with delay to ensure DOM is ready
    const timer = setTimeout(() => {
      loadTradingViewScript().then(() => {
        initializeWidget();
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
          chartInstanceRef.current = null;
        } catch (err) {
          console.error('Error cleaning up chart:', err);
        }
      }
    };
  }, [selectedPair]);

  // Add this effect after other effects
  useEffect(() => {
    // Set first pairs in tabs
    const firstCryptoPair = tradingPairs.find(p => p.type === 'crypto')?.symbol;
    const firstForexPair = tradingPairs.find(p => p.type === 'forex')?.symbol;
    
    // Update selectedPair based on active tab
    if (!selectedPair && firstCryptoPair) {
      setSelectedPair(firstCryptoPair);
    }
  }, [tradingPairs, selectedPair]);

  const formatTradingViewSymbol = (symbol: string) => {
    if (symbol.includes('BINANCE:')) {
      return symbol;
    } else if (symbol.includes('FX:')) {
      // Convert FX:EUR/USD to EURUSD
      return symbol.replace('FX:', '').replace('/', '');
    }
    return symbol;
  };

  // Add trade creation function
  const handleTrade = async (params: {
    type: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    lots: string;
    leverage: string;
    limitPrice?: string;
  }) => {
    try {
      const { type, orderType, lots, leverage, limitPrice } = params;
      const executionPrice = type === 'buy' 
        ? parseFloat(pairPrices[selectedPair]?.ask || '0')
        : parseFloat(pairPrices[selectedPair]?.bid || '0');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to trade",
        });
        return;
      }

      // Insert trade into database
      const { data: trade, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          pair: selectedPair,
          type,
          status: orderType === 'market' ? 'open' : 'pending',
          open_price: executionPrice,
          lots: parseFloat(lots),
          leverage: parseInt(leverage),
          order_type: orderType,
          limit_price: orderType === 'limit' ? parseFloat(limitPrice || '0') : null
        })
        .select()
        .single();

      if (error) throw error;

      // Add trade to local state
      setTrades(prev => [{
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
        pnl: 0
      }, ...prev]);

      toast({
        title: "Trade Opened",
        description: `Successfully opened ${type.toUpperCase()} position for ${selectedPair} @ $${executionPrice}`,
      });
    } catch (error) {
      console.error('Error creating trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create trade"
      });
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      const closePrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      const pnl = calculatePnL(trade, closePrice);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Start a transaction to update both trades and profile
      const { data: { withdrawal_wallet }, error: balanceError } = await supabase
        .rpc('close_trade', {
          p_trade_id: tradeId,
          p_close_price: closePrice,
          p_pnl: pnl
        });

      if (balanceError) throw balanceError;

      // Update local state
      setTrades(prev => prev.map(t => 
        t.id === tradeId
          ? { ...t, status: 'closed', pnl }
          : t
      ));

      // Update user balance in local state
      setUserBalance(withdrawal_wallet);

      toast({
        title: "Trade Closed",
        description: `Position closed with P&L: $${pnl.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error closing trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close trade"
      });
    }
  };

  // Add effect to fetch existing trades on mount
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

      // Transform trades data
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
        pnl: trade.pnl || 0
      }));

      setTrades(formattedTrades);
    };

    fetchTrades();
  }, []);

  // Add effect to fetch trading pairs
  useEffect(() => {
    const fetchTradingPairs = async () => {
      try {
        const { data, error } = await supabase
          .from('trading_pairs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        
        // Set first pair as default if no pair selected
        if (!selectedPair && data.length > 0) {
          const firstCryptoPair = data.find(p => p.type === 'crypto');
          if (firstCryptoPair) {
            setSelectedPair(firstCryptoPair.symbol);
          }
        }
        
        setTradingPairs(data);
      } catch (error) {
        console.error('Error fetching trading pairs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradingPairs();
  }, [selectedPair]);

  // If mobile, redirect to /trade/select to show pairs selection
  // if (isMobile) {
  //   return <Navigate to="/trade/select" />;
  // }

  // Desktop view remains unchanged
  return (
    <TradingLayout
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      userBalance={userBalance}
      depositDialogOpen={depositDialogOpen}
      setDepositDialogOpen={setDepositDialogOpen}
    >
      {isMobile ? (
        <div className="flex flex-col h-full bg-background">
          {/* Market Selection Bar - Updated styling */}
          <div className={cn(
            "flex items-center gap-2 p-2 border-b bg-card overflow-x-auto transition-all duration-300",
            !isSidebarOpen ? "pl-14" : "pl-2" // Add padding when collapsed
          )}>
            {/* Add toggle button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute left-2 top-2 z-50"
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            {tradingPairs.filter(pair => pair.type === (selectedPair.includes('BINANCE:') ? 'crypto' : 'forex')).map((pair) => {
              const priceData = pairPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
              return (
                <Button
                  key={pair.symbol}
                  variant={selectedPair === pair.symbol ? "secondary" : "ghost"}
                  className={cn(
                    "flex-none py-1.5 h-auto",
                    selectedPair === pair.symbol ? "bg-muted" : ""
                  )}
                  onClick={() => setSelectedPair(pair.symbol)}
                >
                  <div className="flex items-center gap-2">
                    {pair.image_url ? (
                      <img 
                        src={pair.image_url}
                        alt={pair.name}
                        className="h-5 w-5"
                      />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-medium">{pair.short_name}</span>
                      <span className={cn(
                        "text-xs",
                        parseFloat(priceData.change) < 0 ? "text-red-500" : "text-green-500"
                      )}>
                        {parseFloat(priceData.change) > 0 ? '+' : ''}{priceData.change}%
                      </span>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Chart - Update margin when sidebar is open */}
          <div className={cn(
            "flex-1 relative min-h-0 transition-all duration-300",
            isSidebarOpen ? "mt-[300px]" : "mt-0"
          )}>
            <div className="absolute inset-0 p-3"> {/* Add padding */}
              <div className="w-full h-full rounded-xl border overflow-hidden bg-card"> {/* Add rounded corners */}
                <TradingViewWidget symbol={formatTradingViewSymbol(selectedPair)} />
              </div>
            </div>
          </div>

          {/* Trading Panel Sheet */}
          <Sheet defaultOpen>
            <SheetContent side="bottom" className="h-[60vh] p-0 flex flex-col">
              <div className="relative -mt-2 pb-1">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 h-1 w-12 rounded-full bg-muted" />
              </div>
              <div className="px-4 py-2 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium">{selectedPair.split(':')[1]}</h2>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      parseFloat(pairPrices[selectedPair]?.change || '0') < 0 
                        ? "bg-red-50 text-red-600" 
                        : "bg-green-50 text-green-600"
                    )}>
                      {parseFloat(pairPrices[selectedPair]?.change || '0') > 0 ? '+' : ''}
                      {pairPrices[selectedPair]?.change || '0.00'}%
                    </div>
                  </div>
                  
                  <Tabs defaultValue="trade" className="w-auto">
                    <TabsList className="grid w-[160px] grid-cols-2 h-8">
                      <TabsTrigger value="trade" className="text-xs">Trade</TabsTrigger>
                      <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <TabsContent value="trade" className="m-0 h-full">
                  <TradingPanel 
                    selectedPair={selectedPair}
                    pairPrices={pairPrices}
                    onTrade={handleTrade}
                    userBalance={userBalance}
                    tradingPairs={tradingPairs}
                  />
                </TabsContent>
                <TabsContent value="orders" className="m-0 p-4 h-full">
                  <TradingActivity 
                    trades={trades} 
                    currentPrices={pairPrices} 
                    onCloseTrade={handleCloseTrade} 
                  />
                </TabsContent>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="flex h-full">
          <TradeSidebar 
            selectedPair={selectedPair} 
            onPairSelect={setSelectedPair}
            isOpen={isSidebarOpen}
            pairPrices={pairPrices}
            tradingPairs={tradingPairs}
          />
          
          <div className="flex flex-1">
            {/* Main content with chart and activity */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 relative min-h-0 p-3"> {/* Add padding */}
                <div className="w-full h-full rounded-xl border overflow-hidden bg-card"> {/* Add rounded corners */}
                  <TradingViewWidget symbol={formatTradingViewSymbol(selectedPair)} />
                </div>
              </div>
              <TradingActivity trades={trades} currentPrices={pairPrices} onCloseTrade={handleCloseTrade} />
            </div>
          </div>
            
          {/* Right trading panel */}
          <TradingPanel 
            selectedPair={selectedPair} 
            pairPrices={pairPrices}
            onTrade={handleTrade}
            userBalance={userBalance}
            tradingPairs={tradingPairs}
          />
        </div>
      )}
    </TradingLayout>
  );
};

// Add this type declaration at the top of your file
declare global {
  interface Window {
    TradingView: any;
  }
}

export default Trade;
