import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Trade, PriceData } from "@/types/trading";
import { calculatePnL, calculatePipValue } from "@/utils/trading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface TradingActivityProps {
  trades: Trade[];
  onCloseTrade: (tradeId: string) => void;
  userBalance: number;
  currentPrices: Record<string, PriceData>; // Add this prop
}

const ITEMS_PER_PAGE = 10;

export const TradingActivity = ({ 
  trades, 
  onCloseTrade,
  userBalance = 0,
  currentPrices, // Add this prop
}: TradingActivityProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [currentPage, setCurrentPage] = useState(1);

  // Remove WebSocket related state and effects
  
  // Update filteredTrades to use currentPrices instead of localPrices
  const filteredTrades = useMemo(() => ({
    open: trades.filter(t => t.status === 'open').map(t => ({
      ...t,
      currentPrice: currentPrices[t.pair]?.bid || t.openPrice
    })),
    pending: trades.filter(t => t.status === 'pending'),
    closed: trades.filter(t => t.status === 'closed')
  }), [trades, currentPrices]);

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
    return displayedTrades.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayedTrades, currentPage]);

  const totalPages = Math.ceil(displayedTrades.length / ITEMS_PER_PAGE);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleCloseTrade = async (tradeId: string) => {
    try {
      await onCloseTrade(tradeId);
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

  // Update helper to format order info with proper decimals
  const getOrderInfo = (trade: Trade) => {
    if (trade.status === 'pending' && trade.orderType === 'limit' && trade.limitPrice) {
      const decimals = getDecimalPlaces(trade.pair);
      return `Limit ${trade.type.toUpperCase()} @ $${trade.limitPrice.toFixed(decimals)}`;
    }
    return `${trade.type.toUpperCase()} ${trade.lots} Lots`;
  };

  return (
    <>
      <div className={cn(
        "bg-card border-t shadow-lg h-[300px] flex flex-col",
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
                  ${totalPnL.toFixed(2)}
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
                  <tr className="border-b">
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Volume</th>
                    <th className="text-right p-2">Open Price</th>
                    <th className="text-right p-2">{activeTab === 'closed' ? 'Close Price' : 'Current Price'}</th>
                    <th className="text-right p-2">Margin Used</th>
                    <th className="text-right p-2">Pip Value</th>
                    <th className="text-left p-2">Position ID</th>
                    <th className="text-left p-2">Open Time</th>
                    {activeTab !== 'pending' && <th className="text-right p-2">P&L</th>}
                    <th className="text-right p-2">Action</th>
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
                    
                    return (
                      <tr key={trade.id} className="border-b border-border/50 hover:bg-accent/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <img 
                              src={imageUrl}
                              className="h-5 w-5"
                              onError={(e) => {
                                e.currentTarget.src = 'https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/generic.svg';
                              }}
                            />
                            <span>{pairSymbol}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {trade.status === 'pending' ? (
                              <span className="text-yellow-500">Pending</span>
                            ) : (
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                trade.type === 'buy' ? "bg-blue-500" : "bg-red-500"
                              )} />
                            )}
                            {getOrderInfo(trade)}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <Badge variant="outline" className="font-mono">
                            {trade.lots}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-mono">${trade.openPrice.toFixed(decimals)}</td>
                        <td className="p-2 text-right font-mono">
                          {trade.status === 'pending' ? '-' : `$${currentPrice.toFixed(decimals)}`}
                        </td>
                        <td className="p-2 text-right font-mono">
                          ${trade.margin_amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-2 text-right font-mono">
                          ${calculatePipValue(trade.lots, currentPrice || trade.openPrice, trade.pair).toFixed(2)}
                        </td>
                        <td className="p-2 font-mono">{trade.id.slice(0, 8)}</td>
                        <td className="p-2">{openTime}</td>
                        {activeTab !== 'pending' && (
                          <td className="p-2 text-right">
                            <div className={cn(
                              "font-mono",
                              pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : ""
                            )}>
                              ${pnl.toFixed(2)}
                            </div>
                          </td>
                        )}
                        <td className="p-2 text-right">
                          {(trade.status === 'pending' || trade.status === 'open') && (
                            <Button
                              variant="ghost"
                              size="sm" 
                              onClick={() => handleCloseTrade(trade.id)}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Add pagination controls */}
              {(activeTab === 'closed' || activeTab === 'pending') && displayedTrades.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-2 py-4 border-t">
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
      <div className="bg-card border-t flex items-center px-4 py-2">
        <div className="flex items-center justify-between w-full gap-8">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Balance:</span>
            <div className="font-mono text-sm">${(userBalance || 0).toFixed(2)}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Used Margin:</span>
            <div className="font-mono text-sm">${totalMarginUsed.toFixed(2)}</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Free Margin:</span>
            <div className={cn(
              "font-mono text-sm",
              freeMargin < 0 ? "text-red-500" : "text-green-500"
            )}>
              ${freeMargin.toFixed(2)}
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
