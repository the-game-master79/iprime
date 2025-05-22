import { useState, useEffect } from "react";
import { 
  Crown,
  DownloadSimple,
  PlusCircle,
  MagnifyingGlass,
  Eye,
  Copy,
  Check,
  XCircle,
  CurrencyDollar
} from "@phosphor-icons/react"; 
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface KycDocument {
  name: string;
  created_at: string;
  publicUrl: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  status: string;
  date_joined: string;
  kyc_status: 'processing' | 'completed' | 'rejected' | 'pending';
  withdrawal_wallet: number;
  role: string;  // Changed from is_admin to role
}

interface UserProfileData extends User {
  total_referrals: number;
  total_commissions: number;
  total_deposits: number;
  total_withdrawals: number;
  total_plans_amount: number; // Add this new field
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
    description?: string;
  }>;
  kyc_details?: {
    id: string;
    full_name: string;
    date_of_birth: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    document_type: string;
    document_number: string;
    document_front: string;
    document_back: string;
    occupation: string;
    status: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
  };
  plans: Array<{
    id: string;
    amount: number;
    status: string;
    plans: {  // Changed from single object to nested object to match DB structure
      name: string;
      duration_days: number;
    };
    total_earnings: number;
    created_at: string;
  }>;
}

interface TabsState {
  activeTab: string;
}

const ITEMS_PER_PAGE = 10;

