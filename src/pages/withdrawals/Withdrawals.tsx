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
import { BalanceCard } from "@/components/shared/BalanceCards";
import { KycVariant } from "@/components/shared/KycVariants";
import { TransactionTable } from "@/components/tables/TransactionTable";

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

const Withdraw = () => {
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
  const [kycStatus, setKycStatus] = useState<'pending' | 'processing' | 'completed' | 'rejected' | 'required'>('pending');
  const [kycDate, setKycDate] = useState<Date | undefined>(undefined);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending').reduce((sum, w) => sum + w.amount, 0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("request");
  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState<'created_at' | 'amount' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historySortField, setHistorySortField] = useState<'date' | 'amount' | 'status'>('date');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchDepositMethods();
    fetchWithdrawals();
    fetchUserBalance();
    fetchKycStatus();
    fetchWithdrawalTransactions(); // fetch transactions for payout history table
  }, []);

  // Set default currency when depositMethods are loaded
  useEffect(() => {
    // Find the first available crypto method (USDT or USDC)
    const firstCrypto = depositMethods.find(
      method =>
        method.method === 'crypto' &&
        method.is_active &&
        (method.crypto_symbol?.toLowerCase() === 'usdt' ||
         method.crypto_symbol?.toLowerCase() === 'usdc')
    );
    if (firstCrypto && !formData.cryptoId) {
      setFormData(prev => ({
        ...prev,
        cryptoId: firstCrypto.id,
        network: firstCrypto.network || ''
      }));
    }
  }, [depositMethods]); // Only runs when depositMethods change

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

      // Prefer to get from profiles table (if kyc_status is there)
      const { data: profile } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('id', user.id)
        .single();

      // Optionally, get latest KYC record for date
      const { data: kyc } = await supabase
        .from('kyc')
        .select('updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      setKycStatus(profile?.kyc_status || 'pending');
      setKycDate(kyc?.updated_at ? new Date(kyc.updated_at) : undefined);
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    }
  };

  // Fetch withdrawal transactions from the withdrawals table (not transactions)
  const fetchWithdrawalTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Map withdrawals to TransactionTable format
      const mapped = (data || []).map((w: Withdrawal) => ({
        id: w.id,
        amount: w.amount,
        status: w.status, // 'Pending' | 'Processing' | 'Completed' | 'Failed'
        created_at: w.created_at,
        updated_at: w.updated_at,
        type: 'withdrawal',
        description: `Withdrawal ${w.crypto_symbol || ''} ${w.network ? `via ${w.network}` : ''}`,
        wallet_address: w.wallet_address, // Pass wallet address to TransactionTable
        crypto_symbol: w.crypto_symbol,
        network: w.network,
      }));
      setTransactions(mapped);
    } catch (error) {
      // Optionally handle error
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

  // Filtered and sorted payout history for TransactionTable
  const filteredAndSortedTransactions = [...transactions]
    .filter(tx => {
      // Optionally add search/filter logic here if needed
      return true;
    })
    .sort((a, b) => {
      if (historySortField === 'amount') {
        return historySortDirection === 'asc'
          ? a.amount - b.amount
          : b.amount - a.amount;
      }
      if (historySortField === 'status') {
        return historySortDirection === 'asc'
          ? (a.status || '').localeCompare(b.status || '')
          : (b.status || '').localeCompare(a.status || '');
      }
      // Default: sort by date
      return historySortDirection === 'asc'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="w-full min-h-screen bg-[#000000]">
      <div className="container max-w-[1000px] mx-auto py-6 px-4 md:px-6">
        {/* Balance Cards Grid */}
        <div className="grid gap-4 mb-8">
          <BalanceCard 
            label="Available for Payout"
            amount={userBalance}
            variant="default"
          />
          <div className="grid grid-cols-2 gap-4">
            <BalanceCard
              label="Processing"
              amount={pendingWithdrawals}
              variant="processing"
            />
            <BalanceCard
              label="Success" 
              amount={withdrawals.filter(w => w.status === 'Completed').reduce((sum, w) => sum + w.amount, 0)}
              variant="success"
            />
          </div>
        </div>

        {/* Use KycVariant for KYC status display */}
        <div className="max-w-lg mx-auto mb-8">
          {kycStatus !== 'completed' && (
            <KycVariant status={kycStatus as any} date={kycDate} />
          )}
        </div>

        {/* Layout: Form on left, payout history full width below */}
        <div className="flex flex-col gap-8">
          {/* Form */}
          <div className="w-full max-w-lg mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-normal">Select Currency</Label>
                  <Select 
                    value={formData.cryptoId || cryptoOptions[0]?.id} 
                    onValueChange={(value) => {
                      const selectedMethod = depositMethods.find(m => m.id === value);
                      const network = selectedMethod?.network || '';
                      setFormData(prev => ({ 
                        ...prev, 
                        cryptoId: value,
                        network
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Grouped by USDT and USDC */}
                      <div>
                        <div className="px-2 py-1 text-xs text-muted-foreground">USDT</div>
                        {depositMethods
                          .filter(method => 
                            method.method === 'crypto' && 
                            method.is_active && 
                            method.crypto_symbol?.toLowerCase() === 'usdt'
                          )
                          .map(method => (
                            <SelectItem key={method.id} value={method.id}>
                              <div className="flex items-center gap-2">
                                {method.logo_url && (
                                  <img src={method.logo_url} alt={method.crypto_name || ''} className="w-4 h-4" />
                                )}
                                {method.crypto_name} • {method.network}
                              </div>
                            </SelectItem>
                          ))}
                      </div>
                      <div>
                        <div className="px-2 py-1 text-xs text-muted-foreground">USDC</div>
                        {depositMethods
                          .filter(method => 
                            method.method === 'crypto' && 
                            method.is_active && 
                            method.crypto_symbol?.toLowerCase() === 'usdc'
                          )
                          .map(method => (
                            <SelectItem key={method.id} value={method.id}>
                              <div className="flex items-center gap-2">
                                {method.logo_url && (
                                  <img src={method.logo_url} alt={method.crypto_name || ''} className="w-4 h-4" />
                                )}
                                {method.crypto_name} • {method.network}
                              </div>
                            </SelectItem>
                          ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletAddress" className="text-xs font-normal text-white">Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    placeholder={`Enter ${
                      selectedCrypto?.name?.toUpperCase() || 'USDT'
                    } ${formData.network || 'TRC20'} address`}
                    value={formData.walletAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-xs font-normal text-white">Amount</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      placeholder="Enter amount"
                      className={`${amountError ? 'border-red-500' : ''}`}
                      value={formData.amount}
                      onChange={handleAmountChange}
                    />
                    <span className="absolute right-3 top-2.5 text-white">USD</span>
                  </div>
                  {amountError && (
                    <p className="text-sm text-red-500">{amountError}</p>
                  )}
                  {formData.amount && !amountError && (
                    <p className="text-sm text-muted-foreground">
                      Your balance after withdrawal → {(userBalance - parseFloat(formData.amount)).toLocaleString()} USD
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Request Payout"}
              </Button>
            </form>
          </div>

          {/* Payout History Table - full width below the form */}
          <div className="w-full">
            {/* Filter and sort controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h2 className="text-xl font-semibold text-white">Payout History</h2>
              <div className="flex items-center gap-2">
                <Select
                  id="payout-history-filter"
                  value={historySortField}
                  onValueChange={setHistorySortField}
                >
                  <SelectTrigger className="w-[120px] bg-[#212121] border-none text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHistorySortDirection(d => d === "asc" ? "desc" : "asc")}
                  className="text-foreground"
                  title="Toggle sort direction"
                >
                  {historySortDirection === "asc" ? (
                    <span className="text-foreground">&uarr;</span>
                  ) : (
                    <span className="text-foreground">&darr;</span>
                  )}
                </Button>
              </div>
            </div>
            <div className="border-b border-white/10 mb-2" />
            <div className="mt-4">
              <TransactionTable
                transactions={filteredAndSortedTransactions}
                onCopyId={handleCopyId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
