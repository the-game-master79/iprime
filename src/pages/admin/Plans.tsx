import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSidebarNav from '@/components/admin/AdminSidebarNav';
import { initializeDatabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Plan {
  id: string;
  plan_name: string;  // Changed from name
  minimum_deposit: number;
  maximum_deposit: number;
  daily_returns: number;
  days_count: number; // Changed from duration_days
  created_at: string;
  participants?: number;
  description?: string;
}

const AdminPlans = () => {
  const { user, loading } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]); // Add type to plans state
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    plan_name: '',
    plan_description: '',
    amount: '',
    daily_returns: '',
    days_count: ''
  });

  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const togglePlanSelection = (planId: string) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const calculateReturns = (plan: Plan) => {
    const dailyReturn = plan.minimum_deposit * (plan.daily_returns / 100);
    const monthlyReturn = dailyReturn * 30; // Approximate month
    return { dailyReturn, monthlyReturn };
  };

  useEffect(() => {
    const init = async () => {
      if (user) {
        setIsInitializing(true);
        try {
          await initializeDatabase();
          await fetchPlans();
        } catch (error) {
          console.error('Database initialization error:', error);
          toast({
            title: "Database error",
            description: "There was an error connecting to the database.",
            variant: "destructive"
          });
        } finally {
          setIsInitializing(false);
        }
      }
    };
    
    init();
  }, [user]);

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

  const handleEdit = (plan: Plan) => {
    setFormData({
      plan_name: plan.plan_name,
      plan_description: plan.description || '',
      amount: plan.minimum_deposit.toString(),
      daily_returns: plan.daily_returns.toString(),
      days_count: plan.days_count.toString()
    });
    setEditingPlanId(plan.id);
    setIsEditMode(true);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInitializing(true);
    
    try {
      const minDeposit = parseFloat(formData.amount);
      const dailyReturns = parseFloat(formData.daily_returns);
      const daysCount = parseInt(formData.days_count);

      if (isNaN(minDeposit) || isNaN(dailyReturns) || isNaN(daysCount)) {
        throw new Error("Please enter valid numbers for amount, returns and duration");
      }

      const planData = {
        plan_name: formData.plan_name,
        description: formData.plan_description,
        minimum_deposit: minDeposit,
        maximum_deposit: minDeposit * 10,
        daily_returns: dailyReturns,
        days_count: daysCount,
      };

      const { error } = isEditMode 
        ? await supabase
            .from('plans')
            .update(planData)
            .eq('id', editingPlanId)
        : await supabase
            .from('plans')
            .insert([{
              ...planData,
              created_at: new Date().toISOString()
            }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Plan has been ${isEditMode ? 'updated' : 'created'} successfully`
      });

      setFormData({
        plan_name: '',
        plan_description: '',
        amount: '',
        daily_returns: '',
        days_count: ''
      });
      setShowDialog(false);
      setIsEditMode(false);
      setEditingPlanId(null);
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Add helper function to calculate maximum deposit
  const calculateMaxDeposit = (minDeposit: number) => {
    return minDeposit * 10; // 10x the minimum deposit
  };

  // Update the returns calculation to include total returns
  const calculatePlanDetails = (plan: Plan) => {
    const minDeposit = plan.minimum_deposit;
    const maxDeposit = plan.maximum_deposit;
    const dailyReturn = minDeposit * (plan.daily_returns / 100);
    const totalReturn = minDeposit * (plan.daily_returns / 100) * plan.days_count;
    
    return { 
      minDeposit, 
      maxDeposit, 
      dailyReturn, 
      totalReturn 
    };
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Plan deleted",
        description: "Investment plan has been removed successfully."
      });

      await fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error deleting plan",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (!user && !loading) {
    return <Navigate to="/admin" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      <AdminSidebarNav 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminNavbar />
        
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Investment Plans</h1>
                <p className="text-slate-400">Manage investment plans and packages</p>
              </div>
              <Button onClick={() => setShowDialog(true)}>
                Add New Plan
              </Button>
            </div>

            <Dialog 
              open={showDialog} 
              onOpenChange={(open) => {
                if (!open) {
                  setIsEditMode(false);
                  setEditingPlanId(null);
                  setFormData({
                    plan_name: '',
                    plan_description: '',
                    amount: '',
                    daily_returns: '',
                    days_count: ''
                  });
                }
                setShowDialog(open);
              }}
            >
              <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white border-slate-700">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? 'Edit Investment Plan' : 'Add New Investment Plan'}</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {isEditMode ? 'Update the investment plan details below' : 'Create a new investment plan with the details below'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="plan_name">Plan Name</Label>
                      <Input
                        id="plan_name"
                        value={formData.plan_name}
                        onChange={(e) => setFormData({...formData, plan_name: e.target.value})}
                        className="bg-slate-900"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="plan_description">Description</Label>
                      <textarea
                        id="plan_description"
                        value={formData.plan_description}
                        onChange={(e) => setFormData({...formData, plan_description: e.target.value})}
                        className="bg-slate-900 rounded-md min-h-[100px] p-3"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="bg-slate-900"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="daily_returns">Daily Returns (%)</Label>
                      <Input
                        id="daily_returns"
                        type="number"
                        step="0.01"
                        value={formData.daily_returns}
                        onChange={(e) => setFormData({...formData, daily_returns: e.target.value})}
                        className="bg-slate-900"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="days_count">Duration (Days)</Label>
                      <Input
                        id="days_count"
                        type="number"
                        value={formData.days_count}
                        onChange={(e) => setFormData({...formData, days_count: e.target.value})}
                        className="bg-slate-900"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isInitializing}>
                      {isInitializing ? 'Creating...' : 'Create Plan'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const { minDeposit, maxDeposit, dailyReturn, totalReturn } = calculatePlanDetails(plan);
                return (
                  <Card 
                    key={plan.id}
                    className={cn(
                      "bg-slate-800 border-slate-700 hover:border-primary/50 transition-all duration-300",
                      selectedPlans.includes(plan.id) && "border-primary"
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl text-white font-bold">{plan.plan_name}</h3>
                          <p className="text-sm text-slate-400">{plan.description}</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-primary">
                          ${minDeposit.toLocaleString()}
                        </div>
                        <p className="text-sm text-slate-400">
                          Min. Investment (Max ${maxDeposit.toLocaleString()})
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-lg font-semibold text-green-400">
                            ${dailyReturn.toFixed(2)} <span className="text-xs text-slate-400">{plan.daily_returns}%</span>
                          </div>
                          <p className="text-xs text-slate-400">Daily Returns</p>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-semibold text-green-400">
                            ${totalReturn.toFixed(2)} <span className="text-xs text-slate-400">({plan.days_count} days)</span>
                          </div>
                          <p className="text-xs text-slate-400">Total Returns</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Duration</span>
                          <span className="font-medium text-white">{plan.days_count} Days</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            className="w-full bg-blue-600"
                            variant="outline"
                            onClick={() => handleEdit(plan)}
                          >
                            Edit Plan
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPlans;
