import { Trade, PriceData } from "@/types/trading";
import { getPipValueForPair } from '@/config/pipValues';

const FOREX_PAIRS_JPY = ['USDJPY', 'EURJPY', 'GBPJPY'];

export const isJPYPair = (pair: string): boolean => {
  const cleanPair = pair.replace(/[^A-Z]/g, '');
  return /JPY$/.test(cleanPair);
};

export const getStandardLotSize = (pair: string): number => {
  if (pair === 'FX:XAU/USD') return 100;
  return 100000; // Default forex lot size
};

export const getPipValue = (pair: string): number => {
  if (!pair) return 0;
  // Use consistent pip values from config
  return getPipValueForPair(pair);
};

export const calculatePipValue = (
  lots: number,
  price: number,
  pair: string
): number => {
  if (!pair || !price || !lots) return 0;
  
  const standardLotSize = getStandardLotSize(pair);
  const pipValue = getPipValueForPair(pair);
  
  if (pair.includes('BINANCE:')) {
    // For crypto: value per pip = position size * configured pip value
    return lots * price * pipValue;
  }
  
  if (pair === 'FX:XAU/USD') {
    // For gold: value per pip = lots * configured pip value
    return lots * pipValue;
  }

  // For forex: Calculate based on standard lot size and pip value from config
  const positionSize = lots * standardLotSize;
  
  if (isJPYPair(pair)) {
    // For JPY pairs: adjust for price scale
    return (positionSize * pipValue) / price;
  }
  
  // For standard forex: use configured pip value
  return positionSize * pipValue;
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

/**
 * Example PnL Calculations:
 * 
 * 1. Bitcoin (BINANCE:BTCUSDT)
 * - Trade: Buy 1 lot at $40,000
 * - Current price: $41,000
 * - Pip value (0.00001): $0.40 per pip at open price
 * - Price difference: +$1,000
 * - Pips moved: 1000 / (40000 * 0.00001) = 2500 pips
 * - PnL: 2500 * $0.40 * 1 lot = +$1,000
 * 
 * 2. EUR/USD (FX:EUR/USD)
 * - Trade: Sell 1 lot at 1.1000
 * - Current price: 1.0950
 * - Standard lot: 100,000 units
 * - Pip value (0.0001): $10 per pip
 * - Price difference: +0.0050 (because sell trade)
 * - Pips moved: 0.0050 / 0.0001 = 50 pips
 * - PnL: 50 * $10 = +$500
 * 
 * 3. USD/JPY (FX:USD/JPY)
 * - Trade: Buy 1 lot at 150.00
 * - Current price: 150.50
 * - Pip value (0.01): $6.67 per pip (100000 * 0.01 / 150.00)
 * - Price difference: +0.50
 * - Pips moved: 0.50 / 0.01 = 50 pips
 * - PnL: 50 * $6.67 = +$333.50
 */
export const calculatePnL = (trade: Trade, currentPrice: number): number => {
  if (!currentPrice || !trade.openPrice) return 0;
  
  // Special handling for BTC and ETH
  if (trade.pair === 'BINANCE:BTCUSDT' || trade.pair === 'BINANCE:ETHUSDT') {
    const pipValue = getPipValueForPair(trade.pair);
    // Calculate price-adjusted pip value
    const adjustedPipValue = trade.openPrice * pipValue;
    const priceDiff = calculatePriceDifference(trade.type, currentPrice, trade.openPrice);
    const pips = priceDiff / adjustedPipValue;
    return pips * adjustedPipValue * trade.lots;
  }
  
  const priceDiff = calculatePriceDifference(trade.type, currentPrice, trade.openPrice);
  const pipValue = getPipValueForPair(trade.pair);
  
  if (trade.pair.includes('BINANCE:')) {
    const pips = priceDiff / pipValue;
    return pips * calculatePipValue(trade.lots, currentPrice, trade.pair);
  }
  
  if (trade.pair === 'FX:XAU/USD') {
    // Gold is quoted in cents, so divide by 0.01 to get pips
    const pips = priceDiff / 0.01;
    return pips * calculatePipValue(trade.lots, currentPrice, trade.pair);
  }
  
  // For forex pairs
  const pips = isJPYPair(trade.pair) 
    ? priceDiff / 0.01  // JPY pairs use 0.01 pip size
    : priceDiff / 0.0001; // Other pairs use 0.0001 pip size
    
  return pips * calculatePipValue(trade.lots, currentPrice, trade.pair);
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
  const positionSize = isCrypto ? price * lots : price * lots * 100000;
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
  leverage: number
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

  const pipValue = calculatePipValue(lots, price, pair);
  const margin = volumeUsd / leverage;

  return {
    margin,
    pipValue,
    volumeUnits,
    volumeUsd
  };
};

export const calculateAdjustedPipValue = (
  lots: number,
  price: number,
  pair: string
): number => {
  if (!lots || !price) return 0;
  const pipValue = getPipValueForPair(pair);
  return lots * price * pipValue;
};
