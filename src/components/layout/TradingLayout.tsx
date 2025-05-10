import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { PlusCircle, ChevronLeftCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { isForexTradingTime } from "@/lib/utils"; // Fix import

const RECENT_PAIRS_KEY = 'recentTradingPairs';

interface TradingLayoutProps {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  userBalance: number;
  depositDialogOpen: boolean;
  setDepositDialogOpen: (open: boolean) => void;
  selectedPair: string;
  onPairSelect: (pair: string) => void;
  tradingPairs: any[];
}

export const TradingLayout: React.FC<TradingLayoutProps> = ({
  children,
  isSidebarOpen,
  toggleSidebar,
  userBalance,
  depositDialogOpen,
  setDepositDialogOpen,
  selectedPair,
  onPairSelect,
  tradingPairs
}) => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoints();
  const [prevBalance, setPrevBalance] = useState(userBalance);
  const [balanceChange, setBalanceChange] = useState<'increase' | 'decrease' | null>(null);
  const [recentPairs, setRecentPairs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_PAIRS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track recent pairs with localStorage persistence
  useEffect(() => {
    if (selectedPair) {
      setRecentPairs(prev => {
        if (!prev.includes(selectedPair)) {
          // Only add to list if not already present
          const updated = [...prev, selectedPair].slice(0, 5);
          localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [selectedPair]);

  // Handle removing pair
  const handleRemovePair = (pair: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentPairs(prev => {
      const updated = prev.filter(p => p !== pair);
      localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(updated));
      
      // If removing current pair, switch to first available pair
      if (pair === selectedPair && updated.length > 0) {
        onPairSelect(updated[0]);
      }
      return updated;
    });
  };

  // Balance change effect
  useEffect(() => {
    if (userBalance !== prevBalance) {
      setBalanceChange(userBalance > prevBalance ? 'increase' : 'decrease');
      setPrevBalance(userBalance);
      
      // Reset animation after 1 second
      const timer = setTimeout(() => {
        setBalanceChange(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [userBalance, prevBalance]);

  // Add helper function to check if pair is forex
  const isForexPair = (pair: string) => {
    return pair.startsWith('FX:');
  };

  // Update check to use isForexTradingTime
  useEffect(() => {
    if (!isForexTradingTime()) {
      setRecentPairs(prev => {
        const filtered = prev.filter(pair => !isForexPair(pair));
        localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(filtered));
        
        // If current pair is forex, switch to first available non-forex pair
        if (isForexPair(selectedPair) && filtered.length > 0) {
          onPairSelect(filtered[0]);
        }
        
        return filtered;
      });
    }
  }, [selectedPair, onPairSelect]);

  // Simplified tab click handler - only updates selected pair without navigation
  const handleTabClick = (pair: string) => {
    if (isForexPair(pair) && !isForexTradingTime()) {
      return; // Prevent selecting forex pairs when market is closed
    }
    onPairSelect(pair); // This will trigger chart update in parent component
  };

  return (
    <div className="flex h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[#525252] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
        <div className="flex h-full items-center justify-between gap-2 px-4 max-w-[2560px] mx-auto">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8"
            >
              <ChevronLeftCircle className="h-12 w-12" />
            </Button>
            
            {!isMobile && (
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudtrade.svg" 
                  alt="CloudTrade Logo" 
                  className="h-8 w-auto" 
                />
              </Link>
            )}
          </div>

          {/* Trading pair tabs */}
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-1 px-2">
              {recentPairs
                .filter(pair => !isForexTradingTime() || !isForexPair(pair))
                .map(pair => {
                const pairInfo = tradingPairs.find(p => p.symbol === pair);
                if (!pairInfo) return null;
                
                return (
                  <Button
                    key={pair}
                    variant={selectedPair === pair ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 gap-2 px-3 text-sm relative group/tab",
                      selectedPair === pair ? "bg-accent" : "hover:bg-accent/50"
                    )}
                    onClick={() => handleTabClick(pair)}
                  >
                    <img 
                      src={pairInfo.image_url} 
                      alt={pair}
                      className="h-4 w-4 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <span>{pairInfo.short_name || pair}</span>
                      {recentPairs.length > 1 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePair(pair, e);
                          }}
                          className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-accent/80 cursor-pointer"
                          role="button"
                          tabIndex={0}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Right side with animated balance */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className={cn(
              "flex items-center gap-1.5 md:gap-2 px-2 py-1 rounded-full bg-muted/50 transition-transform duration-300",
              balanceChange && "scale-110"
            )}>
              <span className={cn(
                "text-sm md:text-base font-medium transition-colors duration-300",
                balanceChange === 'increase' && "text-green-500",
                balanceChange === 'decrease' && "text-red-500"
              )}>
                ${userBalance.toLocaleString()}
              </span>
            </div>

            <Button 
              onClick={() => navigate('/deposit')} 
              size={isMobile ? "sm" : "default"}
              className="h-8 md:h-10 bg-[#FFA500] text-black hover:bg-[#FFA500]/90"
            >
              <PlusCircle className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Add funds</span>}
            </Button>
          </div>
        </div>
      </header>

      <main className={cn(
        "flex-1 mt-14 transition-all duration-300",
        isMobile ? "ml-0" : (isSidebarOpen ? "ml-0" : "ml-0") // Start with no margin, only add when sidebar is open
      )}>
        {children}
      </main>

      <DepositDialog 
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
      />
    </div>
  );
};
