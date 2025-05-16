import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useState } from "react";

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
  leverageOptions: Record<string, string[]>;
  margin: number;
  balance: number;
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
  closeAllTrades = () => {}, // Default empty function
  openCount = 0
}: TradingPanelProps) => {
  // Add state to control the custom dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
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
  
  // Handle confirm close all trades
  const handleConfirmCloseAll = () => {
    closeAllTrades();
    setShowConfirmDialog(false);
  };
  
  // Simple custom dialog implementation without using AlertDialog
  const renderConfirmDialog = () => {
    if (!showConfirmDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-lg max-w-md w-[90vw] overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Close All Positions</h3>
            <p className="text-[#525252] mb-6">
              Are you sure you want to close all {openCount} open positions? This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmCloseAll}
              >
                Close All
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`
      ${isMobile 
        ? "w-full h-full pb-16 overflow-y-auto" // Full width/height on mobile with padding for bottom nav
        : "fixed top-16 right-0 h-[calc(100%-4rem)] w-[350px] bg-muted/10 border-l border-border/50"
      } flex flex-col p-0`}
    >
      {/* Render our custom dialog */}
      {renderConfirmDialog()}
      
      {selectedPair ? (
        <div className="p-4">
          {/* Mobile-specific title bar with PnL display and X button */}
          {isMobile && (
            <div className="mb-4 mt-16 pb-2 border-b border-border/50">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Trading Station</h1>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground">Live P&L</span>
                    {openCount === 0 ? (
                      <span className="font-medium text-gray-400">No trades</span>
                    ) : (
                      <span className={`font-bold ${totalOpenPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ${totalOpenPnL.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {/* Simple X button that opens our custom dialog */}
                  {openCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => setShowConfirmDialog(true)}
                    >
                      <X size={18} />
                    </Button>
                  )}
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

          {/* Tab switch for Market and Limit orders */}
          <div className={`flex gap-2 ${isMobile ? 'mb-2' : 'mb-4'} bg-muted p-1 rounded-2xl`}>
            <Button
              variant={orderType === "market" ? "default" : "outline"}
              className={`flex-1 text-sm ${isMobile ? 'py-0.5 text-xs' : 'py-1'}`}
              onClick={() => setOrderType("market")}
              disabled={orderType === "market"}
            >
              Market
            </Button>
            <Button
              variant={orderType === "limit" ? "default" : "outline"}
              className={`flex-1 text-sm ${isMobile ? 'py-0.5 text-xs' : 'py-1'}`}
              onClick={() => setOrderType("limit")}
              disabled={orderType === "limit"}
            >
              Limit
            </Button>
          </div>

          {/* Lots input with + and - buttons */}
          <div className={`${isMobile ? 'mb-2' : 'mb-4'}`}>
            <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium ${isMobile ? 'mb-1' : 'mb-2'}`}>
              Lots
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'}`}
                onClick={() =>
                  setQuantity((prev) => Math.max(0.01, prev - 0.01))
                }
              >
                -
              </Button>
              <Input
                type="number"
                value={quantity.toFixed(2)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setQuantity(Math.max(0.01, value)); // Enforce minimum of 0.01
                }}
                className="w-full text-center appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={0.01}
                step={0.01}
              />
              <Button
                variant="outline"
                className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'}`}
                onClick={() => setQuantity((prev) => prev + 0.01)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Buy and Sell buttons - Smaller on mobile */}
          <div className={`flex gap-3 ${isMobile ? 'mt-2' : 'mt-4'}`}>
            <button
              className={`flex-1 ${isMobile ? 'h-16 px-3' : 'h-20 pl-5'} bg-red-500 text-white hover:bg-red-600 text-left items-start rounded-lg ${
                balance <= 0 || margin > balance ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => handlePlaceTrade("Sell")}
              disabled={balance <= 0 || margin > balance}
            >
              <div className="flex flex-col items-start">
                <span className={`w-full ${isMobile ? 'text-sm' : 'text-md'} font-regular`}>Sell</span>
                <span className={`${isMobile ? 'text-base' : 'text-lg'} w-full font-bold font-mono`}>
                  {(localPrices[selectedPair.symbol]?.price || selectedPair.price).split(".")[0]}
                  <span className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>
                    .{(localPrices[selectedPair.symbol]?.price || selectedPair.price).split(".")[1] || "00"}
                  </span>
                </span>
              </div>
            </button>
            <button
              className={`flex-1 ${isMobile ? 'h-16 px-3' : 'h-20 pl-5'} bg-blue-500 text-white hover:bg-blue-600 text-left items-start rounded-lg ${
                balance <= 0 || margin > balance ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => handlePlaceTrade("Buy")}
              disabled={balance <= 0 || margin > balance}
            >
              <div className="flex flex-col items-start">
                <span className={`w-full ${isMobile ? 'text-sm' : 'text-md'} font-regular`}>Buy</span>
                <span className={`${isMobile ? 'text-base' : 'text-lg'} w-full font-bold font-mono`}>
                  {(localPrices[selectedPair.symbol]?.price || selectedPair.price).split(".")[0]}
                  <span className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>
                    .{(localPrices[selectedPair.symbol]?.price || selectedPair.price).split(".")[1] || "00"}
                  </span>
                </span>
              </div>
            </button>
          </div>

          {/* Grid Section - Enhanced for mobile */}
          <div className={`space-y-2 ${isMobile ? 'mt-2 text-xs' : 'mt-4'} ${isMobile ? 'bg-muted/20 p-3 rounded-lg' : ''}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Margin:</span>
              <span className={`font-bold font-mono ${margin > balance ? "text-red-500" : ""}`}>
                ${margin.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Leverage:</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="font-bold font-mono text-blue-500 underline">
                    {selectedLeverage}x
                  </button>
                </DialogTrigger>
                <DialogContent className={`p-6 rounded-lg shadow-lg bg-white ${isMobile ? 'w-[90vw]' : ''}`}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-gray-800">Select Leverage</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-8 mt-4">
                    {/* Selected Leverage Display */}
                    <div
                      className={`flex justify-center items-center p-4 border rounded-lg ${
                        parseInt(selectedLeverage) <= 20
                          ? "bg-green-100 border-green-300 text-green-600"
                          : parseInt(selectedLeverage) <= 500
                          ? "bg-yellow-100 border-yellow-300 text-yellow-600"
                          : "bg-red-100 border-red-300 text-red-600"
                      }`}
                    >
                      <span className="text-2xl font-bold">{selectedLeverage}x</span>
                    </div>

                    {/* Low Risk */}
                    {leverageOptions[selectedPair?.symbol || ""]?.some((leverage) => parseInt(leverage) <= 20) && (
                      <div>
                        <h3 className="text-base font-medium text-green-600 mb-3">Low Risk (2-20x)</h3>
                        <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-5'} gap-3`}>
                          {leverageOptions[selectedPair?.symbol || ""]?.filter((leverage) => parseInt(leverage) <= 20).map((leverage) => (
                            <button
                              key={leverage}
                              className={`px-4 py-2 border rounded-lg transition-all duration-200 ${
                                selectedLeverage === leverage
                                  ? "bg-green-500 text-white border-green-600"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                              }`}
                              onClick={() => handleLeverageChange(leverage)}
                            >
                              {leverage}x
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medium Risk */}
                    {leverageOptions[selectedPair?.symbol || ""]?.some((leverage) => parseInt(leverage) > 20 && parseInt(leverage) <= 500) && (
                      <div>
                        <h3 className="text-base font-medium text-yellow-600 mb-3">Medium Risk (21-500x)</h3>
                        <div className="grid grid-cols-5 gap-3">
                          {leverageOptions[selectedPair?.symbol || ""]?.filter((leverage) => parseInt(leverage) > 20 && parseInt(leverage) <= 500).map((leverage) => (
                            <button
                              key={leverage}
                              className={`px-4 py-2 border rounded-lg transition-all duration-200 ${
                                selectedLeverage === leverage
                                  ? "bg-yellow-500 text-white border-yellow-600"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                              }`}
                              onClick={() => handleLeverageChange(leverage)}
                            >
                              {leverage}x
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* High Risk */}
                    {leverageOptions[selectedPair?.symbol || ""]?.some((leverage) => parseInt(leverage) > 500) && (
                      <div>
                        <h3 className="text-base font-medium text-red-600 mb-3">High Risk (500x+)</h3>
                        <div className="grid grid-cols-5 gap-3">
                          {leverageOptions[selectedPair?.symbol || ""]?.filter((leverage) => parseInt(leverage) > 500).map((leverage) => (
                            <button
                              key={leverage}
                              className={`px-4 py-2 border rounded-lg transition-all duration-200 ${
                                selectedLeverage === leverage
                                  ? "bg-red-500 text-white border-red-600"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                              }`}
                              onClick={() => handleLeverageChange(leverage)}
                            >
                              {leverage}x
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Leverage Available */}
                    {!leverageOptions[selectedPair?.symbol || ""]?.length && (
                      <div className="text-center text-gray-500">
                        No leverage options available for this pair.
                      </div>
                    )}
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
                {calculateVolumeWithLeverage()} {getQuoteCurrency()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Value:</span>
              <span className="font-bold font-mono">
                {formatLargeNumber(calculateActualVolume())} {getQuoteCurrency()}
              </span>
            </div>
          </div>

          {/* Add badge at the bottom - Only on desktop */}
          {!isMobile && (
            <div className="mt-6">
              <div className="bg-green-100 text-green-700 text-center py-2 rounded-lg font-medium">
                0% fees for your Account
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 flex flex-col items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-lg font-medium text-muted-foreground mb-2">
              Select a pair to trade
            </p>
            {isMobile && (
              <p className="text-sm text-muted-foreground">
                Tap on "Market" in the bottom navigation to browse available markets
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;
