import { TradingPairsUpdater } from '@/services/tradingPairsUpdater';

// Initialize services
export const initializeServices = () => {
  const tradingPairsUpdater = new TradingPairsUpdater();
  tradingPairsUpdater.start(30); // Update every 30 minutes
};
