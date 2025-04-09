import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowDownUp, CheckSquare, Download, Search, XSquare, DollarSign, Clock, CheckCircle } from "lucide-react";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

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
}

const AdminWithdrawalsPage = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
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
      // Get withdrawal details first
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update withdrawal status - this will trigger notifications
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

      fetchWithdrawals();
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

  const clearFilters = () => {
    setFilterStatus(null);
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Withdrawal Management" 
        description="Review and process user withdrawal requests"
        action={
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            Export Withdrawals
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Withdrawals"
          value={totalWithdrawals.toString()}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Requests"
          value={pendingWithdrawals.toString()}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          title="Total Amount"
          value={`$${totalAmount.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Amount"
          value={`$${pendingAmount.toLocaleString()}`}
          icon={<CheckCircle className="h-4 w-4" />}
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
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filterStatus === "Pending" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterStatus(filterStatus === "Pending" ? null : "Pending")}
            >
              Pending
            </Button>
            <Button 
              variant={filterStatus === "Completed" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterStatus(filterStatus === "Completed" ? null : "Completed")}
            >
              Completed
            </Button>
            <Button 
              variant={filterStatus === "Failed" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFilterStatus(filterStatus === "Failed" ? null : "Failed")}
            >
              Failed
            </Button>
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
                    onClick={() => handleSort("user_id")}
                  >
                    User
                    {sortField === "user_id" && (
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
                    onClick={() => handleSort("crypto_name")}
                  >
                    Method
                    {sortField === "crypto_name" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("wallet_address")}
                  >
                    Wallet Address
                    {sortField === "wallet_address" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("created_at")}
                  >
                    Date
                    {sortField === "created_at" && (
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell className="font-medium">{withdrawal.id}</TableCell>
                  <TableCell>{withdrawal.user_id}</TableCell>
                  <TableCell>${withdrawal.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {withdrawal.crypto_name} ({withdrawal.crypto_symbol})
                    <div className="text-xs text-muted-foreground">
                      Network: {withdrawal.network}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs truncate max-w-[200px]" title={withdrawal.wallet_address}>
                      {withdrawal.wallet_address}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
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
                            size="sm" 
                            className="text-green-500"
                            onClick={() => handleApprove(withdrawal.id)}
                          >
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500"
                            onClick={() => handleReject(withdrawal.id)}
                          >
                            <XSquare className="h-4 w-4 mr-1" />
                            Reject
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
      </div>
    </AdminLayout>
  );
};

export default AdminWithdrawalsPage;
