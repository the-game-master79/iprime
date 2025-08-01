import { Button } from "@/components/ui/button";
import { Input, LotsInput } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom";

// Import the chart component so we can use it in mobile view
import MiniChart from "@/components/tradingstation/MiniChart"; 

interface PriceData {
  price: string;
  symbol: string;
  isPriceUp?: boolean;
}

interface TradingPanelProps {
  selectedPair: PriceData | null;
  quantity: number;
  setQuantity: (value: number) => void;
  selectedLeverage: string;
  handleLeverageChange: (leverage: string) => void;
  leverageOptions: string[];
  margin: number;
  balance: number;
  freeMargin: number;
  usedMargin: number;
  localPrices: Record<string, PriceData>;
  handlePlaceTrade: (type: "Buy" | "Sell") => void;
  calculatePipValue: () => { usd: string; quote: string };
  calculateVolumeWithLeverage: () => string;
  getQuoteCurrency: () => string;
  calculateActualVolume: () => number;
  formatLargeNumber: (num: number) => string;
  orderType: "market" | "limit";
  setOrderType: (type: "market" | "limit") => void;
  getFullName: (symbol: string) => string;
  getCryptoImageForSymbol: (symbol: string) => string;
  getForexImageForSymbol: (symbol: string) => string;
  isMobile?: boolean;
  timezone?: string; // Add timezone for chart
  totalOpenPnL?: number; // Add total PnL prop
  closeAllTrades?: () => void; // Add closeAllTrades function prop
  openCount?: number; // Add open positions count for button visibility
  lotsLimits: { min: number; max: number };
  isForexTimeActive?: boolean; // <-- Add this prop
}

