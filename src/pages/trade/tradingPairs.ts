export const TRADING_PAIRS = {
  crypto: [
    { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', shortName: 'BTC' },
    { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', shortName: 'ETH' },
    { symbol: 'BINANCE:SOLUSDT', name: 'Solana', shortName: 'SOL' },
    // ...rest of crypto pairs
  ],
  forex: [
    { symbol: 'FX:EUR/USD', name: 'EUR/USD', shortName: 'EURUSD' },
    { symbol: 'FX:USD/JPY', name: 'USD/JPY', shortName: 'USDJPY' },
    // ...rest of forex pairs
  ]
} as const;
