import { useState, useEffect } from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'commission' | 'subscription' | 'adjustment' | 'investment_closure';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'cancelled' | 'approved' | 'rejected';
  created_at: string;
  method?: string;
  user_name?: string;
  crypto_name?: string;
  crypto_symbol?: string;
  email?: string;
}

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);

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
        user_name: d.profiles ? `${d.profiles.first_name} ${d.profiles.last_name}` : d.user_id,
        email: d.profiles?.email
      }));

      // Format plan subscriptions
      const formattedSubscriptions = (subscriptions || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        amount: s.amount,
        type: 'subscription' as const, // Changed from 'investment'
        status: s.status,
        created_at: s.created_at,
        method: 'Compute Subscription',
        user_name: s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : s.user_id,
        email: s.profiles?.email
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
    const matchesStatus = filterStatus ? 
      (tx.status.toLowerCase() === filterStatus.toLowerCase() || 
       (filterStatus.toLowerCase() === 'completed' && tx.status.toLowerCase() === 'approved') ||
       (filterStatus.toLowerCase() === 'failed' && tx.status.toLowerCase() === 'rejected')
      ) : true;
    
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

  // Paginate transactions
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
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
    .filter(tx => tx.type === 'subscription')
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
        />
        <StatCard
          title="Total Deposits"
          value={`$${totalDeposits.toLocaleString()}`}
        />
        <StatCard
          title="Total Investments"
          value={`$${totalSubscriptions.toLocaleString()}`}
        />
        <StatCard
          title="Pending Transactions"
          value={pendingTransactions.toString()}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort By <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleSort("created_at")}>
                  Date {sortBy === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("amount")}>
                  Amount {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("status")}>
                  Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("type")}>
                  Type {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                <TableHead>ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type & Method</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading transactions...</TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No transactions found</TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.id}</TableCell>
                    <TableCell>{tx.email || 'N/A'}</TableCell>
                    <TableCell className="font-bold">${tx.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium w-fit
                          ${tx.type === 'deposit' ? 'bg-green-100 text-green-800' : 
                            tx.type === 'subscription' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}`}>
                          {tx.type === 'subscription' ? 'Subscription' : tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          {tx.method && ` • ${tx.method}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(tx.created_at).toLocaleString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${tx.status === 'Completed' || tx.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          tx.status === 'Processing' || tx.status === 'cancelled' ? 'bg-blue-100 text-blue-800' :
                          tx.status === 'Failed' || tx.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {tx.status === 'approved' ? 'Completed' : 
                         tx.status === 'rejected' ? 'Failed' :
                         tx.status === 'cancelled' ? 'Cancelled' :
                         tx.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!isLoading && sortedTransactions.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    {currentPage > 1 && (
                      <PaginationPrevious 
                        onClick={() => handlePageChange(currentPage - 1)}
                      />
                    )}
                  </PaginationItem>
                  {/* Page numbers here if needed */}
                  <PaginationItem>
                    {currentPage !== totalPages && (
                      <PaginationNext 
                        onClick={() => handlePageChange(currentPage + 1)}
                      />
                    )}
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default PaymentsPage;
