import { Trade, PriceData } from "@/types/trading";
import { getPipValueForPair } from '@/config/pipValues';

const FOREX_PAIRS_JPY = ['USDJPY', 'EURJPY', 'GBPJPY'];

export const isJPYPair = (pair: string): boolean => {
  const cleanPair = pair.replace(/[^A-Z]/g, '');
  return /JPY$/.test(cleanPair);
};

export const getStandardLotSize = (pair: string): number => {
  if (pair === 'FX:XAU/USD') return 100;
  if (pair === 'BINANCE:DOTUSDT') return 50; // Special case for Polkadot
  return pair.includes('BINANCE:') ? 1 : 100000; // Default: 1 for crypto, 100000 for forex
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
  
  if (pair.includes('BINANCE:')) {
    const pipSize = getPipValue(pair);
    const standardLot = getStandardLotSize(pair);
    // For DOT: pip value needs to account for 50-unit standard lot size
    if (pair === 'BINANCE:DOTUSDT') {
      return lots * price * pipSize * standardLot * 5; // Multiply by 5 to adjust for 50 units
    }
    return lots * price * pipSize * standardLot;
  }
  
  if (pair === 'FX:XAU/USD') {
    // For gold: 1 pip = 0.1, lot size = 100 oz
    return lots * 100 * 0.1;
  }

  // For forex pairs
  const pipSize = isJPYPair(pair) ? 0.01 : 0.0001;
  return lots * 100000 * pipSize;
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
  if (!currentPrice || !trade.openPrice) return 0;
  
  const priceDiff = trade.type === 'buy' 
    ? currentPrice - trade.openPrice 
    : trade.openPrice - currentPrice;

  if (trade.pair.includes('BINANCE:')) {
    // For crypto: PnL = (price difference * lots)
    return priceDiff * trade.lots;
  }
  
  if (trade.pair === 'FX:XAU/USD') {
    // For gold: PnL = (price difference * lots * 100)
    return priceDiff * trade.lots * 100;
  }
  
  // For forex: PnL = (price difference * lots * standard lot size)
  const standardLotSize = 100000;
  return priceDiff * trade.lots * standardLotSize;
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
