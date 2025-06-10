import { Card } from "@/components/ui/card";
import { CircleDollarSign, CheckCircle2, Clock, XCircle, Users, TrendingUp, DollarSign, Network } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BalanceCardProps {
  amount?: number;
  variant?: 'default' | 'success' | 'processing' | 'failed' | 'referrals' | 'business' | 'commission' | 'direct';
  label?: string;
  prefix?: string;
  className?: string;
  valueClassName?: string;
}

export const BalanceCard = ({ 
  amount = 0, 
  variant = 'default', 
  label,
  prefix = '',
  className = '',
  valueClassName = ''
}: BalanceCardProps) => {
  const variants = {
    default: {
      containerClass: 'bg-blue-500/10 border-blue-500/20',
      iconClass: 'text-blue-500',
      iconBgClass: 'bg-blue-500/20',
      icon: CircleDollarSign,
      label: label || 'Available Balance'
    },
    success: {
      containerClass: 'bg-green-500/10 border-green-500/20',
      iconClass: 'text-green-500',
      iconBgClass: 'bg-green-500/20',
      icon: CheckCircle2,
      label: label || 'Payment Success'
    },
    processing: {
      containerClass: 'bg-amber-500/10 border-amber-500/20',
      iconClass: 'text-amber-500',
      iconBgClass: 'bg-amber-500/20',
      icon: Clock,
      label: label || 'Processing'
    },
    failed: {
      containerClass: 'bg-[#FF005C]/10 border-[#FF005C]/20',
      iconClass: 'text-[#FF005C]',
      iconBgClass: 'bg-[#FF005C]/20',
      icon: XCircle,
      label: label || 'Failed Transaction'
    },
    referrals: {
      containerClass: 'bg-purple-500/10 border-purple-500/20',
      iconClass: 'text-purple-500',
      iconBgClass: 'bg-purple-500/20', 
      icon: Users,
      label: label || 'Total Referrals'
    },
    business: {
      containerClass: 'bg-emerald-500/10 border-emerald-500/20',
      iconClass: 'text-emerald-500',
      iconBgClass: 'bg-emerald-500/20',
      icon: TrendingUp,
      label: label || 'Business Volume'
    },
    commission: {
      containerClass: 'bg-primary/10 border-primary/20',
      iconClass: 'text-primary',
      iconBgClass: 'bg-primary/20',
      icon: DollarSign,
      label: label || 'Total Commission'
    },
    direct: {
      containerClass: 'bg-indigo-500/10 border-indigo-500/20', 
      iconClass: 'text-indigo-500',
      iconBgClass: 'bg-indigo-500/20',
      icon: Network,
      label: label || 'Direct Referrals'
    }
  };

  const { containerClass, iconClass, iconBgClass, icon: Icon, label: cardLabel } = variants[variant];

  const showUsdSuffix = variant !== 'direct' && variant !== 'referrals';

  return (
    <Card className={cn(`relative p-6 ${containerClass}`, className)}>
      <div className={`absolute top-4 right-4 w-8 h-8 rounded-full ${iconBgClass} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconClass}`} />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{cardLabel}</p>
        <h3 className={cn("text-2xl font-bold text-foreground", valueClassName)}>
          {`${(amount || 0).toLocaleString()}${showUsdSuffix ? ' USD' : ''}`}
        </h3>
      </div>
    </Card>
  );
};

export const BalanceCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <BalanceCard amount={1234.56} />
      <BalanceCard amount={150} variant="success" />
      <BalanceCard amount={89.99} variant="processing" />
      <BalanceCard amount={50} variant="failed" />
    </div>
  );
};
