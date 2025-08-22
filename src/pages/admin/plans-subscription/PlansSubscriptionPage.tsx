import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, CheckSquare, XSquare } from "lucide-react";
import { StatCard } from "@/components/ui-components"; // Adjust the path as needed
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlanSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  plans?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  total_returns?: number; // Add new optional property
}

const PlansSubscriptionPage = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<PlanSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<PlanSubscription | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      // First get all subscriptions
      const { data: subscriptionsData, error: subError } = await supabase
        .from('plans_subscriptions')
        .select(`
          *,
          plans:plan_id (name),
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (subError) throw subError;

      // Get all investment returns
      const { data: returnsData, error: returnsError } = await supabase
        .from('transactions')
        .select('reference_id, amount')
        .eq('type', 'investment_return')
        .eq('status', 'Completed');

      if (returnsError) throw returnsError;

      // Group returns by subscription ID
      const returnsBySubscription = returnsData.reduce((acc: Record<string, number>, curr) => {
        acc[curr.reference_id] = (acc[curr.reference_id] || 0) + curr.amount;
        return acc;
      }, {});

      // Combine subscription data with returns
      const enrichedSubscriptions = subscriptionsData.map(sub => ({
        ...sub,
        total_returns: returnsBySubscription[sub.id] || 0
      }));

      setSubscriptions(enrichedSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (subscription: PlanSubscription) => {
    try {
      const { data, error } = await supabase
        .rpc('approve_plan_subscription', {
          subscription_id: subscription.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Plan subscription approved successfully"
      });

      fetchSubscriptions();
    } catch (error) {
      console.error('Error approving subscription:', error);
      toast({
        title: "Error",
        description: "Failed to approve subscription",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (subscription: PlanSubscription) => {
    try {
      const { data, error } = await supabase
        .rpc('reject_plan_subscription', {
          subscription_id: subscription.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Plan subscription rejected successfully"
      });

      fetchSubscriptions();
    } catch (error) {
      console.error('Error rejecting subscription:', error);
      toast({
        title: "Error",
        description: "Failed to reject subscription",
        variant: "destructive"
      });
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const fullName = sub.profiles?.full_name || '';
    const email = sub.profiles?.email || '';
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Update stats calculation
  const stats = {
    subscribedPlans: {
      count: subscriptions.filter(s => s.status === 'approved').length,
      amount: subscriptions
        .filter(s => s.status === 'approved')
        .reduce((sum, s) => sum + s.amount, 0)
    },
    closedPlans: {
      count: subscriptions.filter(s => s.status === 'rejected' || s.status === 'cancelled').length,
      amount: subscriptions
        .filter(s => s.status === 'rejected' || s.status === 'cancelled')
        .reduce((sum, s) => sum + s.amount, 0)
    },
    pendingPlans: {
      count: subscriptions.filter(s => s.status === 'pending').length,
      amount: subscriptions
        .filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + s.amount, 0)
    },
    totalEarnings: subscriptions
      .filter(s => s.status === 'approved')
      .reduce((sum, s) => sum + (s.total_returns || 0), 0)
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Update sorting handler for combined name
  const sortedSubscriptions = filteredSubscriptions.sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    
    switch (sortField) {
      case "name":
        const nameA = a.profiles?.full_name || '';
        const nameB = b.profiles?.full_name || '';
        return direction * nameA.localeCompare(nameB);
      case "amount":
        return direction * (a.amount - b.amount);
      case "plan":
        const planNameA = a.plans?.name || '';
        const planNameB = b.plans?.name || '';
        return direction * planNameA.localeCompare(planNameB);
      case "status":
        return direction * a.status.localeCompare(b.status);
      case "created_at":
      default:
        return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Plan Subscriptions"
        description="Manage and verify plan subscriptions"
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Subscriptions"
          value={stats.subscribedPlans.count.toString()}
        />
        <StatCard
          title="Pending Requests"
          value={stats.pendingPlans.count.toString()}
        />
        <StatCard
          title="Total Amount"
          value={`$${(stats.subscribedPlans.amount + stats.pendingPlans.amount).toLocaleString()}`}
        />
        <StatCard
          title="Total Earnings"
          value={`$${stats.totalEarnings.toLocaleString()}`}
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort By <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSort("created_at")}>
                Date {sortField === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("name")}>
                Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("plan")}>
                Plan {sortField === "plan" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("amount")}>
                Amount {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("status")}>
                Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : sortedSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                sortedSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {subscription.profiles?.full_name || 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.profiles?.email || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{subscription.plans?.name || 'N/A'}</TableCell>
                    <TableCell>${subscription.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${subscription.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          subscription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(subscription.created_at).toLocaleString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {subscription.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-500"
                            onClick={() => handleApprove(subscription)}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon" 
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleReject(subscription)}
                          >
                            <XSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PlansSubscriptionPage;
