import React, { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Brain } from "lucide-react";
import { TradingPair, PriceData, TradeParams, Trade } from "@/types/trading"; // Add this import
import { 
  calculateRequiredMargin, 
  isJPYPair, 
  getStandardLotSize, 
  calculateTradeInfo,
  calculatePipValue 
} from "@/utils/trading";
import { useNavigate } from "react-router-dom"; // Add this import at the top
import { getMaxLeverageForPair } from '@/config/leverageValues';

interface DatabasePlan {
  id: string;
  name: string;
  description: string;
  investment: number;
  returns_percentage: number;
  duration_days: number;
  benefits: string;
  status: 'active' | 'inactive';
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string[];
  investment: number;
  duration: string;
}

interface TradingPanelProps {
  selectedPair: string;
  pairPrices: Record<string, PriceData>;
  onTrade: (params: TradeParams) => void;
  userBalance: number;
  tradingPairs: TradingPair[];
  onSaveLeverage?: (leverage: number) => Promise<void>;
  defaultLeverage?: number;
  onSubscribe?: (plan: SubscriptionPlan) => Promise<void>;
  trades?: Trade[]; // Make trades prop optional
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 100,
    investment: 100,
    duration: '30 days',
    description: [
      'AI-powered trading signals',
      'Basic risk management',
      'Market analysis',
      'Real-time alerts',
      '24/7 support',
      'Educational resources'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 500,
    investment: 500,
    duration: '30 days',
    description: [
      'Advanced AI trading strategies',
      'Priority signals',
      'Risk management suite',
      'Premium market analysis',
      'VIP support',
      'Trading masterclass'
    ]
  }
];

const CRYPTO_LEVERAGE = 400;
const FOREX_LEVERAGE_OPTIONS = [2, 5, 10, 20, 30, 50, 88, 100, 500, 1000, 2000];

