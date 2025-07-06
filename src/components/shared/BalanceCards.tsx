import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface BalanceCardProps {
  amount?: number;
  variant?: 'default' | 'success' | 'processing' | 'failed' | 'referrals' | 'business' | 'commission' | 'direct';
  label?: string;
  prefix?: string;
  className?: string;
  valueClassName?: string;
  totalProfits?: number;
}

export const BalanceCard = ({ 
  amount = 0, 
  variant = 'default', 
  label,
  prefix = '',
  className = '',
  valueClassName = '',
  totalProfits
}: BalanceCardProps) => {
  const variants = {
    default: {
      containerClass: 'border-primary/50 hover:border-primary/70',
      label: label || 'Available Balance',
      gradient: 'from-blue-500/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-blue-500/40 to-transparent'
    },
    success: {
      containerClass: 'border-green-500/50 hover:border-green-500/70',
      label: label || 'Payment Success',
      gradient: 'from-green-500/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-green-500/40 to-transparent'
    },
    processing: {
      containerClass: 'border-amber-500/50 hover:border-amber-500/70',
      label: label || 'Processing',
      gradient: 'from-amber-500/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-amber-500/40 to-transparent'
    },
    failed: {
      containerClass: 'border-red-500/50 hover:border-red-500/70',
      label: label || 'Failed Transaction',
      gradient: 'from-red-500/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-red-500/40 to-transparent'
    },
    referrals: {
      containerClass: 'border-purple-500/50 hover:border-purple-500/70',
      label: label || 'Total Referrals',
      gradient: 'from-purple-500/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-purple-500/40 to-transparent'
    },
    business: {
      containerClass: 'border-emerald-500/50 hover:border-emerald-500/70',
      label: label || 'Business Volume',
      gradient: 'from-emerald-500/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-emerald-500/40 to-transparent'
    },
    commission: {
      containerClass: 'border-primary/50 hover:border-primary/70',
      label: label || 'Total Commission',
      gradient: 'from-primary/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-primary/40 to-transparent'
    },
    direct: {
      containerClass: 'border-indigo-500/50 hover:border-indigo-500/70',
      label: label || 'Direct Referrals',
      gradient: 'from-indigo-500/5 via-transparent to-transparent',
      borderGradient: 'from-transparent via-indigo-500/40 to-transparent'
    }
  };

  const { containerClass, label: cardLabel, gradient, borderGradient } = variants[variant];
  const showUsdSuffix = variant !== 'direct' && variant !== 'referrals';

  return (
    <Card className={cn("relative overflow-hidden", containerClass, className)}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100 pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${borderGradient} opacity-100`} />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{cardLabel}</CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="space-y-1">
          <h3 className={cn("text-4xl font-bold tracking-tight", valueClassName)}>
            {prefix}{(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {showUsdSuffix && <span className="text-lg font-normal text-muted-foreground ml-1">USD</span>}
          </h3>
          
          {typeof totalProfits === 'number' && (
            <div className="mt-3 px-3 py-2 rounded-md bg-green-500/10 border border-green-500/30 text-sm font-medium">
              <div className="flex items-center">
                <span className="relative flex h-2.5 w-2.5 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span>Total profit: {totalProfits.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
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
