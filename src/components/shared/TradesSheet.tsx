import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trade } from "@/types/trade";
import { getDecimalPlaces } from "@/config/decimals"; // Add this import
import { wsManager, ConnectionMode } from '@/services/websocket-manager';
import { toast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react"; 
import { MarginWatchDog } from "@/components/trading/MarginWatchDog";

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

// Helper to group trades by pair and type
const groupTradesByPairAndType = (trades: Trade[]) => {
  const grouped = trades.reduce((acc, trade) => {
    const key = `${trade.pair}-${trade.type}`;
    if (!acc[key]) {
      acc[key] = {
        ...trade,
        originalTrades: [],
        lots: 0,
        pnl: 0,
      };
    }
    // Ensure numerical values are properly handled
    const tradeLots = Number(trade.lots) || 0;
    const tradePnl = Number(trade.pnl) || 0;
    
    acc[key].originalTrades.push(trade);
    acc[key].lots = Number((acc[key].lots + tradeLots).toFixed(2));
    acc[key].pnl = Number((acc[key].pnl + tradePnl).toFixed(2));
    return acc;
  }, {} as Record<string, Trade & { originalTrades: Trade[] }>);
  return Object.values(grouped);
};

// Add safety checks for numerical calculations in calculatePnL usage
const calculateSafePnL = (trade: Trade, currentPrice: number): number => {
  if (!trade || !currentPrice || !calculatePnL) return 0;
  const pnl = calculatePnL(trade, currentPrice);
  return isNaN(pnl) ? 0 : Number(pnl.toFixed(2));
};

interface TradesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trades: Trade[];
  onCloseTrade?: (tradeId: string) => Promise<void>;
  calculatePnL: (trade: Trade, currentPrice: number) => number;
  userBalance: number; // Add this prop
}

