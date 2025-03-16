import React, { useState, useEffect } from "react";
import { ArrowDownUp, Check, Download, Search, XCircle, DollarSign, CreditCard, Clock, ArrowDownCircle } from "lucide-react";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  PageHeader,
  StatCard
} from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Deposit {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  method: string;
  status: "Pending" | "Completed" | "Failed";
  created_at: string;
}

const DepositsPage = () => {
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deposits:', error);
        toast({
          title: "Error",
          description: "Failed to fetch deposits. " + error.message,
          variant: "destructive"
        });
        return;
      }

      if (data) {
        // Format the dates for display
        const formattedDeposits = data.map(deposit => ({
          ...deposit,
          created_at: new Date(deposit.created_at).toLocaleDateString()
        }));
        setDeposits(formattedDeposits);
      }
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // Get deposit details first
      const { data: deposit, error: fetchError } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update the deposit status only - the trigger will handle balance update
      const { error: depositError } = await supabase
        .from('deposits')
        .update({ 
          status: 'Completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (depositError) throw depositError;

      toast({
        title: "Success",
        description: "Deposit approved successfully"
      });
      
      fetchDeposits();
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast({
        title: "Error",
        description: "Failed to approve deposit",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('deposits')
      .update({ 
        status: 'Failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error rejecting deposit:', error);
      toast({
        title: "Error",
        description: `Failed to reject deposit: ${error.message}`,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Deposit rejected successfully"
    });
    
    fetchDeposits();
  };

  // Calculate statistics from real data
  const totalDeposits = deposits.length;
  const pendingDeposits = deposits.filter(d => d.status === "Pending").length;
  const totalAmount = deposits
    .filter(d => d.status === "Completed")
    .reduce((sum, d) => sum + d.amount, 0);
  const pendingAmount = deposits
    .filter(d => d.status === "Pending")
    .reduce((sum, d) => sum + d.amount, 0);

  // Filter deposits
  const filteredDeposits = deposits.filter(
    (deposit) => {
      // Search filter
      const matchesSearch = 
        deposit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.user_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = filterStatus ? deposit.status === filterStatus : true;
      
      // Method filter
      const matchesMethod = filterMethod ? deposit.method === filterMethod : true;
      
      return matchesSearch && matchesStatus && matchesMethod;
    }
  );

  // Sort deposits
  const sortedDeposits = [...filteredDeposits].sort((a, b) => {
    if (!sortField) return 0;
    
    const fieldA = a[sortField as keyof typeof a];
    const fieldB = b[sortField as keyof typeof b];
    
    if (fieldA < fieldB) return sortDirection === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortDirection === "asc" ? 1 : -1;
    return 0;
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
    setFilterStatus(null);
    setFilterMethod(null);
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Deposit Management" 
        description="Review and process user deposit transactions"
        action={
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            Export Deposits
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Deposits"
          value={totalDeposits.toString()}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Verification"
          value={pendingDeposits.toString()}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          title="Verified Amount"
          value={`$${totalAmount.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Amount"
          value={`$${pendingAmount.toLocaleString()}`}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deposits..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
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
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={filterMethod === "Credit Card" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setFilterMethod(filterMethod === "Credit Card" ? null : "Credit Card")}
              >
                Credit Card
              </Button>
              <Button 
                variant={filterMethod === "Bank Transfer" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setFilterMethod(filterMethod === "Bank Transfer" ? null : "Bank Transfer")}
              >
                Bank Transfer
              </Button>
              <Button 
                variant={filterMethod === "PayPal" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setFilterMethod(filterMethod === "PayPal" ? null : "PayPal")}
              >
                PayPal
              </Button>
            </div>
            {(filterStatus || filterMethod) && (
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
                    onClick={() => handleSort("user_name")}
                  >
                    User
                    {sortField === "user_name" && (
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
              {sortedDeposits.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell className="font-medium">{deposit.id}</TableCell>
                  <TableCell>{deposit.user_name}</TableCell>
                  <TableCell>${deposit.amount.toLocaleString()}</TableCell>
                  <TableCell>{deposit.method}</TableCell>
                  <TableCell>{deposit.created_at}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                      ${deposit.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        deposit.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}`}>
                      {deposit.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">View</Button>
                      {deposit.status === "Pending" && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-500"
                            onClick={() => handleApprove(deposit.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500"
                            onClick={() => handleReject(deposit.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DepositsPage;
