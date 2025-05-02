import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trade } from "@/types/trade";
import { getDecimalPlaces } from "@/config/decimals"; // Add this import
import { wsManager } from '@/services/websocket-manager';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface PriceData {
  price: string;
  bid: string;
  ask: string;
  change: string;
}

// Add groupTradesByDate helper function
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

interface TradesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trades: Trade[];
  onCloseTrade?: (tradeId: string) => Promise<void>;
  calculatePnL: (trade: Trade, currentPrice: number) => number;
}

export function TradesSheet({
  open,
  onOpenChange,
  trades: openTrades,
  onCloseTrade,
  calculatePnL
}: TradesSheetProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'pending'>('open');
  const [localPrices, setLocalPrices] = useState<Record<string, PriceData>>({});
  const [isPriceLoaded, setIsPriceLoaded] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Modified WebSocket subscription effect
  useEffect(() => {
    const tradePairs = openTrades
      .filter(t => t.status === 'open' || t.status === 'pending')
      .map(t => t.pair);

    const uniquePairs = Array.from(new Set(tradePairs));
    
    if (uniquePairs.length > 0) {
      setIsPriceLoaded(prev => {
        const next = { ...prev };
        uniquePairs.forEach(pair => next[pair] = false);
        return next;
      });

      const unsubscribe = wsManager.subscribe((symbol, data) => {
        setLocalPrices(prev => ({
          ...prev,
          [symbol]: data
        }));
        setIsPriceLoaded(prev => ({
          ...prev,
          [symbol]: true
        }));
      });

      wsManager.watchPairs(uniquePairs);
      return () => {
        unsubscribe();
        wsManager.unwatchPairs(uniquePairs);
      };
    }
  }, [openTrades]);

  // Reset to open tab when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setActiveTab('open');
    }
  }, [open]);

  // Use trades filtered by active tab
  const displayedTrades = openTrades.filter(trade => trade.status === activeTab);

  // Add price formatting helper
  const formatPrice = (price: number, symbol: string) => {
    return price.toFixed(getDecimalPlaces(symbol));
  };

  // Add handler to check if price is loaded
  const handleCloseTrade = async (tradeId: string) => {
    const trade = openTrades.find(t => t.id === tradeId);
    if (!trade) return;

    if (!isPriceLoaded[trade.pair]) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please wait for price data to load",
      });
      return;
    }

    await onCloseTrade(tradeId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] p-0 flex flex-col overflow-hidden border-t-0 rounded-t-xl"
      >
        <div className="py-4 px-4 border-b">
          <DialogTitle>Active Trades</DialogTitle>
          <VisuallyHidden>
            View and manage your active trading positions
          </VisuallyHidden>
        </div>

        {/* Header */}
        <div className="px-3 py-2 backdrop-blur-sm">
          <Tabs defaultValue="open" onValueChange={(value) => setActiveTab(value as 'open' | 'pending')} className="flex-1">
            <TabsList className="h-8 p-1">
              <TabsTrigger value="open" className="text-xs px-3">
                Open ({openTrades.filter(t => t.status === 'open').length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-3">
                Pending ({openTrades.filter(t => t.status === 'pending').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-sm text-muted-foreground animate-pulse">Loading...</div>
            </div>
          ) : displayedTrades.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="text-sm font-medium mb-1">No {activeTab} trades</div>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Your {activeTab} trades will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedTrades.map(trade => {
                const currentPrice = parseFloat(localPrices[trade.pair]?.bid || '0');
                const pnl = trade.status === 'closed' ? trade.pnl : calculatePnL(trade, currentPrice);
                
                return (
                  <div 
                    key={trade.id} 
                    className="flex flex-col p-3 bg-card hover:bg-accent/50 rounded-lg border"
                  >
                    {/* Top row - Trade info and P&L */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-1 h-2 w-2 rounded-full",
                          trade.type === 'buy' ? "bg-blue-500" : "bg-red-500"
                        )} />
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">{trade.pair.split(':')[1]}</div>
                          <div className="text-xs text-muted-foreground">
                            {trade.type.toUpperCase()} {trade.lots} Lots @ ${formatPrice(trade.openPrice, trade.pair)}
                          </div>
                          {trade.status === 'open' && (
                            <div className="text-xs text-muted-foreground">
                              Current: ${formatPrice(currentPrice, trade.pair)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs font-medium px-2 py-1 rounded-md",
                        pnl > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        ${pnl.toFixed(2)}
                      </div>
                    </div>

                    {/* Bottom row - Close button */}
                    {trade.status === 'open' && onCloseTrade && (
                      <div className="-mx-3 -mb-3 mt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm" 
                          onClick={() => handleCloseTrade(trade.id)}
                          disabled={!isPriceLoaded[trade.pair]}
                          className={cn(
                            "w-full rounded-none h-9 text-xs font-medium",
                            !isPriceLoaded[trade.pair] && "opacity-50 cursor-not-allowed",
                            pnl > 0 
                              ? "bg-green-500/5 text-green-500 hover:bg-green-500/10 hover:text-green-600" 
                              : "bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                          )}
                        >
                          {!isPriceLoaded[trade.pair] ? 'Loading...' : 'Close Position'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
