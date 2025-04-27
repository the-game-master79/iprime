import { Trade, PriceData } from "@/types/trading";

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
  if (pair.includes('BINANCE:')) return 0.01; // Use 0.01 for crypto consistently
  return isJPYPair(pair) ? 0.01 : 0.0001;
};

export const calculatePipValue = (
  lots: number,
  price: number,
  pair: string
): number => {
  const isCrypto = pair.includes('BINANCE:');
  const isGold = pair === 'FX:XAU/USD';
  
  if (isCrypto) {
    const positionValue = price * lots;
    return positionValue * 0.01; // Use 0.01 consistently for crypto
  }
  
  if (isGold) {
    return lots * 100 * 0.01;
  }

  const standardLot = getStandardLotSize(pair);
  const positionSize = lots * standardLot;
  
  if (isJPYPair(pair)) {
    return (positionSize * 0.01) / price;
  }
  
  return positionSize * 0.0001;
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

export const calculatePnL = (trade: Trade, currentPrice: number): number => {
  const isCrypto = trade.pair.includes('BINANCE:');
  
  if (isCrypto) {
    // For crypto, we calculate pip-based P&L just like forex
    const priceDifference = calculatePriceDifference(trade.type, currentPrice, trade.openPrice);
    const lotPipValue = calculatePipValue(trade.lots, currentPrice, trade.pair);
    const pipValue = getPipValue(trade.pair);
    const pips = priceDifference / pipValue;
    return pips * lotPipValue;
  }

  // For forex pairs, calculate pips difference and multiply by pip value
  const priceDifference = calculatePriceDifference(trade.type, currentPrice, trade.openPrice);
  const lotPipValue = calculatePipValue(trade.lots, currentPrice, trade.pair);
  const pipValue = getPipValue(trade.pair);
  const pips = priceDifference / pipValue;
  return pips * lotPipValue;
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
