// Use Phosphor icons instead of lucide-react
import { CurrencyCircleDollar, CheckCircle, Clock, XCircle, Users, TrendUp, CurrencyDollar, Network } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
      containerClass: 'bg-background border-2 border-blue-500',
      badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
      label: label || 'Available Balance'
    },
    success: {
      containerClass: 'bg-background border-2 border-green-500',
      badgeClass: 'bg-green-100 text-green-700 border border-green-200',
      label: label || 'Payment Success'
    },
    processing: {
      containerClass: 'bg-background border-2 border-amber-500',
      badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
      label: label || 'Processing'
    },
    failed: {
      containerClass: 'bg-background border-2 border-[#FFD6E6]',
      badgeClass: 'bg-[#FFD6E6] text-[#FF005C] border border-[#FFD6E6]',
      label: label || 'Failed Transaction'
    },
    referrals: {
      containerClass: 'bg-background border-2 border-purple-200',
      badgeClass: 'bg-purple-100 text-purple-700 border border-purple-200',
      label: label || 'Total Referrals'
    },
    business: {
      containerClass: 'bg-background border-2 border-emerald-500',
      badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      label: label || 'Business Volume'
    },
    commission: {
      containerClass: 'bg-background border-2 border-primary/20',
      badgeClass: 'bg-primary/10 text-primary border border-primary/20',
      label: label || 'Total Commission'
    },
    direct: {
      containerClass: 'bg-background border-2 border-indigo-200', 
      badgeClass: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      label: label || 'Direct Referrals'
    }
  };

  const { containerClass, badgeClass, label: cardLabel } = variants[variant];
  const showUsdSuffix = variant !== 'direct' && variant !== 'referrals';

  return (
    <div
      className={cn(
        `rounded-2xl p-6 flex flex-col justify-between min-h-[140px] ${containerClass}`,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-md text-foreground font-semibold">{cardLabel}</span>
      </div>
      <div className="space-y-1 mt-2">
        <h3 className={cn("text-5xl font-bold text-foreground", valueClassName)}>
          {prefix}
          {(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {showUsdSuffix ? <span className="text-2xl font-normal text-muted-foreground ml-2">USD</span> : null}
        </h3>
        {typeof totalProfits === 'number' && (
          <div className="w-full flex justify-between items-center px-4 py-3 rounded-md bg-green-500/10 border border-green-500 text-xs font-semibold text-foreground mt-4">
            <div className="flex items-center">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span>Total profit: {totalProfits.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
            </div>
          </div>
        )}
      </div>
    </div>
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