export function TradesSheet({
  open,
  onOpenChange,
  trades: openTrades,
  onCloseTrade,
  calculatePnL,
  userBalance  // Add this prop
}: TradesSheetProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'open' | 'pending'>('open');
  const [localPrices, setLocalPrices] = useState<Record<string, PriceData>>({});
  const [isPriceLoaded, setIsPriceLoaded] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [tradeToClose, setTradeToClose] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Calculate total PnL
  const totalPnL = openTrades
    .filter(t => t.status === 'open')
    .reduce((sum, trade) => {
      if (!calculatePnL || !localPrices[trade.pair]) return sum;
      const currentPrice = parseFloat(localPrices[trade.pair]?.bid || '0');
      if (!currentPrice) return sum;
      return sum + calculatePnL(trade, currentPrice);
    }, 0);

  // Update isHedgedPosition to check for matching lots and opposite type
  const isHedgedPosition = (trade: Trade) => {
    if (!trade || !openTrades) return false;
    const hedgedTrade = openTrades.find(t => 
      t.id !== trade.id &&
      t.pair === trade.pair &&
      t.type !== trade.type && 
      t.lots === trade.lots &&
      t.status === 'open'
    );
    return !!hedgedTrade;
  };

  // Add function to get combined hedged PnL
  const getHedgedPnL = (trade: Trade, currentPrice: number) => {
    if (!calculatePnL || !trade || !currentPrice) return 0;
    const hedgedTrade = openTrades.find(t => 
      t.id !== trade.id &&
      t.pair === trade.pair &&
      t.type !== trade.type &&
      t.lots === trade.lots &&
      t.status === 'open'
    );

    if (!hedgedTrade) return calculatePnL(trade, currentPrice);
    
    // For hedged positions, return the locked-in PnL
    const buyTrade = trade.type === 'buy' ? trade : hedgedTrade;
    const sellTrade = trade.type === 'sell' ? trade : hedgedTrade;
    
    return calculatePnL(buyTrade, sellTrade.openPrice);
  };

  // Update handleCloseAllTrades function
  const handleCloseAllTrades = async () => {
    if (!onCloseTrade) return;
    
    setIsLoading(true);
    let failed = 0;
    let completed = 0;

    try {
      const tradesToClose = openTrades.filter(t => t.status === 'open');
      
      for (const trade of tradesToClose) {
        try {
          await onCloseTrade(trade.id);
          completed++;
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast({
          title: "Success",
          description: `Successfully closed ${completed} trades`
        });
        // Navigate back to trade/select after all trades are closed
        navigate('/trade/select');
      } else {
        toast({
          variant: "destructive",
          title: "Warning",
          description: `Failed to close ${failed} trades. Completed: ${completed}`
        });
      }
    } catch (error) {
      console.error('Error closing trades:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close trades"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update handleCloseHedgedTrades function
  const handleCloseHedgedTrades = async () => {
    if (!onCloseTrade) return;
    
    setIsLoading(true);
    let failed = 0;
    let completed = 0;

    try {
      const hedgedTrades = openTrades.filter(t => t.status === 'open' && isHedgedPosition(t));
      
      for (const trade of hedgedTrades) {
        try {
          await onCloseTrade(trade.id);
          completed++;
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast({
          title: "Success", 
          description: `Successfully closed ${completed} hedged positions`
        });
        // Navigate back to trade/select if all hedged positions are closed
        if (completed === hedgedTrades.length) {
          navigate('/trade/select');
        }
      } else {
        toast({
          variant: "destructive",
          title: "Warning",
          description: `Failed to close ${failed} positions. Completed: ${completed}`
        });
      }
    } catch (error) {
      console.error('Error closing hedged trades:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close hedged positions"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to check if all positions are hedged
  const allPositionsAreHedged = () => {
    const openPositions = openTrades.filter(t => t.status === 'open');
    return openPositions.length > 0 && openPositions.every(isHedgedPosition);
  };

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
        if (!data?.bid) return; // Ignore invalid price updates
        
        setLocalPrices(prev => ({
          ...prev,
          [symbol]: data
        }));
        setIsPriceLoaded(prev => ({
          ...prev,
          [symbol]: true
        }));
      });

      // Use MINIMAL mode for trades sheet
      wsManager.watchPairs(uniquePairs, ConnectionMode.MINIMAL);

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

  // Use grouped trades for display
  const groupedTrades = groupTradesByPairAndType(
    openTrades.filter(trade => trade.status === activeTab)
  );

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

    setTradeToClose(tradeId);
  };

  // Update close execution handler
  const executeClose = async () => {
    if (!tradeToClose) return;
    
    setIsClosing(true);
    try {
      const trade = openTrades.find(t => t.id === tradeToClose);
      if (!trade) return;

      await onCloseTrade(tradeToClose);
      
      // Clear trade state
      setTradeToClose(null);
      setIsClosing(false);

      toast({
        title: "Success",
        description: "Trade closed successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive", 
        title: "Error",
        description: "Failed to close trade"
      });
      setIsClosing(false);
      setTradeToClose(null);
    }
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <>
      {/* Add MarginWatchDog before Sheet component */}
      {onCloseTrade && (
        <MarginWatchDog
          trades={openTrades}
          currentPrices={localPrices}
          userBalance={userBalance}
          onCloseTrade={onCloseTrade}
        />
      )}

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="h-[80vh] p-0 flex flex-col overflow-hidden border-t-0 rounded-t-xl"
        >
          <div className="py-4 px-6 border-b border-[#525252] flex items-center">
            <div className="flex items-center gap-6">
              <div className={cn(
                "text-sm font-mono font-medium",
                totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-red-500" : ""
              )}>
                ${totalPnL.toFixed(2)}
              </div>
              {openTrades.some(t => t.status === 'open') && (
                <div className="flex items-center gap-2">
                  {allPositionsAreHedged() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseHedgedTrades}
                      className="text-xs text-blue-500 hover:text-blue-600 min-w-[100px]"
                    >
                      Close Hedged
                    </Button>
                  )}
                  <Button
                    variant="outline"  
                    size="sm"
                    onClick={handleCloseAllTrades}
                    className="text-xs text-red-500 hover:text-red-600 min-w-[80px]"
                  >
                    Close All
                  </Button>
                </div>
              )}
            </div>
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
            ) : groupedTrades.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="text-sm font-medium mb-1">No {activeTab} trades</div>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  Your {activeTab} trades will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupedTrades.map(group => {
                  const currentPrice = parseFloat(localPrices[group.pair]?.bid || '0');
                  const pnl = group.status === 'closed' ? group.pnl : calculatePnL(group, currentPrice);
                  const groupKey = `${group.pair}-${group.type}`;
                  const isExpanded = expandedGroups[groupKey] || false;

                  return (
                    <div 
                      key={groupKey} 
                      className="flex flex-col p-3 bg-card hover:bg-accent/50 rounded-lg border border-[#525252]"
                    >
                      {/* Top row - Group info and P&L */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-1 h-2 w-2 rounded-full",
                            group.type === 'buy' ? "bg-blue-500" : "bg-red-500"
                          )} />
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium flex items-center gap-2">
                              {group.pair.split(':')[1]}
                              {isHedgedPosition(group) && (
                                <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md">
                                  Hedged
                                </span>
                              )}
                              {group.originalTrades.length > 1 && (
                                <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md">
                                  x{group.originalTrades.length}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {group.type.toUpperCase()} {group.lots} Lots @ ${formatPrice(group.openPrice, group.pair)}
                            </div>
                            {group.status === 'open' && (
                              <div className="text-xs text-muted-foreground">
                                Current: ${formatPrice(currentPrice, group.pair)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "text-xs font-medium px-2 py-1 rounded-md",
                          isHedgedPosition(group) ? "bg-blue-500/10 text-blue-500" :
                          pnl > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          ${isHedgedPosition(group) ? getHedgedPnL(group, currentPrice).toFixed(2) : pnl.toFixed(2)}
                          {isHedgedPosition(group) && " (Locked)"}
                        </div>
                      </div>

                      {/* Expandable details */}
                      {group.originalTrades.length > 1 && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGroupExpansion(groupKey)}
                            className="text-xs w-full"
                          >
                            {isExpanded ? "Hide all trades" : "View all trades"}
                          </Button>
                          {isExpanded && (
                            <div className="mt-2 space-y-1">
                              {group.originalTrades.map(trade => (
                                <div 
                                  key={trade.id} 
                                  className="flex items-center justify-between text-xs p-2 bg-muted rounded-md"
                                >
                                  <span>{trade.id.slice(0, 8)}</span>
                                  <span>{trade.lots} Lots</span>
                                  <div className="flex items-center gap-3">
                                    <span>${calculatePnL(trade, currentPrice).toFixed(2)}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseTrade(trade.id);
                                      }}
                                      className="h-6 w-6 p-0 hover:bg-red-500/10 text-red-500 hover:text-red-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom row - Close button */}
                      {group.status === 'open' && onCloseTrade && (
                        <div className="-mx-3 -mb-3 mt-3 border-t border-[#525252]">
                          <Button
                            variant="ghost"
                            size="sm" 
                            onClick={() => handleCloseTrade(group.id)}
                            disabled={!isPriceLoaded[group.pair]}
                            className={cn(
                              "w-full rounded-none h-9 text-xs font-medium",
                              !isPriceLoaded[group.pair] && "opacity-50 cursor-not-allowed",
                              pnl > 0 
                                ? "bg-green-500/5 text-green-500 hover:bg-green-500/10 hover:text-green-600" 
                                : "bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                            )}
                          >
                            {!isPriceLoaded[group.pair] ? 'Loading...' : 'Close Position'}
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

      <AlertDialog open={!!tradeToClose} onOpenChange={() => setTradeToClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this position? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeClose}
              disabled={isClosing}
            >
              {isClosing ? "Closing..." : "Close Position"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
