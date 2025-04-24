import React, { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { TradingPair, PriceData, TradeParams } from "@/types/trading";
import { calculateRequiredMargin, isJPYPair } from "@/utils/trading";

interface TradingPanelProps {
  selectedPair: string;
  pairPrices: Record<string, PriceData>;
  onTrade: (params: TradeParams) => void;
  userBalance: number;
  tradingPairs: TradingPair[];
  onSaveLeverage?: (leverage: number) => Promise<void>;
  defaultLeverage?: number;
}

const CRYPTO_LEVERAGE = 400;
const FOREX_LEVERAGE_OPTIONS = [2, 5, 10, 20, 30, 50, 88, 100, 500, 1000, 2000];

export const TradingPanel = ({
  selectedPair,
  pairPrices,
  onTrade,
  userBalance,
  tradingPairs,
  onSaveLeverage,
  defaultLeverage = 100
}: TradingPanelProps) => {
  // Panel states - removed showPanel and tradeType since quick trading doesn't need them
  const [lots, setLots] = useState('0.01');
  const [showLeverageDialog, setShowLeverageDialog] = useState(false);
  const [selectedLeverage, setSelectedLeverage] = useState(defaultLeverage.toString());
  const [pairInfo, setPairInfo] = useState<TradingPair | null>(null);

  // Add crypto decimal limits mapping
  const cryptoLotDecimals: Record<string, number> = {
    'BTCUSDT': 3,  // 0.001
    'ETHUSDT': 3,  // 0.001
    'SOLUSDT': 2,  // 0.1
    'DOGEUSDT': 0, // 1
    'ADAUSDT': 0,  // 1
    'BNBUSDT': 2,  // 0.01
    'DOTUSDT': 1,  // 0.1
    'TRXUSDT': 0,   // 1
  };

  const forexLotDecimals: Record<string, number> = {
    'EURUSD': 2,
    'GBPUSD': 2,
    'USDJPY': 2,
    'USDCHF': 2,
    'AUDUSD': 2,
    'USDCAD': 2,
    'EURGBP': 2,
    'EURJPY': 2,
    'GBPJPY': 2,
    'XAUUSD': 2  // Gold allows 3 decimals
  };

  const getDecimalPlaces = (pair: string): number => {
    const pairInfo = tradingPairs.find(p => p.symbol === pair);
    if (pairInfo?.pip_value) {
      // Calculate decimal places from pip value
      const decimalPlaces = -Math.log10(pairInfo.pip_value);
      return Math.max(decimalPlaces, 2); // Minimum 2 decimal places
    }
    
    if (pair.includes('BINANCE:')) {
      const symbol = pair.replace('BINANCE:', '');
      return cryptoLotDecimals[symbol] ?? 2;
    }
    
    if (pair.includes('FX:')) {
      const symbol = pair.replace('FX:', '').replace('/', '');
      return forexLotDecimals[symbol] ?? 2;
    }
    
    return 2; // Default
  };

  // Add getStandardLotSize helper function after getDecimalPlaces
  const getStandardLotSize = (pair: string): number => {
    if (pair === 'FX:XAU/USD') return 100;
    return 100000; // Default forex lot size
  };

  // Effect to update pair info
  useEffect(() => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (pair) {
      setPairInfo(pair);
      if (pair.type === 'crypto') {
        setSelectedLeverage(CRYPTO_LEVERAGE.toString());
      } else if (pair.type === 'forex') {
        // Set to nearest valid forex leverage
        const validLeverage = FOREX_LEVERAGE_OPTIONS.find(l => l >= defaultLeverage) || FOREX_LEVERAGE_OPTIONS[0];
        setSelectedLeverage(validLeverage.toString());
      }
    }
  }, [selectedPair, tradingPairs, defaultLeverage]);

  const isGoldPair = (pair: string): boolean => {
    return pair === 'FX:XAU/USD';
  };

  // Calculate required margin
  const marginRequired = useMemo(() => {
    const lotSize = parseFloat(lots) || 0;
    const price = parseFloat(pairPrices[selectedPair]?.price || '0');
    const leverageValue = parseFloat(selectedLeverage);
    const isCrypto = selectedPair.includes('BINANCE:');

    if (selectedPair === 'FX:XAU/USD') {
      // Gold margin calculation: (lots * 100 * price) / leverage
      // 100 represents troy ounces per lot for gold
      return ((lotSize * 100 * price) / leverageValue).toFixed(2);
    }
    
    return calculateRequiredMargin(price, lotSize, leverageValue, isCrypto, selectedPair).toFixed(2);
  }, [lots, pairPrices, selectedLeverage, selectedPair]);

  // Update tradingInfo calculation
  const tradingInfo = useMemo(() => {
    const lotSize = parseFloat(lots) || 0;
    const price = parseFloat(pairPrices[selectedPair]?.price || '0');
    const leverageValue = parseFloat(selectedLeverage);
    const isCrypto = selectedPair.includes('BINANCE:');
    const isGold = selectedPair === 'FX:XAU/USD';
    
    let volumeUnits, volumeUsd;
    if (isCrypto) {
      volumeUnits = lotSize;
      volumeUsd = lotSize * price;
    } else if (isGold) {
      volumeUnits = lotSize * 100; // 100 troy ounces per lot
      volumeUsd = volumeUnits * price;
    } else {
      const standardLotSize = getStandardLotSize(selectedPair);
      volumeUnits = lotSize * standardLotSize;
      volumeUsd = volumeUnits * price;
    }

    // Calculate pip value with updated lot size
    const pipValue = isCrypto 
      ? lotSize * price * 0.00001
      : isJPYPair(selectedPair)
        ? (lotSize * getStandardLotSize(selectedPair) * 0.01) / price 
        : lotSize * getStandardLotSize(selectedPair) * 0.0001;

    // Calculate margin amount
    const margin = isCrypto 
      ? volumeUsd / leverageValue
      : isGold
        ? (volumeUnits * price) / leverageValue
        : (volumeUnits * price) / leverageValue;

    // Calculate fees based on margin (0.1% of margin)
    const fees = margin * 0.001;

    return {
      pipValue: pipValue.toFixed(2),
      fees: fees.toFixed(2),
      volumeUnits: volumeUnits.toFixed(isCrypto ? 8 : 2),
      volumeUsd: volumeUsd.toFixed(2)
    };
  }, [lots, pairPrices, selectedPair, selectedLeverage]);

  // Format price helper
  const formatPrice = (price: string | undefined) => {
    if (!price) return '0.00000';
    const value = parseFloat(price);
    
    if (selectedPair.includes('FX:')) {
      const symbol = selectedPair.replace('FX:', '').replace('/', '');
      if (symbol === 'XAUUSD') return value.toFixed(2);
      return isJPYPair(symbol) ? value.toFixed(3) : value.toFixed(5);
    }
    
    return value > 1 ? value.toFixed(2) : value.toFixed(5);
  };

  // Validation helpers
  const validateLots = (value: string) => {
    const numValue = parseFloat(value);
    const isCrypto = selectedPair.includes('BINANCE:');
    
    if (isNaN(numValue) || numValue <= 0) {
      return "Lots must be greater than 0";
    }

    const maxLots = isCrypto ? 100 : 200;
    if (numValue > maxLots) {
      return `Maximum ${maxLots} lots allowed`;
    }

    return null;
  };

  const handleTrade = (type: 'buy' | 'sell') => {
    const error = validateTrade();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
      return;
    }

    onTrade({
      type,
      orderType: 'market',
      lots: parseFloat(lots),
      leverage: parseInt(selectedLeverage),
    });
  };

  // Add spread calculation helper
  const getSpread = () => {
    const ask = parseFloat(pairPrices[selectedPair]?.ask || '0');
    const bid = parseFloat(pairPrices[selectedPair]?.bid || '0');
    const spread = ask - bid;
    
    if (selectedPair.includes('FX:')) {
      const symbol = selectedPair.replace('FX:', '').replace('/', '');
      return isJPYPair(symbol) ? spread.toFixed(3) : spread.toFixed(5);
    }
    
    const mapping: Record<string, number> = {
      'BNBUSDT': 2,
      'DOTUSDT': 3,
      'ETHUSDT': 2,
      'DOGEUSDT': 5,
      'BTCUSDT': 2,
      'TRXUSDT': 4,
      'LINKUSDT': 2,
      'ADAUSDT': 4
    };
    
    const base = selectedPair.replace('BINANCE:', '');
    return spread.toFixed(mapping[base] ?? 5);
  };

  const handleLotsChange = (value: string) => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    // Remove any non-numeric characters except decimal point
    const sanitizedValue = value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    if ((sanitizedValue.match(/\./g) || []).length > 1) return;
    
    // Allow empty or partial decimal input
    if (sanitizedValue === '' || sanitizedValue === '.') {
      setLots(sanitizedValue);
      return;
    }

    // Get decimal places for the pair
    const decimals = getDecimalPlaces(selectedPair);
    
    // Parse input value
    let numValue = parseFloat(sanitizedValue);
    
    // Don't round while user is typing
    if (sanitizedValue.includes('.')) {
      const [, decimal] = sanitizedValue.split('.');
      if (decimal && decimal.length <= decimals) {
        setLots(sanitizedValue);
        return;
      }
    }

    // Apply min/max constraints only on complete values
    if (!isNaN(numValue)) {
      if (numValue < pair.min_lots) {
        numValue = pair.min_lots;
      } else if (numValue > pair.max_lots) {
        numValue = pair.max_lots;
      }
      
      // Format to proper decimal places for complete values
      setLots(numValue.toFixed(decimals));
    }
  };

  const validateTrade = () => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return "Invalid trading pair";

    let lotsNum = parseFloat(lots);
    const decimals = getDecimalPlaces(selectedPair);
    
    // Check if entered value has more decimal places than allowed
    const decimalPart = lots.includes('.') ? lots.split('.')[1].length : 0;
    if (decimalPart > decimals) {
      lotsNum = parseFloat(lotsNum.toFixed(decimals));
      setLots(lotsNum.toString());
      return `Maximum ${decimals} decimal places allowed`;
    }

    if (lotsNum < pair.min_lots) {
      return `Minimum lot size is ${pair.min_lots}`;
    }
    if (lotsNum > pair.max_lots) {
      return `Maximum lot size is ${pair.max_lots}`;
    }

    return null;
  };

  const handleConfirmLeverage = async () => {
    try {
      if (onSaveLeverage) {
        await onSaveLeverage(parseInt(selectedLeverage));
      }
      setShowLeverageDialog(false);
      toast({
        title: "Success",
        description: "Leverage preference saved",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save leverage preference",
      });
    }
  };

  const handleIncrementLots = () => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    const step = Math.pow(10, -getDecimalPlaces(selectedPair));
    const currentValue = parseFloat(lots) || 0;
    const newValue = currentValue + step;
    
    if (newValue <= pair.max_lots) {
      setLots(newValue.toFixed(getDecimalPlaces(selectedPair)));
    }
  };

  const handleDecrementLots = () => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    const step = Math.pow(10, -getDecimalPlaces(selectedPair));
    const currentValue = parseFloat(lots) || 0;
    const newValue = currentValue - step;
    
    if (newValue >= pair.min_lots) {
      setLots(newValue.toFixed(getDecimalPlaces(selectedPair)));
    }
  };

  // Add helper to get display price
  const getDisplayPrice = (type: 'buy' | 'sell') => {
    return formatPrice(type === 'buy' ? pairPrices[selectedPair]?.ask : pairPrices[selectedPair]?.bid);
  };

  return (
    <div className="w-[350px] border-l bg-card p-4">
      <div className="space-y-4">
        {/* Price info section */}
        <div className="flex items-center gap-3">
          <img
            src={pairInfo?.image_url || `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png`}
            alt={pairInfo?.name || selectedPair}
            className="h-8 w-8"
            onError={(e) => {
              e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
            }}
          />
          <div className="text-lg font-semibold">
            {pairInfo?.short_name}
          </div>
          <div className="ml-auto flex gap-2">
            <div className="bg-muted px-2 py-1 rounded-md">
              <div className="text-xs text-muted-foreground">Bid</div>
              <div className="font-mono">{formatPrice(pairPrices[selectedPair]?.bid)}</div>
            </div>
            <div className="bg-muted px-2 py-1 rounded-md">
              <div className="text-xs text-muted-foreground">Ask</div>
              <div className="font-mono">{formatPrice(pairPrices[selectedPair]?.ask)}</div>
            </div>
          </div>
        </div>

        {/* Quick trade form */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Size (Lots)</label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={lots}
              onChange={(e) => handleLotsChange(e.target.value)}
              min={pairInfo?.min_lots}
              max={pairInfo?.max_lots}
              step={pairInfo ? Math.pow(10, -getDecimalPlaces(selectedPair)) : 0.01}
              className="text-right font-mono"
            />
            <div className="flex flex-col gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-5 w-5"
                onClick={handleIncrementLots}
              >
                <span className="text-xs">+</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-5 w-5"
                onClick={handleDecrementLots}
              >
                <span className="text-xs">-</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className={cn(
                "h-16 flex-col space-y-1 hover:bg-red-500/5 border-2",
                "border-red-500/20 hover:border-red-500/30 text-red-500",
                "transition-colors bg-red-500/5",
                "!items-start !justify-start"
              )}
              onClick={() => handleTrade('sell')}
            >
              <div className="text-xs font-normal text-left pl-2">Sell at</div>
              <div className="text-lg font-mono font-semibold text-left pl-2">
                {getDisplayPrice('sell')}
              </div>
            </Button>

            <Button
              variant="outline"
              className={cn(
                "h-16 flex-col space-y-1 hover:bg-blue-500/5 border-2",
                "border-blue-500/20 hover:border-blue-500/30 text-blue-500",
                "transition-colors bg-blue-500/5",
                "!items-start !justify-start"
              )}
              onClick={() => handleTrade('buy')}
            >
              <div className="text-xs font-normal text-right pr-2">Buy at</div>
              <div className="text-lg font-mono font-semibold text-right pr-2">
                {getDisplayPrice('buy')}
              </div>
            </Button>
          </div>
          <div className="space-y-1 mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Margin:</span>
                  <span className="font-mono font-bold">${marginRequired}</span>
                </div>
                <div 
                  className="flex justify-between items-center rounded cursor-pointer transition-colors"
                  onClick={() => setShowLeverageDialog(true)}
                >
                  <span>Leverage:</span>
                  <span className="font-mono">{pairInfo?.type === 'crypto' ? CRYPTO_LEVERAGE : selectedLeverage}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Pip Value:</span>
                  <span className="font-mono">${tradingInfo.pipValue}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Fees:</span>
                  <span className="font-mono">${tradingInfo.fees}</span>
                </div>
                <div className="flex justify-between">
                  <span>Volume:</span>
                  <span className="font-mono">{tradingInfo.volumeUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Value:</span>
                  <span className="font-mono">${tradingInfo.volumeUsd}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keep leverage dialog unchanged */}
        <Dialog open={showLeverageDialog} onOpenChange={setShowLeverageDialog}>
          <DialogContent className="p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="text-xl">Select Leverage</DialogTitle>
              <DialogDescription className="text-sm">
                {pairInfo?.type === 'crypto' 
                  ? 'Cryptocurrency trading has a fixed leverage of 400x'
                  : 'Choose your preferred leverage level. Higher leverage means higher risk.'}
              </DialogDescription>
            </DialogHeader>
            
            {pairInfo?.type === 'crypto' ? (
              <div className="p-6">
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-6 text-center">
                  <span className="text-3xl font-bold text-red-500">{CRYPTO_LEVERAGE}x</span>
                  <p className="text-sm text-red-500/70 mt-2">High Risk Leverage</p>
                  <p className="text-xs text-muted-foreground mt-1">Fixed leverage for cryptocurrency trading</p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Selection</label>
                  <div className={cn(
                    "border rounded-lg p-4 text-center",
                    parseInt(selectedLeverage) <= 20 
                      ? "bg-green-500/5 border-green-500/10" 
                      : parseInt(selectedLeverage) <= 100
                        ? "bg-yellow-500/5 border-yellow-500/10"
                        : "bg-red-500/5 border-red-500/10"
                  )}>
                    <span className={cn(
                      "text-3xl font-bold",
                      parseInt(selectedLeverage) <= 20 
                        ? "text-green-500" 
                        : parseInt(selectedLeverage) <= 100
                          ? "text-yellow-500"
                          : "text-red-500"
                    )}>{selectedLeverage}x</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-medium text-green-500">Low Risk</div>
                    <div className="grid grid-cols-2 gap-1">
                      {FOREX_LEVERAGE_OPTIONS.filter(v => v <= 20).map((value) => (
                        <Button
                          key={value}
                          variant={selectedLeverage === value.toString() ? "default" : "outline"}
                          onClick={() => setSelectedLeverage(value.toString())}
                          className={cn(
                            "h-9 font-mono transition-all",
                            selectedLeverage === value.toString()
                              ? "bg-green-500 hover:bg-green-500/90 border-0"
                              : "hover:border-green-500/50 hover:bg-green-500/5 border-green-500/20"
                          )}
                        >
                          {value}x
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-yellow-500">Medium Risk</div>
                    <div className="grid grid-cols-2 gap-1">
                      {FOREX_LEVERAGE_OPTIONS.filter(v => v > 20 && v <= 100).map((value) => (
                        <Button
                          key={value}
                          variant={selectedLeverage === value.toString() ? "default" : "outline"}
                          onClick={() => setSelectedLeverage(value.toString())}
                          className={cn(
                            "h-9 font-mono transition-all",
                            selectedLeverage === value.toString()
                              ? "bg-yellow-500 hover:bg-yellow-500/90 border-0"
                              : "hover:border-yellow-500/50 hover:bg-yellow-500/5 border-yellow-500/20"
                          )}
                        >
                          {value}x
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-red-500">High Risk</div>
                    <div className="grid grid-cols-2 gap-1">
                      {FOREX_LEVERAGE_OPTIONS.filter(v => v > 100).map((value) => (
                        <Button
                          key={value}
                          variant={selectedLeverage === value.toString() ? "default" : "outline"}
                          onClick={() => setSelectedLeverage(value.toString())}
                          className={cn(
                            "h-9 font-mono transition-all",
                            selectedLeverage === value.toString()
                              ? "bg-red-500 hover:bg-red-500/90 border-0"
                              : "hover:border-red-500/50 hover:bg-red-500/5 border-red-500/20"
                          )}
                        >
                          {value}x
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-gradient-to-t from-muted/10 border-t">
              <Button 
                onClick={handleConfirmLeverage}
                className={cn(
                  "w-full",
                  parseInt(selectedLeverage) <= 20
                    ? "bg-green-500 hover:bg-green-500/90"
                    : parseInt(selectedLeverage) <= 100
                      ? "bg-yellow-500 hover:bg-yellow-500/90"
                      : "bg-red-500 hover:bg-red-500/90"
                )}
              >
                Confirm Leverage
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
