import { useState, useEffect } from "react";
import { Ban, CheckCircle, CreditCard, DollarSign, Clock, FileText, LockKeyhole } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface DepositMethod {
  id: string;
  method: 'bank_transfer' | 'crypto' | 'upi';
  crypto_name: string | null;
  crypto_symbol: string | null;
  network: string | null;
  logo_url: string | null;
  is_active: boolean;
  min_amount: number;
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
  balance: number;
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
        .select('balance')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one with default balance
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { id: user.id, balance: 0 }
            ])
            .select('balance')
            .single();

          if (createError) throw createError;
          setUserBalance(newProfile?.balance || 0);
        } else {
          throw error;
        }
      } else {
        setUserBalance(data?.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
      toast({
        title: "Error",
        description: "Failed to load account balance. Please try refreshing the page.",
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

  const checkLastDeposit = async (userId: string) => {
    const timeLimit = 48; // hours
    const { data, error } = await supabase
      .from('deposits')
      .select('created_at')
      .eq('user_id', userId)
      .eq('status', 'Completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      const lastDepositTime = new Date(data[0].created_at).getTime();
      const currentTime = new Date().getTime();
      const hoursSinceDeposit = (currentTime - lastDepositTime) / (1000 * 60 * 60);
      
      return hoursSinceDeposit >= timeLimit;
    }
    
    return true; // If no deposits found, allow withdrawal
  };

  const cryptoOptions = depositMethods.filter(m => m.method === 'crypto');
  const selectedCrypto = cryptoOptions.find(c => c.id === formData.cryptoId);
  const networks = selectedCrypto?.network ? [selectedCrypto.network] : [];

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

      // Check 48-hour waiting period
      const canWithdraw = await checkLastDeposit(user.id);
      if (!canWithdraw) {
        toast({
          title: "Withdrawal Not Allowed",
          description: "You must wait 48 hours after your last deposit before making a withdrawal.",
          variant: "destructive",
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

  return (
    <ShellLayout>
      <PageHeader 
        title="Withdrawals" 
        description="Request withdrawals and view your withdrawal history"
      />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <StatCard
          title="Available Balance"
          value={`$${userBalance.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Withdrawals"
          value={`$${pendingWithdrawals.toLocaleString()}`}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          title="Completed Withdrawals"
          value={`$${withdrawals.filter(w => w.status === 'Completed').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}`}
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="request" className="space-y-6">
        <TabsList>
          <TabsTrigger value="request">Request Withdrawal</TabsTrigger>
          <TabsTrigger value="history">Withdrawal History</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-6">
          {kycStatus !== 'completed' ? (
            <KycWarning />
          ) : (
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Request a Withdrawal</CardTitle>
                  <CardDescription>
                    Withdraw your funds to your crypto wallet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                          <SelectItem 
                            key={crypto.id} 
                            value={crypto.id}
                          >
                            <div className="flex items-center gap-2">
                              {crypto.logo_url && (
                                <img 
                                  src={crypto.logo_url} 
                                  alt={crypto.crypto_name || ''} 
                                  className="w-4 h-4"
                                />
                              )}
                              {crypto.crypto_name} ({crypto.crypto_symbol})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.cryptoId && (
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
                            <SelectItem key={network} value={network}>
                              {network}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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

                  <div className="rounded-lg border p-4 bg-muted/50">
                    <h3 className="font-medium mb-1">Withdrawal Policy</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Minimum withdrawal amounts vary by payment method</li>
                      <li>Processing time: Instant or 3 business days</li>
                      <li>Withdrawal fees may apply depending on the method</li>
                      <li>Without Investments, cooling period for withdrawals is 48 hours</li>
                      <li>Withdrawals are instant for Rounder Prestige and Sapphire Rank and above users </li>
                    </ul>
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

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>
                View all your past and pending withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm">{withdrawal.id}</td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          ${withdrawal.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {withdrawal.crypto_name} ({withdrawal.crypto_symbol})
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                            ${withdrawal.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                              withdrawal.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                              withdrawal.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'}`}>
                            {withdrawal.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ShellLayout>
  );
};

export default Withdrawals;