export const TradingPanel = ({
  selectedPair,
  pairPrices,
  onTrade,
  userBalance,
  tradingPairs,
  onSaveLeverage,
  defaultLeverage = 100,
  onSubscribe,
  trades = [] // Provide default empty array
}: TradingPanelProps) => {
  const navigate = useNavigate(); // Add this hook
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
    return 2; // Always return 2 decimal places for standardization
  };

  // Add getMaxAffordableLots helper after getStandardLotSize
  // Calculate total margin utilization from existing trades
  // Update margin utilization calculation to consider only open/pending trades
  const calculateExistingMarginUtilization = useMemo(() => {
    return (trades || [])
      .filter(t => t.status === 'open' || t.status === 'pending')
      .reduce((total, trade) => total + (trade.margin_amount || 0), 0);
  }, [trades]);

  // Update getMaxAffordableLots to properly consider existing margin utilization
  const getMaxAffordableLots = (): number => {
    const price = parseFloat(pairPrices[selectedPair]?.price || '0');
    const leverageValue = parseFloat(selectedLeverage);
    const isCrypto = selectedPair.includes('BINANCE:');
    
    if (!price || !leverageValue || !userBalance) return 0;

    // Calculate available balance after existing margin utilization
    const existingMargin = calculateExistingMarginUtilization;
    const availableBalance = Math.max(0, userBalance - existingMargin);

    // Calculate max lots based on remaining available balance and pair type
    if (isCrypto) {
      return (availableBalance * leverageValue) / price;
    } else if (selectedPair === 'FX:XAU/USD') {
      return (availableBalance * leverageValue) / (price * 100);
    } else {
      return (availableBalance * leverageValue) / (price * getStandardLotSize(selectedPair));
    }
  };

  // Effect to update pair info
  useEffect(() => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (pair) {
      setPairInfo(pair);
      if (pair.type === 'crypto') {
        const maxLeverage = getMaxLeverageForPair(selectedPair);
        setSelectedLeverage(maxLeverage.toString());
      } else if (pair.type === 'forex') {
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
    const info = calculateTradeInfo(
      lotSize,
      selectedPair,
      pairPrices,
      parseInt(selectedLeverage)
    );
    
    return {
      pipValue: info.pipValue.toFixed(2),
      fees: '0.00', // No fees
      volumeUnits: info.volumeUnits.toFixed(2),
      volumeUsd: info.volumeUsd.toFixed(2)
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

  // Update handleLotsChange to consider affordable lots
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

    // Parse input value
    let numValue = parseFloat(sanitizedValue);
    
    if (!isNaN(numValue)) {
      const maxAffordableLots = getMaxAffordableLots();
      const effectiveMaxLots = Math.min(pair.max_lots, maxAffordableLots);
      
      if (numValue < pair.min_lots) {
        numValue = pair.min_lots;
      } else if (numValue > effectiveMaxLots) {
        numValue = effectiveMaxLots;
      }
      
      setLots(numValue.toString());
    }
  };

  // Update validateTrade to use affordable lots check
  const validateTrade = () => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return "Invalid trading pair";

    let lotsNum = parseFloat(lots);
    const maxAffordableLots = getMaxAffordableLots();
    
    if (lotsNum < pair.min_lots) {
      return `Minimum lot size is ${pair.min_lots}`;
    }
    if (lotsNum > maxAffordableLots) {
      return `Maximum affordable lots with current balance is ${maxAffordableLots.toFixed(2)}`;
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

  // Add effect to adjust lots when pair changes
  useEffect(() => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    // Get current lots as number
    const currentLots = parseFloat(lots) || 0;
    
    // Only adjust if current lots are outside allowed range
    if (currentLots < pair.min_lots) {
      setLots(pair.min_lots.toFixed(getDecimalPlaces(selectedPair)));
    } else if (currentLots > pair.max_lots) {
      setLots(pair.max_lots.toFixed(getDecimalPlaces(selectedPair)));
    }
  }, [selectedPair, userBalance, selectedLeverage]); // Remove pairPrices from dependencies

  return (
    <div className="w-[350px] border-l bg-card p-4">
      <div className="flex flex-col h-full justify-between space-y-4">
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
              <label className="text-sm font-medium">
                Size (Lots)
                <span className="ml-2 text-xs text-muted-foreground">
                  Max: {Math.min(pairInfo?.max_lots || 0, getMaxAffordableLots()).toFixed(2)}
                  {calculateExistingMarginUtilization > 0 && (
                    <span className="text-yellow-500 ml-1">
                      (Used: ${calculateExistingMarginUtilization.toFixed(2)})
                    </span>
                  )}
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={lots}
                onChange={(e) => handleLotsChange(e.target.value)}
                min={pairInfo?.min_lots}
                max={pairInfo?.max_lots} 
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
                    <span className="font-mono">
                      {pairInfo?.type === 'crypto' ? `${getMaxLeverageForPair(selectedPair)}x` : `${selectedLeverage}x`}
                    </span>
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

          {/* Update leverage dialog */}
          <Dialog open={showLeverageDialog} onOpenChange={setShowLeverageDialog}>
            <DialogContent className="p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="text-xl">Leverage Information</DialogTitle>
                <DialogDescription className="text-sm">
                  {pairInfo?.type === 'crypto' 
                    ? 'This cryptocurrency pair has a fixed maximum leverage for risk management'
                    : 'Choose your preferred leverage level. Higher leverage means higher risk.'}
                </DialogDescription>
              </DialogHeader>
              
              {pairInfo?.type === 'crypto' ? (
                <div className="p-6">
                  <div className={cn(
                    "bg-red-500/5 border border-red-500/10 rounded-lg p-6 text-center",
                    getMaxLeverageForPair(selectedPair) <= 20 ? "bg-green-500/5 border-green-500/10" : ""
                  )}>
                    <span className={cn(
                      "text-3xl font-bold",
                      getMaxLeverageForPair(selectedPair) <= 20 ? "text-green-500" : "text-red-500"
                    )}>
                      {getMaxLeverageForPair(selectedPair)}x
                    </span>
                    <p className="text-sm text-red-500/70 mt-2">
                      Fixed Maximum Leverage
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This leverage setting is fixed for risk management purposes
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Existing forex leverage options */}
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

                  {/* Only show confirm button for forex */}
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
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* AI Trading button moved to bottom */}
        <div className="pt-4 border-t">
          <Button
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => navigate('/plans')}
          >
            <Brain className="w-4 h-4 mr-2" />
            Subscribe to Computes
          </Button>
        </div>
      </div>
    </div>
  );
};
