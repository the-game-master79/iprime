import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import SidebarNav from '@/components/SidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  plan_name: string;
  minimum_deposit: number;
  maximum_deposit: number;
  daily_returns: number;
  days_count: number;
  created_at: string;
  description?: string;
}

interface PurchasedPlan {
  id: string;
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'Active' | 'Ended';
  plan: Plan;  // Nested plan data
}

const Plans = () => {
  const { user, loading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const { toast } = useToast();
  const [activePlans, setActivePlans] = useState<PurchasedPlan[]>([]);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<Plan | null>(null);

  // Calculate returns for display
  const calculatePlanDetails = (plan: Plan) => {
    const minDeposit = plan?.minimum_deposit || 0;
    const maxDeposit = plan?.maximum_deposit || 0;
    const dailyReturn = minDeposit * ((plan?.daily_returns || 0) / 100);
    const totalReturn = minDeposit * ((plan?.daily_returns || 0) / 100) * (plan?.days_count || 0);
    
    return { 
      minDeposit, 
      maxDeposit, 
      dailyReturn, 
      totalReturn 
    };
  };

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching plans",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setPlans(data || []);
    };

    fetchPlans();
  }, []);

  // Fetch active plans
  const fetchActivePlans = async () => {
    const { data, error } = await supabase
      .from('purchased_plans')
      .select('*, plan:plans(*)')
      .eq('user_id', user?.id)
      .eq('status', 'Active');

    if (error) {
      toast({
        title: "Error fetching active plans",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setActivePlans(data || []);
  };

  useEffect(() => {
    if (user) {
      fetchActivePlans();
    }
  }, [user]);

  const handlePlanSelect = async (plan: Plan) => {
    setSelectedPlanDetails(plan);
    setShowPurchaseDialog(true);
  };

  const handlePurchasePlan = async () => {
    if (!selectedPlanDetails || !user) return;

    try {
      // First check user's investment total
      const { data: profile } = await supabase
        .from('profiles')
        .select('investment_total')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.investment_total < selectedPlanDetails.minimum_deposit) {
        throw new Error('Insufficient balance in your investment total');
      }

      // Begin purchase transaction
      const { error: purchaseError } = await supabase.rpc('purchase_plan', {
        p_plan_id: selectedPlanDetails.id,
        p_user_id: user.id,
        p_amount: selectedPlanDetails.minimum_deposit,
        p_daily_returns: selectedPlanDetails.daily_returns,
        p_days_count: selectedPlanDetails.days_count
      });

      if (purchaseError) throw purchaseError;

      // Deduct investment amount from profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          investment_total: profile.investment_total - selectedPlanDetails.minimum_deposit
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Create transaction history entry with correct type
      const { error: historyError } = await supabase
        .from('account_history')
        .insert([{
          user_id: user.id,
          amount: selectedPlanDetails.minimum_deposit,
          type: 'plan_subscription', // This was previously incorrect
          description: `Subscribed to ${selectedPlanDetails.plan_name} plan`,
          status: 'completed',
          created_at: new Date().toISOString()
        }]);

      if (historyError) throw historyError;

      toast({
        title: "Plan purchased successfully",
        description: "Investment plan is now active"
      });

      // Refresh active plans and user profile
      await fetchActivePlans();
      setShowPurchaseDialog(false);
      setSelectedPlanDetails(null);
      setSelectedPlan(null);

    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (!user && !loading) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Investment Plans</h1>
              <p className="text-muted-foreground">Choose an investment plan that suits your goals</p>
            </div>
            
            <Tabs defaultValue="available" className="w-full">
              <TabsList>
                <TabsTrigger value="available">Available Plans</TabsTrigger>
                <TabsTrigger value="active">Active Plans</TabsTrigger>
              </TabsList>

              <TabsContent value="available">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const { minDeposit, maxDeposit, dailyReturn, totalReturn } = calculatePlanDetails(plan);
                    return (
                      <Card 
                        key={plan.id}
                        className={cn(
                          "hover:border-primary/50 transition-all duration-300",
                          selectedPlan === plan.id && "border-primary"
                        )}
                      >
                        <CardHeader>
                          <CardTitle className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-bold">{plan.plan_name}</h3>
                              <p className="text-sm text-muted-foreground">{plan.description}</p>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="space-y-2">
                            <div className="text-3xl font-bold text-primary">
                              ${(plan?.minimum_deposit || 0).toLocaleString()}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Min. Investment (Max ${(plan?.maximum_deposit || 0).toLocaleString()})
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-lg font-semibold text-green-500">
                                ${dailyReturn.toFixed(2)} <span className="text-xs text-muted-foreground">{plan.daily_returns}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Daily Returns</p>
                            </div>
                            <div className="space-y-1">
                              <div className="text-lg font-semibold text-green-500">
                                ${totalReturn.toFixed(2)} <span className="text-xs text-muted-foreground">({plan.days_count} days)</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Total Returns</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Duration</span>
                              <span className="font-medium">{plan.days_count} Days</span>
                            </div>
                            <Button 
                              className="w-full"
                              variant={selectedPlan === plan.id ? "secondary" : "default"}
                              onClick={() => handlePlanSelect(plan)}
                            >
                              {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="active">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activePlans.map((activePlan) => {
                    // Safely access nested plan data
                    const plan = activePlan.plan || {};
                    const minDeposit = plan.minimum_deposit || 0;
                    const dailyReturns = plan.daily_returns || 0;
                    const daysRemaining = activePlan.end_date ? 
                      Math.max(0, Math.ceil((new Date(activePlan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 
                      0;

                    return (
                      <Card key={activePlan.id} className="bg-slate-800 border-slate-700 relative">
                        <Badge className="absolute top-3 right-3" variant="default">
                          Active
                        </Badge>
                        <CardHeader>
                          <CardTitle>{plan.plan_name || 'Unnamed Plan'}</CardTitle>
                          <p className="text-sm text-slate-400">
                            Started: {new Date(activePlan.start_date).toLocaleDateString()}
                            <br/>
                            Ends: {activePlan.end_date ? new Date(activePlan.end_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="text-2xl font-bold text-primary">
                              ${minDeposit.toLocaleString()}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-slate-400">Daily Returns</p>
                                <p className="text-lg font-semibold text-green-500">
                                  ${((minDeposit * dailyReturns) / 100).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-400">Days Remaining</p>
                                <p className="text-lg font-semibold">{daysRemaining}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to purchase this investment plan?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-lg font-semibold">Plan Details:</p>
            <div className="mt-2 space-y-2">
              <p>Investment Amount: ${(selectedPlanDetails?.minimum_deposit || 0).toLocaleString()}</p>
              <p>Daily Returns: {selectedPlanDetails?.daily_returns || 0}%</p>
              <p>Duration: {selectedPlanDetails?.days_count || 0} days</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>Cancel</Button>
            <Button onClick={handlePurchasePlan}>Confirm Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Plans;
