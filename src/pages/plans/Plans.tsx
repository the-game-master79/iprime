import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
// Replace lucide-react icons with phosphor icons
import { CurrencyDollar, Info, Robot, Coins } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase"; // Removed ShellLayout
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Topbar } from "@/components/shared/Topbar";
import { BalanceCard } from "@/components/shared/BalanceCards"; // Add this import
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast"; // <-- add this import
import {
  getPlans,
  getUserProfile,
  getSubscribedPlans,
  subscribeToPlan,
  cancelPlanSubscription,
  getTradingPairs,
  getTotalInvested
} from "@/pages/plans/planService";

import { AvailablePlanVariant, ActivePlanVariant } from "@/components/shared/PlanCardVariants";
// Add PlatformSidebar import
import { PlatformSidebar } from "@/components/shared/PlatformSidebar";

interface Plan {
  id: string;
  name: string;
  description: string;
  investment: number;
  returns_percentage: number;
  duration_days: number;
  benefits: string;
  status: 'active' | 'inactive';
  recommended?: boolean;
  created_at?: string;
}

interface PlanWithSubscription extends Plan {
  subscription_date?: string;
  actual_earnings?: number;
  subscription_id: string;
  days_credited?: number;
  last_earning_date?: string;
}

interface UserProfile {
  id: string;
  withdrawal_wallet: number;
  total_invested: number;
}

interface TradingPair {
  id: string;
  symbol: string;
  image_url: string;
  type?: string; // 'crypto' | 'forex'
}

