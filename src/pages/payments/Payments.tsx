import { useState, useEffect } from "react";
import { Download, Filter, Search, Receipt, CreditCard, Copy } from "lucide-react";
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
  method?: string;
  crypto_name?: string;
  crypto_symbol?: string;
  type?: 'investment' | 'commission' | 'adjustment' | 'investment_return' | 'rank_bonus';
  description?: string;
}

const Payments = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Transaction[]>([]);
  const [commissions, setCommissions] = useState<Transaction[]>([]);
  const [adjustments, setAdjustments] = useState<Transaction[]>([]);
  const [investmentReturns, setInvestmentReturns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rankBonusData, setRankBonusData] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch transactions including commissions, adjustments, and investment returns
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['commission', 'adjustment', 'investment_return', 'rank_bonus'])
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Split transactions by type
      const commissionsData = transactionsData?.filter(tx => tx.type === 'commission') || [];
      const adjustmentsData = transactionsData?.filter(tx => tx.type === 'adjustment') || [];
      const investmentReturnsData = transactionsData?.filter(tx => tx.type === 'investment_return') || [];
      const rankBonusData = transactionsData?.filter(tx => tx.type === 'rank_bonus') || [];

      // Rest of your existing fetch calls
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (depositsError) throw depositsError;

      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (investmentsError) throw investmentsError;

      // Transform investment data
      const investmentTransactions = (investmentsData || []).map(inv => ({
        ...inv,
        type: 'investment' as const,
      }));

      setDeposits(depositsData || []);
      setWithdrawals(withdrawalsData || []);
      setInvestments(investmentTransactions);
      setCommissions(commissionsData);
      setInvestmentReturns(investmentReturnsData);
      setRankBonusData(rankBonusData);
      setInvestmentReturns(investmentReturnsData);

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

  // Combine and filter transactions based on search and filters
  const filteredTransactions = [...deposits, ...withdrawals, ...investments, ...commissions, 
    ...adjustments, ...investmentReturns, ...rankBonusData]
    .filter(tx => {
      const isDeposit = 'method' in tx && !tx.type; // Updated condition
      const isInvestment = tx.type === 'investment';
      const isCommission = tx.type === 'commission';
      const isAdjustment = tx.type === 'adjustment';
      const isInvestmentReturn = tx.type === 'investment_return';
      const isRankBonus = tx.type === 'rank_bonus';
      const type = isDeposit ? 'Deposit' : 
                  isInvestment ? 'Investment' : 
                  isCommission ? 'Commission' :
                  isAdjustment ? 'Adjustment' :
                  isInvestmentReturn ? 'Investment Return' :
                  isRankBonus ? 'Rank Bonus' : 'Withdrawal';
      
      const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || tx.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesType = typeFilter === "all" || type.toLowerCase() === typeFilter.toLowerCase();
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  // Calculate statistics
  const totalDeposits = deposits
    .filter(d => d.status === 'Completed')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalWithdrawals = withdrawals
    .filter(w => w.status === 'Completed')
    .reduce((sum, w) => sum + w.amount, 0);

  const totalCommissions = commissions
    .filter(c => c.status === 'Completed')
    .reduce((sum, c) => sum + c.amount, 0);

  const pendingTransactions = [...deposits, ...withdrawals]
    .filter(tx => tx.status === 'Pending').length;

  const getTransactionType = (tx: Transaction) => {
    if ('method' in tx && !tx.type) return 'Deposit'; // Updated condition
    switch (tx.type) {
      case 'investment': return 'Investment';
      case 'commission': return 'Commission';
      case 'adjustment': return 'Adjustment';
      case 'investment_return': return 'Investment Return';
      case 'rank_bonus': return 'Rank Bonus';
      default: return 'Withdrawal';
    }
  };

  const getAmountClass = (tx: Transaction) => {
    if ('method' in tx || tx.type === 'commission' || tx.type === 'investment_return' || 
        (tx.type === 'adjustment' && tx.amount > 0)) {
      return "text-green-600";
    }
    return tx.type === 'investment' ? "text-blue-600" : "text-red-500";
  };

  return (
    <ShellLayout>
      <PageHeader 
        title="Payments & Transactions" 
        description="View your transaction history and payment details"
      />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <StatCard
          title="Total Deposits"
          value={`$${totalDeposits.toLocaleString()}`}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Total Withdrawals"
          value={`$${totalWithdrawals.toLocaleString()}`}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Transactions"
          value={pendingTransactions.toString()}
          icon={<Filter className="h-4 w-4" />}
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
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Method</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-4 w-[250px] bg-muted/60 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">No transactions found</td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isDeposit = 'method' in tx && !tx.type;
                    const isCommission = tx.type === 'commission';
                    const isAdjustment = tx.type === 'adjustment';
                    const isInvestmentReturn = tx.type === 'investment_return';
                    const method = isDeposit ? tx.method : 
                                 isCommission ? 'Commission' :
                                 isAdjustment ? 'Balance Adjustment' :
                                 tx.type === 'investment' ? 'Deduction for Package Purchase' :
                                 isInvestmentReturn ? 
                                   tx.description?.replace(/Daily return from \$(\d+)\.?\d* investment at (\d+\.?\d*)% rate/, 
                                     'Daily credit on Basic Plan for $$$1 at $2% rate') || 'Investment Credit' :
                                 `${tx.crypto_name} (${tx.crypto_symbol})`;
                    
                    return (
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
                          {getTransactionType(tx)}
                        </td>
                        <td className="p-4 align-middle">{method}</td>
                        <td className="p-4 align-middle font-medium">
                          <span className={getAmountClass(tx)}>
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
                    );
                  })
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
