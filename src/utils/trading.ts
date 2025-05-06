import { Trade, PriceData, TradingPair } from "@/types/trading";

const FOREX_PAIRS_JPY = ['USDJPY', 'EURJPY', 'GBPJPY'];

export const isJPYPair = (pair: string): boolean => {
  const cleanPair = pair.replace(/[^A-Z]/g, '');
  return /JPY$/.test(cleanPair);
};

export const getStandardLotSize = (pair: string): number => {
  if (pair === 'FX:XAU/USD') return 100;
  if (pair === 'BINANCE:DOTUSDT') return 50; // Special case for Polkadot
  if (pair === 'BINANCE:POLUSDT') return 5; // 5x the volume for POLUSDT
  return pair.includes('BINANCE:') ? 1 : 100000; // Default: 1 for crypto, 100000 for forex
};

export const calculatePipValue = (
  lots: number,
  price: number,
  pair: string,
  tradingPairs?: TradingPair[] // Make tradingPairs optional
): number => {
  if (!pair || !price || !lots || !tradingPairs?.length) return 0;
  
  const pairInfo = tradingPairs.find(p => p.symbol === pair);
  if (!pairInfo?.pip_value) return 0; // Add null check for pip_value
  
  const standardLot = getStandardLotSize(pair);
  const pipSize = pairInfo.pip_value;

  // Standard lot size for forex is 100,000 units
  const STANDARD_LOT = 100000;
  
  // Calculate units based on selected lots
  const units = lots * STANDARD_LOT;
  
  if (pair.includes('BINANCE:')) {
    // For crypto pairs, use simpler calculation since price is in USD directly
    return pairInfo.pip_value * units;
  }
  
  // For forex pairs, use the proper pip value formula
  // Pip Value = (pip size / current price) × units
  // For JPY pairs, pip size is 0.01, for others it's 0.0001
  return (pairInfo.pip_value / price) * units;
};

export const calculatePriceDifference = (
  tradeType: 'buy' | 'sell',
  currentPrice: number,
  openPrice: number
): number => {
  return tradeType === 'buy'
    ? currentPrice - openPrice
    : openPrice - currentPrice;
};

// Calculate price difference in pips
export const calculatePriceDifferenceInPips = (
  tradeType: 'buy' | 'sell',
  currentPrice: number,
  openPrice: number,
  pair: string,
  tradingPairs: TradingPair[]
): number => {
  const pairInfo = tradingPairs.find(p => p.symbol === pair);
  if (!pairInfo) return 0;

  const priceDiff = tradeType === 'buy' 
    ? currentPrice - openPrice 
    : openPrice - currentPrice;
  return priceDiff / pairInfo.pip_value;
};

// Update PnL calculation to use pip-based calculation
export const calculatePnL = (trade: Trade, currentPrice: number, tradingPairs?: TradingPair[]): number => {
  if (!currentPrice || !trade.openPrice) return 0;

  const priceDiff = trade.type === 'buy' 
    ? currentPrice - trade.openPrice 
    : trade.openPrice - currentPrice;
    
  // Calculate PnL based on pair type using standard lot sizes
  if (trade.pair.includes('BINANCE:')) {
    // For crypto pairs, use lots directly
    return priceDiff * trade.lots;
  } else if (trade.pair === 'FX:XAU/USD') {
    // For gold, each lot is 100 oz
    return priceDiff * trade.lots * 100;
  } else {
    // For forex pairs, use standard lot size (100,000)
    return priceDiff * trade.lots * 100000;
  }
};

export const calculateRequiredMargin = (
  price: number, 
  lots: number, 
  leverage: number, 
  isCrypto: boolean, 
  pair: string
) => {
  if (!price || !lots || !leverage) return 0;
  
  const effectiveLeverage = Math.max(1, isJPYPair(pair) ? leverage * 20 : leverage);
  
  // Calculate position size based on instrument type
  let positionSize;
  if (isCrypto) {
    const standardLot = getStandardLotSize(pair);
    positionSize = price * lots * standardLot;
  } else if (pair === 'FX:XAU/USD') {
    positionSize = price * lots * 100;
  } else {
    positionSize = price * lots * 100000;
  }
  
  const cappedPositionSize = Math.min(positionSize, 100000 * lots * (isCrypto ? 1 : 100000));
  return cappedPositionSize / effectiveLeverage;
};

// Add new function to calculate trade value
export const calculateTradeValue = (
  price: number,
  lots: number,
  isCrypto: boolean,
  pair: string
): number => {
  if (isCrypto) {
    // For crypto, value is simply price * lots
    return price * lots;
  }

  // For forex, use standard lot size (100,000)
  const standardLotSize = pair === 'FX:XAU/USD' ? 100 : 100000;
  return price * lots * standardLotSize;
};

export const formatTradingViewSymbol = (symbol: string) => {
  if (symbol.includes('BINANCE:')) return symbol;
  if (symbol.includes('FX:')) return symbol.replace('FX:', '').replace('/', '');
  return symbol;
};

export const calculateTotalMarginUtilization = (trades: Trade[]) => {
  return trades
    .filter(t => t.status === 'open' || t.status === 'pending')
    .reduce((total, trade) => total + (trade.margin_amount || 0), 0);
};

export interface TradeInfo {
  margin: number;
  pipValue: number;
  volumeUnits: number;
  volumeUsd: number;
}

export const calculateTradeInfo = (
  lots: number, 
  pair: string, 
  prices: Record<string, PriceData>,
  leverage: number,
  tradingPairs: TradingPair[]
): TradeInfo => {
  const price = parseFloat(prices[pair]?.price || '0');
  const isCrypto = pair.includes('BINANCE:');
  const isGold = pair === 'FX:XAU/USD';

  if (!price || !lots) {
    return {
      margin: 0,
      pipValue: 0,
      volumeUnits: 0,
      volumeUsd: 0
    };
  }

  let volumeUnits, volumeUsd;
  
  if (isCrypto) {
    volumeUnits = lots;
    volumeUsd = lots * price;
  } else if (isGold) {
    volumeUnits = lots * 100;
    volumeUsd = volumeUnits * price;
  } else {
    const standardLotSize = getStandardLotSize(pair);
    volumeUnits = lots * standardLotSize;
    volumeUsd = volumeUnits * price;
  }

  const pipValue = calculatePipValue(lots, price, pair, tradingPairs);
  const margin = volumeUsd / leverage;

  return {
    margin,
    pipValue,
    volumeUnits,
    volumeUsd
  };
};
