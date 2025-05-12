import { useEffect, useRef } from 'react';
import { Trade, PriceData } from '@/types/trading';
import { calculatePnL } from '@/utils/trading';
import { toast } from '@/components/ui/use-toast';

// Constants for margin thresholds
const STOPOUT_THRESHOLD = 0.05; // 5% threshold for complete stopout
const WARNING_THRESHOLD = 0.10; // 10% threshold for warnings
const LOW_EQUITY_THRESHOLD = 0.05; // 5% equity threshold - close positions when equity drops to 5% of initial balance

interface MarginWatchDogProps {
  trades: Trade[];
  currentPrices: Record<string, PriceData>;
  userBalance: number;
  onCloseTrade: (tradeId: string) => Promise<void>;
}

export const MarginWatchDog = ({ trades, currentPrices, userBalance, onCloseTrade }: MarginWatchDogProps) => {
  const lastCheck = useRef<number>(0);
  
  useEffect(() => {
    const checkMarginLevels = async () => {
      // Get only open trades
      const openTrades = trades.filter(t => t.status === 'open');
      if (openTrades.length === 0) return;

      // Avoid checking too frequently
      const now = Date.now();
      if (now - lastCheck.current < 1000) return;
      lastCheck.current = now;

      // Verify we have prices for all open trades
      const hasAllPrices = openTrades.every(trade => 
        currentPrices[trade.pair] && (currentPrices[trade.pair].bid || currentPrices[trade.pair].ask)
      );

      if (!hasAllPrices) {
        console.warn('MarginWatchDog: Missing prices for some trades');
        return;
      }

      // Calculate total unrealized PnL
      const totalPnL = openTrades.reduce((acc, trade) => {
        const currentPrice = parseFloat(currentPrices[trade.pair]?.bid || '0');
        if (currentPrice === 0) return acc;
        return acc + calculatePnL(trade, currentPrice);
      }, 0);

      // Calculate total margin used
      const totalMargin = openTrades.reduce((acc, trade) => acc + (trade.margin_amount || 0), 0);

      // Calculate adjusted balance including unrealized PnL
      const adjustedBalance = userBalance + totalPnL;

      // Calculate equity level (adjusted balance / initial balance)
      const equityLevel = adjustedBalance / userBalance;

      // Calculate margin level (adjusted balance / margin used)
      const marginLevel = adjustedBalance / totalMargin;

      console.log('MarginWatchDog Status:', {
        openTrades: openTrades.length,
        totalPnL: totalPnL.toFixed(2),
        equityLevel: (equityLevel * 100).toFixed(2) + '%',
        marginLevel: (marginLevel * 100).toFixed(2) + '%',
        adjustedBalance: adjustedBalance.toFixed(2),
        totalMargin: totalMargin.toFixed(2),
      });

      // Handle low equity level (5% of initial balance)
      if (equityLevel <= LOW_EQUITY_THRESHOLD) {
        // Sort trades by PnL (close most unprofitable first)
        const sortedTrades = [...openTrades].sort((a, b) => {
          const pnlA = calculatePnL(a, parseFloat(currentPrices[a.pair]?.bid || '0'));
          const pnlB = calculatePnL(b, parseFloat(currentPrices[b.pair]?.bid || '0'));
          return pnlA - pnlB;
        });

        // Close trades until equity improves
        let currentEquity = equityLevel;
        let remainingTrades = [...sortedTrades];

        for (const trade of sortedTrades) {
          if (currentEquity > LOW_EQUITY_THRESHOLD) break;
          
          await onCloseTrade(trade.id).catch(error => 
            console.error('Failed to close trade during low equity:', error)
          );
          
          // Recalculate equity after each trade closure
          remainingTrades = remainingTrades.filter(t => t.id !== trade.id);
          const newTotalPnL = remainingTrades.reduce((acc, t) => 
            acc + calculatePnL(t, parseFloat(currentPrices[t.pair]?.bid || '0')), 0
          );
          currentEquity = (userBalance + newTotalPnL) / userBalance;
        }
        
        toast({
          variant: "destructive",
          title: "Low Equity Warning",
          description: `Some positions have been closed to protect your account. Equity level: ${(equityLevel * 100).toFixed(2)}% of initial balance`
        });
        return;
      }

      // Optional: Show warning when approaching low equity
      if (equityLevel <= WARNING_THRESHOLD) {
        toast({
          variant: "destructive",
          title: "Equity Warning",
          description: `Your equity level is ${(equityLevel * 100).toFixed(2)}% of initial balance. Positions may be closed at 5%`
        });
      }
    };

    // Initial check
    checkMarginLevels();

    // Set up interval for continuous monitoring
    const interval = setInterval(checkMarginLevels, 1000);
    return () => clearInterval(interval);
  }, [trades, currentPrices, userBalance, onCloseTrade]);

  return null; // This component doesn't render anything
};
