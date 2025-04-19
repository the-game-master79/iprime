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
        className="h-[80vh] p-0 flex flex-col"
        aria-describedby="trades-sheet-description"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Trade History</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription id="trades-sheet-description">
            View and manage your active, pending and closed trades
          </DialogDescription>
        </VisuallyHidden>
        
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <Tabs defaultValue="open" onValueChange={(value) => setActiveTab(value as 'open' | 'pending' | 'closed')} className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="open">
                Open ({openTrades.filter(t => t.status === 'open').length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({openTrades.filter(t => t.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({closedTrades.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <XCircle className="h-5 w-5" weight="bold" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-muted-foreground">Loading trades...</div>
            </div>
          ) : displayedTrades.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-muted-foreground mb-2">No {activeTab} trades</div>
              <p className="text-sm text-muted-foreground">
                Your {activeTab} trades will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === 'closed' ? (
                // Show date grouped trades for closed tab
                <div className="space-y-6">
                  {groupTradesByDate(displayedTrades).map(([date, group]) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{date}</div>
                          <Badge variant="outline" className="h-5 text-xs">
                            {group.trades.length} trades
                          </Badge>
                        </div>
                        <div className={cn(
                          "font-mono text-sm font-medium",
                          group.totalPnL > 0 ? "text-green-500" : "text-red-500"
                        )}>
                          ${group.totalPnL.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {group.trades.map(trade => (
                          <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg relative">
                            <div className={cn(
                              "absolute top-4 left-4 h-2 w-2 rounded-full",
                              trade.type === 'buy' ? "bg-blue-500" : "bg-red-500"
                            )} />
                            <div className="pl-5">
                              <div className="font-medium">{trade.pair.split(':')[1]}</div>
                              <div className="text-sm text-muted-foreground">
                                {trade.type.toUpperCase()} {trade.lots} Lots @ ${trade.openPrice}
                              </div>
                            </div>
                            <div className={cn(
                              "font-mono text-sm",
                              trade.pnl > 0 ? "text-green-500" : "text-red-500"
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
                // Show regular list for open/pending tabs
                displayedTrades.map(trade => {
                  const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
                  const pnl = trade.status === 'closed' ? trade.pnl : calculatePnL(trade, currentPrice);
                  
                  return (
                    <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg relative">
                      <div className={cn(
                        "absolute top-4 left-4 h-2 w-2 rounded-full",
                        trade.type === 'buy' ? "bg-blue-500" : "bg-red-500"
                      )} />
                      <div className="pl-5">
                        <div className="font-medium">{trade.pair.split(':')[1]}</div>
                        <div className="text-sm text-muted-foreground">
                          {trade.type.toUpperCase()} {trade.lots} Lots @ ${trade.openPrice}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Current: ${currentPrice.toFixed(trade.pair.includes('JPY') ? 3 : 5)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "font-mono",
                          pnl > 0 ? "text-green-500" : "text-red-500"
                        )}>
                          ${pnl.toFixed(2)}
                        </div>
                        {trade.status === 'open' && onCloseTrade && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onCloseTrade(trade.id)}
                          >
                            Close
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
