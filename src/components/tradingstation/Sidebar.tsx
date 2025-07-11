import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MagnifyingGlass, 
  X,
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
  type?: "crypto" | "forex";
}

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredPairs: PriceData[];
  selectedPair: PriceData | null;
  handlePairClick: (pair: PriceData) => void;
  formatPairName: (symbol: string) => string;
  getFullName: (symbol: string) => string;
  getCryptoImageForSymbol: (symbol: string) => string;
  isMobile?: boolean;
  closeMobileMenu?: () => void;
  navigateToTradeTab?: () => void;
  isMarketSlow?: boolean;
  onDepositClick?: () => void;
  onPayoutClick?: () => void;
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
  filteredPairs,
  selectedPair,
  handlePairClick,
  formatPairName,
  getFullName,
  getCryptoImageForSymbol,
  isMobile = false,
  closeMobileMenu,
  navigateToTradeTab,
  isMarketSlow = false,
  onDepositClick,
  onPayoutClick,
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
  


  // Remove the effect that auto-selects the first pair when tab or filteredPairs changes
  // useEffect(() => {
  //   // Only auto-select if no pair is currently selected or if tabs were switched
  //   if ((filteredPairs.length > 0 && !selectedPair) || 
  //       (filteredPairs.length > 0 && selectedPair && !filteredPairs.some(p => p.symbol === selectedPair.symbol))) {
  //     handlePairClick(filteredPairs[0]);
  const handlePairSelection = (pair: PriceData) => {
    handlePairClick(pair);
    if (isMobile && closeMobileMenu) {
      closeMobileMenu();
    }
    if (navigateToTradeTab) {
      navigateToTradeTab();
    }
  };

  const renderPriceWithBigDigits = (value: string | number | undefined) => {
    if (value === undefined) return "-";
    const str = value.toString();
    if (str.length > 2) {
      const normal = str.slice(0, -2);
      const big = str.slice(-2);
      return (
        <>
          <span className="font-normal">{normal}</span>
          <span className="text-lg font-bold">{big}</span>
        </>
      );
    }
    return <span className="font-normal">{str}</span>;
  };

  const prevPricesRef = useRef<{ [symbol: string]: number }>({});
  const [animatedPairs, setAnimatedPairs] = useState<{ [symbol: string]: boolean | undefined }>({});

  useEffect(() => {
    setAnimatedPairs((prevAnimated) => {
      const newAnimated: { [symbol: string]: boolean | undefined } = {};
      filteredPairs.forEach(pair => {
        const prev = prevPricesRef.current[pair.symbol];
        const curr = Number(pair.price);
        if (prev !== undefined && !isNaN(curr)) {
          if (curr > prev) {
            newAnimated[pair.symbol] = true; 
          } else if (curr < prev) {
            newAnimated[pair.symbol] = false; 
          } else {
            newAnimated[pair.symbol] = prevAnimated[pair.symbol]; 
          }
        }
        prevPricesRef.current[pair.symbol] = curr;
      });
      return newAnimated;
    });
  }, [filteredPairs]);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendarOpen && calendarRef.current) {
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
              <div
                ref={calendarRef}
                className="tradingview-widget-container"
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </div>
      )}
      {!isMobile && (
        <div className="fixed top-[48px] left-0 h-[calc(100vh-48px)] w-[48px] bg-background border-r border-border/30 flex flex-col items-center justify-start py-2 shadow-sm z-20 gap-1">
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
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md mb-1 group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={onDepositClick}
            title="Deposit"
            disabled={!onDepositClick}
          >
            <DepositIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md mb-1 group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={onPayoutClick}
            title="Withdraw"
            disabled={!onPayoutClick}
          >
            <WithdrawIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md mb-1 group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={() => setCalendarOpen(true)}
            title="Calendar"
          >
            <CalendarIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex flex-col items-center justify-center rounded-md group data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            onClick={() => window.location.assign('/plans')}
            title="Auto Trading"
          >
            <AutoTradingIcon className="h-6 w-6 group-hover:text-primary transition-colors" />
          </Button>
        </div>
      )}
      
      {showContent && (
        <div className={`
          ${isMobile 
            ? "fixed top-[48px] left-0 w-full h-[calc(100vh-48px)] pb-14 bg-background z-30"
            : "fixed top-[48px] left-[48px] h-[calc(100vh-48px)] w-[320px] bg-background border-r border-border/20 shadow-md"
          } 
          flex flex-col p-3 transition-all duration-300 overflow-y-auto
        `}>
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-semibold">
              {isMobile ? "Markets" : "Trading Station"}
            </h1>
          </div>
          <div className="relative mb-3">
            <MagnifyingGlass className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              label="Search markets"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              rightIcon={<MagnifyingGlass className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-1 overflow-y-auto">
            {filteredPairs.map((pair) => {
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
                  <img
                    src={getCryptoImageForSymbol(pair.symbol)}
                    alt={pair.symbol}
                    className="h-5 w-5 rounded-full mr-2"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-coin.png';
                    }}
                  />
                  <div className="flex flex-col text-left min-w-0">
                    <span className="font-medium text-sm group-hover:text-foreground/90 transition-colors truncate">
                      {formatPairName(pair.symbol)}
                    </span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors truncate">
                      {getFullName(pair.symbol)}
                    </span>
                  </div>
                  <div
                    key={pair.symbol + "-" + pair.price}
                    className={`font-bold text-base transition-all duration-500 ${getPriceChangeClass(isUp)} whitespace-nowrap`}
                  >
                    {renderPriceWithBigDigits(pair.price)}
                  </div>
                </Button>
              );
            })}
            
            {filteredPairs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <div className="text-3xl mb-1">🔍</div>
                <p className="text-base">
                  No matching pairs found
                </p>
                <p className="text-xs">
                  Try adjusting your search term
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
