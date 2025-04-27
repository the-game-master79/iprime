import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, DollarSign, Clock, Percent, ArrowRight, BadgeCheck, ArrowRightIcon, Circle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Removed ShellLayout
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Topbar } from "@/components/shared/Topbar"; // Added Topbar import
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Cpu, 
  HardDrive, 
  DatabaseZap, 
  BarChart2, 
  Send, 
  MoveRight 
} from "lucide-react";

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
            subscription_date: subscription.created_at,
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
          description: `Need $${plan.investment} in your wallet to subscribe to this plan. Available balance: $${userProfile.withdrawal_wallet}`,
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
        description: `You need $${amountNeeded.toLocaleString()} more to subscribe to this plan`,
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
      
      <div className="container py-6 px-4">
        {/* Add balance display */}
        <div className="mb-6 p-4 bg-card rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold">${userProfile?.withdrawal_wallet.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invested</p>
              <p className="text-2xl font-bold">${totalInvested.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <Alert className="mb-8 bg-muted border-primary/20">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-primary">Start earning with Computes</AlertTitle>
          <AlertDescription className="mt-2 text-muted-foreground space-y-2">
            <p>• A compute will start trading in your account automatically.</p>
            <p>• You can use your existing balance to subscribe to any compute available.</p>
            <p>• You can close a Compute anytime, and get your refunds. (Deductions Apply)</p>
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="available" className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList className="w-[400px]">
              <TabsTrigger value="available" className="flex-1">Available Computes</TabsTrigger>
              <TabsTrigger value="subscribed" className="flex-1 relative">
                Active Computes
                {subscribedPlans.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {subscribedPlans.length}
                  </span>
                )}
              </TabsTrigger>
              </TabsList>
          </div>

          <TabsContent value="available" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border border-border/40 bg-card/60">
                    <CardHeader className="p-4 pb-2 space-y-2">
                      <div className="h-3 w-16 bg-muted/60 rounded animate-pulse mb-1" />
                      <div className="h-5 w-24 bg-muted/60 rounded animate-pulse" />
                      <div className="h-3 w-full bg-muted/60 rounded animate-pulse mt-1" />
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="space-y-3">
                        <div className="h-3 w-4/5 bg-muted/60 rounded animate-pulse" />
                        <div className="h-3 w-3/4 bg-muted/60 rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                plans.map((plan) => (
                  <Card key={plan.id} className={cn(
                    "relative transition-all duration-300 hover:shadow-lg overflow-hidden border-border/40",
                    selectedPlan === plan.id && "ring-1 ring-primary"
                  )}>
                    {/* Move gradient div here and add negative z-index */}
                    <div className={cn(
                      "absolute -top-32 -right-32 w-[300px] h-[300px] rounded-full opacity-50 blur-3xl transition-transform duration-1000 animate-pulse -z-10",
                      getRandomGradient()
                    )} />
                    
                    <CardHeader className="p-4 pb-2 space-y-2 relative z-10">
                      <div>
                        <CardTitle className="text-base sm:text-lg font-medium">
                          {plan.name}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-0.5 line-clamp-2">
                          {plan.description}
                        </CardDescription>
                      </div>
                      <div className="pt-1">
                        <span className="text-xs text-muted-foreground">$</span>
                        <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                          {plan.investment.toLocaleString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-4 relative z-10">
                      <div className="space-y-2">
                        <div className="rounded border bg-card/50 p-3">
                          <div className="flex items-center justify-between space-x-2 sm:space-x-4">
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Duration</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm sm:text-lg font-semibold">{plan.duration_days}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">days</span>
                              </div>
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Total ROI</p>
                              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
                                <span className="text-sm sm:text-lg font-semibold">
                                  {(plan.returns_percentage * plan.duration_days).toFixed(1)}%
                                </span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  (${((plan.investment * plan.returns_percentage * plan.duration_days) / 100).toFixed(2)})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full text-xs sm:text-sm h-8 sm:h-9 mb-2"
                        variant="default"
                        onClick={() => handleInvestClick(plan.id)}
                      >
                        <span className="flex items-center justify-center w-full">
                          Invest Now
                          <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                        </span>
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full text-xs sm:text-sm h-8 sm:h-9"
                            variant="secondary"
                          >
                            View Benefits
                            <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{plan.name} Benefits</DialogTitle>
                            <DialogDescription>
                              Detailed benefits breakdown for this investment plan
                            </DialogDescription>
                          </DialogHeader>
                          <ul className="space-y-4 mt-4">
                            {plan.benefits.split('•').filter(Boolean).map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                {idx === 0 && <Cpu className="h-5 w-5 text-primary shrink-0" />}
                                {idx === 1 && <HardDrive className="h-5 w-5 text-primary shrink-0" />}
                                {idx === 2 && <DatabaseZap className="h-5 w-5 text-primary shrink-0" />}
                                {idx === 3 && <BarChart2 className="h-5 w-5 text-primary shrink-0" />}
                                {idx === 4 && <Send className="h-5 w-5 text-primary shrink-0" />}
                                {idx === 5 && <MoveRight className="h-5 w-5 text-primary shrink-0" />}
                                <span className="text-sm">{benefit.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </DialogContent>
                      </Dialog>

                    </CardContent>
                  </Card>
                ))
              )}
            </div>
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {subscribedPlans.map((plan) => {
                  const remainingDuration = Math.max(
                    plan.duration_days - (plan.days_credited || 0),
                    0
                  );

                  const progress = Math.min(
                    ((plan.days_credited || 0) / plan.duration_days) * 100,
                    100
                  );

                  return (
                    <Card 
                      key={plan.subscription_id}
                      className="relative transition-all duration-300 hover:shadow-lg overflow-hidden border-border/40"
                    >
                      <CardHeader className="p-4 pb-2 space-y-2">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-medium">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-0.5">
                            Subscribed on {format(new Date(plan.subscription_date || ''), 'do MMMM yyyy')}
                          </CardDescription>
                        </div>
                        <div className="pt-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                            {plan.investment.toLocaleString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-4">
                        <div className="space-y-2">
                          <div className="rounded border bg-card/50 p-3">
                            <div className="flex items-center justify-between space-x-2 sm:space-x-4">
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Duration</p>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm sm:text-lg font-semibold">{plan.duration_days}</span>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">days</span>
                                </div>
                              </div>
                              <Separator orientation="vertical" className="h-8" />
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Total ROI</p>
                                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
                                  <span className="text-sm sm:text-lg font-semibold">
                                    {(plan.returns_percentage * plan.duration_days).toFixed(1)}%
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                                    (${((plan.investment * plan.returns_percentage * plan.duration_days) / 100).toFixed(2)})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded border bg-card/50 p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[10px] sm:text-xs text-muted-foreground">Progress</span>
                                <span className="text-[10px] sm:text-xs font-medium">{Math.round(progress)}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className={cn(
                            "absolute -top-32 -right-32 w-[300px] h-[300px] rounded-full opacity-50 blur-3xl transition-transform duration-1000 animate-pulse",
                            getRandomGradient()
                          )} />
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              className="w-full text-xs sm:text-sm h-8 sm:h-9"
                            >
                              Cancel Plan
                              <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Investment Plan</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-4">
                                <p>Are you sure you want to cancel this investment plan? The refund will be processed with the following deductions:</p>
                                
                                {(() => {
                                  const { forexFee, adminFee, refundAmount } = calculateRefundAmount(plan.investment);
                                  return (
                                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Original Investment:</span>
                                        <span className="font-medium">${plan.investment.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-destructive">
                                        <span>Forex Fee (10%):</span>
                                        <span>-${forexFee.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-destructive">
                                        <span>Admin Fee (5%):</span>
                                        <span>-${adminFee.toLocaleString()}</span>
                                      </div>
                                      <Separator className="my-2" />
                                      <div className="flex justify-between font-medium">
                                        <span>Final Refund Amount:</span>
                                        <span>${refundAmount.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancelSubscription(plan)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirm Cancellation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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
                    <span className="font-medium">${userProfile?.withdrawal_wallet.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Investment Amount:</span>
                    <span>-${planToSubscribe?.investment.toLocaleString()}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Remaining Balance:</span>
                    <span>${((userProfile?.withdrawal_wallet || 0) - (planToSubscribe?.investment || 0)).toLocaleString()}</span>
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

