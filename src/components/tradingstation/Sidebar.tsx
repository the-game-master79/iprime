import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MagnifyingGlass, Coins, Globe, X,
  Calendar as CalendarIcon,
  Wallet as DepositIcon,
  ArrowCircleDown as WithdrawIcon,
  Robot as AutoTradingIcon,
  Sliders as InstrumentsIcon
} from "@phosphor-icons/react";

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
  }, [isForexMarketOpen, nextOpen]);
  
  // On mount, if market is closed and forex tab is active, switch to crypto tab
  useEffect(() => {
    if (!isForexMarketOpen && activeTab === "forex") {
      setActiveTab("crypto");
    }
    // eslint-disable-next-line
  }, []);

  // Remove the effect that auto-selects the first pair when tab or filteredPairs changes
  // useEffect(() => {
  //   // Only auto-select if no pair is currently selected or if tabs were switched
  //   if ((filteredPairs.length > 0 && !selectedPair) || 
  //       (filteredPairs.length > 0 && selectedPair && !filteredPairs.some(p => p.symbol === selectedPair.symbol))) {
  //     handlePairClick(filteredPairs[0]);
  //   }
  // }, [activeTab, filteredPairs, selectedPair, handlePairClick]);
  
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

  // State for TradingView Calendar Dialog
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendarOpen && calendarRef.current) {
      // Remove any previous widget
      calendarRef.current.innerHTML = "";
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
      script.async = true;
      script.innerHTML = JSON.stringify({
        width: "100%",
        height: "100%",
        colorTheme: "dark",
        isTransparent: false,
        locale: "en",
        importanceFilter: "-1,0,1"
      });
      calendarRef.current.appendChild(script);
    }
  }, [calendarOpen]);

  return (
    <>
      {/* TradingView Calendar Dialog */}
      {calendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          style={{ backdropFilter: "blur(2px)" }}
          onClick={() => setCalendarOpen(false)}
        >
          <div
            className="bg-background rounded-lg shadow-lg relative w-full max-w-2xl h-[80vh] flex flex-col"
            style={{ minWidth: 340, maxWidth: 600 }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-xl text-muted-foreground hover:text-destructive"
              onClick={() => setCalendarOpen(false)}
              title="Close"
              style={{ zIndex: 10 }}
            >
              <X />
            </button>
            <div className="flex-1 overflow-hidden p-2">
              {/* TradingView Widget BEGIN */}
              <div
                ref={calendarRef}
                className="tradingview-widget-container"
                style={{ height: "100%" }}
              />
              {/* TradingView Widget END */}
            </div>
          </div>
        </div>
      )}
      {/* Sidebar Corner Buttons - Only show on desktop */}
      {!isMobile && (
        <div className="fixed top-[48px] left-0 h-[calc(100vh-48px)] w-[48px] bg-background border-r border-border/30 flex flex-col items-center justify-start py-2 shadow-sm z-20 gap-1">
          {/* Instruments Button (replaces menu icon) */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 flex flex-col items-center justify-center rounded-md mb-1 group data-[state=active]:bg-primary/10 data-[state=active]:text-primary
              ${!isCollapsed ? "bg-primary/10 text-primary" : ""}
            `}
            onClick={toggleCollapse}
            title="Instruments"
          >
            <InstrumentsIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
            <span className="text-[10px] mt-0.5 text-muted-foreground group-hover:text-primary">Station</span>
          </Button>
          {/* Deposit */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md mb-1 group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={() => window.location.assign('/cashier')}
            title="Deposit"
          >
            <DepositIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
            <span className="text-[10px] mt-0.5 text-muted-foreground group-hover:text-primary">Funds</span>
          </Button>
          {/* Withdraw */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md mb-1 group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={() => window.location.assign('/cashier?payouts=1')}
            title="Withdraw"
          >
            <WithdrawIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
            <span className="text-[10px] mt-0.5 text-muted-foreground group-hover:text-primary">Payouts</span>
          </Button>
          {/* Calendar */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md mb-1 group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={() => setCalendarOpen(true)}
            title="Calendar"
          >
            <CalendarIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
            <span className="text-[10px] mt-0.5 text-muted-foreground group-hover:text-primary">Calendar</span>
          </Button>
          {/* Auto Trading */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={() => window.location.assign('/plans')}
            title="Auto Trading"
          >
            <AutoTradingIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
            <span className="text-[10px] mt-0.5 text-muted-foreground group-hover:text-primary">Auto</span>
          </Button>
        </div>
      )}
      
      {/* Trading Station Sidebar - Adjust for mobile */}
      {showContent && (
        <div className={`
          ${isMobile 
            ? "fixed top-[48px] left-0 w-full h-[calc(100vh-48px)] pb-14 bg-background z-30"
            : "fixed top-[48px] left-[48px] h-[calc(100vh-48px)] w-[320px] bg-background border-r border-border/20 shadow-md"
          } 
          flex flex-col p-3 transition-all duration-300 overflow-y-auto
        `}>
          {/* Header - Compact */}
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-semibold">
              {isMobile ? "Markets" : "Trading Station"}
            </h1>
          </div>
          
          {/* Search bar - Compact */}
          <div className="relative mb-3">
            <MagnifyingGlass className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pairs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2 h-8 text-sm rounded-md bg-muted/40 border border-border/20 focus:border-primary/40 transition-colors"
            />
          </div>
          
          {/* Tab buttons - Sleek pill style */}
          <div className="flex gap-1 mb-3 w-full bg-muted/10 rounded-lg p-1">
            <Button
              variant={activeTab === "crypto" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("crypto")}
              className={`flex-1 h-8 rounded-md text-sm font-medium ${activeTab === "crypto" ? "shadow" : ""}`}
            >
              <Coins className="h-4 w-4 mr-1" />
              Crypto
            </Button>
            <Button
              variant={activeTab === "forex" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("forex")}
              className={`flex-1 h-8 rounded-md text-sm font-medium ${activeTab === "forex" ? "shadow" : ""}`}
            >
              <Globe className="h-4 w-4 mr-1" />
              Forex
            </Button>
          </div>
          {/* Market pairs grid - Compact, elegant cards */}
          <div className="grid grid-cols-1 gap-1 overflow-y-auto">
            {filteredPairs.map((pair) => {
              const decimals = getPriceDecimals(pair.symbol);
              const isUp = animatedPairs[pair.symbol];
              return (
                <Button
                  key={pair.symbol}
                  variant={selectedPair?.symbol === pair.symbol ? "secondary" : "ghost"}
                  className={`
                    flex items-center justify-between px-3 py-2 h-12 min-h-0
                    border border-border/20 rounded-md
                    group transition-all duration-200
                    ${selectedPair?.symbol === pair.symbol
                      ? "bg-primary/10 text-primary border-primary/40 shadow"
                      : "hover:bg-muted/30 hover:text-foreground"}
                  `}
                  onClick={() => handlePairSelection(pair)}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        pair.symbol.endsWith("USDT")
                          ? getCryptoImageForSymbol(pair.symbol)
                          : getForexImageForSymbol(pair.symbol)
                      }
                      alt={pair.symbol}
                      className="h-6 w-6 rounded-full border border-border/20"
                    />
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-sm group-hover:text-foreground/90 transition-colors">
                        {formatPairName(pair.symbol)}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                        {getFullName(pair.symbol)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      key={pair.symbol + "-" + pair.price}
                      className={`font-mono font-medium text-base transition-all duration-500 ${getPriceChangeClass(isUp)}`}
                    >
                      {renderPriceWithBigDigits(pair.price, decimals)}
                    </div>
                  </div>
                </Button>
              );
            })}
            
            {/* Show empty state if no pairs match the search */}
            {filteredPairs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <div className="text-3xl mb-1">🔍</div>
                <p className="text-base">
                  {activeTab === "forex" && !isForexMarketOpen
                    ? "Markets are closed today."
                    : "No matching pairs found"}
                </p>
                <p className="text-xs">
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
