export const CRYPTO_LEVERAGES = {
  'BINANCE:BTCUSDT': 20,  // BTC max 20x leverage
  'BINANCE:ETHUSDT': 20,  // ETH max 20x leverage
  'BINANCE:BNBUSDT': 20,  // BNB max 20x leverage
  'BINANCE:DOGEUSDT': 1,  // DOGE restricted to 1x leverage
  'BINANCE:LINKUSDT': 2,  // LINK max 2x leverage
  'BINANCE:ADAUSDT': 1,   // ADA restricted to 1x leverage
  'DEFAULT': 20           // Default max leverage for other crypto pairs
} as const;

export const getMaxLeverageForPair = (pair: string): number => {
  if (pair in CRYPTO_LEVERAGES) {
    return CRYPTO_LEVERAGES[pair as keyof typeof CRYPTO_LEVERAGES];
  }
  return CRYPTO_LEVERAGES.DEFAULT;
};
