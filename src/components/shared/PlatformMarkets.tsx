import React, { useEffect, useState } from "react";

// Update TradingViewWidget to hide all but the chart
const TradingViewWidget: React.FC<{ symbol: string }> = ({ symbol }) => (
  <iframe
    src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=15&theme=light&style=1&hide_top_toolbar=1&hide_legend=1&hide_side_toolbar=1&withdateranges=0&saveimage=0&studies=[]&show_popup_button=0&hideideas=1&toolbar_bg=white`}
    style={{ width: "100%", height: 320, border: 0 }}
    allowFullScreen
    title="TradingView Chart"
  />
);

export const PlatformMarkets: React.FC<{
  cryptoData: { symbol: string; image_url: string; name?: string }[];
  forexData: { symbol: string; image_url: string; name?: string }[];
  marketPrices: Record<string, { price: string; bid?: number; ask?: number; isPriceUp?: boolean }>;
  getPriceDecimals: (symbol: string) => number;
  getPriceChangeClass: (isUp?: boolean) => string;
  renderPriceWithBigDigits: (
    value: number | undefined,
    decimals: number,
    marketClosed?: boolean,
    isUp?: boolean
  ) => React.ReactNode;
  forexMarketOpen: boolean;
  navigate: (path: string) => void;
}> = ({
  cryptoData,
  forexData,
  marketPrices,
  getPriceDecimals,
  getPriceChangeClass,
  renderPriceWithBigDigits,
  forexMarketOpen,
  navigate,
}) => {
  // --- Countdown logic for next forex market open ---
  const getForexMarketStatus = () => {
    const now = new Date();
    const utcDay = now.getUTCDay();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    let isOpen = false;
    let nextOpen: Date | null = null;

    if (
      (utcDay > 0 && utcDay < 5) ||
      (utcDay === 5 && utcHour < 21) ||
      (utcDay === 0 && (utcHour > 22 || (utcHour === 22 && utcMinute >= 0)))
    ) {
      isOpen = true;
    } else {
      // Find next Sunday 22:00 UTC
      nextOpen = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0, 0));
      let daysUntilSunday = (7 - utcDay) % 7;
      if (utcDay === 0 && utcHour < 22) {
        // Today is Sunday, before 22:00
        // nextOpen is today at 22:00
      } else {
        // Next Sunday
        nextOpen.setUTCDate(now.getUTCDate() + daysUntilSunday);
      }
      // If today is Sunday and after 22:00, next open is next week's Sunday
      if (utcDay === 0 && utcHour >= 22) {
        nextOpen.setUTCDate(nextOpen.getUTCDate() + 7);
      }
    }
    return { isOpen, nextOpen };
  };

  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!forexMarketOpen) {
      const interval = setInterval(() => {
        const { nextOpen } = getForexMarketStatus();
        if (!nextOpen) {
          setCountdown("");
          clearInterval(interval);
          return;
        }
        const now = new Date();
        const diff = nextOpen.getTime() - now.getTime();
        if (diff <= 0) {
          setCountdown("Market is opening...");
          clearInterval(interval);
        } else {
          const totalSeconds = Math.floor(diff / 1000);
          const days = Math.floor(totalSeconds / (60 * 60 * 24));
          const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
          const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
          const seconds = totalSeconds % 60;
          let formatted = "";
          if (days > 0) {
            formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          } else if (hours > 0) {
            formatted = `${hours}h ${minutes}m ${seconds}s`;
          } else if (minutes > 0) {
            formatted = `${minutes}m ${seconds}s`;
          } else {
            formatted = `${seconds}s`;
          }
          setCountdown(formatted);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown("");
    }
  }, [forexMarketOpen]);

  // Dialog state for selected pair
  const [selectedPair, setSelectedPair] = useState<{
    type: "crypto" | "forex";
    symbol: string;
    name?: string;
    image_url?: string;
    decimals: number;
    originalSymbol: string; // for lookup
  } | null>(null);

  // Update dialog priceObj in realtime
  const [dialogPriceObj, setDialogPriceObj] = useState<{
    price: string;
    bid?: number;
    ask?: number;
    isPriceUp?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!selectedPair) {
      setDialogPriceObj(null);
      return;
    }
    // Listen for price changes for the selected pair
    const symbol = selectedPair.originalSymbol;
    setDialogPriceObj(marketPrices[symbol]);
  }, [selectedPair, marketPrices]);

  // Dialog close handler
  const closeDialog = () => setSelectedPair(null);

  return (
    <div className="w-full mt-2 flex flex-col md:flex-row gap-6">
      {/* Crypto Markets Container */}
      <div className="flex-1 rounded-2xl border border-border p-0 overflow-x-auto">
        <div>
          <div className="flex items-center gap-2 px-6 pt-6 pb-2">
            <span className="font-semibold text-lg tracking-tight">Crypto Markets</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              Live
            </span>
          </div>
          <div className="bg-background px-4 pb-4">
            {cryptoData.length === 0 ? (
              <div className="py-4 px-2 text-muted-foreground text-sm">
                No crypto pairs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 px-2 text-left font-semibold">Pair</th>
                      <th className="py-2 px-2 text-right font-semibold">Bid</th>
                      <th className="py-2 px-2 text-right font-semibold">Ask</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cryptoData.map((pair) => {
                      // Use the symbol as-is from Supabase
                      const symbol = pair.symbol;
                      const priceObj = marketPrices[symbol];
                      const decimals = getPriceDecimals(symbol);
                      // Remove 'USD' or 'USDT' suffix for display
                      let displaySymbol = symbol;
                      if (symbol.endsWith('USDT')) {
                        displaySymbol = symbol.replace(/USDT$/, '');
                      } else if (symbol.endsWith('USD')) {
                        displaySymbol = symbol.replace(/USD$/, '');
                      }
                      return (
                        <tr
                          key={pair.symbol}
                          className="hover:bg-muted/10 transition cursor-pointer"
                          onClick={() =>
                            setSelectedPair({
                              type: "crypto",
                              symbol: symbol,
                              name: pair.name,
                              image_url: pair.image_url,
                              decimals,
                              originalSymbol: symbol,
                            })
                          }
                        >
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              {pair.image_url && (
                                <img
                                  src={pair.image_url}
                                  alt={pair.symbol}
                                  className="w-6 h-6 object-contain"
                                />
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold">{displaySymbol}</span>
                                <span className="text-xs text-muted-foreground">{pair.name || "-"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className={getPriceChangeClass(priceObj?.isPriceUp)}>
                              {renderPriceWithBigDigits(priceObj?.bid, decimals)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className={getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)}>
                              {renderPriceWithBigDigits(priceObj?.ask, decimals)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Forex Markets Container */}
      <div className="flex-1 rounded-2xl border border-border p-0 overflow-x-auto flex items-center justify-center">
        <div className="w-full">
          {!forexMarketOpen ? (
            <div className="bg-background px-4 pb-4 flex flex-col items-center justify-center py-12 rounded-2xl min-h-[220px]">
              <span className="text-xl font-semibold text-destructive mb-2 text-center">Forex Market is Closed</span>
              <span className="text-sm text-muted-foreground mb-1 text-center">Opens in</span>
              <span className="text-lg font-bold text-primary text-center">{countdown || "(Countdown)"}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-6 pt-6 pb-2">
                <span className="font-semibold text-lg tracking-tight">Forex Markets</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                  ${forexMarketOpen ? "bg-primary/10 text-primary" : "bg-error/20 text-error"}`}>
                  {forexMarketOpen ? "Live" : "Closed"}
                </span>
              </div>
              <div className="bg-background px-4 pb-4">
                {forexData.length === 0 ? (
                  <div className="py-4 px-2 text-muted-foreground text-sm">
                    No forex pairs found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-2 px-2 text-left font-semibold">Pair</th>
                          <th className="py-2 px-2 text-right font-semibold">Bid</th>
                          <th className="py-2 px-2 text-right font-semibold">Ask</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forexData.map((pair) => {
                          const symbol = pair.symbol.toUpperCase();
                          const priceObj = marketPrices[symbol];
                          const decimals = getPriceDecimals(symbol);
                          return (
                            <tr
                              key={pair.symbol}
                              className="hover:bg-muted/10 transition cursor-pointer"
                              onClick={() =>
                                setSelectedPair({
                                  type: "forex",
                                  symbol: pair.symbol,
                                  name: pair.name,
                                  image_url: pair.image_url,
                                  decimals,
                                  originalSymbol: symbol,
                                })
                              }
                            >
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-2">
                                  {pair.image_url && (
                                    <img
                                      src={pair.image_url}
                                      alt={pair.symbol}
                                      className="w-6 h-6 object-contain"
                                    />
                                  )}
                                  <div className="flex flex-col">
                                    <span className="font-bold">{pair.symbol}</span>
                                    <span className="text-xs text-muted-foreground">{pair.name || "-"}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right">
                                <span
                                  className={
                                    !forexMarketOpen
                                      ? "text-destructive font-semibold"
                                      : getPriceChangeClass(priceObj?.isPriceUp)
                                  }
                                >
                                  {renderPriceWithBigDigits(
                                    priceObj?.bid,
                                    decimals,
                                    !forexMarketOpen
                                  )}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right">
                                <span
                                  className={
                                    !forexMarketOpen
                                      ? "text-destructive font-semibold"
                                      : getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)
                                  }
                                >
                                  {renderPriceWithBigDigits(
                                    priceObj?.ask,
                                    decimals,
                                    !forexMarketOpen
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Pair Detail Dialog */}
      {selectedPair && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeDialog}
        >
          <div
            className="bg-background rounded-xl shadow-lg p-6 min-w-[340px] max-w-[95vw] relative"
            onClick={e => e.stopPropagation()}
            style={{ width: 400, maxWidth: "95vw" }}
          >
            <button
              className="absolute top-2 right-2 text-lg px-2 py-1 rounded hover:bg-muted"
              onClick={closeDialog}
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex items-center gap-3 mb-4">
              {selectedPair.image_url && (
                <img
                  src={selectedPair.image_url}
                  alt={selectedPair.symbol}
                  className="w-10 h-10 object-contain"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {selectedPair.type === "crypto"
                      ? selectedPair.symbol.replace(/USDT$/, '').replace(/USD$/, '')
                      : selectedPair.symbol}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${selectedPair.type === "crypto"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}>
                    {selectedPair.type === "crypto" ? "Crypto Market" : "Forex Market"}
                  </span>
                </div>
                <div className="text-muted-foreground text-sm">{selectedPair.name || "-"}</div>
              </div>
            </div>
            {/* Bid/Ask badges */}
            <div className="flex gap-3 mb-4">
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground mb-1">Bid</span>
                <span
                  className={`px-3 py-1 rounded-full font-semibold text-sm
                    ${dialogPriceObj?.isPriceUp === true
                      ? "bg-green-100 text-green-700"
                      : dialogPriceObj?.isPriceUp === false
                        ? "bg-red-100 text-red-700"
                        : "bg-muted text-foreground"
                    }`}
                >
                  {renderPriceWithBigDigits(
                    dialogPriceObj?.bid,
                    selectedPair.decimals,
                    selectedPair.type === "forex" ? !forexMarketOpen : false,
                    dialogPriceObj?.isPriceUp
                  )}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground mb-1">Ask</span>
                <span
                  className={`px-3 py-1 rounded-full font-semibold text-sm
                    ${dialogPriceObj?.isPriceUp === false
                      ? "bg-red-100 text-red-700"
                      : dialogPriceObj?.isPriceUp === true
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-foreground"
                    }`}
                >
                  {renderPriceWithBigDigits(
                    dialogPriceObj?.ask,
                    selectedPair.decimals,
                    selectedPair.type === "forex" ? !forexMarketOpen : false,
                    dialogPriceObj?.isPriceUp
                  )}
                </span>
              </div>
            </div>
            {selectedPair.type === "forex" && !forexMarketOpen && (
              <div className="text-destructive text-xs mb-2">Market Closed</div>
            )}
            <div className="mb-2">
              <span className="font-semibold text-sm">Chart</span>
            </div>
            <div className="rounded border border-border overflow-hidden bg-white">
              <TradingViewWidget symbol={selectedPair.originalSymbol.replace(/[-/]/g, "")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
