import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  DownloadCloud,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui-components";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalApprovedDeposits: number;
  totalReferrers: number;
  totalPlansValue: number;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalApprovedDeposits: 0,
    totalReferrers: 0,
    totalPlansValue: 0,
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Get total users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (invested in last 48 hours)
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
      
      const { count: activeUsers } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'investment')
        .gt('created_at', twoDaysAgo.toISOString());

      // Get total APPROVED deposits
      const { data: approvedDeposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'approved');

      const totalApprovedDeposits = approvedDeposits?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Get total revenue (sum of completed deposits only)
      const { data: revenueData } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'Completed');

      const totalRevenue = revenueData?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Get count of users who have been referred (have a referrer)
      const { count: totalReferrers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('referred_by', 'is', null);

      // Get total value of approved plan subscriptions
      const { data: approvedPlans } = await supabase
        .from('plans_subscriptions')
        .select('amount')
        .eq('status', 'approved');

      const totalPlansValue = approvedPlans?.reduce((sum, plan) => sum + (plan.amount || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalRevenue,
        totalApprovedDeposits,
        totalReferrers: totalReferrers || 0,
        totalPlansValue,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <PageHeader 
        title="Admin Dashboard" 
        description="Overview of platform performance and metrics"
        action={
          <Button size="sm" variant="outline">
            <DownloadCloud className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        }
      />
      
      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Registered Users"
            value={stats.totalUsers.toLocaleString()}
            loading={loading}
          />
          <StatCard
            title="Affiliates Count" 
            value={stats.totalReferrers.toLocaleString()}
            loading={loading}
          />
          <StatCard
            title="Total Deposits"
            value={`$${stats.totalApprovedDeposits.toLocaleString()}`}
            loading={loading}
          />
          <StatCard
            title="Total Plans"
            value={`$${stats.totalPlansValue.toLocaleString()}`}
            loading={loading}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
