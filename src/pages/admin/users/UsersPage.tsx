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
  StatCard,
} from "@/components/ui-components";
import { Badge } from "@/components/ui/badge";
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

interface UserProfileData extends User {
  total_referrals: number;
  total_commissions: number;
  total_deposits: number;
  total_withdrawals: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
    description?: string;
  }>;
  kyc_details?: {
    full_name: string;
    date_of_birth: string;
    document_type: string;
    document_number: string;
    address: string;
    city: string;
    country: string;
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
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfileData | null>(null);

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

  const fetchUserProfile = async (userId: string) => {
    try {
      // Get referral network count
      const { data: referralNetwork } = await supabase
        .from('referral_relationships')
        .select('id')
        .eq('referrer_id', userId);

      const total_referrals = referralNetwork?.length || 0;

      // Get all transactions including deposits, withdrawals and other types
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          referred_user:reference_id (
            first_name,
            last_name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Get deposits and calculate total
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId);

      // Format transactions with better descriptions
      const formattedTransactions = allTransactions?.map(tx => {
        let description = tx.description;
        
        // Add referred user name for commission transactions
        if (tx.type === 'commission' && tx.referred_user) {
          const referredName = `${tx.referred_user.first_name} ${tx.referred_user.last_name}`;
          description = `Commission from ${referredName}'s investment`;
        }
        
        return {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
          created_at: tx.created_at,
          description
        };
      }) || [];

      // Add deposits to transactions array
      const depositsAsTransactions = deposits?.map(d => ({
        id: d.id,
        type: 'deposit',
        amount: d.amount,
        status: d.status,
        created_at: d.created_at,
        description: `Deposit via ${d.method}`
      })) || [];

      // Get withdrawals and calculate total
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId);

      // Add withdrawals to transactions array  
      const withdrawalsAsTransactions = withdrawals?.map(w => ({
        id: w.id,
        type: 'withdrawal',
        amount: w.amount,
        status: w.status,
        created_at: w.created_at,
        description: `Withdrawal via ${w.crypto_name} (${w.crypto_symbol})`
      })) || [];

      // Calculate totals
      const total_deposits = deposits
        ?.filter(d => d.status === 'Completed')
        .reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      const total_withdrawals = withdrawals
        ?.filter(w => w.status === 'Completed')
        .reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

      const total_commissions = allTransactions
        ?.filter(tx => (tx.type === 'commission' || tx.type === 'rank_bonus') && tx.status === 'Completed')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Combine all transactions with the formatted ones
      const combinedTransactions = [
        ...depositsAsTransactions,
        ...withdrawalsAsTransactions,
        ...formattedTransactions
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Get KYC details
      const { data: kycData } = await supabase
        .from('kyc_details')
        .select('*')
        .eq('user_id', userId)
        .single();

      const userProfile: UserProfileData = {
        ...(users.find(u => u.id === userId) as User),
        total_referrals,
        total_commissions,
        total_deposits,
        total_withdrawals,
        transactions: combinedTransactions,
        kyc_details: kycData || undefined
      };

      setSelectedUserProfile(userProfile);
      setShowProfileDialog(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
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
                  <TableCell>
                    <button
                      className="text-left hover:underline"
                      onClick={() => fetchUserProfile(user.id)}
                    >
                      {user.email}
                    </button>
                  </TableCell>
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

      {/* User Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {selectedUserProfile && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Basic Information</h3>
                  <div className="space-y-1">
                    <p><span className="text-muted-foreground">User ID:</span> {selectedUserProfile.id}</p>
                    <p><span className="text-muted-foreground">Name:</span> {selectedUserProfile.first_name} {selectedUserProfile.last_name}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedUserProfile.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">KYC Information</h3>
                  {selectedUserProfile.kyc_details ? (
                    <div className="space-y-1">
                      <p><span className="text-muted-foreground">Full Name:</span> {selectedUserProfile.kyc_details.full_name}</p>
                      <p><span className="text-muted-foreground">DOB:</span> {selectedUserProfile.kyc_details.date_of_birth}</p>
                      <p><span className="text-muted-foreground">Document:</span> {selectedUserProfile.kyc_details.document_type} ({selectedUserProfile.kyc_details.document_number})</p>
                      <p><span className="text-muted-foreground">Address:</span> {selectedUserProfile.kyc_details.address}</p>
                      <p><span className="text-muted-foreground">Location:</span> {selectedUserProfile.kyc_details.city}, {selectedUserProfile.kyc_details.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No KYC details available</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  title="Total Deposits"
                  value={`$${selectedUserProfile.total_deposits.toLocaleString()}`}
                  description="Completed deposits"
                />
                <StatCard
                  title="Total Withdrawals"
                  value={`$${selectedUserProfile.total_withdrawals.toLocaleString()}`}
                  description="Completed withdrawals"
                />
                <StatCard
                  title="Total Referrals"
                  value={selectedUserProfile.total_referrals.toString()}
                  description="Direct referrals"
                />
                <StatCard
                  title="Total Commissions"
                  value={`$${selectedUserProfile.total_commissions.toLocaleString()}`}
                  description="Earned commissions"
                />
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">All Transactions</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserProfile.transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {tx.type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.description || '-'}</TableCell>
                          <TableCell>${tx.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                tx.status.toLowerCase() === 'completed' ? 'success' : 
                                tx.status.toLowerCase() === 'pending' ? 'warning' :
                                'default'
                              }
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersPage;
