import React, { useState, useEffect } from "react";
import { ArrowDownUp, Download, PlusCircle, Search, Eye, Copy, CreditCard, Check, XCircle } from "lucide-react"; "lucide-react";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
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
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface KycDocument {
  name: string;
  created_at: string;
  publicUrl: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  date_joined: string;
  kyc_status: string;
  balance: number;
  kyc_documents?: {
    document_front?: string;
    document_back?: string;
    recent_uploads?: KycDocument[];
  };
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortField, setSortField] = useState("date_joined");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [newBalance, setNewBalance] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        status,
        date_joined,
        kyc_status,
        balance
      `);

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    // Fetch recent KYC documents for each user
    const usersWithDocs = await Promise.all(
      data.map(async (user) => {
        const { data: files } = await supabase.storage
          .from('kyc_documents')
          .list(user.id, {
            limit: 2,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        const recent_uploads = await Promise.all(
          (files || []).map(async (file) => {
            const { data: { publicUrl } } = supabase.storage
              .from('kyc_documents')
              .getPublicUrl(`${user.id}/${file.name}`);

            return {
              name: file.name,
              created_at: file.created_at,
              publicUrl
            };
          })
        );

        return {
          ...user,
          kyc_documents: {
            recent_uploads
          }
        };
      })
    );

    setUsers(usersWithDocs || []);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
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

  const previewDocument = async (path: string) => {
    try {
      const { data } = await supabase.storage
        .from('kyc_documents')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error creating signed URL:', error);
    }
  };

  const handleKycStatus = async (userId: string, status: 'completed' | 'rejected') => {
    try {
      // Update profile KYC status - this will trigger the notification
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: `KYC ${status === 'completed' ? 'approved' : 'rejected'} successfully`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC status",
        variant: "destructive"
      });
    }
  };

  const handleEditBalance = async () => {
    if (!selectedUser || !newBalance) return;

    try {
      const newBalanceNum = parseFloat(newBalance);
      const difference = newBalanceNum - selectedUser.balance;
      
      // Update user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalanceNum })
        .eq('id', selectedUser.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: selectedUser.id,
          amount: Math.abs(difference),
          type: 'adjustment',
          status: 'Completed',
          description: `Manual balance ${difference >= 0 ? 'increase' : 'decrease'} by admin`,
        });

      if (transactionError) throw transactionError;

      await fetchUsers();
      setIsBalanceDialogOpen(false);
      toast({
        title: "Balance Updated",
        description: `Balance has been updated successfully`,
      });
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: "Error",
        description: "Failed to update balance",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "ID has been copied to clipboard",
    });
  };

  const handleCreditReturns = async (userId: string) => {
    try {
      // Show processing toast
      const loadingToast = toast({
        title: "Processing Returns",
        description: "Crediting investment returns...",
      });

      // Call the credit_investment_returns function
      const { data, error } = await supabase.rpc('credit_investment_returns', { 
        p_user_id: userId 
      });
      
      if (error) throw error;

      const [result] = data || [{ total_credited: 0, transactions_count: 0 }];

      // Fetch updated user data
      const { data: updatedUser, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Update users list with new balance
      setUsers(users.map(user => 
        user.id === userId ? { ...user, balance: updatedUser.balance } : user
      ));

      // Dismiss loading toast and show success
      toast({
        title: "Returns Credited Successfully",
        description: `Credited $${result.total_credited.toFixed(2)} across ${result.transactions_count} investments.`,
        variant: "success",
      });

    } catch (error) {
      console.error('Error crediting returns:', error);
      toast({
        title: "Error",
        description: "Failed to credit investment returns",
        variant: "destructive"
      });
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === "active").length;

  return (
    <AdminLayout>
      <PageHeader 
        title="User Management" 
        description="Manage and monitor user accounts"
        action={
          <Button className="gap-1">
            <PlusCircle className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <StatCard
          title="Total Users"
          value={totalUsers.toString()}
          description="All registered users"
        />
        <StatCard
          title="Active Users"
          value={activeUsers.toString()}
          description="Currently active users"
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="flex gap-1 whitespace-nowrap">
            <Download className="h-4 w-4" />
            Export Users
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("first_name")}
                  >
                    Name
                    {sortField === "first_name" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("email")}
                  >
                    Email
                    {sortField === "email" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("kyc_status")}
                  >
                    KYC Status
                    {sortField === "kyc_status" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>KYC Documents</TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("date_joined")}
                  >
                    Date Joined
                    {sortField === "date_joined" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.id}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(user.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                      ${user.kyc_status === 'completed' ? 'bg-green-100 text-green-800' : 
                        user.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {user.kyc_status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.kyc_documents?.recent_uploads && (
                      <div className="space-y-2">
                        {user.kyc_documents.recent_uploads.map((doc, index) => (
                          <div key={doc.name} className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => previewDocument(`${user.id}/${doc.name}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {doc.name.includes('front') ? 'Front' : 'Back'}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(user.kyc_status === 'pending' || user.kyc_status === 'processing') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500"
                            onClick={() => handleKycStatus(user.id, 'completed')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve KYC
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleKycStatus(user.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject KYC
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewBalance(user.balance.toString());
                          setIsBalanceDialogOpen(true);
                        }}
                      >
                        Edit Balances
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCreditReturns(user.id)}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Credit Returns
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Balance</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">User</label>
                <p className="text-sm text-muted-foreground">
                  {selectedUser?.first_name} {selectedUser?.last_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Current Balance</label>
                <p className="text-sm text-muted-foreground">
                  ${selectedUser?.balance.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">New Balance</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="Enter new balance"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBalanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditBalance}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersPage;
