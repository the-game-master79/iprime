import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { wsManager } from "@/services/websocket-manager";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MagnifyingGlass, CircleNotch, Globe, Coins, WarningCircle } from "@phosphor-icons/react";
import { isForexTradingTime, getForexMarketStatus } from "@/lib/utils";

interface ForexCryptoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPairSelect: (pair: string) => void;
}

interface TradingPair {
  symbol: string;
  name: string;
  type: "crypto" | "forex";
  image_url: string;
}

export const ForexCryptoSheet: React.FC<ForexCryptoSheetProps> = ({ open, onOpenChange, onPairSelect }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localPrices, setLocalPrices] = useState<Record<string, { price: string; timestamp: string }>>({});
  const [priceAnimations, setPriceAnimations] = useState<Record<string, "up" | "down">>({});
  const [activeTab, setActiveTab] = useState<'forex' | 'crypto'>('forex');

  useEffect(() => {
    const fetchTradingPairs = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("symbol, name, type, image_url")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching trading pairs:", error);
        return;
      }

      setTradingPairs(data || []);
      setIsLoading(false);
    };

    fetchTradingPairs();
  }, []);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      setLocalPrices((prev) => ({
        ...prev,
        [symbol]: {
          price: parseFloat(data.price || '0').toFixed(5),
          timestamp: data.timestamp || new Date().toISOString(),
        },
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [tradingPairs]);

  const filteredPairs = tradingPairs.filter((pair) =>
    pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pair.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPairName = (symbol: string) => {
    if (symbol.startsWith("FX:")) {
      return symbol.replace("FX:", "").replace("/", "");
    }
    if (symbol.startsWith("BINANCE:")) {
      return symbol.replace("BINANCE:", "");
    }
    return symbol;
  };

  // Get forex market status
  const { isOpen: isForexOpen, message: forexStatusMessage } = getForexMarketStatus();

  // Handle tab change
  const handleTabChange = (value: 'forex' | 'crypto') => {
    if (value === 'forex' && !isForexOpen) {
      // Show warning but don't switch
      return;
    }
    setActiveTab(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] p-0 flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="p-6 pt-12 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">All Pairs</h2>
          <div className="relative">
            <MagnifyingGlass weight="regular" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pairs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-10 bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/30 transition-colors"
            />
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">          <TabsList className="grid grid-cols-2 gap-4 mx-4 mb-2">
            <TabsTrigger value="forex" className="relative text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-primary/10" disabled={!isForexOpen}>
              <div className="flex items-center gap-2">
                <Globe weight="regular" className="h-4 w-4" />
                Forex
                {!isForexOpen && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 text-[10px] px-1 py-0">
                    Closed
                  </Badge>
                )}
              </div>
            </TabsTrigger>            <TabsTrigger value="crypto" className="text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-primary/10">
              <div className="flex items-center gap-2">
                <Coins weight="regular" className="h-4 w-4" />
                Crypto
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Forex market closed warning */}
          {activeTab === 'forex' && !isForexOpen && (
            <div className="mx-4 mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-500">
                <WarningCircle weight="regular" className="h-5 w-5 flex-shrink-0" />
                <p className="text-xs">{forexStatusMessage}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <CircleNotch weight="regular" className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="forex" className="p-4 space-y-2.5 mt-0">
                {filteredPairs
                  .filter((pair) => pair.type === "forex")
                  .map((pair) => {
                    const priceData = localPrices[pair.symbol] || { price: "0.00000", timestamp: new Date().toISOString() };
                    const priceAnimation = priceAnimations[pair.symbol];

                    return (
                      <Button
                        key={pair.symbol}
                        variant="ghost"
                        className="w-full flex items-center justify-between py-5 px-4 border border-[#525252] rounded-lg hover:bg-accent hover:border-border group transition-all duration-200"
                        onClick={() => {
                          if (!isForexOpen) return;
                          onPairSelect(pair.symbol);
                          navigate(`/trade/chart/${encodeURIComponent(pair.symbol)}`);
                        }}
                        disabled={!isForexOpen}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted/30 flex items-center justify-center">
                            <img
                              src={pair.image_url}
                              alt={pair.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg";
                              }}
                            />
                          </div>
                          <span className="font-medium group-hover:text-foreground/90 transition-colors">
                            {formatPairName(pair.symbol)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div
                            className={cn(
                              "font-mono transition-colors duration-200",
                              priceAnimation === "up" && "text-green-500 animate-price-up",
                              priceAnimation === "down" && "text-red-500 animate-price-down"
                            )}
                          >
                            ${parseFloat(priceData.price).toFixed(5)}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs transition-colors ",
                              parseFloat(priceData.price) >= 0 ? "text-green-500" : "text-red-500"
                            )}
                          >
                            {parseFloat(priceData.price) >= 0 ? "+" : ""}
                            {priceData.price}%
                          </Badge>
                        </div>
                      </Button>
                    );
                  })}
              </TabsContent>
              <TabsContent value="crypto" className="p-4 space-y-2.5 mt-0">
                {filteredPairs
                  .filter((pair) => pair.type === "crypto")
                  .map((pair) => {
                    const priceData = localPrices[pair.symbol] || { price: "0.00000", timestamp: new Date().toISOString() };
                    const priceAnimation = priceAnimations[pair.symbol];

                    return (
                      <Button
                        key={pair.symbol}
                        variant="ghost"
                        className="w-full flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-accent hover:border-border group transition-all duration-200"
                        onClick={() => {
                          onPairSelect(pair.symbol);
                          navigate(`/trade/${encodeURIComponent(pair.symbol)}`);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted/30 flex items-center justify-center">
                            <img
                              src={pair.image_url}
                              alt={pair.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg";
                              }}
                            />
                          </div>
                          <span className="font-medium group-hover:text-foreground/90 transition-colors">
                            {formatPairName(pair.symbol)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div
                            className={cn(
                              "font-mono transition-colors duration-200",
                              priceAnimation === "up" && "text-green-500 animate-price-up",
                              priceAnimation === "down" && "text-red-500 animate-price-down"
                            )}
                          >
                            ${parseFloat(priceData.price).toFixed(5)}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs transition-colors",
                              parseFloat(priceData.price) >= 0 ? "text-green-500" : "text-red-500"
                            )}
                          >
                            {parseFloat(priceData.price) >= 0 ? "+" : ""}
                            {priceData.price}%
                          </Badge>
                        </div>
                      </Button>
                    );
                  })}
              </TabsContent>
            </>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
