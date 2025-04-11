import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageTransition } from "@/components/ui-components";
import { Check, DollarSign, Clock, Percent, ArrowRight, BadgeCheck, ArrowRightIcon, Circle, CheckCircle2 } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { supabase } from "@/lib/supabase";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

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
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [selectedPlanForDeposit, setSelectedPlanForDeposit] = useState<Plan | null>(null);
  const [subscribedPlans, setSubscribedPlans] = useState<PlanWithSubscription[]>([]);

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

  useEffect(() => {
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

  const handleInvestClick = (planId: string) => {
    const selectedPlanData = plans.find(p => p.id === planId);
    if (!selectedPlanData) return;

    setSelectedPlan(planId);
    setSelectedPlanForDeposit(selectedPlanData);
    setShowDepositDialog(true);
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
    <ShellLayout>
      <PageTransition>
        <PageHeader 
          title="Choose Your Investment Plan" 
          description="Select from our curated investment plans and start your journey to financial growth"
        />
        
        <Tabs defaultValue="available" className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList className="w-[400px]">
              <TabsTrigger value="available" className="flex-1">Available Plans</TabsTrigger>
              <TabsTrigger value="subscribed" className="flex-1 relative">
                My Investments
                {subscribedPlans.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {subscribedPlans.length}
                  </span>
                )}
              </TabsTrigger>
              </TabsList>
          </div>

          <TabsContent value="available" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border border-border/40 bg-card/60">
                    <CardHeader className="pb-2">
                      <div className="h-4 w-20 bg-muted/60 rounded animate-pulse mb-2" />
                      <div className="h-6 w-32 bg-muted/60 rounded animate-pulse" />
                      <div className="h-4 w-full bg-muted/60 rounded animate-pulse mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="h-4 w-4/5 bg-muted/60 rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
                        <div className="h-4 w-4/5 bg-muted/60 rounded animate-pulse" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="h-9 w-full bg-muted/60 rounded animate-pulse" />
                    </CardFooter>
                  </Card>
                ))
              ) : (
                plans.map((plan) => (
                  <Card 
                    key={plan.id}
                    className={cn(
                      "relative transition-all duration-300 hover:shadow-lg overflow-hidden",
                      selectedPlan === plan.id && "ring-2 ring-primary"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0 right-0 w-[300px] h-[300px] -mr-32 -mt-32 rounded-full opacity-50 blur-3xl",
                      getRandomGradient()
                    )} />
                    {plan.recommended && (
                      <div className="absolute right-4 top-4 z-10">
                        <BadgeCheck className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <CardHeader className="space-y-2">
                      <div>
                        <CardTitle className="text-xl font-semibold">
                          {plan.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-1">
                          {plan.description}
                        </CardDescription>
                      </div>
                      <Separator className="my-2" />
                      <div>
                        <span className="text-sm text-muted-foreground">$</span>
                        <span className="text-6xl font-bold text-foreground ml-0.5 tracking-tight">
                          {plan.investment.toLocaleString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-lg border bg-card/50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Daily ROI</p>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-2xl font-semibold">{plan.returns_percentage}%</span>
                              <span className="text-sm text-muted-foreground ml-1">
                                (${((plan.investment * plan.returns_percentage) / 100).toFixed(2)})
                              </span>
                            </div>
                          </div>
                          <ArrowRightIcon className="h-5 w-5 text-muted-foreground mx-2" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total ROI</p>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-2xl font-semibold">
                                {(plan.returns_percentage * plan.duration_days).toFixed(1)}%
                              </span>
                              <span className="text-sm text-muted-foreground ml-1">
                                (${((plan.investment * plan.returns_percentage * plan.duration_days) / 100).toFixed(2)})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border bg-card/50 p-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-semibold">{plan.duration_days}</span>
                            <span className="text-muted-foreground">days</span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full"
                        size="lg"
                        variant={selectedPlan === plan.id ? "default" : "outline"}
                        onClick={() => handleInvestClick(plan.id)}
                      >
                        Invest Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>

                      <div className="space-y-3">
                        <p className="font-medium">What's included</p>
                        <ul className="space-y-2">
                          {plan.benefits.split('•').filter(Boolean).map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                                <CheckCircle2 className="h-4 w-4 text-primary/70" />
                              </div>
                              <span className="text-sm">{benefit.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
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
                  onClick={() => document.querySelector('[value="available"]')?.click()}
                >
                  View Available Plans
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className="relative overflow-hidden"
                    >
                      <div className={cn(
                        "absolute top-0 right-0 w-[300px] h-[300px] -mr-32 -mt-32 rounded-full opacity-50 blur-3xl",
                        getRandomGradient()
                      )} />
                      
                      <CardHeader className="space-y-2">
                        <div>
                          <CardTitle className="text-xl font-semibold">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground mt-1">
                            Subscribed on {format(new Date(plan.subscription_date || ''), 'do MMMM yyyy')}
                          </CardDescription>
                        </div>
                        <Separator className="my-2" />
                        <div>
                          <span className="text-sm text-muted-foreground">$</span>
                          <span className="text-6xl font-bold text-foreground ml-0.5 tracking-tight">
                            {plan.investment.toLocaleString()}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        <div className="rounded-lg border bg-card/50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Daily ROI</p>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-2xl font-semibold">{plan.returns_percentage}%</span>
                                <span className="text-sm text-muted-foreground ml-1">
                                  (${((plan.investment * plan.returns_percentage) / 100).toFixed(2)})
                                </span>
                              </div>
                            </div>
                            <ArrowRightIcon className="h-5 w-5 text-muted-foreground mx-2" />
                            <div>
                              <p className="text-sm text-muted-foreground">Your Profit</p>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-2xl font-semibold">
                                  ${(plan.actual_earnings || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border bg-card/50 p-4">
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">Duration</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-semibold">{plan.duration_days}</span>
                                <span className="text-muted-foreground">days</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="rounded-lg border bg-card/50 p-4">
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">Remaining</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-semibold">{remainingDuration}</span>
                                <span className="text-muted-foreground">days</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-muted/50 rounded-lg p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">
                                {Math.round(progress)}%
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                              Cancel Subscription
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

        <DepositDialog 
          open={showDepositDialog} 
          onOpenChange={setShowDepositDialog}
          selectedPlan={selectedPlanForDeposit}
          onSuccess={() => setShowDepositDialog(false)}
        />
      </PageTransition>
    </ShellLayout>
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

