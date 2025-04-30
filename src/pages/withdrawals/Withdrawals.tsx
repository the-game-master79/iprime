import { useState, useEffect } from "react";
import { LockSimple, MagnifyingGlass, CurrencyDollar, Receipt, ClockCounterClockwise, Copy, ArrowsDownUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { checkWithdrawalLimit } from "@/lib/rateLimit";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { Topbar } from "@/components/shared/Topbar";

interface DepositMethod {
  id: string;
  method: 'bank_transfer' | 'crypto' | 'upi';
  crypto_name: string | null;
  crypto_symbol: string | null;
  network: string | null;
  logo_url: string | null;
  is_active: boolean;
  min_amount: number;
  qr_code_url: string | null;
  deposit_address: string | null;
}

interface WithdrawalFormData {
  amount: string;
  cryptoId: string;
  network: string;
  walletAddress: string;
}

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
  updated_at?: string;
}

interface Profile {
  id: string;
  withdrawal_wallet: number;
  investment_wallet: number;
  kyc_status: 'pending' | 'completed' | 'rejected' | null;
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
};

const Withdrawals = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [formData, setFormData] = useState<WithdrawalFormData>({
    amount: '',
    cryptoId: '',
    network: '',
    walletAddress: '',
  });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<Profile['kyc_status']>(null);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending').reduce((sum, w) => sum + w.amount, 0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("request");
  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState<'created_at' | 'amount' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchDepositMethods();
    fetchWithdrawals();
    fetchUserBalance();
    fetchKycStatus();
  }, []);

  const fetchDepositMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('deposit_methods')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setDepositMethods(data || []);
    } catch (error) {
      console.error('Error fetching deposit methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive"
      });
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to load withdrawal history",
        variant: "destructive"
      });
    }
  };

  const fetchUserBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one with default balance
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { id: user.id, withdrawal_wallet: 0, investment_wallet: 0 }
            ])
            .select('withdrawal_wallet')
            .single();

          if (createError) throw createError;
          setUserBalance(newProfile?.withdrawal_wallet || 0);
        } else {
          throw error;
        }
      } else {
        setUserBalance(data?.withdrawal_wallet || 0);
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
      toast({
        title: "Error",
        description: "Failed to load withdrawal wallet balance. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  const fetchKycStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setKycStatus(data?.kyc_status);
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    }
  };

  const getNetworksForCrypto = (cryptoSymbol: string): string[] => {
    return depositMethods
      .filter(m => m.crypto_symbol === cryptoSymbol && m.network)
      .map(m => m.network!)
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
  };

  // Group deposit methods by crypto symbol to avoid duplicates
  const cryptoOptions = [...new Set(
    depositMethods
      .filter(m => m.method === 'crypto')
      .map(m => m.crypto_symbol)
  )]
  .filter(Boolean)
  .map(symbol => {
    const method = depositMethods.find(m => m.crypto_symbol === symbol);
    return {
      symbol,
      name: method?.crypto_name,
      logo: method?.logo_url,
      id: method?.id
    };
  });

  const selectedCrypto = cryptoOptions.find(c => c.id === formData.cryptoId);
  const networks = formData.cryptoId ? 
    getNetworksForCrypto(depositMethods.find(m => m.id === formData.cryptoId)?.crypto_symbol || '') : 
    [];

  const validateAmount = (amount: string) => {
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      setAmountError("Please enter a valid amount");
      return false;
    }
    
    if (amountValue > userBalance) {
      setAmountError("Amount exceeds available balance");
      return false;
    }

    const selectedPaymentMethod = depositMethods.find(m => m.id === formData.cryptoId);
    if (selectedPaymentMethod && amountValue < selectedPaymentMethod.min_amount) {
      setAmountError(`Minimum withdrawal amount is $${selectedPaymentMethod.min_amount}`);
      return false;
    }

    setAmountError(null);
    return true;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    setFormData(prev => ({ ...prev, amount: newAmount }));
    validateAmount(newAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (kycStatus !== 'completed') {
      toast({
        title: "KYC Required",
        description: "Please complete your KYC verification before making withdrawals.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check rate limits
      if (!checkWithdrawalLimit(user.id)) {
        toast({
          title: "Rate Limited",
          description: "You have exceeded the maximum number of withdrawals allowed. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      const amountValue = parseFloat(formData.amount);
      if (!formData.cryptoId) {
        toast({
          title: "Error",
          description: "Please select a cryptocurrency.",
          variant: "destructive",
        });
        return;
      }
      
      if (!formData.network) {
        toast({
          title: "Error",
          description: "Please select a network.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.walletAddress) {
        toast({
          title: "Error",
          description: "Please enter your wallet address.",
          variant: "destructive",
        });
        return;
      }
      
      if (!formData.amount || isNaN(amountValue) || amountValue <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount.",
          variant: "destructive",
        });
        return;
      }
      
      const selectedPaymentMethod = depositMethods.find(m => m.id === formData.cryptoId);
      if (selectedPaymentMethod && amountValue < selectedPaymentMethod.min_amount) {
        toast({
          title: "Error",
          description: `Minimum withdrawal amount for ${selectedPaymentMethod.method} is $${selectedPaymentMethod.min_amount}.`,
          variant: "destructive",
        });
        return;
      }
      
      if (amountValue > userBalance) {
        toast({
          title: "Error",
          description: "Withdrawal amount exceeds your available balance.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        setIsSubmitting(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const selectedCrypto = depositMethods.find(m => m.id === formData.cryptoId);
        if (!selectedCrypto) throw new Error('Invalid cryptocurrency selected');

        const { data, error } = await supabase
          .from('withdrawals')
          .insert({
            user_id: user.id,
            amount: parseFloat(formData.amount),
            crypto_name: selectedCrypto.crypto_name,
            crypto_symbol: selectedCrypto.crypto_symbol,
            network: formData.network,
            wallet_address: formData.walletAddress,
            status: 'Pending'
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Withdrawal Request Submitted",
          description: `Your withdrawal request for $${formData.amount} via ${selectedCrypto.crypto_name} has been submitted.`,
        });

        setFormData({
          amount: '',
          cryptoId: '',
          network: '',
          walletAddress: '',
        });

        // Refresh withdrawal history
        fetchWithdrawals();

      } catch (error) {
        console.error('Error submitting withdrawal:', error);
        toast({
          title: "Error",
          description: "Failed to submit withdrawal request",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: "Error",
        description: "Withdrawal cannot be processed as Deposit amount not used for investments yet.",
        variant: "destructive"
      });
    }
  };

  const KycWarning = () => (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <LockSimple className="h-5 w-5" />
          KYC Verification Required
        </CardTitle>
        <CardDescription className="text-yellow-700">
          You need to complete KYC verification before making withdrawals.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-yellow-700">
        <p>To protect our users and comply with regulations, we require KYC verification for all withdrawals.</p>
        <Button 
          variant="outline" 
          className="mt-4 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          onClick={() => window.location.href = '/profile?tab=kyc'}
        >
          Complete KYC Verification
        </Button>
      </CardContent>
    </Card>
  );

  // Add filter function
  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || withdrawal.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  const shouldShowNetworkSelect = (cryptoSymbol: string | undefined, network: string) => {
    // If no crypto selected or no network available, don't show
    if (!cryptoSymbol || !network) return false;
    
    // Compare crypto symbol with network, case insensitive
    return cryptoSymbol.toLowerCase() !== network.toLowerCase();
  };

  const handleTabChange = (value: string) => {
    if (kycStatus !== 'completed') {
      toast({
        title: "KYC Required",
        description: "Please complete your KYC verification to view withdrawal history.",
        variant: "destructive",
      });
      return;
    }
    setActiveTab(value);
  };

  const handleCopyId = async (id: string) => {
    const success = await copyToClipboard(id);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Add sorted withdrawals computation
  const sortedAndFilteredWithdrawals = filteredWithdrawals.sort((a, b) => {
    if (sortField === 'amount') {
      return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    if (sortField === 'status') {
      return sortDirection === 'asc' 
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    // Default sort by date
    return sortDirection === 'asc'
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="w-full min-h-screen bg-background">
      <Topbar title="Withdrawals" />
      
      <div className="container max-w-[1000px] mx-auto py-6 px-4 md:px-6">
        {/* Balance Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-primary border-gray-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-white mb-1">Available Balance</span>
                  <span className="text-2xl font-semibold text-white">
                    ${userBalance.toLocaleString()}
                  </span>
                  <div className="flex flex-col text-xs text-white/80 mt-1">
                    <span>Ready to withdraw</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Pending Withdrawals</span>
                <span className="text-2xl font-semibold text-yellow-600">
                  ${pendingWithdrawals.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Processing
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Total Withdrawals</span>
                <span className="text-2xl font-semibold text-green-600">
                  ${withdrawals.filter(w => w.status === 'Completed').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Completed
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="container max-w-[1000px] mx-auto">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="border-b">
                <TabsList className="h-10 w-full justify-start gap-6 bg-transparent">
                  <TabsTrigger value="request" className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                    <Receipt className="h-4 w-4" />
                    Request Withdrawal
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none relative"
                    disabled={kycStatus !== 'completed'}
                  >
                    <ClockCounterClockwise className="h-4 w-4" />
                    History
                    {withdrawals.some(w => w.status === 'Pending') && (
                      <Badge className="absolute -right-6 -top-2 h-5 w-5 p-0 flex items-center justify-center">
                        {withdrawals.filter(w => w.status === 'Pending').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="request" className="m-0 space-y-4">
                {kycStatus !== 'completed' ? (
                  <KycWarning />
                ) : (
                  <div className="max-w-[1000px] mx-auto">
                    <Card className="border rounded-lg">
                      <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6 pt-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-normal">Select Cryptocurrency</Label>
                              <Select 
                                value={formData.cryptoId} 
                                onValueChange={(value) => {
                                  const selectedMethod = depositMethods.find(m => m.id === value);
                                  const networks = getNetworksForCrypto(selectedMethod?.crypto_symbol || '');
                                  
                                  // Auto-select network if it matches crypto symbol
                                  let autoNetwork = '';
                                  if (selectedMethod?.crypto_symbol && networks.length > 0) {
                                    const matchingNetwork = networks.find(
                                      n => n.toLowerCase() === selectedMethod.crypto_symbol?.toLowerCase()
                                    );
                                    if (matchingNetwork) {
                                      autoNetwork = matchingNetwork;
                                    }
                                  }

                                  setFormData(prev => ({ 
                                    ...prev, 
                                    cryptoId: value,
                                    network: autoNetwork
                                  }));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cryptocurrency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cryptoOptions.map(crypto => (
                                    <SelectItem key={crypto.id} value={crypto.id || ''}>
                                      <div className="flex items-center gap-2">
                                        {crypto.logo && (
                                          <img src={crypto.logo} alt={crypto.name || ''} className="w-4 h-4" />
                                        )}
                                        {crypto.name} ({crypto.symbol})
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {formData.cryptoId && networks.length > 0 && networks.some(network => 
                              // Only show network select if no automatic match found
                              formData.network === '' && shouldShowNetworkSelect(
                                depositMethods.find(m => m.id === formData.cryptoId)?.crypto_symbol,
                                network
                              )
                            ) && (
                              <div className="space-y-2">
                                <Label className="text-xs font-normal">Select Network</Label>
                                <Select 
                                  value={formData.network} 
                                  onValueChange={(value) => setFormData(prev => ({ ...prev, network: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select network" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {networks.map(network => (
                                      <SelectItem key={network} value={network}>{network}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="walletAddress" className="text-xs font-normal">Wallet Address</Label>
                            <Input
                              id="walletAddress"
                              placeholder="Enter your wallet address"
                              value={formData.walletAddress}
                              onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="amount" className="text-xs font-normal">Amount</Label>
                            <div className="relative">
                              <CurrencyDollar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                              <Input
                                id="amount"
                                type="number"
                                min="0"
                                placeholder="0.00"
                                className={`pl-10 ${amountError ? 'border-red-500' : ''}`}
                                value={formData.amount}
                                onChange={handleAmountChange}
                              />
                            </div>
                            {amountError && (
                              <p className="text-sm text-red-500">{amountError}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Available balance: ${userBalance.toLocaleString()}
                            </p>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Processing..." : "Request Withdrawal"}
                          </Button>
                        </CardFooter>
                      </form>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="m-0 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-full sm:w-[300px]">
                      <MagnifyingGlass className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search withdrawals..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sortField} onValueChange={(value: typeof sortField) => setSortField(value)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at">Date</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                        className="w-10"
                      >
                        <ArrowsDownUp className={`h-4 w-4 transition-transform ${
                          sortDirection === "desc" ? "rotate-180" : ""
                        }`} />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border/40">
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Date</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Transaction</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Amount</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/50">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAndFilteredWithdrawals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                              No withdrawals found
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedAndFilteredWithdrawals.map((withdrawal) => (
                            <TableRow 
                              key={withdrawal.id}
                              className="group hover:bg-muted/50 transition-colors"
                            >
                              <TableCell className="py-4 align-top">
                                <div className="text-sm font-medium">
                                  {format(new Date(withdrawal.created_at), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {format(new Date(withdrawal.created_at), 'hh:mm a')}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 align-top">
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="w-fit capitalize text-xs">
                                    Withdrawal
                                  </Badge>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono">{withdrawal.id.slice(0, 12)}...</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleCopyId(withdrawal.id)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {withdrawal.crypto_name} ({withdrawal.crypto_symbol}) - {withdrawal.network}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 align-top">
                                <Badge variant="outline" className="font-mono">
                                  -${withdrawal.amount.toLocaleString()}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 align-top">
                                <Badge 
                                  variant={
                                    withdrawal.status === 'Completed' ? 'success' :
                                    withdrawal.status === 'Pending' ? 'warning' :
                                    withdrawal.status === 'Processing' ? 'secondary' :
                                    'destructive'
                                  } 
                                  className="capitalize"
                                >
                                  {withdrawal.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdrawals;
