import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "@phosphor-icons/react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  description?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onCopyId: (id: string) => void;
}

export function TransactionTable({ transactions, onCopyId }: TransactionTableProps) {
  // Check if all transactions are from the same year
  const allSameYear = transactions.every((tx, _, arr) => {
    const firstDate = new Date(arr[0].created_at);
    const currentDate = new Date(tx.created_at);
    return isValid(firstDate) && isValid(currentDate) && 
           format(firstDate, 'yyyy') === format(currentDate, 'yyyy');
  });

  const getTransactionType = (type: string) => {
    switch (type) {
      case 'investment_return':
        return 'Reward';
      case 'investment':
        return 'Subscription';
      case 'rank_bonus':
        return 'Bonus';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          border: 'border-[#20BF55]',
          bg: 'bg-[#20BF55]/20',
          text: 'text-[#20BF55]'
        };
      case 'pending':
      case 'Pending':
        return {
          border: 'border-[#FFA500]',
          bg: 'bg-[#FFA500]/20',
          text: 'text-[#FFA500]'
        };
      case 'Failed':
        return {
          border: 'border-[#FF005C]',
          bg: 'bg-[#FF005C]/20',
          text: 'text-[#FF005C]'
        };
      default:
        return {
          border: 'border-[#20BF55]',
          bg: 'bg-[#20BF55]/20',
          text: 'text-[#20BF55]'
        };
    }
  };

  const isPositiveAmount = (type: string) => {
    return ['deposit', 'commission', 'investment_return', 'rank_bonus'].includes(type);
  };

  const getAmountColor = (status: string, isPositive: boolean) => {
    switch (status) {
      case 'Failed':
        return 'text-[#FF005C]';
      case 'Pending':
        return 'text-[#FFA500]';
      default:
        return isPositive ? 'text-[#20BF55]' : 'text-white';
    }
  };

  // Group transactions by date if not all from same year
  const groupedTransactions = allSameYear 
    ? { 'all': transactions }
    : transactions.reduce((groups, transaction) => {
        const date = new Date(transaction.created_at);
        if (!isValid(date)) return groups;
        
        const dateKey = format(date, 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(transaction);
        return groups;
      }, {} as Record<string, Transaction[]>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'd MMM • h:mm a');
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([dateKey, transactions]) => {
        const date = new Date(dateKey);
        const year = isValid(date) ? format(date, 'yyyy') : 'Invalid Date';
        
        return (
          <div key={dateKey} className="space-y-4">
            {!allSameYear && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">{year}</span>
              </div>
            )}
            <div className="space-y-2">
              {transactions.map((transaction) => {
                const formattedDate = formatDate(transaction.created_at);
                const isPositive = isPositiveAmount(transaction.type);
                const badgeColors = getBadgeColor(transaction.status);
                const truncatedId = `${transaction.id.slice(0, 5)}...`;

                return (
                  <div 
                    key={transaction.id} 
                    className="bg-[#1E1E1E] p-4 rounded-xl border border-white/5"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        {/* Left side - Date and Amount */}
                        <div className="space-y-1">
                          <span className="text-sm text-white/60">{formattedDate}</span>
                          <h2 className={`text-xl font-semibold ${getAmountColor(transaction.status, isPositive)}`}>
                            {isPositive ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString()} USD
                          </h2>
                        </div>

                        {/* Right side - ID and Copy button */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/80 font-mono">{truncatedId}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onCopyId(transaction.id)}
                              className="h-6 w-6 hover:bg-white/10"
                            >
                              <Copy className="h-3 w-3 text-white/60" weight="regular" />
                            </Button>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "px-3 py-1",
                              badgeColors.border,
                              badgeColors.bg,
                              badgeColors.text
                            )}
                          >
                            {getTransactionType(transaction.type)} → {transaction.status === 'pending' ? 'Pending' : transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
