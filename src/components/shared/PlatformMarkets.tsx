import React, { useEffect, useState } from "react";

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
              cryptoData.map((pair) => {
                const symbol = pair.symbol.toUpperCase();
                // Remove trailing '/USDT' or '-USDT' or 'USDT' at the end for display
                let displaySymbol = symbol;
                if (displaySymbol.endsWith('/USDT')) {
                  displaySymbol = displaySymbol.replace(/\/USDT$/, '');
                } else if (displaySymbol.endsWith('-USDT')) {
                  displaySymbol = displaySymbol.replace(/-USDT$/, '');
                } else if (displaySymbol.endsWith('USDT')) {
                  displaySymbol = displaySymbol.replace(/USDT$/, '');
                }
                const priceObj = marketPrices[symbol];
                const decimals = getPriceDecimals(symbol);
                return (
                  <div
                    key={pair.symbol}
                    className="flex items-center gap-4 py-3 px-2 hover:bg-muted/10 transition cursor-pointer"
                    onClick={() => navigate('/tradingstation')}
                  >
                    {pair.image_url && (
                      <img
                        src={pair.image_url}
                        alt={pair.symbol}
                        className="w-7 h-7 object-contain"
                      />
                    )}
                    <div className="flex flex-col min-w-[60px]">
                      <span className="font-medium font-bold text-base">{displaySymbol}</span>
                      {/* Show name below symbol */}
                      {pair.name && (
                        <span className="text-xs text-muted-foreground">{pair.name}</span>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                      <span className="flex items-center gap-2">
                        <span
                          className={getPriceChangeClass(priceObj?.isPriceUp)}
                        >
                          B:
                        </span>
                        <span
                          className={getPriceChangeClass(priceObj?.isPriceUp)}
                          key={priceObj?.bid}
                        >
                          {renderPriceWithBigDigits(priceObj?.bid, decimals)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)}
                        >
                          A:
                        </span>
                        <span
                          className={getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)}
                          key={priceObj?.ask}
                        >
                          {renderPriceWithBigDigits(priceObj?.ask, decimals)}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })
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
                  forexData.map((pair) => {
                    const symbol = pair.symbol.toUpperCase();
                    const priceObj = marketPrices[symbol];
                    const decimals = getPriceDecimals(symbol);
                    return (
                      <div
                        key={pair.symbol}
                        className="flex items-center gap-4 py-3 px-2 hover:bg-muted/10 transition cursor-pointer"
                        onClick={() => navigate('/tradingstation')}
                      >
                        {pair.image_url && (
                          <img
                            src={pair.image_url}
                            alt={pair.symbol}
                            className="w-7 h-7 object-contain"
                          />
                        )}
                        <div className="flex flex-col min-w-[60px]">
                          <span className="font-medium font-bold text-base">{pair.symbol}</span>
                          {/* Show name below symbol */}
                          {pair.name && (
                            <span className="text-xs text-muted-foreground">{pair.name}</span>
                          )}
                        </div>
                        <div className="ml-auto flex items-center gap-4">
                          <span className="flex items-center gap-2">
                            <span
                              className={
                                !forexMarketOpen
                                  ? "text-destructive font-semibold"
                                  : getPriceChangeClass(priceObj?.isPriceUp)
                              }
                            >
                              B:
                            </span>
                            <span
                              className={
                                !forexMarketOpen
                                  ? "text-destructive font-semibold"
                                  : getPriceChangeClass(priceObj?.isPriceUp)
                              }
                              key={priceObj?.bid}
                            >
                              {renderPriceWithBigDigits(
                                priceObj?.bid,
                                decimals,
                                !forexMarketOpen
                              )}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={
                                !forexMarketOpen
                                  ? "text-destructive font-semibold"
                                  : getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)
                              }
                            >
                              A:
                            </span>
                            <span
                              className={
                                !forexMarketOpen
                                  ? "text-destructive font-semibold"
                                  : getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)
                              }
                              key={priceObj?.ask}
                            >
                              {renderPriceWithBigDigits(
                                priceObj?.ask,
                                decimals,
                                !forexMarketOpen
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
