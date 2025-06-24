import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import CopyButton from "@/components/ui/CopyButton";

interface ActivityExpandableTradesProps {
  grouped: Record<string, any>;
  expandedGroups: Record<string, boolean>;
  toggleGroupExpand: (key: string) => void;
  getPriceDecimals: (symbol: string) => number;
  localPrices: Record<string, any>;
  handleCloseTrade: (trade: any) => void;
  isForexTrade: (trade: any) => boolean;
  isForexMarketOpen: boolean;
  getCryptoImageForSymbol: (symbol: string) => string;
  getForexImageForSymbol: (symbol: string) => string;
  formatPairName: (symbol: string) => string;
}

const ActivityExpandableTrades: React.FC<ActivityExpandableTradesProps> = ({
  grouped,
  expandedGroups,
  toggleGroupExpand,
  getPriceDecimals,
  localPrices,
  handleCloseTrade,
  isForexTrade,
  isForexMarketOpen,
  getCryptoImageForSymbol,
  getForexImageForSymbol,
  formatPairName,
}) => {
  // For each pair, check if both buy and sell exist and calculate hedging capacity
  const pairTypes: Record<string, { buyLots: number, sellLots: number, hedgedBuyLots: number, hedgedSellLots: number }> = {};
  Object.values(grouped).forEach((g: any) => {
    if (!pairTypes[g.pair]) pairTypes[g.pair] = { buyLots: 0, sellLots: 0, hedgedBuyLots: 0, hedgedSellLots: 0 };
    if (g.type === "buy") pairTypes[g.pair].buyLots += g.totalLots;
    if (g.type === "sell") pairTypes[g.pair].sellLots += g.totalLots;
  });
  Object.keys(pairTypes).forEach(pair => {
    const hedgedLots = Math.min(pairTypes[pair].buyLots, pairTypes[pair].sellLots);
    pairTypes[pair].hedgedBuyLots = hedgedLots;
    pairTypes[pair].hedgedSellLots = hedgedLots;
  });
  return (
    <>
      {Object.values(grouped).map((g: any) => {
        const decimals = getPriceDecimals(g.pair);
        const isHedged = pairTypes[g.pair].buyLots > 0 && pairTypes[g.pair].sellLots > 0;
        const firstTrade = g.trades[0];
        const currentPrice =
          localPrices[g.pair]?.price !== undefined
            ? parseFloat(localPrices[g.pair].price)
            : parseFloat(firstTrade.open_price);
        const isExpanded = expandedGroups[g.key] || false;
        const hasMultiplePositions = g.trades.length > 1;
        g.hedgingTracker = {
          hedgedBuyLots: 0,
          hedgedSellLots: 0,
          maxHedgedBuyLots: pairTypes[g.pair].hedgedBuyLots,
          maxHedgedSellLots: pairTypes[g.pair].hedgedSellLots
        };
        return (
          <React.Fragment key={g.key}>
            {/* Main group row */}
            <tr className={`group border-t border-border/50 ${isExpanded ? 'bg-accent/10' : ''}`}>
              <td className="px-4 py-2">
                <button
                  onClick={g.trades.length > 1 ? () => toggleGroupExpand(g.key) : undefined}
                  className={`flex items-center gap-2 w-full text-left ${g.trades.length > 1 ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        g.pair.endsWith("USDT")
                          ? getCryptoImageForSymbol(g.pair)
                          : getForexImageForSymbol(g.pair)
                      }
                      alt={g.pair}
                      className="h-6 w-6"
                    />
                    <span className="mr-2 text-foreground">{formatPairName(g.pair)}</span>
                    {g.trades.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 rounded-full opacity-70 hover:opacity-100 flex items-center justify-center bg-secondary text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupExpand(g.key);
                        }}
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </Button>
                    )}
                  </div>
                </button>
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-1 items-center">
                  <span
                    className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                      g.type === "buy"
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-destructive hover:bg-destructive/90"
                    }`}
                  >
                    {g.type.toUpperCase()}
                  </span>
                  {isHedged && (
                    <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold transition-all ml-1 hover:bg-primary/20">
                      Hedged
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">
                    {g.totalLots.toFixed(2)}
                  </span>
                  <span className="ml-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {g.trades.length} open
                  </span>
                </div>
              </td>
              <td className="px-4 py-2 text-xs text-foreground">
                {Number(firstTrade.open_price).toFixed(decimals)}
              </td>
              <td className="px-4 py-2 text-xs text-foreground">
                {Number(currentPrice).toFixed(decimals)}
              </td>
              <td className="px-4 py-2 text-xs text-foreground">
                ${g.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                    firstTrade.leverage <= 20
                      ? "bg-success hover:bg-success/90"
                      : firstTrade.leverage <= 500
                      ? "bg-warning hover:bg-warning/90"
                      : "bg-destructive hover:bg-destructive/90"
                  }`}
                >
                  1:{firstTrade.leverage}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-foreground">
                {new Date(g.openedAt).toLocaleString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                  hour12: true,
                })}
              </td>
              <td className={`px-4 py-2 text-xs ${g.totalLivePnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                ${g.totalLivePnl.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-xs">
                {g.trades.every((t: any) => t.status === "open") && (
                  <Button
                    variant={hasMultiplePositions ? "destructive" : "ghost"}
                    size="sm"
                    onClick={() => g.trades.forEach((t: any) => handleCloseTrade(t))}
                    className={`
                      w-8 h-8 p-0 rounded-full
                      text-destructive
                      hover:bg-destructive/10
                      ${hasMultiplePositions ? "bg-destructive/10" : ""}
                    `}
                    title={
                      isForexTrade(g.trades[0])
                        ? "You can only close forex trades when the market is open."
                        : hasMultiplePositions ? "Close All Positions" : "Close Position"
                    }
                    disabled={isForexTrade(g.trades[0]) && !isForexMarketOpen}
                  >
                    <X size={16} />
                  </Button>
                )}
              </td>
            </tr>
            {/* Expanded individual trade rows */}
            {isExpanded && g.trades.map((trade: any, idx: number) => {
              const type = trade.type?.toLowerCase();
              const lots = Number(trade.lots) || 0;
              let isTradeHedged = false;
              if (isHedged) {
                if (type === "buy" && g.hedgingTracker.hedgedBuyLots < g.hedgingTracker.maxHedgedBuyLots) {
                  isTradeHedged = true;
                  g.hedgingTracker.hedgedBuyLots += lots;
                  if (g.hedgingTracker.hedgedBuyLots > g.hedgingTracker.maxHedgedBuyLots) {
                    g.hedgingTracker.hedgedBuyLots = g.hedgingTracker.maxHedgedBuyLots;
                  }
                } else if (type === "sell" && g.hedgingTracker.hedgedSellLots < g.hedgingTracker.maxHedgedSellLots) {
                  isTradeHedged = true;
                  g.hedgingTracker.hedgedSellLots += lots;
                  if (g.hedgingTracker.hedgedSellLots > g.hedgingTracker.maxHedgedSellLots) {
                    g.hedgingTracker.hedgedSellLots = g.hedgingTracker.maxHedgedSellLots;
                  }
                }
              }
              return (
                <tr key={`${g.key}-${idx}`} className="bg-accent/5 border-t border-dashed border-border/30">
                  <td className="px-4 py-2 pl-10 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>ID: {trade.id.substring(0, 8)}...</span>
                      <CopyButton text={trade.id} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <div className="flex gap-1 items-center">
                      <span
                        className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                          trade.type?.toLowerCase() === "buy"
                            ? "bg-primary hover:bg-primary/90"
                            : "bg-destructive hover:bg-destructive/90"
                        }`}
                      >
                        {trade.type?.toUpperCase() || "UNKNOWN"}
                      </span>
                      {isTradeHedged && (
                        <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold transition-all ml-1 hover:bg-primary/20">
                          H
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">
                      {Number(trade.lots).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground">
                    {Number(trade.open_price).toFixed(decimals)}
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground">
                    {Number(currentPrice).toFixed(decimals)}
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground">
                    ${Number(trade.margin_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                        trade.leverage <= 20
                          ? "bg-success hover:bg-success/90"
                          : trade.leverage <= 500
                          ? "bg-warning hover:bg-warning/90"
                          : "bg-destructive hover:bg-destructive/90"
                      }`}
                    >
                      1:{trade.leverage}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground">
                    {new Date(trade.created_at).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                      hour12: true,
                    })}
                  </td>
                  <td className={`px-4 py-2 text-xs`}>
                    {/* Calculate and display individual PnL */}
                    {(() => {
                      let individualPnL = 0;
                      const openPrice = parseFloat(trade.open_price);
                      const currentPriceValue = currentPrice;
                      let pipSize = 0.0001;
                      let lotSize = 100000;
                      if (trade.pair.endsWith("USDT")) {
                        pipSize = 1;
                        lotSize = 1;
                        if (trade.type?.toLowerCase() === "buy") {
                          individualPnL = currentPriceValue - openPrice;
                        } else {
                          individualPnL = openPrice - currentPriceValue;
                        }
                      } else if (trade.pair === "XAUUSD") {
                        pipSize = 0.01;
                        lotSize = 100;
                        const lots = Number(trade.lots) || 0;
                        const pipValue = pipSize * lots * 100;
                        if (trade.type?.toLowerCase() === "buy") {
                          individualPnL = ((currentPriceValue - openPrice) / pipSize) * pipValue;
                        } else {
                          individualPnL = ((openPrice - currentPriceValue) / pipSize) * pipValue;
                        }
                      } else {
                        if (trade.pair.endsWith("JPY")) {
                          pipSize = 0.01;
                        }
                        const lots = Number(trade.lots) || 0;
                        const pipValue = (pipSize * lotSize * lots) / currentPriceValue;
                        if (trade.type?.toLowerCase() === "buy") {
                          individualPnL = ((currentPriceValue - openPrice) / pipSize) * pipValue;
                        } else {
                          individualPnL = ((openPrice - currentPriceValue) / pipSize) * pipValue;
                        }
                      }
                      return (
                        <span className={individualPnL >= 0 ? "text-success" : "text-destructive"}>
                          ${individualPnL.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {trade.status === "open" && (
                      <div
                        onClick={() => handleCloseTrade({ ...trade, id: typeof trade.id === "string" ? trade.id.trim() : String(trade.id ?? "").trim() })}
                        className="w-6 h-6 p-0 rounded-full flex items-center justify-center cursor-pointer text-destructive hover:bg-destructive/10"
                        title="Close Position"
                      >
                        <X size={14} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default ActivityExpandableTrades;
