// Pip value configuration for crypto and forex pairs
export const PIP_VALUES = {
  // Major cryptocurrencies with custom pip values
  'BINANCE:BTCUSDT': 0.0001,     // $1.00 per pip
  'BINANCE:ETHUSDT': 0.01,     // $0.10 per pip
  'BINANCE:BNBUSDT': 0.01,    // $0.01 per pip
  'BINANCE:SOLUSDT': 0.01,    // $0.01 per pip
  'BINANCE:ADAUSDT': 0.0001,   // $0.01 per pip
  'BINANCE:DOGEUSDT': 0.0001,  // $0.01 per pip
  'BINANCE:DOTUSDT': 0.01,     // $0.01 per pip
  'BINANCE:TRXUSDT': 0.0001,   // $0.01 per pip

  
  // Default values
  'CRYPTO_DEFAULT': 0.00001,  // Default for other crypto pairs
  'FOREX_DEFAULT': 0.0001,    // Default for forex pairs
  'FOREX_JPY': 0.01          // Default for JPY pairs
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
