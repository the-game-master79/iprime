import { useState, useEffect } from "react";
import { LockKeyhole, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { checkWithdrawalLimit } from "@/lib/rateLimit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}

interface Profile {
  id: string;
  withdrawal_wallet: number;
  investment_wallet: number;
  kyc_status: 'pending' | 'completed' | 'rejected' | null;
}

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
          <LockKeyhole className="h-5 w-5" />
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

  // Group withdrawals by date
  const groupedWithdrawals = Object.entries(
    filteredWithdrawals.reduce((groups, withdrawal) => {
      const date = new Date(withdrawal.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(withdrawal);
      return groups;
    }, {} as Record<string, Withdrawal[]>)
  );

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

  return (
    <div className="w-full min-h-screen bg-background">
      <Topbar title="Withdrawals" />
      
      <div className="max-w-[1000px] mx-auto py-6 px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="border border-black p-4 rounded-lg flex flex-col">
            <div className="text-4xl font-bold mb-2">
              ${userBalance.toLocaleString()}
            </div>
            <div className="text-sm font-medium">Available Balance</div>
          </div>

          <div className="border border-black p-4 rounded-lg flex flex-col">
            <div className="text-4xl font-bold text-yellow-600 mb-2">
              ${pendingWithdrawals.toLocaleString()}
            </div>
            <div className="text-sm font-medium">Pending Withdrawals</div>
          </div>

          <div className="border border-black p-4 rounded-lg flex flex-col">
            <div className="text-4xl font-bold text-green-600 mb-2">
              ${withdrawals.filter(w => w.status === 'Completed').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
            </div>
            <div className="text-sm font-medium">Completed Withdrawals</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2" data-kyc-disabled={kycStatus !== 'completed'}>
            <TabsTrigger value="request">Request Withdrawal</TabsTrigger>
            <TabsTrigger 
              value="history"
              disabled={kycStatus !== 'completed'}
              className="data-[kyc-disabled=true]:opacity-50 data-[kyc-disabled=true]:cursor-not-allowed"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-4">
            {kycStatus !== 'completed' ? (
              <KycWarning />
            ) : (
              <Card>
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-6 pt-6">
                    {/* Replace grid with stacked layout */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Cryptocurrency</Label>
                        <Select 
                          value={formData.cryptoId} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, cryptoId: value, network: '' }))}
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
                        shouldShowNetworkSelect(
                          depositMethods.find(m => m.id === formData.cryptoId)?.crypto_symbol,
                          network
                        )
                      ) && (
                        <div className="space-y-2">
                          <Label>Select Network</Label>
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

                    {/* Rest of the form remains unchanged */}
                    <div className="space-y-2">
                      <Label htmlFor="walletAddress">Wallet Address</Label>
                      <Input
                        id="walletAddress"
                        placeholder="Enter your wallet address"
                        value={formData.walletAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
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
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-4 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
                  <Button onClick={() => setStatusFilter("all")} variant="outline" size="sm">
                    Clear Filter
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                {filteredWithdrawals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No withdrawals found
                  </div>
                ) : (
                  <Accordion type="multiple" className="divide-y">
                    {groupedWithdrawals.map(([date, transactions]) => (
                      <AccordionItem key={date} value={date}>
                        <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium">{formatDate(date)}</span>
                            <Badge variant="secondary" className="ml-auto mr-4 text-xs">
                              {transactions.length} Withdrawals
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-3">
                            {transactions.map((withdrawal) => (
                              <div key={withdrawal.id} className="relative bg-white border rounded-lg p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">{withdrawal.id}</span>
                                    <div className={`h-2.5 w-2.5 rounded-full ${
                                      withdrawal.status === 'Completed' ? 'bg-green-500' : 
                                      withdrawal.status === 'Pending' ? 'bg-yellow-500' : 
                                      withdrawal.status === 'Processing' ? 'bg-blue-500' : 
                                      'bg-red-500'
                                    }`} />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-2xl font-semibold">
                                      ${withdrawal.amount.toLocaleString()}
                                    </span>
                                    <Badge variant="outline" className="font-normal">
                                      {withdrawal.crypto_name} ({withdrawal.crypto_symbol})
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Network: {withdrawal.network}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Withdrawals;
