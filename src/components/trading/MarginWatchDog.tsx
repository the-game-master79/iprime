import { useEffect } from 'react';
import { Trade, PriceData } from '@/types/trading';
import { calculatePnL } from '@/utils/trading';

const MARGIN_THRESHOLD = 0.05; // 5% threshold

interface MarginWatchDogProps {
  trades: Trade[];
  currentPrices: Record<string, PriceData>;
  userBalance: number;
  onCloseTrade: (tradeId: string) => Promise<void>;
}

export const MarginWatchDog = ({ trades, currentPrices, userBalance, onCloseTrade }: MarginWatchDogProps) => {
  useEffect(() => {
    const checkMarginLevels = () => {
      // Get only open trades
      const openTrades = trades.filter(t => t.status === 'open');
      if (openTrades.length === 0) return;

      // Calculate total unrealized PnL
      const totalPnL = openTrades.reduce((acc, trade) => {
        const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
        return acc + calculatePnL(trade, currentPrice);
      }, 0);

      // Calculate adjusted balance including unrealized PnL
      const adjustedBalance = userBalance + totalPnL;

      // Calculate total margin used
      const totalMargin = openTrades.reduce((acc, trade) => acc + (trade.margin_amount || 0), 0);

      // Check if margin utilization exceeds threshold
      if (totalMargin >= (adjustedBalance * MARGIN_THRESHOLD)) {
        // Close all open trades
        openTrades.forEach(trade => {
          onCloseTrade(trade.id);
        });
      }
    };

    // Check margin levels every second
    const interval = setInterval(checkMarginLevels, 1000);
    return () => clearInterval(interval);
  }, [trades, currentPrices, userBalance, onCloseTrade]);

  return null; // This component doesn't render anything
};
