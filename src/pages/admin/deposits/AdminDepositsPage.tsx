import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/pages/admin/AdminLayout";
import { ArrowDownUp, Download, Search, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader, StatCard } from "@/components/ui-components";

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  crypto_name: string;
  crypto_symbol: string;
  network: string;
  transaction_hash: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const AdminDepositsPage = () => {
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Deposit | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: "Error",
        description: "Failed to load deposits",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { data, error } = await supabase
        .rpc('approve_deposit', { deposit_id: id });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.message);
      }

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
    try {
      const { data, error } = await supabase
        .rpc('reject_deposit', { deposit_id: id });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message);
      }

      toast({
        title: "Success",
        description: "Deposit rejected successfully"
      });

      fetchDeposits();
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast({
        title: "Error",
        description: "Failed to reject deposit",
        variant: "destructive"
      });
    }
  };

  const filteredDeposits = deposits.filter(deposit =>
    deposit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deposit.crypto_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deposit.crypto_symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalDeposits = deposits.length;
  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
  const totalAmount = deposits.reduce((sum, d) => sum + d.amount, 0);
  const pendingAmount = deposits
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <AdminLayout>
      <PageHeader 
        title="Deposit Management" 
        description="Review and process user deposit requests"
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
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Deposits"
          value={pendingDeposits.toString()}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Total Amount"
          value={`$${totalAmount.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Amount"
          value={`$${pendingAmount.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
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
        </div>

        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredDeposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No deposits found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-medium">{deposit.id}</TableCell>
                    <TableCell>{deposit.user_id}</TableCell>
                    <TableCell>${deposit.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {deposit.crypto_name} ({deposit.crypto_symbol})
                    </TableCell>
                    <TableCell>{deposit.network}</TableCell>
                    <TableCell>
                      {new Date(deposit.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${deposit.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          deposit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {deposit.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(deposit.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(deposit.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
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

export default AdminDepositsPage;
