import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { House, Sun, Moon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";
import { useMemo } from "react";

interface PriceData {
  price: string;
  symbol: string;
  isPriceUp?: boolean;
}

interface NavbarProps {
  balance: number;
  isMobile?: boolean;
  toggleMobileMenu?: () => void;
  selectedPairs?: PriceData[];
  handleRemovePair?: (symbol: string) => void;
  getCryptoImageForSymbol?: (symbol: string) => string;
  getForexImageForSymbol?: (symbol: string) => string;
  formatPairName?: (symbol: string) => string;
  localPrices?: Record<string, PriceData>;
  onPairClick?: (pair: PriceData) => void;
  selectedPairSymbol?: string; // <-- Add this prop
}

const Navbar = ({
  balance,
  isMobile = false,
  toggleMobileMenu,
  selectedPairs = [],
  handleRemovePair,
  getCryptoImageForSymbol = () => "",
  getForexImageForSymbol = () => "",
  formatPairName = (s) => s,
  localPrices = {},
  onPairClick,
  selectedPairSymbol, // <-- Add this
}: NavbarProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Animation helpers (copied from Sidebar)
  const getPriceChangeClass = (isUp?: boolean) => {
    if (isUp === undefined) return "";
    return isUp ? "text-green-500" : "text-red-500";
  };
  // Helper to get decimals for a symbol
  const getPriceDecimals = (symbol: string) => {
    if (symbol === "XAUUSD") return 2;
    if (symbol.endsWith("JPY")) return 3;
    if (symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT" || symbol === "LINKUSDT" || symbol === "BNBUSDT") return 2;
    if (symbol === "DOGEUSDT") return 5;
    if (symbol === "ADAUSDT" || symbol === "TRXUSDT") return 4;
    if (symbol === "DOTUSDT") return 3;
    if (!symbol.endsWith("USDT")) return 5;
    return 2;
  };
  // Helper to render price with big digits
  const renderPriceWithBigDigits = (value: string | number | undefined, decimals: number) => {
    if (value === undefined) return "-";
    const str = Number(value).toFixed(decimals);
    if (decimals === 2) {
      const dotIdx = str.indexOf(".");
      if (dotIdx <= 0) return str;
      const before = str.slice(0, dotIdx - 1);
      const big = str.slice(dotIdx - 1, dotIdx + 1);
      const after = str.slice(dotIdx + 1);
      return (
        <>
          {before}
          <span className="text-lg font-bold">{big}</span>
          {after}
        </>
      );
    } else if (decimals > 2) {
      const normal = str.slice(0, -2);
      const big = str.slice(-2);
      return (
        <>
          {normal}
          <span className="text-lg font-bold">{big}</span>
        </>
      );
    }
    return str;
  };

  // Memoize selectedPairs rendering to debounce rapid localPrices updates
  const renderedPairs = useMemo(() => (
    selectedPairs.map((pair) => {
      const isSelected = selectedPairSymbol === pair.symbol;
      return (
        <div
          key={pair.symbol}
          className={`
            flex items-center gap-2 px-2 py-1 rounded-md border border-border/40 shadow min-w-[80px] max-w-[130px] cursor-pointer
            ${isSelected
              ? "bg-primary/20 border-primary outline outline-1 outline-primary z-10"
              : "bg-secondary hover:bg-primary/10 hover:border-primary/40"}
            transition-all
          `}
          style={
            isSelected
              ? { padding: "0.18rem 0.7rem", overflow: "visible", boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)" }
              : { boxShadow: "0 1px 4px 0 rgba(0,0,0,0.03)" }
          }
          title={pair.symbol}
          onClick={() => onPairClick?.(pair)}
        >
          <img
            src={
              pair.symbol.endsWith("USDT")
                ? getCryptoImageForSymbol(pair.symbol)
                : getForexImageForSymbol(pair.symbol)
            }
            alt={pair.symbol}
            className="h-5 w-5 rounded-full border border-border/30 object-contain"
            style={{ boxShadow: "0 1px 3px 0 rgba(0,0,0,0.07)" }}
          />
          <span
            className="font-semibold text-xs truncate"
            style={isSelected ? { overflow: "visible", textOverflow: "unset", whiteSpace: "nowrap", maxWidth: "none", color: "var(--primary)" } : { maxWidth: 60 }}
          >
            {formatPairName(pair.symbol)}
          </span>
          {handleRemovePair && (
            <button
              className="ml-1 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-full px-1"
              style={{ lineHeight: 1, fontWeight: 700, fontSize: 14 }}
              onClick={e => {
                e.stopPropagation();
                handleRemovePair(pair.symbol);
              }}
              title="Remove"
            >
              ×
            </button>
          )}
        </div>
      );
    })
  ), [selectedPairs, selectedPairSymbol, getCryptoImageForSymbol, getForexImageForSymbol, formatPairName, onPairClick, handleRemovePair]);

  return (
    <nav
      className="fixed top-0 left-0 w-full h-12 bg-background/80 border-b border-border/50 flex items-center px-3 justify-between z-50 shadow-sm backdrop-blur-md"
      style={{ minHeight: 48 }}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg p-0 hover:bg-primary/10 transition"
          onClick={() => navigate("/platform")}
          title="Home"
        >
          <House size={20} weight="bold" />
        </Button>
        <button
          onClick={() => window.location.reload()}
          className="focus:outline-none ml-1"
          title="Refresh"
          style={{ borderRadius: 8, padding: 0, background: "none", border: "none" }}
        >
          <img
            src={theme === "dark"
              ? "/cf-dark.svg"
              : "/cf-light.svg"
            }
            alt="CloudForex Logo"
            className="h-5"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.07))" }}
          />
        </button>
        {!isMobile && selectedPairs.length > 0 && (
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted/40 scrollbar-track-transparent py-0.5">
              {renderedPairs}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg bg-secondary-foreground text-primary hover:bg-primary/10 transition"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-yellow-400" weight="bold" />
          ) : (
            <Moon className="h-5 w-5 text-blue-500" weight="bold" />
          )}
        </Button>
        <div
          className="bg-secondary text-xs font-semibold px-3 py-1 rounded-lg flex items-center cursor-pointer hover:bg-primary/10 transition h-9"
          style={{ minWidth: 60, fontSize: 15, letterSpacing: 0.2 }}
          onClick={() => navigate("/cashier")}
          title="Go to Cashier"
        >
          {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
