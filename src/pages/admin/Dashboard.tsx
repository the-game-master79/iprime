import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  DollarSign,
  DownloadCloud,
  UserCheck
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui-components";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  activeAffiliates: number;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    activeAffiliates: 0
  });

  const fetchStats = async () => {
    try {
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

      // Get total revenue (sum of all deposits)
      const { data: revenueData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'deposit')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Get active affiliates count (referrals in last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const { count: activeAffiliates } = await supabase
        .from('referral_relationships')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', oneDayAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalRevenue,
        activeAffiliates: activeAffiliates || 0
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
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            description="Registered accounts"
            icon={<Users className="h-4 w-4" />}
            trend={{ value: 0, isPositive: true }}
            loading={loading}
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers.toLocaleString()}
            description="Active in last 48h"
            icon={<UserCheck className="h-4 w-4" />}
            trend={{ value: 0, isPositive: true }}
            loading={loading}
          />
          <StatCard
            title="Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            description="Total deposits"
            icon={<DollarSign className="h-4 w-4" />}
            trend={{ value: 0, isPositive: true }}
            loading={loading}
          />
          <StatCard
            title="Active Affiliates"
            value={stats.activeAffiliates.toLocaleString()}
            description="Active in last 24h"
            icon={<UserPlus className="h-4 w-4" />}
            trend={{ value: 0, isPositive: true }}
            loading={loading}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
