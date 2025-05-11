import { useEffect } from 'react';
import { Trade, PriceData } from '@/types/trading';
import { calculatePnL } from '@/utils/trading';
import { toast } from '@/components/ui/use-toast';

// Constants for margin thresholds
const STOPOUT_THRESHOLD = 0.05; // 5% threshold for complete stopout
const WARNING_THRESHOLD = 0.10; // 10% threshold for warnings

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

      // Calculate margin level as a percentage of initial balance
      const marginLevel = adjustedBalance / userBalance;

      // Check if margin level is below stopout threshold (5%)
      if (marginLevel <= STOPOUT_THRESHOLD) {
        // Close all open trades immediately
        openTrades.forEach(trade => {
          onCloseTrade(trade.id);
        });
        
        // Show stopout notification
        toast({
          variant: "destructive",
          title: "Margin Stopout",
          description: `All positions have been closed due to margin level reaching ${(marginLevel * 100).toFixed(2)}%`
        });
        return;
      }

      // Optional: Show warning when approaching stopout level
      if (marginLevel <= WARNING_THRESHOLD) {
        toast({
          variant: "destructive",
          title: "Low Margin Warning",
          description: `Your margin level is ${(marginLevel * 100).toFixed(2)}%. Positions may be closed at 5%`
        });
      }
    };

    // Check margin levels every second
    const interval = setInterval(checkMarginLevels, 1000);
    return () => clearInterval(interval);
  }, [trades, currentPrices, userBalance, onCloseTrade]);

  return null; // This component doesn't render anything
};
