import { useState, useEffect } from "react";
import { Plus, Pencil, Trash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import AdminLayout from "@/pages/admin/AdminLayout";
import { PageTransition } from "@/components/ui-components";

interface Plan {
  id: string;
  name: string;
  description: string;
  investment: number;
  returns_percentage: number;
  duration_days: number;
  benefits: string;
  status: 'active' | 'inactive';
}

const validateBenefits = (benefits: string) => {
  const items = benefits.split('•').filter(Boolean);
  if (items.length !== 6) {
    return 'Exactly 6 benefits are required, separated by • symbol';
  }
  return null;
};

const Plans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [benefitsCount, setBenefitsCount] = useState(0);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      toast.success('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const benefits = formData.get('benefits') as string;
    
    // Validate benefits
    const benefitsError = validateBenefits(benefits);
    if (benefitsError) {
      toast.error(benefitsError);
      setIsLoading(false);
      return;
    }

    const planData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      investment: Number(formData.get('investment')),
      returns_percentage: Number(formData.get('returns_percentage')),
      duration_days: Number(formData.get('duration_days')),
      benefits: formData.get('benefits') as string,
      status: formData.get('status') === 'on' ? 'active' : 'inactive'
    };

    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        const { error } = await supabase
          .from('plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('Plan created successfully');
      }

      setIsDialogOpen(false);
      fetchPlans();
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBenefitsChange = (value: string) => {
    const items = value.split('•').filter(Boolean);
    setBenefitsCount(items.length);
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Investment Plans</h2>
              <Dialog 
                open={isDialogOpen} 
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) setEditingPlan(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                    <DialogDescription>
                      {editingPlan ? 'Update the investment plan details.' : 'Add a new investment plan to the platform.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Plan Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingPlan?.name}
                        placeholder="e.g., Basic Plan"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingPlan?.description}
                        placeholder="Plan description..."
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="investment">Investment Amount ($)</Label>
                      <Input
                        id="investment"
                        name="investment"
                        type="number"
                        defaultValue={editingPlan?.investment}
                        min={0}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="benefits" className="flex justify-between">
                        <span>Benefits (6 items, separated by •)</span>
                        <span className={`text-sm ${benefitsCount === 6 ? 'text-green-500' : 'text-amber-500'}`}>
                          {benefitsCount}/6 benefits added
                        </span>
                      </Label>
                      <Textarea
                        id="benefits"
                        name="benefits"
                        defaultValue={editingPlan?.benefits}
                        placeholder="CPU Benefit • GPU Benefit • RAM Benefit • Trade Symbol Benefit • Support Benefit • Progress Benefit"
                        className={`min-h-[120px] ${benefitsCount !== 6 ? 'border-amber-500' : 'border-green-500'}`}
                        required
                        onChange={(e) => handleBenefitsChange(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter exactly 6 benefits, one for each category: CPU, GPU, RAM, Trade Symbol, Support, and Progress
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="returns_percentage">Returns (%)</Label>
                        <Input
                          id="returns_percentage"
                          name="returns_percentage"
                          type="number"
                          defaultValue={editingPlan?.returns_percentage}
                          step="0.1"
                          min={0}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="duration_days">Duration (Days)</Label>
                        <Input
                          id="duration_days"
                          name="duration_days"
                          type="number"
                          defaultValue={editingPlan?.duration_days}
                          min={1}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="status"
                        name="status"
                        defaultChecked={editingPlan?.status === 'active'}
                      />
                      <Label htmlFor="status">Active</Label>
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {plan.name}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          plan.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                          className="text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Investment:</span>
                          <span>${plan.investment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Returns:</span>
                          <span>{plan.returns_percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{plan.duration_days} days</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold">Benefits:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {plan.benefits.split('•').filter(Boolean).map((benefit, index) => (
                            <li key={index} className="text-muted-foreground">{benefit.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    </AdminLayout>
  );
};

export default Plans;
