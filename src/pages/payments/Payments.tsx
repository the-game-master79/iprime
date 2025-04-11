import { useState, useEffect } from "react";
import { 
  Download, Search, Receipt, CreditCard, Copy, DollarSign,
  ArrowUpCircle, ArrowDownCircle
} from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
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

  return (
    <ShellLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Transactions" 
          description="View and manage your payment history"
          action={
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export History
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Invested"
            value={`$${stats.deposits.toLocaleString()}`}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            description="Total investment deposits"
          />
          <StatCard
            title="Total Withdrawn"
            value={`$${stats.withdrawals.toLocaleString()}`}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            description="Completed withdrawals"
          />
          <StatCard
            title="Commission Earned"
            value={`$${stats.commissions.toLocaleString()}`}
            icon={<DollarSign className="h-4 w-4" />}
            description="Total referral earnings"
          />
          <StatCard
            title="Active Plans"
            value={stats.activePlans || "0"}
            icon={<Receipt className="h-4 w-4" />}
            description="Current investments"
          />
        </div>

        <Card>
          <CardHeader className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search transactions..."
                  className="pl-8 w-full md:w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
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
                  <SelectTrigger className="w-[130px]">
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
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Transaction ID</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="text-muted-foreground">Loading transactions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tx.id}</span>
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
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {getTransactionType(tx.type)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className={`text-${
                            tx.type === 'deposit' || tx.type === 'commission' || tx.type === 'investment_return' ? 'green' : 
                            tx.type === 'withdrawal' || tx.type === 'investment' ? 'red' : 
                            'blue'}-600`}>
                            ${tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                            ${tx.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                              tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                              tx.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ShellLayout>
  );
};

export default Payments;
