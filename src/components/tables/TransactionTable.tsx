import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onCopyId: (id: string) => void;
}

export function TransactionTable({ transactions, onCopyId }: TransactionTableProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Processing':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  const getTypeVariant = (type: string) => {
    if (type === 'rank_bonus') {
      return 'border-purple-200 bg-purple-50 text-purple-700';
    }
    if (type === 'deposit' || type === 'commission' || type === 'investment_return') {
      return 'border-green-200 bg-green-50 text-green-700';
    }
    if (type === 'withdrawal' || type === 'investment') {
      return 'border-red-200 bg-red-50 text-red-700';
    }
    return 'border-gray-200 bg-gray-50 text-gray-700';
  };

  const getTypeLabel = (type: string) => {
    if (type === 'rank_bonus') {
      return 'Rank Bonus';
    }
    if (type === 'investment_return') {
      return 'Reward';
    }
    return type.replace(/_/g, ' ');
  };

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/40">
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Date</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Transaction</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Amount</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow 
              key={tx.id} 
              className="group hover:bg-muted/50 transition-colors"
            >
              <TableCell className="py-4 align-top">
                <div className="text-sm font-medium">
                  {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(tx.created_at), 'hh:mm a')}
                </div>
              </TableCell>
              <TableCell className="py-4 align-top">
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className={cn("w-fit capitalize text-xs", getTypeVariant(tx.type))}>
                    {getTypeLabel(tx.type)}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{tx.id.slice(0, 12)}...</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onCopyId(tx.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell py-4 align-top">
                <Badge variant={getTypeVariant(tx.type)} className="font-mono">
                  {tx.type.startsWith('withdrawal') ? '-' : '+'}${tx.amount.toLocaleString()}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell py-4 align-top">
                <Badge variant={getStatusVariant(tx.status)} className="capitalize">
                  {tx.status}
                </Badge>
              </TableCell>
              {/* Mobile: Combined Amount & Status */}
              <TableCell className="md:hidden py-4 align-top">
                <div className="space-y-2">
                  <Badge variant={getTypeVariant(tx.type)} className="font-mono">
                    {tx.type.startsWith('withdrawal') ? '-' : '+'}${tx.amount.toLocaleString()}
                  </Badge>
                  <div>
                    <Badge variant={getStatusVariant(tx.status)} className="capitalize">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
