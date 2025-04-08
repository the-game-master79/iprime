import { useState, useEffect } from "react";
import { Download, Filter, Search, Receipt, CreditCard, Copy, DollarSign } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      // Fetch all transactions including deposits
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // Fetch withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Format withdrawals as transactions
      const formattedWithdrawals = (withdrawals || []).map(w => ({
        ...w,
        type: 'withdrawal'
      }));

      // Combine all transactions
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

  // Calculate statistics
  const stats = {
    deposits: transactions
      .filter(tx => tx.type === 'investment' && tx.status === 'Completed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    withdrawals: transactions
      .filter(tx => tx.type === 'withdrawal' && tx.status === 'Completed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    commissions: transactions
      .filter(tx => (tx.type === 'commission' || tx.type === 'rank_bonus' || tx.type === 'investment_return') && tx.status === 'Completed')
      .reduce((sum, tx) => sum + tx.amount, 0)
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
    // Skip system investment entries
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
      <PageHeader 
        title="Payments & Transactions" 
        description="View your transaction history and payment details"
      />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <StatCard
          title="Total Invested"
          value={`$${stats.deposits.toLocaleString()}`}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Total Withdrawals"
          value={`$${stats.withdrawals.toLocaleString()}`}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          title="Total Commissions"
          value={`$${stats.commissions.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search transactions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="investment">Investments</option>
                <option value="commission">Commissions</option>
                <option value="adjustment">Adjustments</option>
                <option value="rank_bonus">Rank Bonuses</option>
                <option value="investment_return">Investment Returns</option>
                <option value="investment_closure">Investment Closures</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-4 w-[250px] bg-muted/60 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">No transactions found</td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle">
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
                      <td className="p-4 align-middle text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 align-middle">
                        {getTransactionType(tx.type)}
                      </td>
                      <td className="p-4 align-middle font-medium">
                        <span className={`text-${
                          tx.type === 'deposit' || tx.type === 'commission' || tx.type === 'investment_return' ? 'green' : 
                          tx.type === 'withdrawal' || tx.type === 'investment' ? 'red' : 
                          'blue'}-600`}>
                          ${tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
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
    </ShellLayout>
  );
};

export default Payments;
