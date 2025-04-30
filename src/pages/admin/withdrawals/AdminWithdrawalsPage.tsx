import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowDownUp, ChevronDown, CheckSquare, XSquare, Search } from "lucide-react";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
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

const ITEMS_PER_PAGE = 10;

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  crypto_name: string; 
  crypto_symbol: string;
  network: string;
  wallet_address: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  created_at: string;
  user_email: string; // Changed from nested object to direct string
}

const AdminWithdrawalsPage = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles!withdrawals_user_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const withdrawalsWithEmail = data?.map(w => ({
        ...w,
        user_email: w.profiles.email || 'N/A' // Map the email directly
      })) || [];

      setWithdrawals(withdrawalsWithEmail);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to load withdrawals",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics from real data
  const totalWithdrawals = withdrawals.length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "Pending").length;
  const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const pendingAmount = withdrawals
    .filter(w => w.status === "Pending")
    .reduce((sum, w) => sum + w.amount, 0);

  // Memoize filtered withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((withdrawal) => {
      const matchesSearch = 
        withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.crypto_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.wallet_address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus ? withdrawal.status === filterStatus : true;
      
      return matchesSearch && matchesStatus;
    });
  }, [withdrawals, searchTerm, filterStatus]);

  // Memoize sort handler
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  const handleApprove = async (id: string) => {
    try {
      // First get withdrawal details
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Then get user's profile data separately
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', withdrawal.user_id)
        .single();

      if (profileError) throw profileError;

      // Check if user has sufficient balance
      if (!profile?.withdrawal_wallet || profile.withdrawal_wallet < withdrawal.amount) {
        toast({
          title: "Error",
          description: "User has insufficient balance for this withdrawal",
          variant: "destructive"
        });
        return;
      }

      // Update status - the trigger will handle the balance update
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'Completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: "Withdrawal Approved",
        description: `Withdrawal ${id} has been approved and user has been notified.`,
      });

      fetchWithdrawals(); // Refresh data
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to approve withdrawal",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'Failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Withdrawal Rejected",
        description: `Withdrawal ${id} has been rejected and user has been notified.`,
        variant: "destructive",
      });

      fetchWithdrawals(); // Refresh data
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "Error", 
        description: "Failed to reject withdrawal",
        variant: "destructive"
      });
    }
  };

  // Sort withdrawals
  const sortedWithdrawals = [...filteredWithdrawals].sort((a, b) => {
    if (!sortField) return 0;
    
    const fieldA = a[sortField as keyof typeof a];
    const fieldB = b[sortField as keyof typeof b];
    
    if (fieldA < fieldB) return sortDirection === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Modify sortedWithdrawals to include pagination
  const paginatedWithdrawals = sortedWithdrawals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(sortedWithdrawals.length / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setFilterStatus(null);
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Withdrawal Management" 
        description="Review and process user withdrawal requests"
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Withdrawals"
          value={totalWithdrawals.toString()}
        />
        <StatCard
          title="Pending Requests"
          value={pendingWithdrawals.toString()}
        />
        <StatCard
          title="Total Amount"
          value={`$${totalAmount.toLocaleString()}`}
        />
        <StatCard
          title="Pending Amount"
          value={`$${pendingAmount.toLocaleString()}`}
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search withdrawals..."
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
                  Date {sortField === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("amount")}>
                  Amount {sortField === "amount" && (sortField === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("status")}>
                  Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("crypto_name")}>
                  Method {sortField === "crypto_name" && (sortDirection === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {filterStatus && (
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
                <TableHead>Email</TableHead> {/* Add new column */}
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Wallet Address</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell className="font-medium">{withdrawal.id}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {withdrawal.user_email}
                    </span>
                  </TableCell>
                  <TableCell>${withdrawal.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <span className="rounded-md px-2 py-1 text-xs font-medium w-fit bg-gray-100 text-gray-800">
                        {withdrawal.crypto_name} ({withdrawal.crypto_symbol}) • {withdrawal.network}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs truncate max-w-[200px]" title={withdrawal.wallet_address}>
                      {withdrawal.wallet_address}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(withdrawal.created_at).toLocaleString('en-US', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                      ${withdrawal.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        withdrawal.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                        withdrawal.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'}`}>
                      {withdrawal.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {withdrawal.status === "Pending" && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-green-500"
                            onClick={() => handleApprove(withdrawal.id)}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleReject(withdrawal.id)}
                          >
                            <XSquare className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedWithdrawals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {isLoading ? "Loading..." : "No withdrawal requests found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && sortedWithdrawals.length > 0 && (
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
    </AdminLayout>
  );
};

export default AdminWithdrawalsPage;
