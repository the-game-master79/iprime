
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon, trend }) => (
  <Card className="bg-slate-800 border-slate-700 text-white">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
      <div className="h-8 w-8 rounded-lg bg-primary/10 p-1 text-primary">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
      {trend !== undefined && (
        <div className="flex items-center mt-2">
          <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
          <p className="text-xs font-medium text-green-500">+{trend}% from last month</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const AdminDashboardStats = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Investments"
        value="$48,574"
        description="Total deposits from all users"
        icon={<DollarSign className="h-5 w-5" />}
        trend={12.5}
      />
      <StatCard
        title="Total Withdrawals"
        value="$12,897"
        description="Total withdrawals from all users"
        icon={<DollarSign className="h-5 w-5" />}
        trend={8.2}
      />
      <StatCard
        title="Total Users"
        value="1,298"
        description="Active users on the platform"
        icon={<Users className="h-5 w-5" />}
        trend={24.1}
      />
      <StatCard
        title="Affiliate Income"
        value="$7,432"
        description="Total affiliate commission generated"
        icon={<TrendingUp className="h-5 w-5" />}
        trend={15.3}
      />
    </div>
  );
};

export default AdminDashboardStats;
