import { useState, useEffect } from "react";
import { cryptoDecimals, forexDecimals } from "@/config/decimals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowCircleUpRight } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { wsManager } from '@/services/websocket-manager';
import { calculatePnL } from "@/utils/trading";
import { cn } from "@/lib/utils";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Topbar } from "@/components/shared/Topbar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { NavigationFooter } from "@/components/shared/NavigationFooter";

interface Trade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  status: 'open' | 'pending' | 'closed';
  openPrice: number;
  closePrice?: number;
  lots: number;
  leverage: number;
  pnl?: number;
  created_at: string;
  closed_at?: string;
  margin_amount: number;
  image_url: string;  // Add this field
}

interface PriceData {
  bid: string;
  ask: string;
}

const ITEMS_PER_PAGE = 10;

// Update the helper functions section after interfaces
const getDecimalPlaces = (pair: string): number => {
  if (pair.includes('BINANCE:')) {
    const symbol = pair.replace('BINANCE:', '');
    return cryptoDecimals[symbol] ?? 5;
  }
  
  if (pair.includes('FX:')) {
    const symbol = pair.replace('FX:', '').replace('/', '');
    if (symbol === 'XAUUSD') return 2;
    return forexDecimals[symbol] ?? 5;
  }
  
  return 5;
};

const formatPrice = (price: number, pair: string) => {
  if (!price) return '0.00000';
  return price.toFixed(getDecimalPlaces(pair));
};

// Add formatLots helper function after other helper functions
const formatLots = (lots: number): string => {
  return lots.toFixed(2);
};

// Add formatPairDisplay helper function after other helper functions
const formatPairDisplay = (pair: string): string => {
  if (pair.startsWith('BINANCE:')) {
    return pair.replace('BINANCE:', '');
  }
  if (pair.startsWith('FX:')) {
    return pair.replace('FX:', '').replace('/', '');
  }
  return pair;
};

// Add this helper function after other helper functions
const groupTradesByDate = (trades: Trade[]) => {
  return trades.reduce((acc, trade) => {
    const date = new Date(trade.closed_at || trade.created_at).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    if (!acc[date]) {
      acc[date] = {
        trades: [],
        totalPnL: 0,
      };
    }
    
    acc[date].trades.push(trade);
    acc[date].totalPnL += trade.pnl || 0;
    
    return acc;
  }, {} as Record<string, { trades: Trade[], totalPnL: number }>);
};

