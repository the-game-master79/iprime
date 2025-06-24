import React from "react";

interface ActivityMobileViewProps {
  trades: any[];
  localPrices: Record<string, any>;
  pairNameMap: Record<string, string>;
}

const ActivityMobileView: React.FC<ActivityMobileViewProps> = ({ trades, localPrices, pairNameMap }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <span className="h-16 w-16 mb-4 text-white/20">📉</span>
        <p className="text-base">No open trades found</p>
        <p className="text-sm text-white/50 mt-1">Your open trades will appear here</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {trades.map((trade: any) => {
        const decimals =
          trade.pair === "XAUUSD" ? 2 :
          trade.pair.endsWith("JPY") ? 3 :
          trade.pair.endsWith("USDT") && ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT", "BNBUSDT"].includes(trade.pair) ? 2 :
          trade.pair === "DOGEUSDT" ? 5 :
          trade.pair === "ADAUSDT" || trade.pair === "TRXUSDT" ? 4 :
          trade.pair === "DOTUSDT" ? 3 :
          !trade.pair.endsWith("USDT") ? 5 : 2;
        const isProfitable = trade.pnl >= 0;
        const currentPrice = localPrices[trade.pair]?.price !== undefined
          ? parseFloat(localPrices[trade.pair].price)
          : parseFloat(trade.open_price);
        return (
          <div
            key={trade.id}
            className="p-4 rounded-xl border border-border bg-muted/10 shadow-sm flex flex-col"
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  trade.type?.toLowerCase() === "buy"
                    ? "bg-primary"
                    : "bg-error"
                }`}
                title={trade.type?.toUpperCase()}
              />
              <span className="font-bold text-base">
                {pairNameMap[trade.pair] || trade.pair}
              </span>
              <span className={`ml-auto font-bold ${isProfitable ? "text-success" : "text-error"}`}>
                {isProfitable ? "+" : ""}
                {trade.pnl?.toFixed(2)} USD
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                <span
                  className={
                    trade.type?.toLowerCase() === "buy"
                      ? "text-primary font-medium"
                      : "text-error font-medium"
                  }
                >
                  {`${trade.type?.charAt(0).toUpperCase() + trade.type?.slice(1).toLowerCase()} ${Number(trade.lots).toFixed(2)} Lot`}
                </span>
                {` at ${Number(trade.open_price).toFixed(decimals)}`}
              </span>
              <span className="text-md text-foreground font-medium ml-2">
                {Number(currentPrice).toFixed(decimals)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityMobileView;
