import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagnifyingGlass, ChartLine, Globe, ArrowsHorizontal } from "@phosphor-icons/react";
import { TradingPair, PriceData } from "@/types/trading";
import { Badge } from "@/components/ui/badge";
import { isForexTradingTime } from "@/lib/utils";
import { wsManager } from '@/services/websocket-manager';

interface TradeSidebarProps {
  selectedPair: string;
  onPairSelect: (pair: string) => void;
  isOpen: boolean;
  pairPrices: Record<string, PriceData>;
  isMobile?: boolean;
  tradingPairs: TradingPair[];
  collapsed?: boolean; // Add collapsed prop
  onToggleCollapse?: () => void; // Add toggle handler
}

export const TradeSidebar = ({ 
  selectedPair, 
  onPairSelect,
  isOpen,
  pairPrices,
  isMobile = false,
  tradingPairs,
  collapsed = false,
  onToggleCollapse
}: TradeSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");
  const [priceAnimations, setPriceAnimations] = useState<{[key: string]: 'up' | 'down'}>({});
  const [localPrices, setLocalPrices] = useState<Record<string, PriceData>>({});

  // Move filtered pairs to useMemo before useEffect
  const filteredPairs = useMemo(() => {
    return tradingPairs.filter(pair => {
      const matchesSearch = pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pair.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'crypto' ? pair.type === 'crypto' : pair.type === 'forex';
      return matchesSearch && matchesTab;
    });
  }, [tradingPairs, searchQuery, activeTab]);

  // Subscribe to WebSocket price updates
  useEffect(() => {
    const pairsToWatch = filteredPairs.map(p => p.symbol);
    
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      if (!pairsToWatch.includes(symbol)) return;

      setLocalPrices(prev => {
        const prevPrice = parseFloat(prev[symbol]?.bid || '0');
        const newPrice = parseFloat(data.bid || '0');
        
        if (prevPrice !== newPrice) {
          setPriceAnimations(prev => ({
            ...prev,
            [symbol]: newPrice > prevPrice ? 'up' : 'down'
          }));
        }

        return { ...prev, [symbol]: data };
      });
    });

    wsManager.watchPairs(pairsToWatch);

    return () => {
      unsubscribe();
      wsManager.unwatchPairs(pairsToWatch);
    };
  }, [filteredPairs]);

  // Clear animations after delay
  useEffect(() => {
    const timer = setTimeout(() => setPriceAnimations({}), 1000);
    return () => clearTimeout(timer);
  }, [localPrices]);

  // Add market status check
  const isForexClosed = !isForexTradingTime();

  // Prevent switching to forex tab when market is closed
  const handleTabChange = (value: string) => {
    if (value === 'forex' && isForexClosed) {
      return;
    }
    setActiveTab(value);
  };

  const cryptoLotDecimals: Record<string, number> = {
    'BNBUSDT': 2,
    'DOTUSDT': 3,
    'ETHUSDT': 2,
    'DOGEUSDT': 5,
    'BTCUSDT': 2,
    'TRXUSDT': 4,
    'LINKUSDT': 2,
    'ADAUSDT': 4,
    'SOLUSDT': 2,
  };

  const forexLotDecimals: Record<string, number> = {
    'EURUSD': 5,
    'GBPUSD': 5,
    'USDJPY': 3,
    'USDCHF': 5,
    'AUDUSD': 5,
    'USDCAD': 5,
    'EURGBP': 5,
    'EURJPY': 3,
    'GBPJPY': 3,
    'XAUUSD': 2
  };

  const getDecimalPlaces = (symbol: string): number => {
    if (symbol.includes('BINANCE:')) {
      const base = symbol.replace('BINANCE:', '');
      return cryptoLotDecimals[base] ?? 5;
    }
    
    if (symbol.includes('FX:')) {
      const base = symbol.replace('FX:', '').replace('/', '');
      return forexLotDecimals[base] ?? 5;
    }
    
    return 5; // Default
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-20 flex flex-col border-r bg-card transition-all duration-300 mt-14",
      collapsed ? "w-20" : "w-72",
      !isOpen && "-translate-x-full"
    )}>
      <div className="flex flex-col items-center border-b">
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className={cn("font-semibold", collapsed && "hidden")}>
            Markets
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 hover:bg-accent"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ArrowsHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Add price display when collapsed */}
        {collapsed && selectedPair && (
          <div className="pb-2 text-center">
            <div className={cn(
              "font-medium tabular-nums transition-colors text-sm",
              priceAnimations[selectedPair] === 'up' && "text-green-500",
              priceAnimations[selectedPair] === 'down' && "text-red-500"
            )}>
              ${parseFloat(localPrices[selectedPair]?.bid || '0').toFixed(getDecimalPlaces(selectedPair))}
            </div>
            <div className={cn(
              "text-xs font-medium",
              parseFloat(localPrices[selectedPair]?.change || '0') >= 0 
                ? "text-green-500" 
                : "text-red-500"
            )}>
              {parseFloat(localPrices[selectedPair]?.change || '0') >= 0 ? '+' : ''}
              {localPrices[selectedPair]?.change || '0'}%
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {!collapsed ? (
          <>
            <div className="space-y-4 p-4">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="crypto" className="flex items-center gap-2">
                    <ChartLine className="h-4 w-4" />
                    {!collapsed && "Crypto"}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="forex" 
                    className="flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    {!collapsed && "Forex"}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 p-4">
                {filteredPairs.map((pair) => {
                  const priceData = localPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                  const priceAnimation = priceAnimations[pair.symbol];
                  const decimals = getDecimalPlaces(pair.symbol);
                  
                  return (
                    <Button
                      key={pair.symbol}
                      variant={selectedPair === pair.symbol ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-between py-4 px-3 h-auto", // Fixed padding
                        selectedPair === pair.symbol && "bg-accent"
                      )}
                      onClick={() => onPairSelect(pair.symbol)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={pair.image_url}
                          alt={pair.name}
                          className="h-8 w-8" // Increased from h-6 w-6
                          onError={(e) => {
                            e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                          }}
                        />
                        <div className="text-left">
                          <div className="font-medium">{pair.short_name}</div>
                          <div className="text-xs text-muted-foreground/60">{pair.name}</div> {/* Made more subtle */}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className={cn(
                          "font-medium tabular-nums transition-colors",
                          priceAnimation === 'up' && "text-green-500",
                          priceAnimation === 'down' && "text-red-500"
                        )}>
                          ${parseFloat(priceData.bid).toFixed(decimals)}
                        </div>
                        <div className={cn(
                          "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                          parseFloat(priceData.change) >= 0 
                            ? "bg-green-500/10 text-green-500" 
                            : "bg-red-500/10 text-red-500"
                        )}>
                          {parseFloat(priceData.change) >= 0 ? '+' : ''}{priceData.change}%
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-2">
              {filteredPairs.map((pair) => (
                <Button
                  key={pair.symbol}
                  variant={selectedPair === pair.symbol ? "secondary" : "ghost"}
                  className={cn(
                    "w-full aspect-square p-0",
                    selectedPair === pair.symbol && "bg-accent"
                  )}
                  onClick={() => onPairSelect(pair.symbol)}
                  title={pair.name}
                >
                  <img
                    src={pair.image_url}
                    alt={pair.name}
                    className="h-8 w-8"
                    onError={(e) => {
                      e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                    }}
                  />
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </aside>
  );
};
