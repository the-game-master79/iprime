import React, { useState, useEffect } from "react";
import { ArrowDownUp, Download, Filter, Search, DollarSign, CreditCard, ArrowUpCircle, ArrowDownCircle, ChevronDown, Clock } from "lucide-react";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/ui-components";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'commission' | 'investment' | 'adjustment' | 'investment_closure';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  created_at: string;
  method?: string;
  user_name?: string;
  crypto_name?: string;
  crypto_symbol?: string;
}

const PaymentsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("created_at"); // Default sort by date
  const [sortOrder, setSortOrder] = useState("desc"); // Default newest first

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);

      // Fetch deposits with user names and crypto details
      const { data: deposits, error: depositsError } = await supabase
        .from('deposits')
        .select(`
          id, 
          user_id, 
          amount, 
          crypto_name,
          crypto_symbol,
          network,
          status, 
          created_at,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `);

      if (depositsError) throw depositsError;

      // Fetch plans subscriptions
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('plans_subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          amount,
          status,
          created_at,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `);

      if (subscriptionsError) throw subscriptionsError;

      // Format deposits with method derived from crypto info
      const formattedDeposits = (deposits || []).map(d => ({
        id: d.id,
        user_id: d.user_id,
        amount: d.amount,
        type: 'deposit' as const,
        status: d.status,
        created_at: d.created_at,
        method: d.crypto_name ? `${d.crypto_name} (${d.crypto_symbol})` : 'Unknown',
        user_name: d.profiles ? `${d.profiles.first_name} ${d.profiles.last_name}` : d.user_id
      }));

      // Format plan subscriptions
      const formattedSubscriptions = (subscriptions || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        amount: s.amount,
        type: 'investment' as const,
        status: s.status,
        created_at: s.created_at,
        method: 'Plan Subscription',
        user_name: s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : s.user_id
      }));

      // Combine all transactions
      const allTransactions = [
        ...formattedDeposits,
        ...formattedSubscriptions
      ];

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value === "all" ? null : value);
  };

  const handleFilterStatusChange = (value: string) => {
    setFilterStatus(value === "all" ? null : value);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.user_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType ? tx.type.toLowerCase() === filterType.toLowerCase() : true;
    const matchesStatus = filterStatus ? tx.status === filterStatus : true;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const aValue = a[sortBy as keyof Transaction];
    const bValue = b[sortBy as keyof Transaction];

    if (sortOrder === "desc") {
      return bValue > aValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setFilterType(null);
    setFilterStatus(null);
  };

  // Calculate statistics from raw data
  const totalDeposits = transactions
    .filter(tx => tx.type === 'deposit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSubscriptions = transactions
    .filter(tx => tx.type === 'investment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const pendingTransactions = transactions
    .filter(tx => tx.status === 'Pending' || tx.status === 'Processing').length;

  return (
    <AdminLayout>
      <PageHeader 
        title="Payment Management" 
        description="Monitor and manage all payment transactions"
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Transactions"
          value={transactions.length.toString()}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Total Deposits"
          value={`$${totalDeposits.toLocaleString()}`}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Total Investments"
          value={`$${totalSubscriptions.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Transactions"
          value={pendingTransactions.toString()}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Select 
              value={filterType || "all"} 
              onValueChange={handleFilterTypeChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="commission">Commissions</SelectItem>
                <SelectItem value="investment">Investments</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
                <SelectItem value="investment_closure">Investment Closures</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filterStatus || "all"} 
              onValueChange={handleFilterStatusChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            {(filterType || filterStatus) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("id")}
                  >
                    ID
                    {sortField === "id" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("userName")}
                  >
                    User
                    {sortField === "userName" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("amount")}
                  >
                    Amount
                    {sortField === "amount" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("type")}
                  >
                    Type
                    {sortField === "type" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("method")}
                  >
                    Method
                    {sortField === "method" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("date")}
                  >
                    Date
                    {sortField === "date" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    {sortField === "status" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading transactions...</TableCell>
                </TableRow>
              ) : sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No transactions found</TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.id}</TableCell>
                    <TableCell>{tx.user_name || tx.user_id}</TableCell>
                    <TableCell>${tx.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${tx.type === 'deposit' ? 'bg-green-100 text-green-800' : 
                          tx.type === 'investment' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{tx.method || '-'}</TableCell>
                    <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${tx.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          tx.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'}`}>
                        {tx.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PaymentsPage;
