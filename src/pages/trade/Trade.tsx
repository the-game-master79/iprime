import React, { useState, useEffect } from "react";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { cn, getForexMarketStatus } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { TradingLayout } from "@/components/layout/TradingLayout";
import { TradeSidebar } from "@/components/trading/TradeSidebar";
import { TradingPanel } from "@/components/trading/TradingPanel";
import { TradingActivity } from "@/components/trading/TradingActivity";
import { toast } from "@/components/ui/use-toast";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import type { Trade, TradingPair, PriceData, TradeParams } from "@/types/trading";
import { formatTradingViewSymbol, calculatePnL, calculateRequiredMargin } from "@/utils/trading";
import { usePriceSubscriptions } from '@/hooks/use-price-subscriptions';

// Add interfaces for price tables
interface CryptoPrice {
  symbol: string;
  bid: number;
  ask: number;
}

interface ForexPrice {
  symbol: string;
  bid: number;
  ask: number;
}

const Trade = () => {
  const { isMobile } = useBreakpoints();
  const { pair } = useParams();
  const location = useLocation();

  // Base states
  const [selectedPair, setSelectedPair] = useState(pair ? decodeURIComponent(pair) : '');
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultLeverage, setDefaultLeverage] = useState(100);

  // Replace the price subscription logic with hook
  const pairPrices = usePriceSubscriptions();

  // Effect to fetch user balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserBalance(data.withdrawal_wallet);
      }
    };

    fetchUserBalance();
  }, []);

  // Effect to fetch trading pairs
  useEffect(() => {
    const fetchTradingPairs = async () => {
      try {
        const { data, error } = await supabase
          .from('trading_pairs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        
        if (!selectedPair && data.length > 0) {
          const firstCryptoPair = data.find(p => p.type === 'crypto');
          if (firstCryptoPair) {
            setSelectedPair(firstCryptoPair.symbol);
          }
        }
        
        setTradingPairs(data);
      } catch (error) {
        console.error('Error fetching trading pairs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradingPairs();
  }, [selectedPair]);

  // Effect to fetch trades
  useEffect(() => {
    const fetchTrades = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTrades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      const formattedTrades = userTrades.map(trade => ({
        id: trade.id,
        pair: trade.pair,
        type: trade.type,
        status: trade.status,
        openPrice: trade.open_price,
        lots: trade.lots,
        leverage: trade.leverage,
        orderType: trade.order_type,
        limitPrice: trade.limit_price || null,
        openTime: new Date(trade.created_at).getTime(),
        pnl: trade.pnl || 0,
        margin_amount: trade.margin_amount
      }));

      setTrades(formattedTrades);
    };

    fetchTrades();
  }, []);

  // Add helper function to check margin utilization
  const calculateTotalMarginUtilization = (excludeTradeId?: string) => {
    return trades
      .filter(t => (t.status === 'open' || t.status === 'pending') && t.id !== excludeTradeId)
      .reduce((total, trade) => total + (trade.margin_amount || 0), 0);
  };

  // Trade handlers
  const handleTrade = async (params: TradeParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if forex market is closed for forex pairs
      if (selectedPair.startsWith('FX:')) {
        const { isOpen, message } = getForexMarketStatus();
        if (!isOpen) {
          toast({
            variant: "destructive",
            title: "Market Closed", 
            description: message
          });
          return;
        }
      }

      const currentPrice = params.type === 'buy'
        ? parseFloat(pairPrices[selectedPair]?.ask || '0')
        : parseFloat(pairPrices[selectedPair]?.bid || '0');

      // For limit orders, use limit price as open price
      const effectivePrice = params.orderType === 'limit' 
        ? parseFloat(params.limitPrice!) 
        : currentPrice;

      const marginAmount = calculateRequiredMargin(
        effectivePrice,
        params.lots,
        params.leverage,
        selectedPair.includes('BINANCE:'),
        selectedPair
      );

      const currentMarginUtilization = calculateTotalMarginUtilization();
      if (currentMarginUtilization + marginAmount > userBalance) {
        toast({
          variant: "destructive",
          title: "Insufficient Balance",
          description: `Total margin (${(currentMarginUtilization + marginAmount).toFixed(2)}) would exceed available balance (${userBalance.toFixed(2)})`
        });
        return;
      }

      const { data: trade, error } = await supabase
        .from('trades')
        .insert([{
          user_id: user.id,
          pair: selectedPair,
          type: params.type,
          status: params.orderType === 'limit' ? 'pending' : 'open',
          open_price: effectivePrice, // Set open_price to limit price for limit orders
          lots: params.lots,
          leverage: params.leverage,
          order_type: params.orderType,
          limit_price: params.limitPrice,
          margin_amount: marginAmount
        }])
        .select()
        .single();

      if (error) throw error;

      // Update trades state with new trade
      setTrades(prev => [{
        id: trade.id,
        pair: selectedPair,
        type: params.type,
        status: params.orderType === 'limit' ? 'pending' : 'open',
        openPrice: params.orderType === 'limit' ? params.limitPrice! : currentPrice,
        lots: params.lots,
        leverage: params.leverage,
        orderType: params.orderType,
        limitPrice: params.limitPrice,
        openTime: Date.now(),
        pnl: 0,
        margin_amount: marginAmount
      }, ...prev]);

      // Fetch updated balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserBalance(profile.withdrawal_wallet);
      }

      if (params.orderType === 'market') {
        toast({
          title: "Trade Opened",
          description: `Market order ${params.type.toUpperCase()} executed at $${currentPrice}`
        });
      }

    } catch (error) {
      console.error('Error creating trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create trade"
      });
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      // Handle pending trade cancellation
      if (trade.status === 'pending') {
        const { error } = await supabase
          .from('trades')
          .update({ status: 'cancelled' })
          .eq('id', tradeId);

        if (error) throw error;

        // Update local trades state to show cancelled status
        setTrades(prev => prev.filter(t => t.id !== tradeId));

        toast({
          title: "Order Cancelled",
          description: `Successfully cancelled ${trade.type} order for ${trade.pair}`
        });
        return;
      }

      // Handle regular trade closure (existing code)
      const closePrice = parseFloat(pairPrices[trade.pair]?.bid || '0');
      const pnl = calculatePnL(trade, closePrice);
      
      const { data, error } = await supabase
        .rpc('close_trade', {
          p_trade_id: tradeId,
          p_close_price: closePrice,
          p_pnl: pnl
        });

      if (error) throw error;

      // Update local trades state
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      
      // Update balance if data contains new wallet amount
      if (data?.withdrawal_wallet) {
        setUserBalance(data.withdrawal_wallet);
      }

      toast({
        title: "Trade Closed",
        description: `Successfully closed trade for ${trade.pair}`
      });
    } catch (error) {
      console.error('Error closing trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close trade"
      });
    }
  };

  // Add effect to fetch default leverage
  useEffect(() => {
    const fetchDefaultLeverage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('default_leverage')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching default leverage:', error);
        return;
      }

      if (data?.default_leverage) {
        setDefaultLeverage(data.default_leverage);
      }
    };

    fetchDefaultLeverage();
  }, []);

  const handleSaveLeverage = async (leverage: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "User not authenticated",
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          default_leverage: leverage,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local state after successful save
      setDefaultLeverage(leverage);

      toast({
        title: "Success",
        description: "Leverage preference saved"
      });

    } catch (error) {
      console.error('Error saving leverage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save leverage preference"
      });
      throw error;
    }
  };

  if (isMobile && location.pathname === '/trade') {
    return <Navigate to="/trade/select" replace />;
  }

  return (
    <TradingLayout
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      userBalance={userBalance}
      depositDialogOpen={depositDialogOpen}
      setDepositDialogOpen={setDepositDialogOpen}
      trades={trades}
      currentPrices={pairPrices}
      onCloseTrade={handleCloseTrade}
    >
      {isMobile ? (
        <div className="flex flex-col h-full bg-background">
          {/* Mobile view layout */}
          <div className={cn(
            "flex items-center gap-2 p-2 border-b bg-card overflow-x-auto transition-all duration-300",
            !isSidebarOpen ? "pl-14" : "pl-2"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute left-2 top-2 z-50"
              aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
            >
              {isSidebarOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            {/* Market Selection List */}
            {/* ...existing mobile market selection code... */}
          </div>

          {/* Mobile Chart */}
          <div className={cn(
            "flex-1 relative min-h-0 transition-all duration-300",
            isSidebarOpen ? "mt-[300px]" : "mt-0"
          )}>
            <div className="absolute inset-0 p-3">
              <div className="w-full h-full rounded-xl border overflow-hidden bg-card">
                <TradingViewWidget symbol={formatTradingViewSymbol(selectedPair)} />
              </div>
            </div>
          </div>

          {/* Mobile Trading Panel */}
          <Sheet defaultOpen>
            <SheetContent side="bottom" className="h-[60vh] p-0 flex flex-col">
              {/* ...existing mobile trading panel code... */}
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="flex h-full">
          <TradeSidebar 
            selectedPair={selectedPair} 
            onPairSelect={setSelectedPair}
            isOpen={isSidebarOpen}
            pairPrices={pairPrices}
            tradingPairs={tradingPairs}
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
          
          <div className={cn(
            "flex flex-1 transition-all duration-300",
            isSidebarOpen ? (isSidebarCollapsed ? "ml-20" : "ml-72") : "p-0" // Only apply margin when sidebar is open
          )}>
            <div className={cn(
              "flex flex-col h-full w-full transition-all duration-300"
            )}>
              {/* Chart container */}
              <div className="flex-1 min-h-0 p-3">
                <div className="w-full h-full rounded-xl border overflow-hidden bg-card">
                  <TradingViewWidget symbol={formatTradingViewSymbol(selectedPair)} />
                </div>
              </div>
              
              {/* Activity panel */}
              <div className="flex-none">
                <TradingActivity 
                  trades={trades} 
                  currentPrices={pairPrices} 
                  onCloseTrade={handleCloseTrade} 
                  userBalance={userBalance}
                />
              </div>
            </div>
            
            <TradingPanel 
              selectedPair={selectedPair} 
              pairPrices={pairPrices}
              onTrade={handleTrade}
              userBalance={userBalance}
              tradingPairs={tradingPairs}
              onSaveLeverage={handleSaveLeverage}
              defaultLeverage={defaultLeverage}
            />
          </div>
        </div>
      )}
    </TradingLayout>
  );
};

export default Trade;

