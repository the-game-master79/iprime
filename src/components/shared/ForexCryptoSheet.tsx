import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { wsManager } from "@/services/websocket-manager";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate(); // Add navigation hook
  const [searchQuery, setSearchQuery] = useState("");
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [localPrices, setLocalPrices] = useState<Record<string, { bid: string; change: string }>>({});
  const [priceAnimations, setPriceAnimations] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const fetchTradingPairs = async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("symbol, name, type, image_url")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching trading pairs:", error);
        return;
      }

      setTradingPairs(data || []);
    };

    fetchTradingPairs();
  }, []);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      setLocalPrices((prev) => {
        const prevPrice = parseFloat(prev[symbol]?.bid || "0");
        const newPrice = parseFloat(data.bid || "0");

        if (prevPrice !== newPrice) {
          setPriceAnimations((prevAnimations) => ({
            ...prevAnimations,
            [symbol]: newPrice > prevPrice ? "up" : "down",
          }));
        }

        return { ...prev, [symbol]: data };
      });
    });

    wsManager.watchPairs(tradingPairs.map((pair) => pair.symbol));

    return () => {
      unsubscribe();
      wsManager.unwatchPairs(tradingPairs.map((pair) => pair.symbol));
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] p-0 flex flex-col">
        <div className="p-4 pt-10">
          <h2 className="text-lg font-semibold mb-2">All Pairs</h2>
          <Input
            placeholder="Search pairs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Tabs defaultValue="forex" className="flex-1">
          <TabsList className="grid grid-cols-2 m-2 py-2">
            <TabsTrigger value="forex" className="py-2">Forex</TabsTrigger>
            <TabsTrigger value="crypto" className="py-2">Crypto</TabsTrigger>
          </TabsList>
          <TabsContent value="forex" className="p-4 space-y-2">
            {filteredPairs
              .filter((pair) => pair.type === "forex")
              .map((pair) => {
                const priceData = localPrices[pair.symbol] || { bid: "0.00000", change: "0.00" };
                const priceAnimation = priceAnimations[pair.symbol];

                return (
                  <Button
                    key={pair.symbol}
                    variant="ghost"
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                    onClick={() => {
                      onPairSelect(pair.symbol); // Notify parent about the selected pair
                      navigate(`/trade/chart/${encodeURIComponent(pair.symbol)}`); // Navigate to ChartView
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={pair.image_url}
                        alt={pair.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg";
                        }}
                      />
                      <span className="font-medium">{formatPairName(pair.symbol)}</span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono ${
                          priceAnimation === "up" ? "text-green-500" : priceAnimation === "down" ? "text-red-500" : ""
                        }`}
                      >
                        ${parseFloat(priceData.bid).toFixed(5)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          parseFloat(priceData.change) >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {parseFloat(priceData.change) >= 0 ? "+" : ""}
                        {priceData.change}%
                      </Badge>
                    </div>
                  </Button>
                );
              })}
          </TabsContent>
          <TabsContent value="crypto" className="p-4 space-y-2">
            {filteredPairs
              .filter((pair) => pair.type === "crypto")
              .map((pair) => {
                const priceData = localPrices[pair.symbol] || { bid: "0.00000", change: "0.00" };
                const priceAnimation = priceAnimations[pair.symbol];

                return (
                  <Button
                    key={pair.symbol}
                    variant="ghost"
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                    onClick={() => {
                      onPairSelect(pair.symbol); // Notify parent about the selected pair
                      navigate(`/trade/${encodeURIComponent(pair.symbol)}`); // Navigate to ChartView
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={pair.image_url}
                        alt={pair.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg";
                        }}
                      />
                      <span className="font-medium">{formatPairName(pair.symbol)}</span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono ${
                          priceAnimation === "up" ? "text-green-500" : priceAnimation === "down" ? "text-red-500" : ""
                        }`}
                      >
                        ${parseFloat(priceData.bid).toFixed(5)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          parseFloat(priceData.change) >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {parseFloat(priceData.change) >= 0 ? "+" : ""}
                        {priceData.change}%
                      </Badge>
                    </div>
                  </Button>
                );
              })}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
