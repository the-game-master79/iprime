import { Trade } from "@/types/trading";

const FOREX_PAIRS_JPY = ['USDJPY', 'EURJPY', 'GBPJPY'];

export const isJPYPair = (pair: string): boolean => {
  const cleanPair = pair.replace(/[^A-Z]/g, '');
  return /JPY$/.test(cleanPair);
};

export const getPipValue = (pair: string) => {
  if (!pair) return 0;
  if (pair.includes('BINANCE:')) return 0.00001;
  return isJPYPair(pair) ? 0.01 : 0.0001;
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

export const calculatePnL = (trade: Trade, currentPrice: number) => {
  const isCrypto = trade.pair.includes('BINANCE:');
  const priceDifference = trade.type === 'buy' 
    ? currentPrice - trade.openPrice
    : trade.openPrice - currentPrice;

  // Calculate value without leverage to get actual P&L
  const baseValue = calculateTradeValue(
    trade.openPrice,
    trade.lots,
    isCrypto,
    trade.pair
  );

  return priceDifference * (baseValue / trade.openPrice);
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
