import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge"; // Add this import
import { TradingPair, PriceData, TradeParams, Trade } from "@/types/trading"; // Add this import
import { 
  calculateRequiredMargin, 
  isJPYPair, 
  getStandardLotSize,
  calculatePipValue, // Add this import
  calculatePriceDifferenceInPips // Add this import
} from "@/utils/trading";
import { useNavigate } from "react-router-dom"; // Add this import at the top
import { supabase } from "@/lib/supabase"; // Add this import at the top
import { AlertTriangle, DollarSign, TrendingUp } from "lucide-react";

// Helper functions for leverage categories
interface LeverageCategories {
  low: number[];
  medium: number[];
  high: number[];
}

const getLeverageCategories = (leverageOptions: number[]): LeverageCategories => {
  const sortedOptions = [...leverageOptions].sort((a, b) => a - b);
  return {
    low: sortedOptions.filter(l => l <= 100),
    medium: sortedOptions.filter(l => l > 100 && l <= 500),
    high: sortedOptions.filter(l => l > 500)
  };
};

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

interface RiskLevelInfo {
  label: string;
  color: string;
  Icon: any;
  description: string;
}

const RISK_LEVEL_INFO: Record<'low' | 'medium' | 'high', RiskLevelInfo> = {
  low: {
    label: 'Conservative',
    color: 'text-green-500',
    Icon: DollarSign,
    description: 'Lower risk, suitable for beginners'
  },
  medium: {
    label: 'Moderate',
    color: 'text-yellow-500',
    Icon: TrendingUp,
    description: 'Balanced risk-reward ratio'
  },
  high: {
    label: 'Aggressive',
    color: 'text-red-500',
    Icon: AlertTriangle,
    description: 'High risk, for experienced traders'
  }
};

