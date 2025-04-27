import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "@phosphor-icons/react";
import { toast } from "@/components/ui/use-toast";
import { Trade, PriceData } from "@/types/trading";
import { calculatePnL } from "@/utils/trading"; // Updated import
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const CRYPTO_LEVERAGE = 400;
const FOREX_LEVERAGE_OPTIONS = [2, 5, 10, 20, 30, 50, 88, 100, 500, 1000, 2000];

interface TradingActivityProps {
  trades: Trade[];
  currentPrices: Record<string, PriceData>;
  onCloseTrade: (tradeId: string) => void;
  userBalance: number;
}

export const TradingActivity = ({ 
  trades, 
  currentPrices, 
  onCloseTrade,
  userBalance = 0,
}: TradingActivityProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'closed'>('open');
  const filteredTrades = useMemo(() => ({
    open: trades.filter(t => t.status === 'open'),
    pending: trades.filter(t => t.status === 'pending'),
    closed: trades.filter(t => t.status === 'closed')
  }), [trades]);

  const { totalPnL } = useMemo(() => {
    return filteredTrades.open.reduce((acc, trade) => {
      const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
      const pnl = calculatePnL(trade, currentPrice);
      return { totalPnL: acc.totalPnL + pnl };
    }, { totalPnL: 0 });
  }, [filteredTrades.open, currentPrices]);

  const { totalMarginUsed, marginLevel, adjustedBalance } = useMemo(() => {
    // Calculate total P&L first
    const totalPnL = trades
      .filter(t => t.status === 'open')
      .reduce((acc, trade) => {
        const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
        return acc + calculatePnL(trade, currentPrice);
      }, 0);

    // Calculate total margin used
    const marginUsed = trades
      .filter(t => t.status === 'open' || t.status === 'pending')
      .reduce((total, trade) => {
        return total + (trade.margin_amount || 0);
      }, 0);

    // Calculate adjusted balance including unrealized P&L
    const adjustedBal = userBalance + totalPnL;
    
    // Calculate margin level using adjusted balance
    const level = marginUsed > 0 ? ((adjustedBal / marginUsed) * 100) : 100;

    return {
      totalMarginUsed: marginUsed,
      marginLevel: level,
      adjustedBalance: adjustedBal
    };
  }, [trades, userBalance, currentPrices]);

  // Update free margin calculation to use adjusted balance
  const freeMargin = adjustedBalance - totalMarginUsed;

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

  if (trades.length === 0) return null;

  const displayedTrades = filteredTrades[activeTab];

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
              <div className={cn(
                "text-sm font-mono font-medium",
                totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-red-500" : ""
              )}>
                ${totalPnL.toFixed(2)}
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
                    <th className="text-right p-2">Current Price</th>
                    <th className="text-right p-2">T/P</th>
                    <th className="text-right p-2">S/L</th>
                    <th className="text-left p-2">Position ID</th>
                    <th className="text-left p-2">Open Time</th>
                    <th className="text-right p-2">P&L</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {displayedTrades.map(trade => {
                    const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
                    const pnl = trade.status === 'closed' 
                      ? (trade.pnl || 0) 
                      : calculatePnL(trade, currentPrice);
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
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              trade.type === 'buy' ? "bg-blue-500" : "bg-red-500"
                            )} />
                            {trade.type.toUpperCase()}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <Badge variant="outline" className="font-mono">
                            {trade.lots}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-mono">${trade.openPrice.toFixed(decimals)}</td>
                        <td className="p-2 text-right font-mono">${currentPrice.toFixed(decimals)}</td>
                        <td className="p-2 text-right font-mono">-</td>
                        <td className="p-2 text-right font-mono">-</td>
                        <td className="p-2 font-mono">{trade.id.slice(0, 8)}</td>
                        <td className="p-2">{openTime}</td>
                        <td className="p-2 text-right">
                          <span className={cn(
                            "font-mono",
                            pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : ""
                          )}>
                            ${pnl.toFixed(2)}
                          </span>
                          {trade.status !== 'closed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 ml-2 text-red-600"
                              onClick={() => handleCloseTrade(trade.id)}
                            >
                              <X className="h-4 w-4" weight="bold" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