const TradingPanel = ({
  selectedPair,
  quantity,
  setQuantity,
  selectedLeverage,
  handleLeverageChange,
  leverageOptions,
  margin,
  balance,
  freeMargin,
  usedMargin,
  localPrices,
  handlePlaceTrade,
  calculatePipValue,
  calculateVolumeWithLeverage,
  getQuoteCurrency,
  calculateActualVolume,
  formatLargeNumber,
  orderType,
  setOrderType,
  getFullName,
  getCryptoImageForSymbol,
  getForexImageForSymbol,
  isMobile = false,
  timezone = "Etc/UTC",
  totalOpenPnL = 0,
  closeAllTrades = () => {},
  openCount = 0,
  lotsLimits,
  isForexTimeActive = false, // <-- Default to false
}: TradingPanelProps) => {
  // Add state to control the custom dialog
  const [showFeesDialog, setShowFeesDialog] = useState(false);

  // --- FIX: Reset PnL display when all trades are closed (mobile) ---
  // Add a local state to track the displayed PnL for mobile
  const [mobilePnL, setMobilePnL] = useState<number>(totalOpenPnL);

  // When openCount becomes 0, clear the mobilePnL
  useEffect(() => {
    if (openCount === 0) {
      setMobilePnL(0);
      // Strictly clear any persisted PnL here if needed (e.g., session/localStorage)
      // localStorage.removeItem("lastPnL"); // Uncomment if you persist PnL elsewhere
    } else {
      setMobilePnL(totalOpenPnL);
      // Optionally persist PnL if needed
      // localStorage.setItem("lastPnL", totalOpenPnL.toString());
    }
  }, [openCount, totalOpenPnL]);

  // Helper function to get TradingView symbol format
  const getTradingViewSymbol = (pair: PriceData | null): string => {
    if (!pair) return "";
    const { symbol } = pair;

    if (symbol.endsWith("USDT")) return `BINANCE:${symbol}`;
    if (symbol === "XAUUSD") return "OANDA:XAUUSD";
    if (symbol.startsWith("FX:")) return symbol;
    if (symbol.includes(":")) return symbol;
    return `FX:${symbol}`;
  };
  
  // 0% Fees Dialog
  const renderFeesDialog = () => {
    if (!showFeesDialog) return null;
    return ReactDOM.createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
        <div className="bg-background rounded-lg shadow-lg max-w-md w-[90vw] overflow-hidden border border-border">
          <div className="p-6 flex flex-col items-center">
            <h3 className="text-2xl font-bold mb-4 text-success">Enjoy True 0% Fees</h3>
            <div className="grid grid-cols-1 gap-4 w-full">
              <div className="flex items-center gap-4 bg-success/10 rounded-lg p-4 w-full">
                <span className="text-5xl font-extrabold text-success">0 USD</span>
                <span className="text-xl font-medium text-success">Swap</span>
              </div>
              <div className="flex items-center gap-4 bg-success/10 rounded-lg p-4 w-full">
                <span className="text-5xl font-extrabold text-success">0%</span>
                <span className="text-xl font-medium text-success">Fees</span>
              </div>
              <div className="flex items-center gap-4 bg-success/10 rounded-lg p-4 w-full">
                <span className="text-5xl font-extrabold text-success">0%</span>
                <span className="text-xl font-medium text-success">Commissions</span>
              </div>
              <div className="flex items-center gap-4 bg-success/10 rounded-lg p-4 w-full">
                <span className="text-5xl font-extrabold text-success">0%</span>
                <span className="text-xl font-medium text-success">Holding Fees</span>
              </div>
              <div className="flex items-center gap-4 bg-success/10 rounded-lg p-4 w-full">
                <span className="text-5xl font-extrabold text-success">0%</span>
                <span className="text-xl font-medium text-success">Night Swaps</span>
              </div>
            </div>
            <button
              className="mt-6 px-6 py-2 bg-success hover:bg-success/80 text-white rounded-lg font-medium transition-colors"
              onClick={() => setShowFeesDialog(false)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Helper to get min/max lots for current pair, with max lots based on free margin
  const getLotsLimits = () => {
    if (!selectedPair) return { min: 0.01, max: 100 };
    const staticLimits = lotsLimits || { min: 0.01, max: 100 };
    // Estimate margin per lot
    let marginPerLot = 0;
    if (quantity > 0) {
      marginPerLot = margin / quantity;
    } else {
      // Estimate using min lot
      const minLot = staticLimits.min;
      marginPerLot = minLot > 0 ? (margin / (quantity || minLot)) : 0;
    }
    // Prevent division by zero
    if (!marginPerLot || marginPerLot <= 0) {
      return { min: staticLimits.min, max: staticLimits.max };
    }
    // Calculate max lots based on free margin
    const maxLotsByMargin = Math.floor((freeMargin / marginPerLot) * 100000) / 100000; // 5 decimals
    const maxLots = Math.max(staticLimits.min, Math.min(staticLimits.max, parseFloat(maxLotsByMargin.toFixed(5))));
    return { min: staticLimits.min, max: maxLots };
  };

  // Force orderType to "market" always
  if (orderType !== "market") {
    setOrderType("market");
  }

  // Add this helper to format price with big digits for bid/ask
  const renderPriceWithBigDigits = (value: string | number | undefined, decimals: number) => {
    if (value === undefined) return "-";
    const str = Number(value).toFixed(decimals);

    if (decimals === 2) {
      // Make the last 2 digits (including the decimal point) bigger
      if (str.length < 4) return str;
      const normal = str.slice(0, -3); // up to before ".dd"
      const big = str.slice(-3); // ".dd"
      return (
        <>
          {normal}
          <span className="text-2xl font-bold">{big}</span>
        </>
      );
    } else if (decimals > 2) {
      // Make the last 2 digits bigger
      const normal = str.slice(0, -2);
      const big = str.slice(-2);
      return (
        <>
          {normal}
          <span className="text-2xl font-bold">{big}</span>
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

  // Helper to check if selected pair is forex
  const isSelectedPairForex = selectedPair && !selectedPair.symbol.endsWith("USDT") && selectedPair.symbol !== "XAUUSD";

  // Helper to get the correct quote currency for a symbol
  const getPanelQuoteCurrency = (symbol: string) => {
    if (!symbol) return "";
    if (symbol.endsWith("USDT")) return "USDT";
    if (symbol.endsWith("USD")) return "USD";
    if (symbol === "XAUUSD") return "USD";
    // For forex, quote is last 3 chars, but avoid slicing into the base for USD pairs
    if (symbol.length > 6) return symbol.slice(-3);
    return "";
  };

  return (
    <div className={`
      ${isMobile 
        ? "w-full h-full pb-16 overflow-y-auto"
        : "fixed top-16 right-0 h-[calc(100%-4rem)] w-[350px] bg-muted/10 border-l border-border/50"
      } flex flex-col p-0`}
    >
      {/* Remove our custom close all dialog */}
      {renderFeesDialog()}
      
      {selectedPair ? (
        <div className="p-4 flex flex-col flex-1 h-full">
          {/* Mobile-specific title bar with PnL display (no X button) */}
          {isMobile && (
            <div className="mb-4 mt-16 pb-2 border-b border-border/50">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Trading Station</h1>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground">Live P&L</span>
                    {/* STRICT FIX: Only show PnL if there are open trades */}
                    {openCount === 0 ? (
                      <span className="font-medium text-gray-400">No trades</span>
                    ) : (
                      <span className={`font-bold ${mobilePnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ${mobilePnL.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {/* REMOVE: X button for closing all trades */}
                  {/* (No button here anymore) */}
                </div>
              </div>
            </div>
          )}
          
          {/* Display full symbol name with logo - Only on desktop */}
          {!isMobile && (
            <div className="flex items-center gap-3 mb-4">
              {selectedPair?.symbol.endsWith("USDT") ? (
                <img
                  src={getCryptoImageForSymbol(selectedPair.symbol)}
                  alt={selectedPair.symbol}
                  className="h-8 w-8"
                />
              ) : (
                <img
                  src={getForexImageForSymbol(selectedPair.symbol)}
                  alt={selectedPair.symbol}
                  className="h-8 w-8"
                />
              )}
              <h2 className="text-xl font-semibold">
                {getFullName(selectedPair.symbol)}
              </h2>
            </div>
          )}

          {/* Add mini chart for mobile view */}
          {isMobile && (
            <div className="mb-3 mt-0 h-[400px] bg-muted/5 rounded-lg overflow-hidden">
              <MiniChart 
                symbol={getTradingViewSymbol(selectedPair)} 
                timezone={timezone} 
              />
            </div>
          )}

          {/* Tab switch for Market and Limit orders - HIDDEN */}
          {/* 
          <div className={`flex gap-1 ${isMobile ? 'mb-2' : 'mb-4'} bg-muted/20 rounded-xl p-1`}>
            <Button
              variant={orderType === "market" ? "default" : "outline"}
              className={`flex-1 text-sm ${isMobile ? 'py-0.5 text-xs' : 'py-1'}`}
              onClick={() => setOrderType("market")}
            >
              Market
            </Button>
            <Button
              variant={orderType === "limit" ? "default" : "outline"}
              className={`flex-1 text-sm ${isMobile ? 'py-0.5 text-xs' : 'py-1'}`}
              onClick={() => setOrderType("limit")}
            >
              Limit
            </Button>
          </div>
          */}

          {/* Lots input with + and - buttons */}
          <div className={`${isMobile ? 'mb-1' : 'mb-2'}`}>
            <label className={`block ${isMobile ? 'text-[11px]' : 'text-xs'} font-medium text-foreground ${isMobile ? 'mb-0.5' : 'mb-1'} flex items-center justify-between`}>
              <span></span>
              {/* Max lots badge - click to set max lots */}
              <span
                className="ml-2 px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground cursor-pointer hover:bg-primary/10"
                style={{ fontSize: isMobile ? "9px" : "10px" }}
                title={`Set to maximum lots: ${getLotsLimits().max}`}
                onClick={() => setQuantity(getLotsLimits().max)}
              >
                Max {getLotsLimits().max}
              </span>
            </label>
            <LotsInput
              label="Lots"
              value={quantity}
              min={getLotsLimits().min}
              max={getLotsLimits().max}
              step={0.01}
              onChange={setQuantity}
              disabled={balance <= 0 || margin > freeMargin}
              className="w-full"
            />
            {/* Insufficient balance or margin warning */}
            {(balance <= 0 || margin > freeMargin) && (
              <div className="mt-0.5 text-error text-[11px] flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-error" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                {balance <= 0
                  ? "Insufficient balance"
                  : `Insufficient free margin (Available: $${freeMargin.toFixed(2)})`}
              </div>
            )}
          </div>

          {/* Buy and Sell buttons - Smaller on mobile */}
          <div className={`flex gap-3 ${isMobile ? 'mt-2' : 'mt-4'}`}>
            <button
              className={`flex-1 ${isMobile ? 'h-16 px-3' : 'h-20 pl-5'} bg-error text-white hover:bg-error/80 text-left items-start rounded-lg ${
                balance <= 0 || margin > freeMargin || (isForexTimeActive && isSelectedPairForex) ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => handlePlaceTrade("Sell")}
              disabled={balance <= 0 || margin > freeMargin || (isForexTimeActive && isSelectedPairForex)}
            >
              <div className="flex flex-col items-start">
                <span className={`w-full ${isMobile ? 'text-sm' : 'text-md'} font-regular`}>Sell</span>
                <span className={`${isMobile ? 'text-base' : 'text-lg'} w-full font-bold font-mono`}>
                  {renderPriceWithBigDigits(
                    localPrices[selectedPair.symbol]?.price || selectedPair.price,
                    getPriceDecimals(selectedPair.symbol)
                  )}
                </span>
              </div>
            </button>
            <button
              className={`flex-1 ${isMobile ? 'h-16 px-3' : 'h-20 pl-5'} bg-primary text-white hover:bg-primary/80 text-left items-start rounded-lg ${
                balance <= 0 || margin > freeMargin || (isForexTimeActive && isSelectedPairForex) ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => handlePlaceTrade("Buy")}
              disabled={balance <= 0 || margin > freeMargin || (isForexTimeActive && isSelectedPairForex)}
            >
              <div className="flex flex-col items-start">
                <span className={`w-full ${isMobile ? 'text-sm' : 'text-md'} font-regular`}>Buy</span>
                <span className={`${isMobile ? 'text-base' : 'text-lg'} w-full font-bold font-mono`}>
                  {renderPriceWithBigDigits(
                    localPrices[selectedPair.symbol]?.price || selectedPair.price,
                    getPriceDecimals(selectedPair.symbol)
                  )}
                </span>
              </div>
            </button>
          </div>

          {/* Grid Section - Enhanced for mobile */}
          <div className={`space-y-1.5 ${isMobile ? 'mt-1 text-[11px]' : 'mt-2 text-xs'} ${isMobile ? 'bg-secondary p-2 rounded-lg' : ''}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Margin:</span>
              <span className={`font-bold font-mono ${margin > balance ? "text-error" : ""}`}>
                ${margin.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Leverage:</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="font-bold font-mono text-primary underline">
                    {selectedLeverage}x
                  </button>
                </DialogTrigger>
                <DialogContent className={`p-0 rounded-2xl shadow-2xl bg-background border-0 ${isMobile ? 'w-[95vw] max-w-[420px]' : 'w-[420px]'}`}>
                  <div className="p-6">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-center text-primary mb-2">Select Leverage</DialogTitle>
                    </DialogHeader>
                    {/* Risk Progress Bar */}
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-xs text-muted-foreground mb-1">Risk Level</span>
                      <div className="w-full flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-success/20 relative overflow-hidden">
                          <div
                            className={`
                              h-2 rounded-full transition-all duration-300
                              ${parseInt(selectedLeverage) <= 20
                                ? "bg-success/80 w-1/4"
                                : parseInt(selectedLeverage) <= 500
                                ? "bg-warning/80 w-2/4"
                                : "bg-error/80 w-full"}
                            `}
                          ></div>
                        </div>
                        <span className={`
                          text-xs font-bold
                          ${parseInt(selectedLeverage) <= 20
                            ? "text-success"
                            : parseInt(selectedLeverage) <= 500
                            ? "text-warning"
                            : "text-error"}
                        `}>
                          {parseInt(selectedLeverage) <= 20
                            ? "Low"
                            : parseInt(selectedLeverage) <= 500
                            ? "Medium"
                            : "High"}
                        </span>
                      </div>
                    </div>
                    {/* Selected Leverage Card */}
                    <div
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl mb-8 shadow
                        ${parseInt(selectedLeverage) <= 20
                          ? "bg-success/10 border border-success/30"
                          : parseInt(selectedLeverage) <= 500
                          ? "bg-warning/10 border border-warning/30"
                          : "bg-error/10 border border-error/30"}
                      `}
                    >
                      <span className="text-4xl font-extrabold mb-1">
                        {selectedLeverage}x
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {parseInt(selectedLeverage) <= 20
                          ? "Low Risk"
                          : parseInt(selectedLeverage) <= 500
                          ? "Medium Risk"
                          : "High Risk"}
                      </span>
                    </div>
                    {/* Leverage Options */}
                    <div className="space-y-7">
                      {/* Low Risk */}
                      {leverageOptions.some((leverage) => parseInt(leverage) <= 20) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20 text-success">
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="7" /><path d="M5 8l2 2 4-4" /></svg>
                            </span>
                            <h3 className="text-base font-semibold text-green-700">Low Risk (2-20x)</h3>
                          </div>
                          <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-5'} gap-2`}>
                            {leverageOptions.filter((leverage) => parseInt(leverage) <= 20).map((leverage) => (
                              <button
                                key={leverage}
                                className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all duration-200 shadow-sm
                                  ${selectedLeverage === leverage
                                    ? "bg-success/80 text-white border-success/80 scale-105"
                                    : "bg-success/10 text-success border-success/30 hover:bg-success/20"}
                                `}
                                onClick={() => handleLeverageChange(leverage)}
                              >
                                {leverage}x
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Medium Risk */}
                      {leverageOptions.some((leverage) => parseInt(leverage) > 20 && parseInt(leverage) <= 500) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning/20 text-warning">
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="7" /><path d="M8 5v3l2 2" /></svg>
                            </span>
                            <h3 className="text-base font-semibold text-yellow-700">Medium Risk (21-500x)</h3>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {leverageOptions.filter((leverage) => parseInt(leverage) > 20 && parseInt(leverage) <= 500).map((leverage) => (
                              <button
                                key={leverage}
                                className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all duration-200 shadow-sm
                                  ${selectedLeverage === leverage
                                    ? "bg-warning/80 text-white border-warning/80 scale-105"
                                    : "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20"}
                                `}
                                onClick={() => handleLeverageChange(leverage)}
                              >
                                {leverage}x
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* High Risk */}
                      {leverageOptions.some((leverage) => parseInt(leverage) > 500) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-error/20 text-error">
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="7" /><path d="M8 5v4" /><circle cx="8" cy="11" r="1" /></svg>
                            </span>
                            <h3 className="text-base font-semibold text-red-700">High Risk (500x+)</h3>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {leverageOptions.filter((leverage) => parseInt(leverage) > 500).map((leverage) => (
                              <button
                                key={leverage}
                                className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all duration-200 shadow-sm
                                  ${selectedLeverage === leverage
                                    ? "bg-error/80 text-white border-error/80 scale-105"
                                    : "bg-error/10 text-error border-error/30 hover:bg-error/20"}
                                `}
                                onClick={() => handleLeverageChange(leverage)}
                              >
                                {leverage}x
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* No Leverage Available */}
                      {!leverageOptions.length && (
                        <div className="text-center text-gray-400 py-8">
                          No leverage options available for this pair.
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Pip Value:</span>
              <span className="font-bold font-mono">
                {selectedPair && selectedPair.symbol.endsWith("USDT")
                  ? `$${calculatePipValue().usd}`
                  : selectedPair && selectedPair.symbol === "XAUUSD"
                  ? `${calculatePipValue().usd} USD`
                  : selectedPair && getQuoteCurrency() === "USD"
                  ? `${calculatePipValue().usd} USD`
                  : selectedPair
                  ? `${calculatePipValue().usd} USD ~ ${calculatePipValue().quote}`
                  : "$0.00"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Volume:</span>
              <span className="font-bold font-mono">
                {calculateVolumeWithLeverage()} {selectedPair ? getPanelQuoteCurrency(selectedPair.symbol) : ""}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Value:</span>
              <span className="font-bold font-mono">
                {formatLargeNumber(calculateActualVolume())} {selectedPair ? getPanelQuoteCurrency(selectedPair.symbol) : ""}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Used Margin:</span>
              <span className="font-bold font-mono">${usedMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Free Margin:</span>
              <span className="font-bold font-mono">${freeMargin.toFixed(2)}</span>
            </div>
          </div>

          {/* Add badge at the bottom - Only on desktop */}
          {!isMobile && (
            <div className="mt-auto flex flex-col">
            <Button
              onClick={() => setShowFeesDialog(true)}
              className="mt-6 w-full text-sm font-medium bg-success/10 text-success hover:bg-success/20 transition rounded-lg py-2"
            >
              🎁 Enjoy 0% Fees on All Trades
            </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 flex flex-col items-center justify-center h-full">
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-base font-medium text-muted-foreground mb-1">
              Select a pair to trade
            </p>
            {isMobile && (
              <p className="text-[11px] text-muted-foreground">
                Tap on "Market" in the bottom navigation to browse available markets
              </p>
            )}
          </div>
        </div>
      )}
      {/* For mobile, show the badge at the bottom as well */}
      {isMobile && selectedPair && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90vw] z-40">
          <button
            className="w-full bg-success/10 text-success text-center py-2 rounded-lg font-medium hover:bg-success/20 transition-colors shadow"
            onClick={() => setShowFeesDialog(true)}
            type="button"
          >
            0% fees for your Account
          </button>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;
