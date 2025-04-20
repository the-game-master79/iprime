import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trade } from "@/types/trade";
import { XCircle } from "@phosphor-icons/react";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

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
  pairPrices: Record<string, { bid?: string; ask?: string }>;
  onCloseTrade?: (tradeId: string) => Promise<void>;
  calculatePnL: (trade: Trade, currentPrice: number) => number;
}

export function TradesSheet({
  open,
  onOpenChange,
  trades: openTrades, // Rename to clarify these are open trades
  pairPrices,
  onCloseTrade,
  calculatePnL
}: TradesSheetProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset to open tab when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setActiveTab('open');
    }
  }, [open]);

  // Fetch closed trades when tab changes to 'closed'
  useEffect(() => {
    const fetchClosedTrades = async () => {
      if (activeTab !== 'closed') return;
      
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: trades, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'closed')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedTrades: Trade[] = trades.map(trade => ({
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

        setClosedTrades(formattedTrades);
      } catch (error) {
        console.error('Error fetching closed trades:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClosedTrades();
  }, [activeTab]);

  // Use different trade sources based on active tab
  const displayedTrades = activeTab === 'closed' 
    ? closedTrades 
    : openTrades.filter(trade => trade.status === activeTab);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[92vh] p-0 flex flex-col overflow-hidden border-t-0 cursor-grab active:cursor-grabbing touch-none"
        aria-describedby="trades-sheet-description"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Trading Positions</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription id="trades-sheet-description">
            View and manage your active, pending and closed trading positions
          </DialogDescription>
        </VisuallyHidden>

        {/* Make entire drag handle area interactive */}
        <div className="relative pb-1 cursor-grab active:cursor-grabbing">
          {/* Visual indicator for dragging */}
          <div 
            role="presentation"
            className="absolute left-1/2 -translate-x-1/2 top-3 h-1 w-12 rounded-full bg-muted hover:bg-muted/80 transition-colors" 
          />
        </div>

        <div className="px-4 py-3 border-b bg-muted/50 backdrop-blur-sm">
          <Tabs defaultValue="open" onValueChange={(value) => setActiveTab(value as 'open' | 'pending' | 'closed')} className="flex-1">
            <TabsList className="grid w-full grid-cols-3 p-1 rounded-lg">
              <TabsTrigger value="open" className="rounded-md">
                Open ({openTrades.filter(t => t.status === 'open').length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-md">
                Pending ({openTrades.filter(t => t.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="closed" className="rounded-md">
                Closed ({closedTrades.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-muted-foreground animate-pulse">Loading trades...</div>
            </div>
          ) : displayedTrades.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-lg font-medium mb-2">No {activeTab} trades</div>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Your {activeTab} trades will appear here once you start trading
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {activeTab === 'closed' ? (
                <div className="space-y-8">
                  {groupTradesByDate(displayedTrades).map(([date, group]) => (
                    <div key={date} className="space-y-3">
                      <div className="sticky top-0 z-10 flex items-center justify-between px-2 py-2 bg-background/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{date}</div>
                          <Badge variant="secondary" className="h-5 text-xs font-normal">
                            {group.trades.length} trades
                          </Badge>
                        </div>
                        <div className={cn(
                          "font-mono text-sm font-medium px-2 py-0.5 rounded-md",
                          group.totalPnL > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          ${group.totalPnL.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {group.trades.map(trade => (
                          <div 
                            key={trade.id} 
                            className="flex items-center justify-between p-4 bg-card hover:bg-accent transition-colors rounded-xl border shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "mt-1.5 h-2 w-2 rounded-full ring-2 ring-offset-2",
                                trade.type === 'buy' 
                                  ? "bg-blue-500 ring-blue-500/20" 
                                  : "bg-red-500 ring-red-500/20"
                              )} />
                              <div>
                                <div className="font-medium">{trade.pair.split(':')[1]}</div>
                                <div className="text-sm text-muted-foreground">
                                  {trade.type.toUpperCase()} {trade.lots} Lots
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Entry @ ${trade.openPrice.toFixed(trade.pair.includes('JPY') ? 3 : 5)}
                                </div>
                              </div>
                            </div>
                            <div className={cn(
                              "text-sm font-medium font-mono px-2 py-1 rounded-md",
                              trade.pnl > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            )}>
                              ${trade.pnl?.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                displayedTrades.map(trade => {
                  const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
                  const pnl = trade.status === 'closed' ? trade.pnl : calculatePnL(trade, currentPrice);
                  
                  return (
                    <div 
                      key={trade.id} 
                      className="flex flex-col gap-4 p-4 bg-card hover:bg-accent transition-colors rounded-xl border shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full ring-2 ring-offset-2",
                            trade.type === 'buy' 
                              ? "bg-blue-500 ring-blue-500/20" 
                              : "bg-red-500 ring-red-500/20"
                          )} />
                          <div className="font-medium">{trade.pair.split(':')[1]}</div>
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-md text-sm font-medium font-mono",
                          pnl > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          ${pnl.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="space-y-1">
                          <div className="text-muted-foreground">
                            {trade.type.toUpperCase()} {trade.lots} Lots
                          </div>
                          <div className="text-muted-foreground">
                            Entry @ ${trade.openPrice.toFixed(trade.pair.includes('JPY') ? 3 : 5)}
                          </div>
                          <div className="text-muted-foreground">
                            Current: ${currentPrice.toFixed(trade.pair.includes('JPY') ? 3 : 5)}
                          </div>
                        </div>
                        {trade.status === 'open' && onCloseTrade && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onCloseTrade(trade.id)}
                            className="h-8 px-3 text-xs font-medium"
                          >
                            Close Position
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
