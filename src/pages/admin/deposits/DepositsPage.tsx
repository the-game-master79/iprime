import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import AdminLayout from "@/pages/admin/AdminLayout";

const DepositsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [volumes, setVolumes] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("plans_subscriptions")
        .select("id, user_id, amount, plan_id, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSubscriptions(data || []);

      // Calculate volumes
      const volumeData = data.reduce(
        (acc, sub) => {
          if (sub.status === "pending") acc.pending += sub.amount;
          else if (sub.status === "approved") acc.approved += sub.amount;
          else if (sub.status === "rejected") acc.rejected += sub.amount;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0 }
      );

      setVolumes(volumeData);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      const { data, error } = await supabase
        .rpc('approve_plan_subscription', { subscription_id: id });

      if (error) throw error;
      
      // Check the response from the function
      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success(data.message || "Plan subscription approved successfully");
      fetchSubscriptions();
    } catch (error) {
      console.error("Error approving subscription:", error);
      toast.error(error.message || "Failed to approve subscription");
    }
  };

  const handleReject = async (id) => {
    try {
      const { error } = await supabase
        .rpc('reject_plan_subscription', { subscription_id: id });

      if (error) throw error;

      toast.success("Plan subscription rejected successfully");
      fetchSubscriptions();
    } catch (error) {
      console.error("Error rejecting subscription:", error);
      toast.error("Failed to reject subscription");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h2 className="text-3xl font-bold">Plan Subscriptions</h2>

        {/* Volume Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white shadow rounded">
            <h3 className="text-lg font-semibold">Pending Volume</h3>
            <p>${volumes.pending.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-white shadow rounded">
            <h3 className="text-lg font-semibold">Approved Volume</h3>
            <p>${volumes.approved.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-white shadow rounded">
            <h3 className="text-lg font-semibold">Rejected Volume</h3>
            <p>${volumes.rejected.toLocaleString()}</p>
          </div>
        </div>

        {/* Subscriptions Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Plan Amount</TableHead>
              <TableHead>Plan ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No subscriptions found</TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.id}</TableCell>
                  <TableCell>{sub.user_id}</TableCell>
                  <TableCell>${sub.amount.toLocaleString()}</TableCell>
                  <TableCell>{sub.plan_id}</TableCell>
                  <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{sub.status}</TableCell>
                  <TableCell>
                    {sub.status === "pending" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleVerify(sub.id)}>
                          Verify
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleReject(sub.id)}>
                          Reject
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
    </AdminLayout>
  );
};

export default DepositsPage;
