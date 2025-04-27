// Decimal places configuration for crypto pairs
export const cryptoDecimals: Record<string, number> = {
  'BTCUSDT': 2,
  'ETHUSDT': 2,
  'BNBUSDT': 2,
  'SOLUSDT': 2,
  'DOTUSDT': 3,
  'DOGEUSDT': 5,
  'ADAUSDT': 4,
  'TRXUSDT': 4,
  'LINKUSDT': 2
};

// Decimal places configuration for forex pairs
export const forexDecimals: Record<string, number> = {
  'EURUSD': 5,
  'GBPUSD': 5,
  'USDJPY': 3,
  'USDCHF': 5,
  'AUDUSD': 5,
  'USDCAD': 5,
  'EURGBP': 5,
  'EURJPY': 3,
  'GBPJPY': 3,
  'XAUUSD': 2  // Gold
};

// Helper function to get decimal places for any pair
export const getDecimalPlaces = (symbol: string): number => {
  if (symbol.includes('BINANCE:')) {
    const base = symbol.replace('BINANCE:', '');
    return cryptoDecimals[base] ?? 5;
  }

  if (symbol.includes('FX:')) {
    const base = symbol.replace('FX:', '').replace('/', '');
    return forexDecimals[base] ?? 5;
  }

  return 5; // Default fallback
};

// Lot size decimal places configuration
export const lotSizeDecimals: Record<string, number> = {
  // Crypto lot size decimals
  'BNBUSDT': 2,
  'DOTUSDT': 1,
  'ETHUSDT': 2,
  'DOGEUSDT': 0,
  'BTCUSDT': 2,
  'TRXUSDT': 0,
  'LINKUSDT': 2,
  'ADAUSDT': 0,
  'SOLUSDT': 2,
  
  // Forex lot size decimals (standard 2 decimals)
  'EURUSD': 2,
  'GBPUSD': 2,
  'USDJPY': 2,
  'USDCHF': 2,
  'AUDUSD': 2,
  'USDCAD': 2,
  'EURGBP': 2,
  'EURJPY': 2,
  'GBPJPY': 2,
  'XAUUSD': 2
};

// Helper function to get lot size decimal places
export const getLotSizeDecimals = (symbol: string): number => {
  if (symbol.includes('BINANCE:')) {
    const base = symbol.replace('BINANCE:', '');
    return lotSizeDecimals[base] ?? 2;
  }

  if (symbol.includes('FX:')) {
    const base = symbol.replace('FX:', '').replace('/', '');
    return lotSizeDecimals[base] ?? 2;
  }

  return 2; // Default to 2 decimals
};