export default function Account() {
  const navigate = useNavigate();
  const [userBalance, setUserBalance] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState('open');
  const [currentPage, setCurrentPage] = useState(1);
  const [pairPrices, setPairPrices] = useState<Record<string, PriceData>>({});
  const [totalPnL, setTotalPnL] = useState(0);
  const [closedPnL, setClosedPnL] = useState(0); // Add this state
  const [userProfile, setUserProfile] = useState<{
    withdrawal_wallet: number;
    multiplier_bonus: number;
  } | null>(null);
  const [pairImages, setPairImages] = useState<Record<string, string>>({});
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Update fetch to get both wallet and bonus
  useEffect(() => {
    const fetchUserBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('withdrawal_wallet, multiplier_bonus')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
        setUserBalance(data.withdrawal_wallet + (data.multiplier_bonus || 0));
      }
    };

    fetchUserBalance();
  }, []);

  // Add new function to fetch trading pair images
  useEffect(() => {
    const fetchPairImages = async () => {
      const { data: tradingPairs, error } = await supabase
        .from('trading_pairs')
        .select('symbol, image_url');
      
      if (error) {
        console.error('Error fetching trading pair images:', error);
        return;
      }

      // Create a map of symbol -> image_url
      const imageMap = tradingPairs.reduce((acc, pair) => ({
        ...acc,
        [pair.symbol]: pair.image_url
      }), {});

      setPairImages(imageMap);
    };

    fetchPairImages();
  }, []);

  // WebSocket subscription for price updates - modified to be persistent
  useEffect(() => {
    // Get all unique pairs from trades regardless of status
    const pairs = [...new Set(trades.map(t => t.pair))];

    const unsubscribe = wsManager.subscribe((symbol, data) => {
      setPairPrices(prev => ({
        ...prev,
        [symbol]: data
      }));
    });

    if (pairs.length > 0) {
      // Pass true as second argument to make connections persistent
      wsManager.watchPairs(pairs);
    }

    return () => {
      unsubscribe();
      // Don't unwatchPairs here to keep connections alive
    };
  }, [trades]);

  // Update fetch trades effect to preserve WebSocket connections
  useEffect(() => {
    const fetchTrades = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all trades regardless of status to maintain price updates
      const { data: allTrades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      if (allTrades) {
        // Filter trades based on active tab for display
        const filteredTrades = allTrades.filter(t => t.status === activeTab);
        setTrades(filteredTrades.map(trade => ({
          ...trade,
          openPrice: trade.open_price,
          closePrice: trade.close_price,
          image_url: pairImages[trade.pair]
        })));
      }
    };

    fetchTrades();
  }, [activeTab, pairImages]);

  // Calculate total PnL for open trades
  useEffect(() => {
    const openTrades = trades.filter(t => t.status === 'open');
    const total = openTrades.reduce((sum, trade) => {
      const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      return sum + calculatePnL(trade, currentPrice);
    }, 0);

    setTotalPnL(total);
  }, [trades, pairPrices]);

  // Add useEffect to calculate closed trades P&L
  useEffect(() => {
    if (activeTab === 'closed') {
      const total = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      setClosedPnL(total);
    }
  }, [trades, activeTab]);

  // Pagination
  const totalPages = Math.ceil(trades.length / ITEMS_PER_PAGE);
  const paginatedTrades = trades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTradeClick = (trade: Trade) => {
    if (trade.status === 'closed') {
      setSelectedTrade(trade);
      setIsDetailsOpen(true);
    } else {
      // Navigate to chart view for the selected pair
      navigate(`/trade/chart/${encodeURIComponent(trade.pair)}`);
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      const closePrice = trade.type === 'buy'
        ? parseFloat(pairPrices[trade.pair]?.bid || '0')
        : parseFloat(pairPrices[trade.pair]?.ask || '0');

      if (!closePrice) {
        throw new Error('No valid close price available');
      }

      // Calculate PnL
      const pnl = calculatePnL(trade, closePrice);

      // Call close_trade function
      const { data: newBalance, error } = await supabase.rpc('close_trade', {
        p_trade_id: tradeId,
        p_close_price: closePrice,
        p_pnl: pnl
      });

      if (error) throw error;

      // Update local state
      setTrades(prev => prev.filter(t => t.id !== tradeId));

      // Update balance if returned
      if (typeof newBalance === 'number') {
        setUserBalance(newBalance);
      }

      toast({
        title: "Success",
        description: `Trade closed with P&L: $${pnl.toFixed(2)}`
      });

    } catch (error: any) {
      console.error('Error closing trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to close trade" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Account" variant="minimal" />

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Balance Card */}
        <Card className="bg-[#141414] border border-[#525252] mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Badges */}
              <div className="flex gap-2">
                <Badge variant="outline" className="rounded-sm bg-[#282828] text-primary">Pro</Badge>
                <Badge variant="outline" className="rounded-sm bg-[#282828] text-primary">MT5</Badge>
                <Badge variant="outline" className="rounded-sm bg-[#282828] text-primary">Web</Badge>
              </div>
              
              {/* Balance */}
              <div className="flex flex-col">
                <span className="text-sm text-white/80 mb-1">Available to trade</span>
                <span className="text-2xl font-semibold text-white">
                  ${userBalance.toLocaleString()}
                </span>
                <div className="flex flex-col text-xs text-white/80 mt-1">
                  <span>Bonus: ${(userProfile?.multiplier_bonus || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => navigate('/deposit')}
                >
                  <PlusCircle className="h-5 w-5 mr-2" weight="regular" />
                  Add funds
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => navigate('/withdrawals')}
                >
                  <ArrowCircleUpRight className="h-5 w-5 mr-2" weight="regular" />
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Activity */}
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="justify-start">
            <TabsTrigger value="open">
              Open ({trades.filter(t => t.status === 'open').length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({trades.filter(t => t.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({trades.filter(t => t.status === 'closed').length})
            </TabsTrigger>
          </TabsList>

          {/* Only show total PnL for open and closed tabs when there are trades */}
          {activeTab !== 'pending' && trades.length > 0 && (
            <div className="flex items-center justify-between pt-4 px-2">
              <span className="text-sm text-muted-foreground">Total P&L</span>
              <span className={cn(
                "text-lg font-mono font-medium",
                activeTab === 'closed' ? 
                  (closedPnL > 0 ? "text-green-500" : "text-red-500") :
                  (totalPnL > 0 ? "text-green-500" : "text-red-500")
              )}>
                ${(activeTab === 'closed' ? closedPnL : totalPnL).toFixed(2)}
              </span>
            </div>
          )}

          <TabsContent value={activeTab} className="p-4">
            {paginatedTrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {activeTab} trades found
              </div>
            ) : (
              <div className="space-y-2">
                {activeTab === 'closed' ? (
                  Object.entries(groupTradesByDate(paginatedTrades))
                    .map(([date, group]) => (
                      <div key={date} className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                          <div className="font-medium text-sm text-muted-foreground">{date}</div>
                          <div className={cn(
                            "font-mono text-sm font-medium",
                            group.totalPnL > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            ${group.totalPnL.toFixed(2)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {group.trades.map(trade => {
                            const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
                            const pnl = trade.status === 'open' 
                              ? calculatePnL(trade, currentPrice)
                              : trade.pnl || 0;

                            return (
                              <div
                                key={trade.id}
                                className={cn(
                                  "flex items-start justify-between p-2 border border-[#525252] rounded-lg",
                                  "cursor-pointer hover:bg-accent/50 transition-colors" // Remove condition to make all trades clickable
                                )}
                                onClick={() => handleTradeClick(trade)}
                              >
                                <div className="flex items-start gap-3">
                                  <img
                                    src={trade.image_url}
                                    className="h-6 w-6 mt-1"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className="space-y-1">
                                    <div className="font-medium text-foreground">
                                      {formatPairDisplay(trade.pair)}
                                    </div>
                                    <div className="text-sm">
                                      <span className={trade.type === 'buy' ? "text-blue-500" : "text-red-500"}>
                                        {trade.type.toUpperCase()}
                                      </span>
                                      <span className="text-foreground"> {formatLots(trade.lots)} lots at {
                                        trade.openPrice 
                                          ? formatPrice(trade.openPrice, trade.pair)
                                          : formatPrice(trade.openPrice, trade.pair)
                                      }</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className={cn(
                                    "font-mono font-medium",
                                    pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : ""
                                  )}>
                                    ${pnl.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-[#7d7d7d]">
                                    {trade.status === 'open' ? (
                                      `${formatPrice(parseFloat(pairPrices[trade.pair]?.bid || '0'), trade.pair)}`
                                    ) : trade.status === 'closed' ? (
                                      `${formatPrice(trade.closePrice || 0, trade.pair)}`
                                    ) : (
                                      <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                ) : (
                  // Existing code for open/pending trades
                  paginatedTrades.map(trade => {
                    const currentPrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
                    const pnl = trade.status === 'open' 
                      ? calculatePnL(trade, currentPrice)
                      : trade.pnl || 0;

                    return (
                      <div
                        key={trade.id}
                        className={cn(
                          "flex items-start justify-between p-2 border border-[#525252] rounded-lg",
                          "cursor-pointer hover:bg-accent/50 transition-colors" // Remove condition to make all trades clickable
                        )}
                        onClick={() => handleTradeClick(trade)}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={trade.image_url}
                            className="h-6 w-6 mt-1"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">
                              {formatPairDisplay(trade.pair)}
                            </div>
                            <div className="text-sm">
                              <span className={trade.type === 'buy' ? "text-blue-500" : "text-red-500"}>
                                {trade.type.toUpperCase()}
                              </span>
                              <span className="text-foreground"> {formatLots(trade.lots)} lots at {
                                trade.openPrice 
                                  ? formatPrice(trade.openPrice, trade.pair)
                                  : formatPrice(trade.openPrice, trade.pair)
                              }</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={cn(
                            "font-mono font-medium",
                            pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : ""
                          )}>
                            ${pnl.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {trade.status === 'open' ? (
                              `${formatPrice(parseFloat(pairPrices[trade.pair]?.bid || '0'), trade.pair)}`
                            ) : trade.status === 'closed' ? (
                              `${formatPrice(trade.closePrice || 0, trade.pair)}`
                            ) : (
                              <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pagination controls */}
                {(activeTab === 'closed' || activeTab === 'pending') && trades.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4 pb-10">
                    <div className="text-sm text-muted-foreground">
                      Showing {Math.min(currentPage * ITEMS_PER_PAGE, trades.length)} of {trades.length} trades
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          {currentPage > 1 && (
                            <PaginationPrevious onClick={() => setCurrentPage(p => p - 1)} />
                          )}
                        </PaginationItem>
                        <PaginationItem>
                          {currentPage < totalPages && (
                            <PaginationNext onClick={() => setCurrentPage(p => p + 1)} />
                          )}
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>

      {/* Trade Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="sm:max-w-[400px]">
          <SheetHeader className="pb-4">
            <SheetTitle>Trade #{selectedTrade?.id.slice(0, 8)}</SheetTitle>
          </SheetHeader>
          
          {selectedTrade && (
            <div className="space-y-6">
              {/* Trade Header */}
              <div className="flex items-center gap-3">
                <img
                  src={selectedTrade.image_url}
                  alt={selectedTrade.pair}
                  className="h-8 w-8"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div>
                  <h3 className="font-medium">{formatPairDisplay(selectedTrade.pair)}</h3>
                  <p className={cn(
                    "text-sm",
                    selectedTrade.type === 'buy' ? "text-blue-500" : "text-red-500"
                  )}>
                    {selectedTrade.type.toUpperCase()}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Trade Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Lot Size</p>
                  <p className="font-medium">{formatLots(selectedTrade.lots)} lots</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Leverage</p>
                  <p className="font-medium">{selectedTrade.leverage}x</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Open Price</p>
                  <p className="font-medium font-mono">${formatPrice(selectedTrade.openPrice, selectedTrade.pair)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Close Price</p>
                  <p className="font-medium font-mono">
                    ${formatPrice(selectedTrade.closePrice || 0, selectedTrade.pair)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">P&L</p>
                  <p className={cn(
                    "font-medium font-mono",
                    (selectedTrade.pnl || 0) > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    ${(selectedTrade.pnl || 0).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Margin Used</p>
                  <p className="font-medium font-mono">${selectedTrade.margin_amount.toFixed(2)}</p>
                </div>
              </div>

              <Separator />

              {/* Trade Times */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Opened at</span>
                  <span className="text-sm">{new Date(selectedTrade.created_at).toLocaleString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}</span>
                </div>
                {selectedTrade.closed_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Closed at</span>
                    <span className="text-sm">{new Date(selectedTrade.closed_at).toLocaleString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <NavigationFooter />
    </div>
  );
}
