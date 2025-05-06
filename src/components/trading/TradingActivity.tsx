import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Trade, PriceData, TradingPair } from "@/types/trading";
import { calculatePnL } from "@/utils/trading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface TradingActivityProps {
  trades: Trade[];
  onCloseTrade: (tradeId: string) => void;
  userBalance: number;
  currentPrices: Record<string, PriceData>; // Add this prop
  tradingPairs: TradingPair[]; // Add this prop
}

const ITEMS_PER_PAGE = 10;

export const TradingActivity = ({ 
  trades, 
  onCloseTrade,
  userBalance = 0,
  currentPrices, // Add this prop
  tradingPairs, // Add this prop
}: TradingActivityProps) => {
  const [isExpanded, setIsExpanded] = useState(true); // Change this line to default to true
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Remove WebSocket related state and effects

  // Add new helper to merge trades
  const mergeTrades = (trades: Trade[]) => {
    const mergedMap = trades.reduce((acc, trade) => {
      // Create a unique key including the trade ID to avoid duplicates
      const key = `${trade.pair}-${trade.type}-${trade.id}`;
      if (!acc[key]) {
        acc[key] = {
          ...trade,
          lots: 0,
          margin_amount: 0,
          originalTrades: [],
          mergeKey: key // Store the key for later use
        };
      }
      acc[key].lots += trade.lots;
      acc[key].margin_amount += (trade.margin_amount || 0);
      acc[key].originalTrades.push(trade);
      return acc;
    }, {} as Record<string, Trade & { originalTrades: Trade[]; mergeKey: string }>);

    return Object.values(mergedMap);
  };

  // Add copy functionality helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Position ID copied to clipboard"
    });
  };

  // Update filteredTrades to properly handle closed trades
  const filteredTrades = useMemo(() => {
    const openTrades = trades.filter(t => 
      t.status === 'open' && 
      t.orderType !== 'limit'
    );

    const pendingTrades = trades.filter(t => 
      t.status === 'pending' || 
      (t.status === 'open' && t.orderType === 'limit')
    );

    const closedTrades = trades.filter(t => t.status === 'closed');

    return {
      open: mergeTrades(openTrades).map(t => ({
        ...t,
        currentPrice: currentPrices[t.pair]?.bid || t.openPrice
      })),
      pending: pendingTrades,
      closed: closedTrades
    };
  }, [trades, currentPrices]);

  const { totalPnL } = useMemo(() => {
    return filteredTrades.open.reduce((acc, trade) => {
      const currentPrice = parseFloat(currentPrices[trade.pair]?.price || '0');
      const pnl = calculatePnL(trade, currentPrice);
      return { totalPnL: acc.totalPnL + pnl };
    }, { totalPnL: 0 });
  }, [filteredTrades.open, currentPrices]);

  const { totalMarginUsed, marginLevel, adjustedBalance } = useMemo(() => {
    const totalPnL = trades
      .filter(t => t.status === 'open')
      .reduce((acc, trade) => {
        const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
        return acc + calculatePnL(trade, currentPrice);
      }, 0);

    const marginUsed = trades
      .filter(t => t.status === 'open' || t.status === 'pending')
      .reduce((total, trade) => {
        return total + (trade.margin_amount || 0);
      }, 0);

    const adjustedBal = userBalance + totalPnL;
    const level = marginUsed > 0 ? ((adjustedBal / marginUsed) * 100) : 100;

    return {
      totalMarginUsed: marginUsed,
      marginLevel: level,
      adjustedBalance: adjustedBal
    };
  }, [trades, userBalance, currentPrices]);

  // Move useEffect before conditional return
  useEffect(() => {
    const channel = supabase.channel('trade-executions')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trades',
        filter: `status=eq.open`,
      }, (payload) => {
        const executedTrade = payload.new as Trade;
        if (executedTrade.orderType === 'limit' && executedTrade.status === 'open') {
          toast({
            title: "Trade Executed",
            description: `${executedTrade.type === 'buy' ? 'Buy' : 'Sell'} order executed at ${executedTrade.openPrice}`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const freeMargin = adjustedBalance - totalMarginUsed;
  const displayedTrades = filteredTrades[activeTab];

  // Add pagination helpers
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    // Map trades to include current prices before pagination
    const tradesWithPrices = displayedTrades.map(trade => {
      const currentPrice = trade.status === 'open' 
        ? parseFloat(currentPrices[trade.pair]?.bid || trade.openPrice.toString())
        : trade.closePrice || trade.openPrice;
      
      const pnl = trade.status === 'closed'
        ? trade.pnl || 0
        : trade.status === 'open'
          ? calculatePnL(trade, currentPrice)
          : 0;
  
      return {
        ...trade,
        currentPrice,
        pnl
      };
    });
    return tradesWithPrices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayedTrades, currentPage, currentPrices]);

  const totalPages = Math.ceil(displayedTrades.length / ITEMS_PER_PAGE);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Update handleCloseTrade to handle merged positions
  const handleCloseTrade = async (mergedTrade: Trade & { originalTrades?: Trade[] }) => {
    try {
      if (mergedTrade.originalTrades) {
        // Close all trades in the merged position
        for (const trade of mergedTrade.originalTrades) {
          await onCloseTrade(trade.id);
        }
      } else {
        await onCloseTrade(mergedTrade.id);
      }
    } catch (error) {
      toast({
        variant: "destructive", 
        title: "Error",
        description: "Failed to close trade"
      });
    }
  };

  // Add handleCloseAllTrades function before the return statement
  const handleCloseAllTrades = async () => {
    try {
      const openTrades = trades.filter(t => t.status === 'open');
      
      // Show confirmation dialog
      if (!window.confirm(`Are you sure you want to close all ${openTrades.length} open trades?`)) {
        return;
      }

      // Close all trades sequentially
      for (const trade of openTrades) {
        await onCloseTrade(trade.id);
      }

      toast({
        title: "Success",
        description: `Successfully closed ${openTrades.length} trades`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close all trades"
      });
    }
  };

  // Update isHedgedPosition to check all trades in pair
  const isHedgedPosition = (trade: Trade) => {
    if (trade.status !== 'open') return false;
    
    // For non-expanded trades, check against all trades
    const oppositeType = trade.type === 'buy' ? 'sell' : 'buy';
    return trades
      .filter(t => t.status === 'open' && t.pair === trade.pair)
      .some(t => 
        t.id !== trade.id && 
        t.type === oppositeType && 
        t.lots === trade.lots
      );
  };

  // Only return null after all hooks
  if (trades.length === 0) {
    return null;
  }

  const cryptoDecimals: Record<string, number> = {
    'BNBUSDT': 2,
    'DOTUSDT': 3,
    'ETHUSDT': 2,
    'DOGEUSDT': 5,
    'BTCUSDT': 2,
    'TRXUSDT': 4,
    'LINKUSDT': 2,
    'ADAUSDT': 4,
    'SOLUSDT': 2
  };

  const forexDecimals: Record<string, number> = {
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
      return cryptoDecimals[base] ?? 5;
    }

    if (symbol.includes('FX:')) {
      const base = symbol.replace('FX:', '').replace('/', '');
      return forexDecimals[base] ?? 5;
    }
    
    return 5; // Default for unknown symbols
  };

  // Update getOrderInfo to only show limit price for pending orders
  const getOrderInfo = (trade: Trade) => {
    if (trade.status === 'pending' && trade.orderType === 'limit' && trade.limitPrice) {
      const decimals = getDecimalPlaces(trade.pair);
      return `@ $${trade.limitPrice.toFixed(decimals)}`;
    }
    return ''; // Return empty string since we'll show type in badge
  };

  return (
    <>
      <div className={cn(
        "bg-card border-t border-[#525252] shadow-lg h-[300px] flex flex-col",
        !isExpanded && "h-10"
      )}>
        <div 
          className="h-10 flex items-center justify-between px-4 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'open' | 'pending' | 'closed')}>
              <TabsList className="h-7">
                <TabsTrigger value="open" className="text-xs">
                  Open ({filteredTrades.open.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">
                  Pending ({filteredTrades.pending.length})
                </TabsTrigger>
                <TabsTrigger value="closed" className="text-xs">
                  Closed ({filteredTrades.closed.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === 'open' && (
              <div className="flex items-center gap-4">
                <div className={cn(
                  "text-sm font-mono font-medium",
                  totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-red-500" : ""
                )}>
                  {totalPnL.toFixed(2)} USD
                </div>
                {filteredTrades.open.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseAllTrades();
                    }}
                    className="h-7 px-3 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Close All
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <ScrollArea className="flex-1">
            <div className="w-full min-w-max p-4">
              <table className="w-full">
                <thead className="text-xs text-muted-foreground font-medium">
                  <tr className="border-b border-[#525252]">
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Volume</th>
                    <th className="text-right p-2">Open Price</th>
                    <th className="text-right p-2">{activeTab === 'closed' ? 'Close Price' : 'Current Price'}</th>
                    <th className="text-right p-2">Margin Used</th>
                    <th className="text-left p-2">Position ID</th>
                    <th className="text-left p-2">Open Time</th>
                    {activeTab !== 'pending' && <th className="text-right p-2">P&L</th>}
                    {activeTab !== 'closed' && <th className="text-right p-2">Action</th>}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paginatedTrades.map(trade => {
                    const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
                    // Calculate PnL based on trade status
                    const pnl = trade.status === 'closed' 
                      ? trade.pnl || 0
                      : trade.status === 'open'
                        ? calculatePnL(trade, currentPrice)
                        : 0;

                    const pairSymbol = trade.pair.split(':')[1];
                    const openTime = new Date(trade.openTime).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    });
                    const decimals = getDecimalPlaces(trade.pair);
                    const symbolName = trade.pair.includes('BINANCE:') 
                      ? pairSymbol.toLowerCase().replace('usdt', '')
                      : pairSymbol.toLowerCase().replace('/', '-');
                    
                    const imageUrl = `https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/${symbolName}.svg`;
                    
                    const isExpanded = expandedRows.has(trade.pair + trade.type);
                    const hasMultipleTrades = trade.originalTrades?.length > 1;
                    
                    return (
                      <React.Fragment key={trade.mergeKey || trade.id}>
                        <tr 
                          className={cn(
                            "border-b border-[#525252] hover:bg-accent/50",
                            hasMultipleTrades && "cursor-pointer"
                          )}
                          onClick={() => hasMultipleTrades && toggleRowExpansion(trade.mergeKey || trade.id)}
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <img 
                                src={imageUrl}
                                className="h-5 w-5"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg';
                                }}
                              />
                              {hasMultipleTrades && (
                                <Badge variant="outline" className="text-xs">
                                  x{trade.originalTrades.length}
                                </Badge>
                              )}
                              <span>{pairSymbol}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {trade.status === 'pending' ? (
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">Pending</Badge>
                              ) : (
                                <>
                                  <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'} className="text-xs">
                                    {trade.type.toUpperCase()}
                                  </Badge>
                                  {isHedgedPosition(trade) && (
                                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                                      Hedged
                                    </Badge>
                                  )}
                                </>
                              )}
                              {getOrderInfo(trade)}
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <Badge variant="outline" className="font-mono">
                              {trade.lots}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{trade.openPrice.toFixed(decimals)}</td>
                          <td className="p-2 text-right font-mono">
                            {trade.status === 'closed' 
                              ? (trade.closePrice || 0).toFixed(decimals)
                              : trade.status === 'pending' 
                                ? '-' 
                                : trade.currentPrice.toFixed(decimals)}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {trade.margin_amount?.toFixed(2) || '0.00'} USD
                          </td>
                          <td className="p-2 font-mono">
                            <div className="flex items-center gap-2">
                              <span>{trade.id.slice(0, 8)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyId(trade.id);
                                }}
                                className="h-6 w-6 p-0 hover:bg-accent"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-2">{openTime}</td>
                          {activeTab !== 'pending' && (
                            <td className="p-2 text-right">
                              <div className={cn(
                                "font-mono",
                                pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : ""
                              )}>
                                {pnl.toFixed(2)} USD
                              </div>
                            </td>
                          )}
                          {activeTab !== 'closed' && (
                            <td className="p-2 text-right">
                              {(trade.status === 'pending' || trade.status === 'open') && (
                                <Button
                                  variant="ghost"
                                  size="sm" 
                                  onClick={() => handleCloseTrade(trade)}
                                  className={cn(
                                    "h-7 px-2",
                                    trade.status === 'pending' 
                                      ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                                      : "text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                  )}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>

                        {/* Expanded details row */}
                        {hasMultipleTrades && isExpanded && (
                          <tr className="bg-accent/30" key={`expanded-${trade.mergeKey || trade.id}`}>
                            <td colSpan={11} className="p-1">
                              <table className="w-full text-sm">
                                <thead className="text-xs text-muted-foreground">
                                  <tr>
                                    <th className="text-left p-1">ID</th>
                                    <th className="text-right p-1">Volume</th>
                                    <th className="text-right p-1">Open Price</th>
                                    <th className="text-right p-1">Current Price</th>
                                    <th className="text-right p-1">Margin</th>
                                    <th className="text-right p-1">P&L</th>
                                    <th className="text-right p-1">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {trade.originalTrades.map(subTrade => {
                                    const subPnl = calculatePnL(subTrade, currentPrice);
                                    const isSubTradeHedged = trade.originalTrades.some(t => 
                                      t.id !== subTrade.id &&
                                      t.pair === subTrade.pair && 
                                      t.type === (subTrade.type === 'buy' ? 'sell' : 'buy') &&
                                      t.lots === subTrade.lots
                                    );
                                    
                                    return (
                                      <tr key={subTrade.id} className="border-t border-[#525252]/50">
                                        <td className="p-1 font-mono">
                                          <div className="flex items-center gap-2">
                                            {subTrade.id.slice(0, 8)}
                                            {isSubTradeHedged && (
                                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                Hedged
                                              </Badge>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-1 text-right">{subTrade.lots}</td>
                                        <td className="p-1 text-right">{subTrade.openPrice.toFixed(decimals)} USD</td>
                                        <td className="p-1 text-right">{currentPrice.toFixed(decimals)} USD</td>
                                        <td className="p-1 text-right">{subTrade.margin_amount?.toFixed(2)} USD</td>
                                        <td className={cn(
                                          "p-1 text-right font-mono",
                                          subPnl > 0 ? "text-green-500" : "text-red-500"
                                        )}>{subPnl.toFixed(2)} USD</td>
                                        <td className="p-1 text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCloseTrade(subTrade);
                                            }}
                                            className="h-7 px-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Add pagination controls */}
              {(activeTab === 'closed' || activeTab === 'pending') && displayedTrades.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-2 py-4 border-t border-[#525252]">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min(currentPage * ITEMS_PER_PAGE, displayedTrades.length)} of {displayedTrades.length} trades
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Updated Margin Information container - removed leverage section */}
      <div className="bg-card border-t border-[#525252] flex items-center px-4 py-2">
        <div className="flex items-center justify-between w-full gap-8">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Balance:</span>
            <div className="font-mono text-sm">{(userBalance || 0).toFixed(2)} USD</div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Used Margin:</span>
            <div className="font-mono text-sm">{totalMarginUsed.toFixed(2)} USD</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Free Margin:</span>
            <div className={cn(
              "font-mono text-sm",
              freeMargin < 0 ? "text-red-500" : "text-green-500"
            )}>
              {freeMargin.toFixed(2)} USD
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Margin Level:</span>
            <div className={cn(
              "font-mono text-sm",
              marginLevel < 100 ? "text-red-500" : "text-green-500"
            )}>
              {marginLevel.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
