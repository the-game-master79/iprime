import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Info } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Removed ShellLayout
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Topbar } from "@/components/shared/Topbar"; // Added Topbar import
import { BalanceCard } from "@/components/shared/BalanceCards"; // Add this import
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

import { AvailablePlanVariant, ActivePlanVariant } from "@/components/shared/PlanCardVariants";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";

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
  investment_wallet: number;
  total_invested: number;
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

  // Add this new function
  const calculateTotalInvested = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from('plans_subscriptions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;
      
      const total = data?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;
      setTotalInvested(total);
      return total;
    } catch (error) {
      console.error('Error calculating total invested:', error);
      return 0;
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('status', 'active')
          .order('investment', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
        if (data && data.length > 0) {
          setSelectedPlan(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, withdrawal_wallet, investment_wallet, total_invested')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchSubscribedPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subscriptions, error: subsError } = await supabase
        .from('plans_subscriptions')
        .select(`
          id,
          plan_id,
          created_at,
          plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (subsError) throw subsError;

      const plansWithEarnings = await Promise.all(
        subscriptions.map(async (subscription) => {
          // Get earnings with dates
          const { data: earnings, error: earningsError } = await supabase
            .from('transactions')
            .select('amount, created_at')
            .eq('user_id', user.id)
            .eq('type', 'investment_return')
            .eq('reference_id', subscription.id)
            .eq('status', 'Completed')
            .order('created_at', { ascending: false });

          if (earningsError) throw earningsError;

          const totalEarnings = earnings?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
          const lastEarningDate = earnings?.[0]?.created_at;
          const daysCredited = earnings?.length || 0;

          return {
            ...subscription.plans,
            subscription_id: subscription.id,
            subscription_date: format(new Date(subscription.created_at), "MMMM d, yyyy"),
            actual_earnings: totalEarnings,
            days_credited: daysCredited,
            last_earning_date: lastEarningDate
          };
        })
      );

      setSubscribedPlans(plansWithEarnings);
    } catch (error) {
      console.error('Error fetching subscribed plans:', error);
    }
  };

  useEffect(() => {
    fetchSubscribedPlans();
  }, []);

  useEffect(() => {
    calculateTotalInvested();
  }, []);

  const handleSubscribe = async (plan: Plan) => {
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create subscription without wallet_type
      const { data: subscription, error: subscriptionError } = await supabase
        .from('plans_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount: plan.investment,
          status: 'approved'
        })
        .select()
        .single();

      if (subscriptionError) throw subscriptionError;

      // Update withdrawal wallet balance directly
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          withdrawal_wallet: userProfile.withdrawal_wallet - plan.investment,
          total_invested: (userProfile.total_invested || 0) + plan.investment 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Recalculate total invested
      await calculateTotalInvested();

      toast({
        title: "Success",
        description: `Successfully subscribed to ${plan.name}`,
        variant: "default"
      });

      // Refresh data
      fetchSubscribedPlans();
      fetchUserProfile();

    } catch (error) {
      console.error('Error subscribing to plan:', error);
      toast({
        title: "Error",
        description: "Failed to subscribe to plan. Please try again.",
        variant: "destructive"
      });
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get the business volumes to be removed
      const { data: businessVolumes, error: bvError } = await supabase
        .from('business_volumes')
        .select('id, user_id, amount')
        .eq('subscription_id', plan.subscription_id);

      if (bvError) throw bvError;

      // Update subscription status to cancelled
      const { error: updateError } = await supabase
        .from('plans_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', plan.subscription_id);

      if (updateError) throw updateError;

      // Delete business volumes entries
      if (businessVolumes && businessVolumes.length > 0) {
        const { error: deleteError } = await supabase
          .from('business_volumes')
          .delete()
          .eq('subscription_id', plan.subscription_id);

        if (deleteError) throw deleteError;
      }

      // Recalculate total invested
      await calculateTotalInvested();

      toast({
        title: "Plan Cancelled",
        description: "Your investment has been refunded to your withdrawal wallet with applicable fees deducted.",
        variant: "default"
      });

      fetchSubscribedPlans();

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Buy Computes" />
      
      <div className="container mx-auto max-w-[1000px] py-6 px-4">
        {/* Balance cards section */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
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
        </div>

        <Accordion type="single" collapsible defaultValue="info" className="mb-8">
          <AccordionItem value="info" className="bg-card/30 border border-primary/20 rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]>div>div]:rotate-180">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">Start earning with Computes</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="text-muted-foreground space-y-2">
                <p>• A compute will start trading in your account automatically.</p>
                <p>• You can use your existing balance to subscribe to any compute available.</p>
                <p>• You can close a Compute anytime, and get your refunds. (Deductions Apply)</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Tabs defaultValue="available" className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList className="w-[400px]">
              <TabsTrigger value="available" className="flex-1">Available Computes</TabsTrigger>
              <TabsTrigger value="subscribed" className="flex-1 relative">
                Active Computes
                {subscribedPlans.length > 0 && (
                  <span className="relative  inline-flex items-center justify-center rounded-full border-background bg-primary text-primary-foreground h-5 min-w-[20px] px-1.5 text-xs font-medium">
                    {subscribedPlans.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="available" className="space-y-4">
            <AvailablePlanVariant 
              plans={plans}
              loading={loading}
              onInvest={handleInvestClick}
            />
          </TabsContent>

          <TabsContent value="subscribed">
            {subscribedPlans.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-medium">No Active Investments</h3>
                <p className="mt-2 text-muted-foreground">
                  You haven't subscribed to any investment plans yet.
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
            ) : (
              <ActivePlanVariant 
                plans={subscribedPlans}
                onCancel={handleCancelSubscription}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={handleDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Subscription</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Please confirm your subscription to {planToSubscribe?.name}</p>
                
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className="font-medium">{userProfile?.withdrawal_wallet.toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Investment Amount:</span>
                    <span>-{planToSubscribe?.investment.toLocaleString()} USD</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Remaining Balance:</span>
                    <span>{((userProfile?.withdrawal_wallet || 0) - (planToSubscribe?.investment || 0)).toLocaleString()} USD</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubscription}>
              Confirm Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Plans;

function toast({ title, description, variant }: { title: string; description: string; variant: string }) {
  const toastContainer = document.createElement("div");
  toastContainer.className = `toast toast-${variant}`;
  toastContainer.style.position = "fixed";
  toastContainer.style.bottom = "20px";
  toastContainer.style.right = "20px";
  toastContainer.style.padding = "16px";
  toastContainer.style.backgroundColor = variant === "destructive" ? "#f44336" : "#4caf50";
  toastContainer.style.color = "#fff";
  toastContainer.style.borderRadius = "4px";
  toastContainer.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
  toastContainer.style.zIndex = "1000";

  const toastTitle = document.createElement("strong");
  toastTitle.textContent = title;
  toastTitle.style.display = "block";
  toastTitle.style.marginBottom = "8px";

  const toastDescription = document.createElement("span");
  toastDescription.textContent = description;

  toastContainer.appendChild(toastTitle);
  toastContainer.appendChild(toastDescription);

  document.body.appendChild(toastContainer);

  setTimeout(() => {
    toastContainer.style.opacity = "0";
    toastContainer.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(toastContainer);
    }, 500);
  }, 3000);
}

