import { useState, useEffect } from "react";
import { 
  Download, Search, Receipt, Copy, DollarSign,
  ArrowUpCircle, ArrowDownCircle, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PageHeader, StatCard } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  type: string;
  method?: string;
  crypto_name?: string;
  crypto_symbol?: string;
  network?: string;
  description?: string;
  reference_id?: string;
  wallet_type?: string;
}

const Payments = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      const formattedWithdrawals = (withdrawals || []).map(w => ({
        ...w,
        type: 'withdrawal'
      }));

      const allTransactions = [
        ...txData,
        ...formattedWithdrawals
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    deposits: transactions
      .filter(tx => tx.type === 'investment' && tx.status === 'Completed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    withdrawals: transactions
      .filter(tx => tx.type === 'withdrawal' && tx.status === 'Completed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    commissions: transactions
      .filter(tx => (tx.type === 'commission' || tx.type === 'rank_bonus' || tx.type === 'investment_return') && tx.status === 'Completed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    activePlans: transactions
      .filter(tx => tx.type === 'investment' && tx.status === 'Active').length
  };

  const getTransactionType = (type: string): string => {
    const types: Record<string, string> = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      investment: 'Plan Purchase',
      commission: 'Commission',
      rank_bonus: 'Rank Bonus',
      adjustment: 'Adjustment',
      investment_return: 'Investment Returns',
      investment_closure: 'Investment Closure'
    };
    return types[type] || type;
  };

  const truncateId = (id: string) => {
    if (window.innerWidth < 640 && id.length > 8) {
      return `${id.slice(0, 8)}...`;
    }
    return id;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (tx.type === 'investment' && tx.method === 'system') return false;

    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === "all" || tx.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <div className="container max-w-7xl p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        <div>
          </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Transactions</h1>
        </div>
      </div>

      {/* Stats Grid - Existing code */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-black p-4 rounded-lg flex flex-col">
          <div className="text-4xl font-bold text-green-600 mb-2">
            ${stats.deposits.toLocaleString()}
          </div>
          <div className="text-sm font-medium">Active Plans Value</div>
        </div>

        <div className="border border-black p-4 rounded-lg flex flex-col">
          <div className="text-4xl font-bold text-red-600 mb-2">
            ${stats.withdrawals.toLocaleString()}
          </div>
          <div className="text-sm font-medium">Withdrawals</div>
        </div>

        <div className="border border-black p-4 rounded-lg flex flex-col">
          <div className="text-4xl font-bold mb-2">
            ${stats.commissions.toLocaleString()}
          </div>
          <div className="text-sm font-medium">Commissions</div>
        </div>

        <div className="border border-black p-4 rounded-lg flex flex-col">
          <div className="text-4xl font-bold mb-2">$0.00</div>
          <div className="text-sm font-medium">Trade P&L</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:justify-between sm:items-center mb-6">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search transactions..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="commission">Commissions</SelectItem>
              <SelectItem value="investment">Investments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">Loading transactions...</span>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {Object.entries(
            filteredTransactions.reduce((groups, tx) => {
              const date = new Date(tx.created_at).toLocaleDateString();
              if (!groups[date]) groups[date] = [];
              groups[date].push(tx);
              return groups;
            }, {} as Record<string, Transaction[]>)
          ).map(([date, txs]) => (
            <AccordionItem key={date} value={date} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex justify-between items-center w-full">
                  <span className="font-medium">{formatDate(date)}</span>
                  <Badge variant="secondary" className="ml-auto mr-4 text-xs">
                    {txs.length} Transactions
                  </Badge>
                </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {txs.map((tx) => (
                      <div key={tx.id} className="relative bg-white border rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground hidden sm:block">{tx.id}</span>
                            <span className="text-sm font-medium text-muted-foreground sm:hidden">{truncateId(tx.id)}</span>
                            <div className={`h-2.5 w-2.5 rounded-full ${
                              tx.status === 'Completed' ? 'bg-green-500' : 
                              tx.status === 'Pending' ? 'bg-yellow-500' : 
                              tx.status === 'Processing' ? 'bg-blue-500' : 
                              'bg-red-500'
                            }`} />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-background"
                              onClick={() => handleCopyId(tx.id)}
                            >
                              <Copy className="h-3 w-3" />
                              <span className="sr-only">Copy ID</span>
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-2xl font-semibold ${
                              tx.type === 'deposit' || tx.type === 'commission' || tx.type === 'investment_return' 
                                ? 'text-green-600' 
                                : tx.type === 'withdrawal' || tx.type === 'investment' 
                                ? 'text-red-600' 
                                : 'text-blue-600'
                            }`}>
                              ${tx.amount.toLocaleString()}
                            </span>
                            <Badge 
                              variant={
                                tx.type === 'deposit' ? 'default' :
                                tx.type === 'withdrawal' ? 'secondary' :
                                tx.type === 'commission' ? 'outline' :
                                'secondary'
                              }
                              className="font-normal"
                            >
                              {getTransactionType(tx.type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default Payments;