export const TradingPanel = ({
  selectedPair,
  pairPrices,
  onTrade,
  userBalance,
  tradingPairs,
  onSaveLeverage,
  defaultLeverage = 100,
  onSubscribe,
  trades = []
}: TradingPanelProps) => {
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [staticBidPrice, setStaticBidPrice] = useState('0');
  const [staticAskPrice, setStaticAskPrice] = useState('0');
  const navigate = useNavigate();
  const [lots, setLots] = useState('0.01');
  const [selectedLeverage, setSelectedLeverage] = useState(defaultLeverage.toString());
  const [pairInfo, setPairInfo] = useState<TradingPair | null>(null);
  const [actualLeverage, setActualLeverage] = useState(defaultLeverage);
  const [showLeverageDialog, setShowLeverageDialog] = useState(false);
  const [newLeverage, setNewLeverage] = useState(defaultLeverage.toString());

  // Effect to handle defaultLeverage changes
  useEffect(() => {
    setSelectedLeverage(defaultLeverage.toString());
    setActualLeverage(defaultLeverage);
  }, [defaultLeverage]);

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

  // Add helper to get max leverage for pair
  const getMaxLeverageForPair = (pair: TradingPair) => {
    if (!pair.leverage_options?.length) return 1;
    return Math.max(...pair.leverage_options);
  };

  // Add helper to get max leverage from options
  const getMaxLeverageFromOptions = (options: number[] = []): number => {
    return options.length ? Math.max(...options) : 1;
  };

  // Add effect to manage leverage based on pair limits
  useEffect(() => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (pair && pair.leverage_options?.length > 0) {
      setPairInfo(pair);
      // Get the leverage options and sort them
      const leverageOptions = [...pair.leverage_options].sort((a, b) => a - b);
      const selectedValue = parseInt(selectedLeverage);
      
      // Find the closest available leverage option that's less than or equal to selected value
      // If none found, use the highest available option
      const effectiveLeverage = leverageOptions
        .filter(l => l <= selectedValue)
        .sort((a, b) => b - a)[0] || leverageOptions[leverageOptions.length - 1];
      
      if (effectiveLeverage !== selectedValue) {
        // Update both selected and actual leverage
        setSelectedLeverage(effectiveLeverage.toString());
        setActualLeverage(effectiveLeverage);
        
        // Show a message about the adjustment
        toast({
          description: `Leverage adjusted to ${effectiveLeverage}x (available for ${pair.short_name || pair.symbol})`,
        });
        
        // If a save leverage handler is provided and the leverage needs to change
        if (onSaveLeverage) {
          onSaveLeverage(effectiveLeverage).catch(error => {
            console.error('Error saving leverage:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to update leverage preference"
            });
          });
        }
      } else {
        setActualLeverage(selectedValue);
      }
    }
  }, [selectedPair, tradingPairs, selectedLeverage]);

  // Initialize leverage state on component mount and pair changes
  useEffect(() => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair || !pair.leverage_options?.length) return;

    setPairInfo(pair);
    const userLeverage = parseInt(selectedLeverage);
    const maxPairLeverage = Math.max(...pair.leverage_options);

    // If current leverage is beyond pair's maximum, cap it
    if (userLeverage > maxPairLeverage) {
      setActualLeverage(maxPairLeverage);
      setSelectedLeverage(maxPairLeverage.toString());
      
      // Only show toast if leverage was actually changed
      if (userLeverage !== maxPairLeverage) {
        toast({
          description: `${pair.short_name || pair.symbol}: Leverage adjusted from ${userLeverage}x to ${maxPairLeverage}x (maximum allowed)`,
          duration: 4000
        });
      }
    } else {
      // Keep user's selected leverage since it's within pair limits
      setActualLeverage(userLeverage);
      setSelectedLeverage(userLeverage.toString());
    }
  }, [selectedPair, tradingPairs]);

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
      return ((lotSize * 100 * price) / actualLeverage).toFixed(2);
    }
    
    return calculateRequiredMargin(price, lotSize, actualLeverage, isCrypto, selectedPair).toFixed(2);
  }, [lots, pairPrices, selectedLeverage, selectedPair, actualLeverage]);

  // Update tradingInfo calculation to use calculatePipValue function
  const tradingInfo = useMemo(() => {
    if (!pairInfo) return {
      pipValue: '0.00',
      fees: '0.00',
      volumeUnits: '0.00',
      volumeUsd: '0.00'
    };

    const lotSize = parseFloat(lots) || 0;
    const price = parseFloat(pairPrices[selectedPair]?.price || '0');
    
    // Calculate volume using standardLotSize utility
    const standardLotSize = getStandardLotSize(selectedPair);
    const volumeUnits = lotSize * standardLotSize; // This will now use 50 units for DOT
    const volumeUsd = volumeUnits * price;
    
    // Calculate pip value using the utility function
    const pipValue = calculatePipValue(lotSize, price, selectedPair, tradingPairs);
    
    return {
      pipValue: pipValue.toFixed(2),
      fees: '0.00',
      volumeUnits: volumeUnits.toFixed(2),
      volumeUsd: volumeUsd.toFixed(2)
    };
  }, [lots, pairPrices, selectedPair, pairInfo, tradingPairs]);

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

  // Update validateTrade to include limit price validation
  const validateTrade = () => {
    const basicValidation = validateLots(lots);
    if (basicValidation) return basicValidation;

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

  // Update handleTrade to include loading state
  const handleTrade = async (type: 'buy' | 'sell') => {
    if (isExecutingTrade) return; // Prevent multiple clicks

    const error = validateTrade();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
      return;
    }

    setIsExecutingTrade(true);
    try {
      const params: TradeParams = {
        type,
        orderType: 'market',
        lots: parseFloat(lots),
        leverage: parseInt(selectedLeverage),
      };

      await onTrade(params);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to execute trade",
      });
    } finally {
      setIsExecutingTrade(false);
    }
  };

  // Update handleSetMaxLots function to enforce 2 decimals
  const handleSetMaxLots = () => {
    const maxAffordableLots = getMaxAffordableLots();
    const maxPairLots = pairInfo?.max_lots || 0;
    const effectiveMaxLots = Math.min(maxAffordableLots, maxPairLots);
    setLots(effectiveMaxLots.toFixed(2)); // Always use 2 decimals for max
  };

  // Update handleLotsChange to enforce 2 decimal limit
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

    // Enforce 2 decimal limit
    const [whole, decimal] = sanitizedValue.split('.');
    if (decimal && decimal.length > 2) return;

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
      
      // When user is typing, maintain original decimal places up to 2
      if (sanitizedValue.includes('.')) {
        setLots(numValue.toFixed(decimal ? decimal.length : 0));
      } else {
        setLots(numValue.toString());
      }
    }
  };

  // Update increment/decrement to use 2 decimals
  const handleIncrementLots = () => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    const currentValue = parseFloat(lots) || 0;
    const newValue = currentValue + 0.01; // Always increment by 0.01
    
    if (newValue <= pair.max_lots) {
      setLots(newValue.toFixed(2));
    }
  };

  const handleDecrementLots = () => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    const currentValue = parseFloat(lots) || 0;
    const newValue = currentValue - 0.01; // Always decrement by 0.01
    
    if (newValue >= pair.min_lots) {
      setLots(newValue.toFixed(2));
    }
  };

  // Add handleSetMaxLots function before return statement
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

  // Add effect to update static prices
  useEffect(() => {
    if (pairPrices[selectedPair]) {
      setStaticBidPrice(formatPrice(pairPrices[selectedPair].bid));
      setStaticAskPrice(formatPrice(pairPrices[selectedPair].ask));
    }
  }, [selectedPair, pairPrices[selectedPair]?.bid, pairPrices[selectedPair]?.ask]);

  // Update getDisplayPrice to use static prices
  function getDisplayPrice(type: 'buy' | 'sell'): string {
    return type === 'buy' ? staticAskPrice : staticBidPrice;
  }

  // Add subscription to trade execution notifications
  useEffect(() => {
    const channel = supabase.channel('trade-executions')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trades',
        filter: `status=eq.open`,
      }, (payload) => {
        const trade = payload.new as Trade;
        if (trade.orderType === 'limit') {
          toast({
            title: "Limit Order Executed",
            description: `${trade.type === 'buy' ? 'Buy' : 'Sell'} order executed at ${trade.openPrice}`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function getVisibleRiskCategories(leverageOptions: number[]) {
    const categories = getLeverageCategories(leverageOptions);
    const visibleCategories: ('low' | 'medium' | 'high')[] = [];

    if (categories.low.length > 0) {
      visibleCategories.push('low');
    }
    if (categories.medium.length > 0) {
      visibleCategories.push('medium');
    }
    if (categories.high.length > 0) {
      visibleCategories.push('high');
    }

    return visibleCategories;
  }

  // Add price animation state
  const [priceAnimations, setPriceAnimations] = useState<{[key: string]: 'up' | 'down'}>({});

  // Update price state to include last values for comparison
  const [lastPrices, setLastPrices] = useState({
    bid: '0',
    ask: '0'
  });

  // Update price effect to handle animations
  useEffect(() => {
    if (pairPrices[selectedPair]) {
      const newBid = pairPrices[selectedPair].bid;
      const newAsk = pairPrices[selectedPair].ask;
      
      // Compare with last prices
      if (parseFloat(newBid) !== parseFloat(lastPrices.bid)) {
        setPriceAnimations(prev => ({
          ...prev,
          bid: parseFloat(newBid) > parseFloat(lastPrices.bid) ? 'up' : 'down'
        }));
      }
      
      if (parseFloat(newAsk) !== parseFloat(lastPrices.ask)) {
        setPriceAnimations(prev => ({
          ...prev,
          ask: parseFloat(newAsk) > parseFloat(lastPrices.ask) ? 'up' : 'down'
        }));
      }

      setLastPrices({ bid: newBid, ask: newAsk });
      setStaticBidPrice(formatPrice(newBid));
      setStaticAskPrice(formatPrice(newAsk));

      // Clear animations after delay
      const timer = setTimeout(() => setPriceAnimations({}), 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedPair, pairPrices[selectedPair]?.bid, pairPrices[selectedPair]?.ask]);

  // Add pip difference calculation
  const pipDifference = useMemo(() => {
    const ask = parseFloat(staticAskPrice);
    const bid = parseFloat(staticBidPrice);
    if (!ask || !bid) return 0;
    
    return calculatePriceDifferenceInPips(
      'buy',
      ask,
      bid,
      selectedPair,
      tradingPairs
    );
  }, [staticAskPrice, staticBidPrice, selectedPair, tradingPairs]);

  const handleLeverageSelect = async (leverage: number) => {
    const pair = tradingPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    const maxPairLeverage = Math.max(...(pair.leverage_options || []));
    const effectiveLeverage = Math.min(leverage, maxPairLeverage);

    // Update states
    setNewLeverage(effectiveLeverage.toString());
    setSelectedLeverage(effectiveLeverage.toString());
    setActualLeverage(effectiveLeverage);

    // Show toast if leverage was capped
    if (leverage !== effectiveLeverage) {
      toast({
        description: `${pair.short_name || pair.symbol} has a maximum leverage of ${maxPairLeverage}x. Your selected leverage (${leverage}x) has been adjusted accordingly.`,
        duration: 4000
      });
    }

    // Save preference if handler provided
    if (onSaveLeverage) {
      try {
        await onSaveLeverage(effectiveLeverage);
      } catch (error) {
        console.error('Error saving leverage:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update leverage preference"
        });
      }
    }
    setShowLeverageDialog(false);
  };

  return (
    <div className="w-[350px] border-l border-[#525252] bg-card p-4">
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
                <div className={cn(
                  "font-mono transition-colors",
                  priceAnimations.bid === 'up' && "text-green-500",
                  priceAnimations.bid === 'down' && "text-red-500"
                )}>
                  {formatPrice(pairPrices[selectedPair]?.bid)}
                </div>
              </div>
              <div className="bg-muted px-2 py-1 rounded-md">
                <div className="text-xs text-muted-foreground">Ask</div>
                <div className={cn(
                  "font-mono transition-colors",
                  priceAnimations.ask === 'up' && "text-green-500",
                  priceAnimations.ask === 'down' && "text-red-500"
                )}>
                  {formatPrice(pairPrices[selectedPair]?.ask)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick trade form - Removed Tabs section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">
                Size (Lots)
                <span 
                  className="ml-2 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                  onClick={handleSetMaxLots}
                  title="Click to set maximum lots"
                >
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

          {/* Trade buttons section - Updated with pip difference badge */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 relative">
              <Button
                className={cn(
                  "h-16 flex-col space-y-1",
                  "bg-red-500 hover:bg-red-600 border-0",
                  "text-white font-medium",
                  "!items-start !justify-start",
                  isExecutingTrade && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleTrade('sell')}
                disabled={isExecutingTrade}
              >
                <div className="text-xs font-normal text-left pl-2">
                  {isExecutingTrade ? 'Executing...' : 'Sell at'}
                </div>
                <div className="text-lg font-mono font-semibold text-left pl-2">
                  {getDisplayPrice('sell')}
                </div>
              </Button>

              {/* Updated pip difference badge */}
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3 z-10">
                <Badge 
                  variant="secondary" 
                  className="bg-background rounded-sm px-3 py-0.5 text-[10px] font-medium shadow-sm"
                >
                  {pipDifference.toFixed(1)} pips
                </Badge>
              </div>

              <Button
                className={cn(
                  "h-16 flex-col space-y-1",
                  "bg-blue-500 hover:bg-blue-600 border-0",
                  "text-white font-medium",
                  "!items-start !justify-start",
                  isExecutingTrade && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleTrade('buy')}
                disabled={isExecutingTrade}
              >
                <div className="text-xs font-normal text-right pr-2">
                  {isExecutingTrade ? 'Executing...' : 'Buy at'}
                </div>
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
                  <div className="flex justify-between">
                    <span>Leverage:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-mono hover:bg-transparent"
                      onClick={() => setShowLeverageDialog(true)}
                    >
                      {actualLeverage !== parseInt(selectedLeverage)
                        ? `${actualLeverage}x (max for ${pairInfo?.short_name})`
                        : `${actualLeverage}x`}
                    </Button>
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
        </div>

        {/* Replace AI Trading button with image button */}
        <div className="pt-4 border-t border-[#525252]">
          {/* Removed DemoTrade component */}
          <Button
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => navigate('/plans')}
          >
            <img 
              src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//ai-computes.svg"
              alt="Subscribe to AI Computes"
              className="w-full h-full object-fit-cover rounded-md"
            />
          </Button>
        </div>
      </div>

      <Dialog open={showLeverageDialog} onOpenChange={setShowLeverageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Leverage</DialogTitle>
            <DialogDescription>
              Choose your preferred leverage level. Higher leverage increases both potential profits and risks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pairInfo && getVisibleRiskCategories(pairInfo.leverage_options || []).map(category => {
              const options = getLeverageCategories(pairInfo.leverage_options || [])[category];
              const { label, color, Icon, description } = RISK_LEVEL_INFO[category];

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", color)} />
                    <span className={cn("font-medium", color)}>{label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map(leverage => (
                      <Button
                        key={leverage}
                        variant={parseInt(selectedLeverage) === leverage ? "secondary" : "outline"}
                        onClick={() => handleLeverageSelect(leverage)}
                        className="flex-1"
                      >
                        {leverage}x
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Selected leverage will be saved as your default for future trades.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
