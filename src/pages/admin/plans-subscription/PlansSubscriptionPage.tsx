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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface PlanSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  plans: {
    name: string;
  };
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const PlansSubscriptionPage = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<PlanSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<PlanSubscription | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('plans_subscriptions')
        .select(`
          *,
          plans:plan_id (name),
          profiles:user_id (first_name, last_name, email)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
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

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Plan Subscriptions"
        description="Manage and verify plan subscriptions"
      />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {subscription.profiles.first_name} {subscription.profiles.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {subscription.profiles.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{subscription.plans.name}</TableCell>
                  <TableCell>${subscription.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={
                      subscription.status === 'approved' ? 'success' :
                      subscription.status === 'pending' ? 'warning' :
                      'destructive'
                    }>
                      {subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(subscription.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {subscription.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(subscription)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(subscription)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PlansSubscriptionPage;
