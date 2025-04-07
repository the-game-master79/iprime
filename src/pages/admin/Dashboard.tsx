import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  DollarSign,
  DownloadCloud,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui-components";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalReferrers: number;  // This now counts users who have been referred
}

interface ActivityRecord {
  id: string;
  user_name: string;  // Update to use user_name directly
  user_id: string;
  type: string;
  description: string;
  amount?: number;
  status?: string;
  created_at: string;
}

const getStatusBadgeVariant = (status: string | undefined) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'failed':
      return 'destructive'
    default:
      return 'outline'
  }
}

const getStatusIcon = (status: string | undefined) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    case 'pending':
      return <Clock className="h-4 w-4" />
    case 'failed':
      return <XCircle className="h-4 w-4" />
    default:
      return null
  }
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalReferrers: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityRecord[]>([]);

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
        .not('referred_by', 'is', null); // Changed from referral_code to referred_by

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalRevenue,
        totalReferrers: totalReferrers || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    const { data, error } = await supabase
      .from('platform_activity_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching activity:', error);
      return;
    }

    setRecentActivity(data || []);
  };

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
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
            title="Total Referred" // Changed from "Total Referrers"
            value={stats.totalReferrers.toLocaleString()}
            description="Users with referrers" // Updated description
            icon={<UserPlus className="h-4 w-4" />}
            trend={{ value: 0, isPositive: true }}
            loading={loading}
          />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {activity.user_name || 'Unknown'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        ID: {activity.user_id?.slice(0,8)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {(activity.type || 'unknown').replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{activity.description}</TableCell>
                  <TableCell className="text-right">
                    {activity.amount ? (
                      <span className={activity.amount >= 0 ? "text-green-600" : "text-red-600"}>
                        ${Math.abs(activity.amount).toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(activity.status)} className="flex w-fit items-center gap-1">
                      {getStatusIcon(activity.status)}
                      <span className="capitalize">
                        {activity.status || 'Unknown'}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
