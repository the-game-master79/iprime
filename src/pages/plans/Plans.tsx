import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageTransition, SectionHeader } from "@/components/ui-components";
import { Check, DollarSign, Clock, Percent, Calculator, ArrowRight, Coins } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  total_earnings?: number;
}

interface UserProfile {
  id: string;
  balance: number;
  total_invested: number;
}

const Plans = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscribedPlans, setSubscribedPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const [calculatedReturns, setCalculatedReturns] = useState({
    monthly: 0,
    total: 0,
  });
  const [activeTab, setActiveTab] = useState("active");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [investmentError, setInvestmentError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingInvestment, setProcessingInvestment] = useState(false);

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

  // Fetch user profile including balance and total_invested
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, balance, total_invested')
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

  // Add this new effect to fetch subscribed plans
  useEffect(() => {
    const fetchSubscribedPlans = async () => {
      if (!userProfile) return;
      
      try {
        const { data, error } = await supabase
          .from('investments')
          .select(`
            plan_id,
            plans (*)
          `)
          .eq('user_id', userProfile.id)
          .eq('status', 'active');

        if (error) throw error;
        
        // Fetch earnings for each plan
        const plansWithEarnings = await Promise.all(
          data.map(async (item) => {
            const { data: earnings } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', userProfile.id)
              .eq('type', 'investment_return')
              .eq('reference_id', item.plan_id);

            const totalEarnings = earnings?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
            return {
              ...item.plans,
              total_earnings: totalEarnings
            };
          })
        );
        
        setSubscribedPlans(plansWithEarnings);
      } catch (error) {
        console.error('Error fetching subscribed plans:', error);
      }
    };

    if (activeTab === 'subscribed') {
      fetchSubscribedPlans();
    }
  }, [userProfile, activeTab]);

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

  // Add this function to handle dialog open
  const handleInvestClick = (planId: string) => {
    setSelectedPlan(planId);
    setShowConfirmDialog(true);
  };

  // Modify handleInvestment function
  const handleInvestment = async () => {
    if (!selectedPlan || !userProfile) return;
    setProcessingInvestment(true);
    
    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) return;

    // Convert balance and investment to numbers and check
    const currentBalance = Number(userProfile.balance) || 0;
    const investmentAmount = Number(selectedPlanData.investment) || 0;

    if (currentBalance < investmentAmount) {
      setInvestmentError(`Insufficient balance. You need $${investmentAmount.toFixed(2)}`);
      return;
    }

    try {
      // Insert into investments table with a clean object
      const { error: investmentError } = await supabase
        .from('investments')
        .insert({
          user_id: userProfile.id,  // Use the profile's ID directly
          plan_id: selectedPlan,
          amount: selectedPlanData.investment,  // Use the plan's investment amount
          status: 'active'  // Explicitly set the status
        });

      if (investmentError) throw investmentError;

      // Create user_plan subscription if it doesn't exist
      const { error: subscriptionError } = await supabase
        .from('user_plans')
        .upsert({
          user_id: userProfile.id,
          plan_id: selectedPlan,
          status: 'active'
        }, {
          onConflict: 'user_id,plan_id'
        });

      if (subscriptionError) throw subscriptionError;

      // Refresh user profile after investment
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, balance, total_invested')
        .eq('id', userProfile.id)
        .single();

      if (profileError) throw profileError;

      setUserProfile(updatedProfile);
      setShowConfirmDialog(false);
      setInvestmentError(null);
      // Optional: Add success message
      alert('Investment successful!');
    } catch (error) {
      console.error('Error creating investment:', error);
      setInvestmentError('Failed to process investment. Please try again.');
    } finally {
      setProcessingInvestment(false);
    }
  };

  // Modify the CardFooter in the plans mapping to include balance check
  const renderInvestButton = (plan: Plan) => {
    const currentBalance = Number(userProfile?.balance) || 0;
    const investmentAmount = Number(plan.investment) || 0;
    const insufficientBalance = currentBalance < investmentAmount;
    
    return (
      <Button 
        variant="default"
        className="w-full"
        onClick={() => handleInvestClick(plan.id)}
        disabled={insufficientBalance || !userProfile}
      >
        <span className="mr-2">
          {!userProfile ? 'Loading...' : 
           insufficientBalance ? `Need $${investmentAmount.toFixed(2)}` : 'Invest Now'}
        </span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    );
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <ShellLayout>
      <PageTransition>
        <PageHeader 
          title="Investment Plans" 
          description="Choose the investment plan that best fits your financial goals"
        />
        
        <div className="grid gap-6">
          <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="active">Active Plans</TabsTrigger>
              <TabsTrigger value="subscribed">Subscribed Plans</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            ) : activeTab === "active" ? (
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
                        <p className="text-sm text-muted-foreground">{plan.duration_days} days</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Earnings</p>
                        <p className="text-sm text-muted-foreground">
                          ${plan.total_earnings?.toLocaleString() || '0.00'}
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
                    {renderInvestButton(plan)}
                    {investmentError && selectedPlan === plan.id && (
                      <p className="text-sm text-destructive">{investmentError}</p>
                    )}
                  </CardFooter>
                </Card>
              ))
            ) : (
              // Replace the "No subscribed plans" message with the actual subscribed plans
              <div className="col-span-full">
                {subscribedPlans.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No subscribed plans yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {subscribedPlans.map((plan) => (
                      <Card 
                        key={plan.id}
                        className="relative border-border/40"
                      >

                        <CardHeader>
                        <div>
                          <Badge 
                          variant="default" 
                          className="bg-green-500 hover:bg-green-600">
                          Active & Earning
                        </Badge>
                          </div>
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
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Duration</p>
                              <p className="text-sm text-muted-foreground">{plan.duration_days} days</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                              <Coins className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Total Earnings</p>
                              <p className="text-sm text-green-500 font-medium">
                                ${plan.total_earnings?.toLocaleString() || '0.00'}
                              </p>
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Investment</DialogTitle>
              <DialogDescription>
                Please review your investment details below
              </DialogDescription>
            </DialogHeader>
            
            {selectedPlanData && (
              <div className="space-y-4 py-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Plan:</span>
                  <span className="font-medium">{selectedPlanData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Amount:</span>
                  <span className="font-medium">${selectedPlanData.investment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Balance:</span>
                  <span className="font-medium">${(userProfile?.balance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance After Investment:</span>
                  <span className="font-medium">${((userProfile?.balance || 0) - selectedPlanData.investment).toLocaleString()}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={processingInvestment}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvestment}
                disabled={processingInvestment}
              >
                {processingInvestment ? "Processing..." : "Confirm Investment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </PageTransition>
    </ShellLayout>
  );
};

export default Plans;
