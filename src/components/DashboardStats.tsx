
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard = ({ title, value, description, icon, change, trend }: StatCardProps) => {
  return (
    <Card className="glass card-hover overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {change && (
          <div className="mt-1 flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span className={cn(
              "text-xs",
              trend === 'up' && "text-green-500",
              trend === 'down' && "text-red-500"
            )}>
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardStats = () => {
  const { profile } = useAuth();
  
  const formatCurrency = (value: number = 0) => `$${value.toFixed(2)}`;
  const formatNumber = (value: number = 0) => value.toString();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Investment"
        value={formatCurrency(profile?.investment_total || 0)}
        description="Your current balance"
        icon={<DollarSign className="h-4 w-4" />}
        change="8% from last month"
        trend="up"
      />
      <StatCard
        title="Total Withdrawals"
        value={formatCurrency(profile?.withdrawal_total || 0)}
        description="Total withdrawn amount"
        icon={<TrendingDown className="h-4 w-4" />}
        change="12% from last month"
        trend="up"
      />
      <StatCard
        title="Affiliate Income"
        value={formatCurrency(profile?.affiliate_income || 0)}
        description="Earnings from referrals"
        icon={<TrendingUp className="h-4 w-4" />}
        change="23% from last month"
        trend="up"
      />
      <StatCard
        title="Affiliate Referrals"
        value={formatNumber(profile?.affiliate_referrals || 0)}
        description="Number of referrals"
        icon={<Users className="h-4 w-4" />}
        change="5% from last month"
        trend="up"
      />
    </div>
  );
};

import { cn } from '@/lib/utils';

export default DashboardStats;
