import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CaretDown } from "@phosphor-icons/react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  description?: string;
  wallet_address?: string; // Add wallet_address as optional
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

  const isRewardTransaction = (type: string) => {
    return ['investment_return', 'rank_bonus'].includes(type);
  };

  // Group transactions by date and type
  const groupTransactions = (transactions: Transaction[]) => {
    return transactions.reduce((groups, transaction) => {
      const date = new Date(transaction.created_at);
      if (!isValid(date)) return groups;
      
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = {
          rewards: [],
          other: []
        };
      }

      if (isRewardTransaction(transaction.type)) {
        groups[dateKey].rewards.push(transaction);
      } else {
        groups[dateKey].other.push(transaction);
      }

      return groups;
    }, {} as Record<string, { rewards: Transaction[], other: Transaction[] }>);
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          border: 'border-success',
          bg: 'bg-success/20',
          text: 'text-success'
        };
      case 'pending':
      case 'Pending':
        return {
          border: 'border-warning',
          bg: 'bg-warning/20',
          text: 'text-warning'
        };
      case 'Failed':
        return {
          border: 'border-error',
          bg: 'bg-error/20',
          text: 'text-error'
        };
      default:
        return {
          border: 'border-success',
          bg: 'bg-success/20',
          text: 'text-success'
        };
    }
  };

  const isPositiveAmount = (type: string) => {
    return ['deposit', 'commission', 'investment_return', 'rank_bonus'].includes(type);
  };

  const getAmountColor = (status: string, isPositive: boolean) => {
    switch (status) {
      case 'Failed':
        return 'text-error';
      case 'Pending':
        return 'text-warning';
      default:
        return isPositive ? 'text-success' : 'text-success';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'd MMM • h:mm a');
  };

  const groupedTransactions = allSameYear 
    ? { 'all': groupTransactions(transactions) }
    : Object.entries(groupTransactions(transactions)).reduce((acc, [key, value]) => {
        const year = format(new Date(key), 'yyyy');
        if (!acc[year]) {
          acc[year] = {};
        }
        acc[year][key] = value;
        return acc;
      }, {} as Record<string, Record<string, { rewards: Transaction[], other: Transaction[] }>>);

  const renderTransaction = (transaction: Transaction) => {
    const formattedDate = formatDate(transaction.created_at);
    const isPositive = isPositiveAmount(transaction.type);
    const badgeColors = getBadgeColor(transaction.status);
    const truncatedId = `${transaction.id.slice(0, 5)}...`;

    return (
      <div 
        key={transaction.id} 
        className="text-foreground p-4 rounded-xl border border-border"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            {/* Left side - Date and Amount */}
            <div className="space-y-1">
              <span className="text-sm text-foreground">{formattedDate}</span>
              <h2 className={`text-3xl font-bold ${getAmountColor(transaction.status, isPositive)}`}>
                {isPositive ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString()} USD
              </h2>
              {/* Wallet Address display and copy */}
              {transaction.wallet_address && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/60 font-mono break-all">{transaction.wallet_address}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCopyId(transaction.wallet_address!)}
                    className="h-5 w-5 hover:bg-white/10"
                    title="Copy wallet address"
                  >
                    <Copy className="h-3 w-3 text-foreground" weight="regular" />
                  </Button>
                </div>
              )}
            </div>

            {/* Right side - ID and Copy button */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base text-foreground font-medium">{truncatedId}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCopyId(transaction.id)}
                  className="h-6 w-6 hover:bg-white/10"
                >
                  <Copy className="h-3 w-3 text-foreground" weight="regular" />
                </Button>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "px-4 py-0.5 text-base font-medium shadow-none border-0",
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
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([year, dateGroups]) => (
        <div key={year} className="space-y-4">
          {!allSameYear && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">{year}</span>
            </div>
          )}
          {Object.entries(dateGroups).map(([dateKey, { rewards, other }]) => (
            <div key={dateKey} className="space-y-2">
              {/* Regular transactions */}
              {other.map(renderTransaction)}

              {/* Rewards - group in accordion if more than 1, else render directly */}
              {rewards.length > 1 ? (
                <Accordion type="single" collapsible className="border border-border rounded-xl">
                  <AccordionItem value={`rewards-${dateKey}`} className="border-0">
                    <AccordionTrigger className="px-4 py-3 flex items-center gap-2">
                      <span className="text-base font-medium">
                        {rewards.length} Reward Transactions
                      </span>
                      <span className="text-sm text-foreground/40">
                        {format(new Date(dateKey), 'd MMM')}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-2 pb-4 space-y-2">
                        {rewards.map(renderTransaction)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : (
                rewards.map(renderTransaction)
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
