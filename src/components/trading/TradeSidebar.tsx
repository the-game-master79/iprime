import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagnifyingGlass, ChartLine, Globe, ArrowsHorizontal } from "@phosphor-icons/react";
import { TradingPair, PriceData } from "@/types/trading";
import { isForexTradingTime } from "@/lib/utils";
import { wsManager, ConnectionMode } from '@/services/websocket-manager';
import { Badge } from "@/components/ui/badge";
import { getDecimalPlaces } from "@/config/decimals"; // Add this import

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
  const [activeTab, setActiveTab] = useState("forex");
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

  // Subscribe to WebSocket price updates with FULL mode
  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
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

    // Watch all pairs in FULL mode
    wsManager.watchPairs(tradingPairs.map(p => p.symbol), ConnectionMode.FULL);

    return () => {
      unsubscribe();
    };
  }, [tradingPairs]); // Only depend on tradingPairs changes

  // Clear animations after delay
  useEffect(() => {
    const timer = setTimeout(() => setPriceAnimations({}), 1000);
    return () => clearTimeout(timer);
  }, [localPrices]);

  // Add market status check
  const isForexClosed = !isForexTradingTime();

  // Add effect to handle forex market closure
  useEffect(() => {
    if (isForexClosed && activeTab === 'forex') {
      setActiveTab('crypto');
    }
  }, [isForexClosed, activeTab]);

  // Prevent switching to forex tab when market is closed
  const handleTabChange = (value: string) => {
    if (value === 'forex' && isForexClosed) {
      return;
    }
    setActiveTab(value);
  };

  // Update to use imported getDecimalPlaces
  const getDisplayDecimals = (symbol: string): number => {
    return getDecimalPlaces(symbol);
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-20 flex flex-col border-r border-[#525252] bg-card transition-all duration-300 mt-14",
      collapsed ? "w-20" : "w-72",
      !isOpen && "-translate-x-full"
    )}>
      <div className="flex flex-col items-center border-b border-[#525252]">
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
              ${parseFloat(localPrices[selectedPair]?.bid || '0').toFixed(getDisplayDecimals(selectedPair))}
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
                  <TabsTrigger 
                    value="forex" 
                    className="flex items-center gap-2"
                    disabled={isForexClosed}
                  >
                    <Globe className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        Forex
                        {isForexClosed && (
                          <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                            Closed
                          </Badge>
                        )}
                      </>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="crypto" className="flex items-center gap-2">
                    <ChartLine className="h-4 w-4" />
                    {!collapsed && "Crypto"}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 p-4">
                {filteredPairs.map((pair) => {
                  const priceData = localPrices[pair.symbol] || { bid: '0.00000', change: '0.00' };
                  const priceAnimation = priceAnimations[pair.symbol];
                  const decimals = getDisplayDecimals(pair.symbol);
                  
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
