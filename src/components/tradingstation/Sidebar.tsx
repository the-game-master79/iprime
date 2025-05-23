import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MagnifyingGlass, Coins, Globe, X } from "@phosphor-icons/react";

interface PriceData {
  price: string;
  symbol: string;
  isPriceUp?: boolean;
}

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: "forex" | "crypto";
  setActiveTab: (tab: "forex" | "crypto") => void;
  filteredPairs: PriceData[];
  selectedPair: PriceData | null;
  handlePairClick: (pair: PriceData) => void;
  formatPairName: (symbol: string) => string;
  getFullName: (symbol: string) => string;
  getCryptoImageForSymbol: (symbol: string) => string;
  getForexImageForSymbol: (symbol: string) => string;
  isMobile?: boolean;
  closeMobileMenu?: () => void;
  navigateToTradeTab?: () => void; // Add new prop for navigating to trade tab
}

// Add this utility for price animation (before Sidebar)
const getPriceChangeClass = (isUp?: boolean) => {
  if (isUp === undefined) return "";
  return isUp
    ? "text-green-500"
    : "text-red-500";
};

const Sidebar = ({ 
  isCollapsed,
  toggleCollapse,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  filteredPairs,
  selectedPair,
  handlePairClick,
  formatPairName,
  getFullName,
  getCryptoImageForSymbol,
  getForexImageForSymbol,
  isMobile = false,
  closeMobileMenu,
  navigateToTradeTab
}: SidebarProps) => {
  // For mobile, we'll ignore the isCollapsed prop and always show content
  const showContent = isMobile || !isCollapsed;

  // Helper to check if forex market is open and get next open time
  function getForexMarketStatus() {
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
  }
  const { isOpen: isForexMarketOpen, nextOpen } = getForexMarketStatus();

  // Countdown state for next open
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!isForexMarketOpen && nextOpen) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = nextOpen.getTime() - now.getTime();
        if (diff <= 0) {
          setCountdown("Market is opening...");
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown(
            `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          );
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown("");
    }
  }, [isForexMarketOpen, nextOpen]);
  
  // On mount, if market is closed and forex tab is active, switch to crypto tab
  useEffect(() => {
    if (!isForexMarketOpen && activeTab === "forex") {
      setActiveTab("crypto");
    }
    // eslint-disable-next-line
  }, []);

  // Add effect to select first pair when tab changes or when filteredPairs changes
  useEffect(() => {
    // Only auto-select if no pair is currently selected or if tabs were switched
    if ((filteredPairs.length > 0 && !selectedPair) || 
        (filteredPairs.length > 0 && selectedPair && !filteredPairs.some(p => p.symbol === selectedPair.symbol))) {
      handlePairClick(filteredPairs[0]);
    }
  }, [activeTab, filteredPairs, selectedPair, handlePairClick]);
  
  // Create a function to handle pair click and navigation
  const handlePairSelection = (pair: PriceData) => {
    handlePairClick(pair);
    
    // For mobile, close the menu and navigate to trade tab
    if (isMobile) {
      if (closeMobileMenu) closeMobileMenu();
      if (navigateToTradeTab) navigateToTradeTab();
    }
  };
  
  // Add this helper to format price with big digits for bid/ask
  const renderPriceWithBigDigits = (value: string | number | undefined, decimals: number) => {
    if (value === undefined) return "-";
    const str = Number(value).toFixed(decimals);

    if (decimals === 2) {
      // Make the digit before the decimal and the decimal point bigger
      const dotIdx = str.indexOf(".");
      if (dotIdx <= 0) return str;
      const before = str.slice(0, dotIdx - 1);
      const big = str.slice(dotIdx - 1, dotIdx + 1); // digit before + "."
      const after = str.slice(dotIdx + 1);
      return (
        <>
          {before}
          <span className="text-lg font-bold">{big}</span>
          {after}
        </>
      );
    } else if (decimals > 2) {
      // Make the last 2 digits bigger
      const normal = str.slice(0, -2);
      const big = str.slice(-2);
      return (
        <>
          {normal}
          <span className="text-lg font-bold">{big}</span>
        </>
      );
    }
    // fallback
    return str;
  };

  // Helper to get decimals for a symbol
  const getPriceDecimals = (symbol: string) => {
    if (symbol === "XAUUSD") return 2;
    if (symbol.endsWith("JPY")) return 3;
    if (symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT" || symbol === "LINKUSDT" || symbol === "BNBUSDT") return 2;
    if (symbol === "DOGEUSDT") return 5;
    if (symbol === "ADAUSDT" || symbol === "TRXUSDT") return 4;
    if (symbol === "DOTUSDT") return 3;
    // Default: forex pairs (non-JPY, non-XSUPER, non-crypto)
    if (!symbol.endsWith("USDT")) return 5;
    // Fallback
    return 2;
  };

  // Track previous prices for animation
  const prevPricesRef = useRef<{ [symbol: string]: number }>({});
  const [animatedPairs, setAnimatedPairs] = useState<{ [symbol: string]: boolean | undefined }>({});

  useEffect(() => {
    // Only update animation for visible pairs
    setAnimatedPairs((prevAnimated) => {
      const newAnimated: { [symbol: string]: boolean | undefined } = {};
      filteredPairs.forEach(pair => {
        const prev = prevPricesRef.current[pair.symbol];
        const curr = Number(pair.price);
        if (prev !== undefined && !isNaN(curr)) {
          if (curr > prev) {
            newAnimated[pair.symbol] = true; // up
          } else if (curr < prev) {
            newAnimated[pair.symbol] = false; // down
          } else {
            newAnimated[pair.symbol] = prevAnimated[pair.symbol]; // unchanged
          }
        }
        prevPricesRef.current[pair.symbol] = curr;
      });
      // Remove animations for pairs no longer visible
      return newAnimated;
    });
    // Only run when filteredPairs changes (not on every price change)
    // eslint-disable-next-line
  }, [filteredPairs, selectedPair]);

  return (
    <>
      {/* Hamburger Menu Container - Only show on desktop */}
      {!isMobile && (
        <div className="fixed top-16 left-0 h-[calc(100%-4rem)] w-[60px] bg-muted/20 border-r border-border/50 flex flex-col items-center justify-start py-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 flex items-center justify-center"
            onClick={toggleCollapse}
          >
            <span className="text-xl">{isCollapsed ? "☰" : "✕"}</span>
          </Button>
        </div>
      )}
      
      {/* Trading Station Sidebar - Adjust for mobile */}
      {showContent && (
        <div className={`
          ${isMobile 
            ? "w-full h-full pb-16 bg-background" // Full width/height with mobile styling
            : "fixed top-16 left-[60px] h-[calc(100%-4rem)] w-[400px] bg-muted/10 border-r border-border/50"
          } 
          flex flex-col p-4 transition-all duration-300 overflow-y-auto
        `}>
          {/* Header - Adjust for mobile */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold">
              {isMobile ? "Markets" : "Trading Station"}
            </h1>
            
            {/* Only show close button on desktop */}
            {!isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCollapse}
                className="h-8 w-8 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Search bar */}
          <div className="relative mb-4">
            <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pairs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-10 placeholder:text-muted-foreground bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/30 transition-colors"
            />
          </div>
          
          {/* Tab buttons - Make full width on mobile */}
          <div className="flex gap-1 mb-4 w-full bg-muted/20 rounded-xl p-1">
            <Button
              variant={activeTab === "crypto" ? "default" : "outline"}
              onClick={() => setActiveTab("crypto")}
              className="flex-1"
            >
              <Coins className="h-4 w-4 mr-2" />
              Crypto
            </Button>
            <Button
              variant={activeTab === "forex" ? "default" : "outline"}
              onClick={() => setActiveTab("forex")}
              className="flex-1"
            >
              <Globe className="h-4 w-4 mr-2" />
              Forex
            </Button>
          </div>
          {/* Market pairs grid */}
          <div className="grid grid-cols-1 gap-2 overflow-y-auto">
            {filteredPairs.map((pair) => {
              const decimals = getPriceDecimals(pair.symbol);
              const isUp = animatedPairs[pair.symbol];
              return (
                <Button
                  key={pair.symbol}
                  variant={selectedPair?.symbol === pair.symbol ? "default" : "ghost"}
                  className={`
                    flex items-center justify-between p-4 
                    ${isMobile ? "h-16" : "h-16"} 
                    border border-border/50 rounded-lg
                    group transition-all duration-200
                    ${selectedPair?.symbol === pair.symbol
                      ? "bg-secondary text-foreground border-primary"
                      : "hover:bg-secondary/60 hover:text-foreground"}
                  `}
                  onClick={() => handlePairSelection(pair)}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        pair.symbol.endsWith("USDT")
                          ? getCryptoImageForSymbol(pair.symbol)
                          : getForexImageForSymbol(pair.symbol)
                      }
                      alt={pair.symbol}
                      className="h-8 w-8"
                    />
                    <div className="flex flex-col text-left">
                      <span className="font-medium group-hover:text-foreground/90 transition-colors">
                        {formatPairName(pair.symbol)}
                      </span>
                      <span className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors">
                        {getFullName(pair.symbol)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      key={pair.symbol + "-" + pair.price}
                      className={`font-mono font-medium transition-all duration-500 ${getPriceChangeClass(isUp)}`}
                    >
                      {renderPriceWithBigDigits(pair.price, decimals)}
                    </div>
                  </div>
                </Button>
              );
            })}
            
            {/* Show empty state if no pairs match the search */}
            {filteredPairs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <div className="text-4xl mb-2">🔍</div>
                <p>
                  {activeTab === "forex" && !isForexMarketOpen
                    ? "Markets are closed today."
                    : "No matching pairs found"}
                </p>
                <p className="text-sm">
                  {activeTab === "forex" && !isForexMarketOpen
                    ? <>
                        Forex market is currently closed.<br />
                        {countdown && (
                          <span>
                            Market opens in <span className="font-semibold">{countdown}</span>
                          </span>
                        )}
                      </>
                    : "Try adjusting your search term"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