const DocumentPreview = ({ url }: { url: string }) => {
  if (!url) return null;

  const fileExtension = url.split('.').pop()?.toLowerCase();
  const isPDF = fileExtension === 'pdf';

  return (
    <div className="rounded-lg border overflow-hidden bg-white">
      {isPDF ? (
        <div className="h-[300px]">
          <iframe src={url} className="w-full h-full" />
        </div>
      ) : (
        <div className="aspect-[3/2] relative group">
          <img src={url} alt="Document" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(url, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [activeTab, setActiveTab] = useState<TabsState["activeTab"]>("overview");
  const [displayedTransactions, setDisplayedTransactions] = useState<number>(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [transactionType, setTransactionType] = useState('all');
  const [transactionStatus, setTransactionStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersWithPlans, setUsersWithPlans] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (currentUser) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get all users with their basic info
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          status,
          date_joined,
          kyc_status,
          withdrawal_wallet,
          role
        `);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Get users who have active plan subscriptions
      const { data: subscriptions } = await supabase
        .from('plans_subscriptions')
        .select('user_id')
        .eq('status', 'approved');

      // Create a Set of user IDs who have plans
      const usersWithSubscriptions = new Set(
        subscriptions?.map(sub => sub.user_id) || []
      );

      setUsersWithPlans(usersWithSubscriptions);
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Update totalPages calculation based on filtered results
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Apply pagination after filtering and sorting
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Pagination logic
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
        variant: "destructive",
      });
    }
  };

  const handleEditBalance = async () => {
    if (!selectedUser || !newBalance) return;

    try {
      const newBalanceNum = parseFloat(newBalance);
      
      // Update user wallet balance in profiles table
      const { data, error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          withdrawal_wallet: newBalanceNum,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id)
        .select()
        .single();

      if (balanceError) throw balanceError;

      // Update local state with the returned data
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? { ...user, withdrawal_wallet: newBalanceNum }
            : user
        )
      );

      // Also update selectedUserProfile if it exists and matches the current user
      if (selectedUserProfile && selectedUserProfile.id === selectedUser.id) {
        setSelectedUserProfile(prev => prev ? {
          ...prev,
          withdrawal_wallet: newBalanceNum
        } : null);
      }

      setIsBalanceDialogOpen(false);
      toast({
        title: "Balance Updated",
        description: `Withdrawal wallet balance has been updated to $${newBalanceNum.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: "Error",
        description: "Failed to update balance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreditReturns = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('credit_user_plan_returns', {
        user_id_param: userId
      });

      if (error) throw error;
      await fetchUsers();
      toast({
        title: "Returns Credited",
        description: `Credited $${data.total_credited.toFixed(2)} from ${data.plans_credited} plans`,
      });
    } catch (error) {
      console.error('Error crediting returns:', error);
      toast({
        title: "Error",
        description: "Failed to credit returns",
        variant: "destructive",
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

  const fetchUserProfile = async (userId: string) => {
    try {
      // Get referral network count
      const { data: referralNetwork } = await supabase
        .from('referral_relationships')
        .select('id')
        .eq('referrer_id', userId);

      const total_referrals = referralNetwork?.length || 0;

      // Get all transactions without invalid join
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('*')
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
        let status = tx.status;
        
        // Standardize status text
        if (status === 'approved') status = 'Completed';
        if (status === 'rejected') status = 'Failed';
        
        // Use transaction description directly
        if (!description) {
          switch (tx.type) {
            case 'commission':
              description = 'Commission from investment';
              break;
            case 'investment':
              description = 'Investment in plan';
              break;
            case 'investment_return':
              description = 'Investment return credited';
              break;
            default:
              description = tx.type.replace(/_/g, ' ');
          }
        }
        
        return {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          status,
          created_at: tx.created_at,
          description
        };
      }) || [];

      // Add deposits to transactions array
      const depositsAsTransactions = deposits?.map(d => ({
        id: d.id,
        type: 'deposit',
        amount: d.amount,
        status: d.status === 'approved' ? 'Completed' : 
               d.status === 'rejected' ? 'Failed' : d.status,
        created_at: d.created_at,
        description: d.crypto_name ? `Deposit via ${d.crypto_name} (${d.crypto_symbol})` : 'Manual Deposit'
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
        ?.filter(d => d.status === 'approved')
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
        ...formattedTransactions.filter(tx => tx.type !== 'deposit'), // Only include non-deposit transactions
        ...withdrawalsAsTransactions
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Modified KYC fetching to get only most recent record
      const { data: kycData } = await supabase
        .from('kyc')
        .select(`
          id,
          full_name,
          date_of_birth,
          address,
          city,
          state,
          country,
          postal_code,
          document_type,
          document_number,
          document_front,
          document_back,
          occupation,
          status,
          rejection_reason,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Initialize document URLs object
      let documentUrls = { document_front: '', document_back: '' };

      // Only attempt to get URLs if KYC data exists and has valid document paths
      if (kycData) {
        try {
          if (kycData.document_front && typeof kycData.document_front === 'string') {
            const frontUrl = await supabase.storage
              .from('kyc_documents')
              .createSignedUrl(kycData.document_front, 3600);
            if (frontUrl.data) {
              documentUrls.document_front = frontUrl.data.signedUrl;
            }
          }
          
          if (kycData.document_back && typeof kycData.document_back === 'string') {
            const backUrl = await supabase.storage
              .from('kyc_documents')
              .createSignedUrl(kycData.document_back, 3600);
            if (backUrl.data) {
              documentUrls.document_back = backUrl.data.signedUrl;
            }
          }
        } catch (urlError) {
          console.error('Error generating signed URLs:', urlError);
          // Continue with empty URLs if generation fails
        }
      }

      // Get user's plans and calculate total investment
      const { data: userPlans } = await supabase
        .from('plans_subscriptions')
        .select(`
          id,
          amount,
          status,
          created_at,
          plans (
            name,
            duration_days
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'approved');

      // Get earnings for each plan
      const plansWithEarnings = await Promise.all(
        (userPlans || []).map(async (plan) => {
          const { data: earnings } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('type', 'investment_return')
            .eq('reference_id', plan.id)
            .eq('status', 'Completed');

          const total_earnings = earnings?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

          return {
            id: plan.id,
            amount: plan.amount || 0,
            status: plan.status,
            plans: {  // Ensure this matches the interface structure
              name: plan.plans?.name || '',
              duration_days: plan.plans?.duration_days || 0
            },
            total_earnings,
            created_at: plan.created_at
          };
        })
      );

      const total_plans_amount = userPlans?.reduce((sum, plan) => sum + (plan.amount || 0), 0) || 0;

      const userProfile: UserProfileData = {
        ...(users.find(u => u.id === userId) as User),
        total_referrals,
        total_commissions,
        total_deposits,
        total_withdrawals,
        total_plans_amount,
        transactions: combinedTransactions,
        kyc_details: kycData ? {
          ...kycData,
          document_front: documentUrls.document_front,
          document_back: documentUrls.document_back
        } : undefined,
        plans: plansWithEarnings || []
      };

      setSelectedUserProfile(userProfile);
      setShowProfileDialog(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    }
  };

  const totalUsers = users.length;

  const handleRoleChange = async (userId: string, isAdmin: boolean) => {
    try {
      // Get current user role first
      if (!currentUser) throw new Error('No authenticated user');
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (currentProfile?.role !== 'admin') {
        throw new Error('Not authorized to change user roles');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: isAdmin ? 'admin' : 'user' })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map user => 
        user.id === userId ? {...user, role: isAdmin ? 'admin' : 'user'} : user
      );

      toast({
        title: "Role Updated",
        description: `User role has been ${isAdmin ? 'upgraded to admin' : 'set to regular user'}`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleLoadMore = () => {
    setDisplayedTransactions(prev => prev + 10);
  };

  function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
  }
  return (
    <AdminLayout>
      <PageHeader 
        title="User Management" 
        description="Manage and monitor user accounts"
      />

      <div className="mb-6">
        <StatCard
          title="Registered Users"
          value={totalUsers.toString()}
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <MagnifyingGlass className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort By <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                setSortField("date_joined");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                Date Joined {sortField === "date_joined" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField("kyc_status");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                KYC Status {sortField === "kyc_status" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField("full_name");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                Name {sortField === "full_name" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField("email");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                Email {sortField === "email" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Date Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
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
                  <TableCell>{user.full_name}</TableCell>
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
                    {new Date(user.date_joined).toLocaleString('en-US', {
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
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => handleRoleChange(user.id, !user.role.includes('admin'))}
                            >
                              {user.role === 'admin' ? (
                                <Crown className="h-4 w-4 text-green-500" />
                              ) : (
                                <Crown className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.role === 'admin' ? 'Remove admin' : 'Make admin'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {(user.kyc_status === 'pending' || user.kyc_status === 'processing') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-500"
                                onClick={() => handleKycStatus(user.id, 'completed')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Approve KYC</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500"
                                onClick={() => handleKycStatus(user.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reject KYC</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewBalance(user.withdrawal_wallet.toString());
                                setIsBalanceDialogOpen(true);
                              }}
                            >
                              <CurrencyDollar className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Balances</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={!usersWithPlans.has(user.id)}
                              onClick={() => handleCreditReturns(user.id)}
                            >
                              <PlusCircle className={cn(
                                "h-4 w-4",
                                !usersWithPlans.has(user.id) && "opacity-50"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{usersWithPlans.has(user.id) ? 'Credit Returns' : 'No active plans'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!isLoadingMore && sortedUsers.length > 0 && (
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
                  {selectedUser?.full_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Current Balance</label>
                <p className="text-sm text-muted-foreground">
                  ${selectedUser?.withdrawal_wallet.toFixed(2)}
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
            <DialogTitle>User Profile Details</DialogTitle>
          </DialogHeader>
          {selectedUserProfile && (
            <Tabs defaultValue="overview" className="space-y-4" onValueChange={(value) => setActiveTab(value)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="kyc">KYC Info</TabsTrigger>
                <TabsTrigger value="plans">Computes</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-4">
                  {/* User Identity Card */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{selectedUserProfile.full_name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{selectedUserProfile.email}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Joined on {format(new Date(selectedUserProfile.date_joined), "dd MMM yyyy, h:mm:ss a 'IST'")}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">ID: {selectedUserProfile.id}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(selectedUserProfile.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Badge variant={selectedUserProfile.status === 'active' ? 'success' : 'secondary'}>
                        {selectedUserProfile.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <StatCard
                      title="Total Deposits"
                      value={`$${selectedUserProfile.total_deposits.toLocaleString()}`}
                    />
                    <StatCard
                      title="Total Referrals"
                      value={selectedUserProfile.total_referrals.toString()}
                    />
                    <div className="p-6 rounded-lg border bg-card relative">
                      <h3 className="font-medium text-sm text-muted-foreground">Current Balance</h3>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-2xl font-bold">
                          ${selectedUserProfile.withdrawal_wallet.toLocaleString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedUser(selectedUserProfile);
                            setNewBalance(selectedUserProfile.withdrawal_wallet.toString());
                            setIsBalanceDialogOpen(true);
                          }}
                        >
                          <CurrencyDollar className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-6 rounded-lg border bg-card relative">
                      <h3 className="font-medium text-sm text-muted-foreground">Total Investment</h3>
                      <p className="text-2xl font-bold mt-2">
                        ${selectedUserProfile.total_plans_amount.toLocaleString()}
                      </p>
                      <div className="mt-3">
                        <Badge variant="outline">
                          {selectedUserProfile.plans?.length || 0} Plans
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="kyc">
                <div className="p-4 rounded-lg border">
                  <div className="flex justify-between items-center mb-4">
                    <div className="space-y-1">
                      <h3 className="font-medium">KYC Information</h3>
                      {selectedUserProfile.kyc_details?.created_at && (
                        <p className="text-xs text-muted-foreground">
                          Submitted on {new Date(selectedUserProfile.kyc_details.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={
                        selectedUserProfile.kyc_status === 'completed' ? 'success' :
                        selectedUserProfile.kyc_status === 'pending' || selectedUserProfile.kyc_status === 'processing' ? 'warning' :
                        'destructive'
                      }
                    >
                      {selectedUserProfile.kyc_status}
                    </Badge>
                  </div>

                  {selectedUserProfile.kyc_status === 'processing' || selectedUserProfile.kyc_status === 'completed' ? (
                    <div className="space-y-6">
                      {/* Personal Information */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Personal Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Full Name</span>
                              <p className="font-medium">{selectedUserProfile.kyc_details?.full_name || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Date of Birth</span>
                              <p className="font-medium">{selectedUserProfile.kyc_details?.date_of_birth || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Occupation</span>
                              <p className="font-medium">{selectedUserProfile.kyc_details?.occupation || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Address</span>
                              <p className="font-medium">{selectedUserProfile.kyc_details?.address || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Location</span>
                              <p className="font-medium">
                                {[
                                  selectedUserProfile.kyc_details?.city,
                                  selectedUserProfile.kyc_details?.state,
                                  selectedUserProfile.kyc_details?.country
                                ].filter(Boolean).join(', ') || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Postal Code</span>
                              <p className="font-medium">{selectedUserProfile.kyc_details?.postal_code || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document Information */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Document Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-muted-foreground">Document Type</span>
                            <p className="font-medium capitalize">{selectedUserProfile.kyc_details?.document_type.replace(/_/g, ' ') || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Document Number</span>
                            <p className="font-medium">{selectedUserProfile.kyc_details?.document_number || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {/* Document Preview Section */}
                        {(selectedUserProfile.kyc_details?.document_front || selectedUserProfile.kyc_details?.document_back) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {selectedUserProfile.kyc_details?.document_front && (
                              <div className="space-y-2">
                                <span className="text-sm font-medium text-muted-foreground">Front Side</span>
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => window.open(selectedUserProfile.kyc_details?.document_front, '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Front Document
                                </Button>
                              </div>
                            )}
                            {selectedUserProfile.kyc_details?.document_back && (
                              <div className="space-y-2">
                                <span className="text-sm font-medium text-muted-foreground">Back Side</span>
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => window.open(selectedUserProfile.kyc_details?.document_back, '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Back Document
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Verification Status */}
                      {selectedUserProfile.kyc_details?.updated_at && selectedUserProfile.kyc_status === 'completed' && (
                        <div className="pt-4 border-t">
                          <p className="text-xs text-muted-foreground">
                            Verified on {new Date(selectedUserProfile.kyc_details.updated_at).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {selectedUserProfile.kyc_status === 'rejected' && selectedUserProfile.kyc_details?.rejection_reason && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium text-red-600">Rejection Reason</h4>
                          <p className="mt-1 text-sm text-red-600">
                            {selectedUserProfile.kyc_details.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <XCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h4 className="text-base font-medium mb-1">No KYC Submitted</h4>
                      <p className="text-sm text-muted-foreground">
                        This user has not submitted any KYC information yet.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="plans">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Computes Information</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Total Subscription:</span>
                        <span className="font-medium">${selectedUserProfile.total_plans_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Total Earnings:</span>
                        <span className="font-medium text-green-600">
                          ${selectedUserProfile.plans?.reduce((sum, plan) => sum + plan.total_earnings, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Compute Name</TableHead>
                          <TableHead>Remaining Days</TableHead>
                          <TableHead>Purchase Date</TableHead>
                          <TableHead className="text-right">Subscription</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserProfile.plans?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No active computes found
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedUserProfile.plans?.map((plan) => {
                            const purchaseDate = new Date(plan.created_at);
                            const today = new Date();
                            const totalDays = plan.plans.duration_days;
                            const daysPassed = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
                            const remainingDays = Math.max(totalDays - daysPassed, 0);
                            
                            return (
                              <TableRow key={plan.id}>
                                <TableCell className="font-medium">
                                  {plan.plans.name}
                                </TableCell>
                                <TableCell>
                                  {`${remainingDays} (out of ${totalDays})`}
                                </TableCell>
                                <TableCell>
                                  {format(purchaseDate, 'dd MMM yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${plan.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  ${plan.total_earnings.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="transactions">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Transaction History</h3>
                    <div className="flex items-center gap-2">
                      {/* Type Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Type <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setTransactionType("all")}>
                            All Types
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionType("deposit")}>
                            Deposits
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionType("withdrawal")}>
                            Withdrawals
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionType("commission")}>
                            Commissions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionType("investment")}>
                            Subscriptions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionType("investment_return")}>
                            Rewards
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Status Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Status <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setTransactionStatus("all")}>
                            All Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionStatus("completed")}>
                            Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionStatus("pending")}>
                            Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransactionStatus("failed")}>
                            Failed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Sort Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder(current => current === 'asc' ? 'desc' : 'asc')}
                      >
                        Date <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-y-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserProfile.transactions
                          .filter(tx => transactionType === 'all' || tx.type === transactionType)
                          .filter(tx => transactionStatus === 'all' || tx.status.toLowerCase() === transactionStatus)
                          .sort((a, b) => {
                            const dateA = new Date(a.created_at).getTime();
                            const dateB = new Date(b.created_at).getTime();
                            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                          })
                          .slice(0, displayedTransactions)
                          .map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {new Date(tx.created_at).toLocaleString('en-US', {
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
                              <Badge variant="secondary" className="capitalize">
                                {tx.type === 'investment_return' ? 'Rewards' : 
                                 tx.type === 'investment' ? 'Subscription' :
                                 tx.type.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{tx.description || '-'}</TableCell>
                            <TableCell>
                              <span className={tx.type === 'investment_return' ? 'text-green-600' : ''}>
                                ${tx.amount.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  tx.status.toLowerCase() === 'completed' || tx.status.toLowerCase() === 'approved' ? 'success' : 
                                  tx.status.toLowerCase() === 'pending' || tx.status.toLowerCase() === 'processing' ? 'warning' :
                                  tx.status.toLowerCase() === 'failed' || tx.status.toLowerCase() === 'rejected' ? 'destructive' :
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
                  {selectedUserProfile.transactions.length > displayedTransactions && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        className="w-[200px]"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersPage;
