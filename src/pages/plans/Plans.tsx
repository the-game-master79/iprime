import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageTransition } from "@/components/ui-components";
import { Check, DollarSign, Clock, Percent, ArrowRight } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { supabase } from "@/lib/supabase";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
}

interface UserProfile {
  id: string;
  withdrawal_wallet: number;
  investment_wallet: number;
  total_invested: number;
}

const Plans = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const [calculatedReturns, setCalculatedReturns] = useState({
    monthly: 0,
    total: 0,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [investmentError, setInvestmentError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingInvestment, setProcessingInvestment] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [selectedPlanForDeposit, setSelectedPlanForDeposit] = useState<Plan | null>(null);
  const [subscribedPlans, setSubscribedPlans] = useState<PlanWithSubscription[]>([]);

  // Fetch plans from Supabase
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

  // Update fetchUserProfile function to use correct columns
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

  // Update fetchSubscribedPlans function to use plans_subscriptions
  useEffect(() => {
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

        // For each subscription, get the total earnings from transactions
        const plansWithEarnings = await Promise.all(
          subscriptions.map(async (subscription) => {
            // Fixed the transaction query to use proper filtering
            const { data: earnings, error: earningsError } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', user.id)
              .eq('type', 'investment_return')
              .eq('reference_id', subscription.id) // Changed from plan_id to subscription.id
              .eq('status', 'Completed');

            if (earningsError) throw earningsError;

            const totalEarnings = earnings?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

            return {
              ...subscription.plans,
              subscription_date: subscription.created_at,
              actual_earnings: totalEarnings
            };
          })
        );

        setSubscribedPlans(plansWithEarnings);
      } catch (error) {
        console.error('Error fetching subscribed plans:', error);
      }
    };

    fetchSubscribedPlans();
  }, []);

  // Calculate returns when plan or amount changes
  useEffect(() => {
    if (selectedPlan) {
      const plan = plans.find((p) => p.id === selectedPlan);
      if (plan) {
        const monthlyReturn = (investmentAmount * plan.returns_percentage) / 100;
        const totalMonths = plan.duration_days / 30;
        const totalReturn = monthlyReturn * totalMonths;

        setCalculatedReturns({
          monthly: monthlyReturn,
          total: totalReturn,
        });
      }
    }
  }, [selectedPlan, investmentAmount, plans]);

  // Handle amount slider change
  const handleAmountChange = (value: number[]) => {
    setInvestmentAmount(value[0]);
  };

  // Update handleInvestClick function
  const handleInvestClick = (planId: string) => {
    const selectedPlanData = plans.find(p => p.id === planId);
    if (!selectedPlanData) return;
    
    setSelectedPlan(planId);
    setSelectedPlanForDeposit(selectedPlanData);
    setShowDepositDialog(true); // Open deposit dialog instead of confirm dialog
  };

  // Update handleInvestment function
  const handleInvestment = async () => {
    if (!selectedPlan || !userProfile) {
      console.error("Error: Selected plan or user profile is missing.");
      return;
    }
    setProcessingInvestment(true);

    try {
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      if (!selectedPlanData) {
        throw new Error("Selected plan data is missing.");
      }

      // Call the stored procedure to create subscription and transaction
      const { data, error } = await supabase.rpc('handle_plan_subscription', {
        p_user_id: userProfile.id,
        p_plan_id: selectedPlan,
        p_amount: selectedPlanData.investment,
        p_description: `Subscription to ${selectedPlanData.name} plan`,
        p_method: 'crypto' // Or get this from the DepositDialog
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully subscribed to ${selectedPlanData.name} plan`,
        variant: "default",
      });

      setShowDepositDialog(false);
      setInvestmentError(null);
    } catch (error) {
      console.error("Error processing subscription:", error);
      setInvestmentError('Failed to process subscription. Please try again.');
    } finally {
      setProcessingInvestment(false);
    }
  };

  return (
    <ShellLayout>
      <PageTransition>
        <PageHeader 
          title="Investment Plans" 
          description="Select your plan, click on subscribe, complete payment and start earning!"
        />
        
        <Tabs defaultValue="available">
          <TabsList className="mb-6">
            <TabsTrigger value="available">Available Plans</TabsTrigger>
            <TabsTrigger value="subscribed" className="relative">
              Subscribed Plans
              {subscribedPlans.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {subscribedPlans.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <div className="grid gap-6">
              {/* Plans Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                  // Loading state
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
                  // Active plans section
                  plans.map((plan) => (
                    <Card 
                      key={plan.id}
                      className={`relative overflow-hidden transition-all duration-300 ${
                        selectedPlan === plan.id 
                          ? "border-primary/50 shadow-md" 
                          : "border-border/40 hover:border-primary/30 hover:shadow-sm"
                      }`}
                    >
                      {plan.recommended && (
                        <div className="absolute -right-12 top-6 rotate-45 bg-primary px-10 py-1 text-xs font-medium text-primary-foreground">
                          Recommended
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {plan.name}
                        </CardTitle>
                        <CardDescription className="mt-2">{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Package</p>
                            <p className="text-sm text-muted-foreground">
                              ${plan.investment.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Percent className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Daily ROI</p>
                            <p className="text-sm text-muted-foreground">{plan.returns_percentage}% per day</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <ArrowRight className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Total ROI</p>
                            <p className="text-sm text-muted-foreground">
                              {(plan.returns_percentage * plan.duration_days).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Duration</p>
                            <p className="text-sm text-muted-foreground">
                              {plan.duration_days} days
                            </p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <p className="text-sm font-medium mb-2">Benefits:</p>
                          <ul className="space-y-2">
                            {plan.benefits.split('•').filter(Boolean).map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                                <span>{benefit.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-2">
                        <Button 
                          onClick={() => handleInvestClick(plan.id)}
                          variant={selectedPlan === plan.id ? "default" : "outline"}
                          className="w-full"
                        >
                          Subscribe Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        {investmentError && selectedPlan === plan.id && (
                          <p className="text-sm text-destructive">{investmentError}</p>
                        )}
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscribed">
            {subscribedPlans.length === 0 ? (
              <p className="text-muted-foreground">You have not subscribed to any plans yet.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Investment</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Remaining Duration</TableHead>
                      <TableHead>Daily ROI</TableHead>
                      <TableHead>Total Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribedPlans.map((plan) => {
                      const remainingDuration = Math.max(
                        plan.duration_days - Math.floor(
                          (Date.now() - new Date(plan.subscription_date || Date.now()).getTime()) / 
                          (1000 * 60 * 60 * 24)
                        ),
                        0
                      );

                      return (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>${plan.investment.toLocaleString()}</TableCell>
                          <TableCell>{plan.duration_days} days</TableCell>
                          <TableCell>{remainingDuration} days</TableCell>
                          <TableCell>{plan.returns_percentage}%</TableCell>
                          <TableCell>${(plan.actual_earnings || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DepositDialog 
          open={showDepositDialog} 
          onOpenChange={setShowDepositDialog}
          selectedPlan={selectedPlanForDeposit}
          onSuccess={() => {
            setShowDepositDialog(false);
          }}
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

