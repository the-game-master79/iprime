// Pip value configuration for crypto and forex pairs
export const PIP_VALUES = {
  // Major cryptocurrencies with custom pip values
  'BINANCE:BTCUSDT': 0.0001,    // 1 pip = $0.0001 for BTC
  'BINANCE:ETHUSDT': 0.0001,   // 1 pip = $0.00001 for others
  'BINANCE:BNBUSDT': 0.00001,
  'BINANCE:SOLUSDT': 0.01,
  'BINANCE:ADAUSDT': 0.00001,
  'BINANCE:DOGEUSDT': 0.1,
  'BINANCE:DOTUSDT': 0.0001,    // Higher pip value for DOT's 50-unit lot size
  'BINANCE:TRXUSDT': 0.00001,
  
  // Default values
  'CRYPTO_DEFAULT': 0.00001,  // Standard crypto pip
  'FOREX_DEFAULT': 0.0001,    // Standard forex pip
  'FOREX_JPY': 0.01          // Standard JPY pip
} as const;

export const getPipValueForPair = (pair: string): number => {
  // Check for exact match first
  if (pair in PIP_VALUES) {
    return PIP_VALUES[pair as keyof typeof PIP_VALUES];
  }

  // Check for type-based default
  if (pair.includes('BINANCE:')) {
    return PIP_VALUES.CRYPTO_DEFAULT;
  }

  // For forex pairs
  if (pair.includes('FX:')) {
    return pair.includes('JPY') ? PIP_VALUES.FOREX_JPY : PIP_VALUES.FOREX_DEFAULT;
  }

  return PIP_VALUES.CRYPTO_DEFAULT; // Fallback to crypto default
};