const getRandomGradient = () => {
  const gradients = [
    'bg-gradient-to-r from-blue-500/20 to-purple-500/20',
    'bg-gradient-to-r from-green-500/20 to-teal-500/20',
    'bg-gradient-to-r from-orange-500/20 to-pink-500/20',
    'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20',
    'bg-gradient-to-r from-rose-500/20 to-orange-500/20',
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};

const PAGE_SIZE = 6;

const Plans = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [investmentError, setInvestmentError] = useState<string | null>(null);
  const [subscribedPlans, setSubscribedPlans] = useState<PlanWithSubscription[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [planToSubscribe, setPlanToSubscribe] = useState<Plan | null>(null);
  const [totalInvested, setTotalInvested] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<PlanWithSubscription | null>(null);
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(true);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [showAllPairs, setShowAllPairs] = useState(false);
  const [daysCount, setDaysCount] = useState(48);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [availableOffset, setAvailableOffset] = useState(0);
  const [availableHasMore, setAvailableHasMore] = useState(true);
  const [activeOffset, setActiveOffset] = useState(0);
  const [activeHasMore, setActiveHasMore] = useState(true);
  const { toast } = useToast();

  // Loading states for Supabase actions
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // DRY: Refund calculation utility
  function getRefundDetails(investment: number) {
    const forexFee = investment * 0.10;
    const adminFee = investment * 0.05;
    const refundAmount = investment - (forexFee + adminFee);
    return { forexFee, adminFee, refundAmount };
  }

  useEffect(() => {
    if (currentUser) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [currentUser]);

  // Refactored: calculateTotalInvested
  const calculateTotalInvested = async (user: any) => {
    try {
      if (!user) return 0;
      const total = await getTotalInvested(user.id);
      setTotalInvested(total);
      return total;
    } catch (error) {
      console.error('Error calculating total invested:', error);
      return 0;
    }
  };

  // Refactored: fetchPlans
  const fetchPlansHandler = async (reset = false) => {
    try {
      setLoading(true);
      const offset = reset ? 0 : availableOffset;
      const data = await getPlans(offset, PAGE_SIZE);
      if (reset) {
        setPlans(data);
        setAvailableOffset(PAGE_SIZE);
      } else {
        setPlans(prev => [...prev, ...data]);
        setAvailableOffset(offset + PAGE_SIZE);
      }
      setAvailableHasMore((data.length || 0) === PAGE_SIZE);
      if (data && data.length > 0 && reset) setSelectedPlan(data[0].id);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansHandler(true);
    // eslint-disable-next-line
  }, []);

  // Refactored: fetchUserProfile
  const fetchUserProfileHandler = async (user: any) => {
    try {
      if (user) {
        const profile = await getUserProfile(user.id);
        setUserProfile(profile as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (currentUser) fetchUserProfileHandler(currentUser);
  }, [currentUser]);

  // Refactored: fetchSubscribedPlans
  const fetchSubscribedPlansHandler = async (user: any, reset = false) => {
    try {
      if (!user) return;
      const offset = reset ? 0 : activeOffset;
      const plansWithEarnings = await getSubscribedPlans(user.id, offset, PAGE_SIZE);
      if (reset) {
        setSubscribedPlans(plansWithEarnings);
        setActiveOffset(PAGE_SIZE);
      } else {
        setSubscribedPlans(prev => [...prev, ...plansWithEarnings]);
        setActiveOffset(offset + PAGE_SIZE);
      }
      setActiveHasMore((plansWithEarnings.length || 0) === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching subscribed plans:', error);
    }
  };

  useEffect(() => {
    if (currentUser) fetchSubscribedPlansHandler(currentUser, true);
    // eslint-disable-next-line
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) calculateTotalInvested(currentUser);
  }, [currentUser]);

  // Refactored: fetch trading pairs
  useEffect(() => {
    const fetchTradingPairsHandler = async () => {
      setLoadingPairs(true);
      try {
        const data = await getTradingPairs();
        setTradingPairs(data);
      } catch (error) {
        console.error('Error fetching trading pairs:', error);
      } finally {
        setLoadingPairs(false);
      }
    };
    fetchTradingPairsHandler();
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    setSubscribing(true);
    try {
      if (!userProfile) {
        toast({
          title: "Error",
          description: "Please login to subscribe to plans",
          variant: "destructive"
        });
        return;
      }
      if (userProfile.withdrawal_wallet < plan.investment) {
        toast({
          title: "Insufficient Balance", 
          description: `Need ${plan.investment} USD in your wallet to subscribe to this plan. Available balance: ${userProfile.withdrawal_wallet} USD`,
          variant: "destructive"
        });
        return;
      }
      if (!currentUser) return;

      const newSubscribedPlan = await subscribeToPlan({
        userId: currentUser.id,
        plan,
        withdrawal_wallet: userProfile.withdrawal_wallet,
        total_invested: userProfile.total_invested
      });

      await calculateTotalInvested(currentUser);

      setSubscribedPlans(prev => [newSubscribedPlan, ...prev]);

      toast({
        title: "Success",
        description: `Successfully subscribed to ${plan.name}`,
        variant: "default"
      });

      setUserProfile(prev =>
        prev
          ? {
              ...prev,
              withdrawal_wallet: prev.withdrawal_wallet - plan.investment,
              total_invested: (prev.total_invested || 0) + plan.investment,
            }
          : prev
      );

      fetchUserProfileHandler(currentUser);
      // No need to call fetchSubscribedPlansHandler immediately, as we already updated state

    } catch (error) {
      console.error('Error subscribing to plan:', error);
      toast({
        title: "Error",
        description: "Failed to subscribe to plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleInvestClick = (planId: string) => {
    const selectedPlanData = plans.find(p => p.id === planId);
    if (!selectedPlanData) return;
    
    if (!userProfile) {
      toast({
        title: "Error",
        description: "Please login to subscribe to plans",
        variant: "destructive"
      });
      return;
    }

    const currentBalance = userProfile.withdrawal_wallet;
    const requiredAmount = selectedPlanData.investment;
    
    if (currentBalance < requiredAmount) {
      const amountNeeded = requiredAmount - currentBalance;
      toast({
        title: "Insufficient Balance",
        description: `You need ${amountNeeded.toLocaleString()} USD more to subscribe to this plan`,
        variant: "destructive"
      });
      return;
    }

    setPlanToSubscribe(selectedPlanData);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubscription = () => {
    if (planToSubscribe) {
      handleSubscribe(planToSubscribe);
      setShowConfirmDialog(false);
      setPlanToSubscribe(null);
    }
  };

  // Add this function to handle dialog close
  const handleDialogClose = (open: boolean) => {
    setShowConfirmDialog(open);
    if (!open) {
      setPlanToSubscribe(null);
    }
  };

  const calculateRefundAmount = (investment: number) => {
    const forexFee = investment * 0.10;
    const adminFee = investment * 0.05;
    const refundAmount = investment - (forexFee + adminFee);
    
    return {
      forexFee,
      adminFee,
      refundAmount
    };
  };

  const handleCancelSubscription = async (plan: PlanWithSubscription) => {
    // Calculate fees and refund amount
    const { forexFee, adminFee, refundAmount } = calculateRefundAmount(plan.amount);
    
    // Show confirmation dialog with fee breakdown
    if (!window.confirm(
      `Are you sure you want to cancel this plan?\n\n` +
      `Investment Amount: $${plan.investment.toFixed(2)}\n` +
      `Forex Fee (10%): -$${forexFee.toFixed(2)}\n` +
      `Admin Fee (5%): -$${adminFee.toFixed(2)}\n` +
      `Refund Amount: $${refundAmount.toFixed(2)}\n\n` +
      `Click OK to proceed with cancellation.`
    )) return;

    try {
      if (!currentUser) return;

      // Update subscription status to cancelled
      const { error: updateError } = await supabase
        .from('plans_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', plan.subscription_id);

      if (updateError) throw updateError;

      // Recalculate total invested
      await calculateTotalInvested(currentUser);

      toast({
        title: "Plan Cancelled",
        description: "Your investment has been refunded to your withdrawal wallet with applicable fees deducted.",
        variant: "default"
      });

      fetchSubscribedPlansHandler(currentUser, true);

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelClick = (plan: PlanWithSubscription) => {
    setPlanToCancel(plan);
    setShowCancelDialog(true);
  };

  // Refactored: handleCancelConfirm
  const handleCancelConfirm = async () => {
    if (!planToCancel) return;
    setCancelling(true);
    try {
      if (!currentUser) return;

      const { refundAmount } = getRefundDetails(planToCancel.investment);

      await cancelPlanSubscription({
        subscription_id: planToCancel.subscription_id,
        userId: currentUser.id,
        refundAmount,
        withdrawal_wallet: userProfile?.withdrawal_wallet || 0
      });

      // Remove the cancelled plan from the UI immediately
      setSubscribedPlans(prev => prev.filter(p => p.subscription_id !== planToCancel.subscription_id));

      await calculateTotalInvested(currentUser);
      
      toast({
        title: "Success",
        description: "Plan cancelled successfully. Refund credited to your wallet.",
        variant: "default"
      });

      setShowCancelDialog(false);
      setPlanToCancel(null);
      fetchUserProfileHandler(currentUser);
      // Optionally, you can keep the fetchSubscribedPlansHandler for full sync, but UI is instant now
      fetchSubscribedPlansHandler(currentUser, true);

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel plan",
        variant: "destructive"
      });
    } finally {
      setCancelling(false);
    }
  };

  // Calculate total profits from all subscribed plans
  const totalProfits = subscribedPlans.reduce((sum, plan) => sum + (plan.actual_earnings || 0), 0);

  // For "Load More" in Available Computes
  const handleLoadMoreAvailable = () => {
    fetchPlansHandler();
  };

  // For "Load More" in Active Computes
  const handleLoadMoreActive = () => {
    if (currentUser) fetchSubscribedPlansHandler(currentUser);
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar 
          title="AlphaQuant" 
        />
        {/* Add sidebar/main layout as in DepositPage */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar for desktop */}
          <PlatformSidebar />
          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="container mx-auto max-w-[1200px] py-6 px-4">
              {/* Balance cards section */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-8">
                <BalanceCard 
                  label="Available to Invest"
                  amount={userProfile?.withdrawal_wallet || 0}
                  variant="default"
                />
                <BalanceCard
                  label="Total Invested"
                  amount={totalInvested}
                  variant="success"
                />
                <BalanceCard
                  label="Total Profits"
                  amount={totalProfits}
                  variant="business"
                  totalProfits={totalProfits}
                />
              </div>

              {/* Steps section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="group relative bg-secondary/30 hover:bg-secondary/50 border border-primary/20 hover:border-primary/40 rounded-lg p-6 text-center transition-all duration-300 hover:-translate-y-1">
                  <div className="flex justify-center mb-6">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Robot className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <h3 className="font-medium text-lg mb-3 text-foreground/90">What is AlphaQuant?</h3>
                  <p className="text-sm text-foreground/60 group-hover:text-foreground/80 transition-colors">
                    It’s a GEN-AI system that trades on your behalf, maximizing profits while you relax.
                  </p>
                </div>

                <div className="group relative bg-secondary/30 hover:bg-secondary/50 border border-primary/20 hover:border-primary/40 rounded-lg p-6 text-center transition-all duration-300 hover:-translate-y-1">
                  <div className="flex justify-center mb-6">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <CurrencyDollar className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <h3 className="font-medium text-lg mb-3 text-foreground/90">How do I get started?</h3>
                  <p className="text-sm text-foreground/60 group-hover:text-foreground/80 transition-colors">
                    Simply subscribe to a trading plan that fits your goals and activate it in seconds.
                  </p>
                </div>

                <div className="group relative bg-secondary/30 hover:bg-secondary/50 border border-primary/20 hover:border-primary/40 rounded-lg p-6 text-center transition-all duration-300 hover:-translate-y-1">
                  <div className="flex justify-center mb-6">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Coins className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <h3 className="font-medium text-lg mb-3 text-foreground/90">When do I earn?</h3>
                  <p className="text-sm text-foreground/60 group-hover:text-foreground/80 transition-colors">
                    You start receiving daily returns as soon as your AI begins trading.
                  </p>
                </div>
              </div>

              <Tabs defaultValue="available" className="space-y-8">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="available">Auto-trades</TabsTrigger>
                    <TabsTrigger value="subscribed" className="relative">
                      Your Autos
                      {subscribedPlans.length > 0 && (
                        <span className="relative inline-flex items-center justify-center rounded-full border-background bg-primary text-primary-foreground h-5 min-w-[20px] px-1.5 text-xs font-medium ml-2">
                          {subscribedPlans.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="available" className="space-y-4">
                  {loading ? (
                    <PlansSkeleton />
                  ) : (
                    <AvailablePlanVariant 
                      plans={plans.map(plan => ({ ...plan, description: plan.description }))}
                      loading={loading}
                      onInvest={handleInvestClick}
                    />
                  )}
                  {availableHasMore && !loading && (
                    <div className="flex justify-center mt-4">
                      <Button onClick={handleLoadMoreAvailable} variant="outline" disabled={loading}>
                        {loading ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="subscribed">
                  {subscribedPlans.length === 0 && !loading ? (
                    <div className="text-center py-12">
                      <CurrencyDollar className="mx-auto h-12 w-12 text-muted-foreground/30" />
                      <h3 className="mt-4 text-lg font-medium">No Active Auto-Trades</h3>
                      <p className="mt-2 text-muted-foreground">
                        You haven't subscribed to any computes yet.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => {
                          const availableTab = document.querySelector('[value="available"]') as HTMLElement | null;
                          availableTab?.click();
                        }}
                      >
                        View Available Computes
                      </Button>
                    </div>
                  ) : loading ? (
                    <PlansSkeleton />
                  ) : (
                    <>
                      <ActivePlanVariant 
                        plans={subscribedPlans.map(plan => ({ ...plan, description: plan.description }))}
                        onCancel={handleCancelClick}
                      />
                      {activeHasMore && (
                        <div className="flex justify-center mt-4">
                          <Button onClick={handleLoadMoreActive} variant="outline">
                            Load More
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* <TabsContent value="create">
                  ...Create Your Compute content...
                </TabsContent> */}
              </Tabs>
            </div>
          </main>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={handleDialogClose}>
          <DialogContent className="bg-secondary text-foreground border-border border">
            <DialogHeader>
              <DialogTitle>Confirm Subscription</DialogTitle>
              <DialogDescription>
                <div className="space-y-4">
                  <div>
                    Please confirm your subscription to{" "}
                    <span className="font-semibold text-foreground">{planToSubscribe?.name}</span>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary-foreground text-foreground p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current Balance:</span>
                      <span className="font-medium">${userProfile?.withdrawal_wallet.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Investment Amount:</span>
                      <span>-${planToSubscribe?.investment.toLocaleString()} USD</span>
                    </div>
                    <Separator className="my-2 border-border border" />
                    <div className="flex justify-between font-medium">
                      <span>Remaining Balance:</span>
                      <span>
                        ${((userProfile?.withdrawal_wallet || 0) - (planToSubscribe?.investment || 0)).toLocaleString()} USD
                      </span>
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={subscribing}
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button className="rounded-md" onClick={handleConfirmSubscription} disabled={subscribing}>
                {subscribing ? "Subscribing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="bg-secondary text-foreground">
            <DialogHeader>
              <DialogTitle>Cancel Plan</DialogTitle>
              <DialogDescription>
                <div className="space-y-4">
                  <p>Are you sure you want to cancel this plan? This action cannot be undone.</p>
                  
                  <div className="mt-4 p-4 rounded-lg border bg-secondary text-foreground border-border space-y-2">
                    <div className="flex justify-between">
                      <span>Plan Name:</span>
                      <span className="font-medium">{planToCancel?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investment Amount:</span>
                      <span className="font-medium">${planToCancel?.investment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Earned:</span>
                      <span className="font-medium text-green-500">
                        +${(planToCancel?.actual_earnings || 0).toLocaleString()}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    {planToCancel && (() => {
                      const { forexFee, adminFee, refundAmount } = getRefundDetails(planToCancel.investment);
                      return (
                        <>
                          <div className="flex justify-between text-error">
                            <span>Pre-closure Fee (10%):</span>
                            <span>-{forexFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-error">
                            <span>Admin Fee (5%):</span>
                            <span>-{adminFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-medium">
                            <span>Final Refund Amount:</span>
                            <span>{refundAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" className="rounded-md" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>Keep Plan</Button>
              <Button onClick={handleCancelConfirm} className="bg-error hover:bg-error rounded-md text-white" disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Cancel Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
      {/* Disclaimer Footer */}
      <footer className="w-full py-6 px-4 text-center text-xs text-muted-foreground bg-background border-t border-border">
        <span role="img" aria-label="disclaimer">📌</span> Projected gains are estimates based on historical simulations and current market models. Actual performance may vary. AlphaQuant does not provide guaranteed returns or financial advice.
      </footer>
    </>
  );
};

export default Plans;

function TradingPairsBento({
  tradingPairs,
  selectedPairId,
  setSelectedPairId,
}: {
  tradingPairs: TradingPair[];
  selectedPairId: string | null;
  setSelectedPairId: (id: string) => void;
}) {
  const INITIAL_COUNT = 3;
  const INCREMENT = 3;
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  React.useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [tradingPairs]);

  const visiblePairs = tradingPairs.slice(0, visibleCount);
  const hasMore = visibleCount < tradingPairs.length;

  if (tradingPairs.length === 0) {
    return <div className="text-muted-foreground text-sm">No pairs available.</div>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {visiblePairs.map(pair => (
          <label
            key={pair.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer bg-muted/70 hover:bg-primary/10 transition
              ${selectedPairId === pair.id ? "border-primary ring-2 ring-primary/30" : "border-muted"}
              shadow-sm
            `}
            style={{ minWidth: 0 }}
          >
            <input
              type="radio"
              name="tradingPair"
              value={pair.id}
              checked={selectedPairId === pair.id}
              onChange={() => setSelectedPairId(pair.id)}
              className="accent-primary"
            />
            <img
              src={pair.image_url}
              alt={pair.symbol}
              className="w-8 h-8 rounded-full object-contain bg-white border"
            />
            <span className="font-medium text-foreground text-sm truncate">{pair.symbol}</span>
          </label>
        ))}
      </div>
      {tradingPairs.length > INITIAL_COUNT && (
        <div className="mt-3 flex justify-center">
          {hasMore ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount(c => Math.min(c + INCREMENT, tradingPairs.length))}
              className="px-4"
            >
              +{Math.min(INCREMENT, tradingPairs.length - visibleCount)} more
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount(INITIAL_COUNT)}
              className="px-4"
            >
              Show Less
            </Button>
          )}
        </div>
      )}
    </>
  );
}

// Skeleton for plans
function PlansSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(PAGE_SIZE)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-muted/40 p-6 animate-pulse h-[220px]">
          <div className="h-6 w-1/2 bg-muted mb-4 rounded"></div>
          <div className="h-4 w-1/3 bg-muted mb-2 rounded"></div>
          <div className="h-4 w-2/3 bg-muted mb-2 rounded"></div>
          <div className="h-8 w-1/2 bg-muted mt-6 rounded"></div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for trading pairs
function TradingPairsSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-muted/40 animate-pulse w-32 h-12">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="h-4 w-12 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}