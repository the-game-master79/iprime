import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/shared/Topbar";
import { supabase } from "@/lib/supabase";
import { Copy, ArrowLeft, Info, CurrencyDollar, Receipt } from "@phosphor-icons/react"; // Changed from lucide-react
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label"; // Add this import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionTable } from "@/components/tables/TransactionTable";
import Withdrawals from "../withdrawals/Withdrawals";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface Promocode {
  id: string;
  code: string;
  description: string;
  type: 'multiplier' | 'cashback';  // Updated to only have these two types
  discount_percentage: number;
  min_amount: number;
  max_amount: number | null;
}

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

interface CryptoPrice {
  symbol: string;
  price: number;
  logo: string;
  name: string;
  networks: string[];
}

interface Plan {
  id: string;
  name: string;
  investment: number;
}

interface DepositHistory {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  crypto_symbol?: string;
  network?: string;
  description?: string;
}

export default function CashierPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = location.state?.plan as Plan | null;
  const { toast } = useToast();
  const [cryptoType, setCryptoType] = useState<string>("");
  const [network, setNetwork] = useState<string>("");
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, { usd: number }>>({});
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [amountError, setAmountError] = useState<string>("");
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [selectedPromocode, setSelectedPromocode] = useState<Promocode | null>(null);
  const [promoInput, setPromoInput] = useState<string>("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [deposits, setDeposits] = useState<DepositHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [historySortField, setHistorySortField] = useState<'date' | 'amount' | 'status'>('date');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');
  const [userProfile, setUserProfile] = useState<{ id: string; full_name?: string } | null>(null);

  // Fetch deposit methods from Supabase
  useEffect(() => {
    const fetchDepositMethods = async () => {
      const { data, error } = await supabase
        .from('deposit_methods')
        .select('*')
        .order('method', { ascending: true });

      if (error) {
        console.error('Error fetching deposit methods:', error);
        return;
      }

      setDepositMethods(data);
    };

    fetchDepositMethods();
  }, []);

  // Fetch crypto prices
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      const cryptoSymbols = [...new Set(depositMethods
        .filter(m => m.method === 'crypto' && m.crypto_symbol)
        .map(m => m.crypto_symbol!.toLowerCase()))];

      if (cryptoSymbols.length === 0) return;

      // Map crypto symbols to their CoinGecko IDs
      const coinIdMap: Record<string, string> = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'bnb': 'binancecoin',
        'sol': 'solana',
        'xrp': 'ripple',
        'usdt': 'tether',
        'usdc': 'usd-coin',
        'ada': 'cardano',
        'dot': 'polkadot',
        'doge': 'dogecoin',
        'trx': 'tron',
        'ltc': 'litecoin',
      };

      try {
        const coinIds = cryptoSymbols.map(symbol => coinIdMap[symbol] || symbol).join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`
        );
        const data = await response.json();
        
        // Format the data correctly by mapping CoinGecko IDs back to crypto symbols
        const formattedData = Object.entries(data).reduce((acc, [coinId, priceData]) => {
          const symbol = Object.entries(coinIdMap).find(([sym, id]) => id === coinId)?.[0] || coinId;
          acc[symbol] = { usd: (priceData as any).usd };
          return acc;
        }, {} as Record<string, { usd: number }>);
        
        setCryptoPrices(formattedData);
      } catch (error) {
        console.error("Error fetching crypto prices:", error);
      }
    };

    if (depositMethods.length > 0) {
      fetchCryptoPrices();
      const interval = setInterval(fetchCryptoPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [depositMethods]);

  // Get unique payment methods and sort them in desired order
  const methodOrder = { crypto: 1, bank_transfer: 2, upi: 3 };
  const uniqueMethods = [...new Set(depositMethods.map(m => m.method))]
    .sort((a, b) => methodOrder[a] - methodOrder[b]);
  
  // Get available cryptocurrencies with their networks
  const availableCryptos = depositMethods
    .filter(m => m.method === 'crypto' && m.is_active)
    .map(m => ({
      symbol: m.crypto_symbol!,
      name: m.crypto_name!,
      network: m.network,
      logo_url: m.logo_url,
      deposit_address: m.deposit_address
    }));

  // Update formatCryptoDisplayName to be more defensive
  const formatCryptoDisplayName = (crypto: typeof availableCryptos[0] | undefined) => {
    if (!crypto?.symbol || !crypto?.name) return '';
    return crypto.network 
      ? `${crypto.name} (${crypto.symbol.toUpperCase()} ${crypto.network})` 
      : `${crypto.name} (${crypto.symbol.toUpperCase()})`;
  };

  // Add a function to calculate total USD value
  const calculateTotalUSD = () => {
    if (!cryptoType) return 0;
    const price = cryptoPrices[cryptoType.toLowerCase()]?.usd || 0;
    return price;
  };

  // Update handleCopyAddress to check for valid address
  const handleCopyAddress = (address: string | null | undefined) => {
    if (!address) {
      toast({
        title: "Error",
        description: "No deposit address available",
        variant: "destructive"
      });
      return;
    }

    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "The deposit address has been copied to your clipboard.",
    });
  };

  // Replace calculateFinalAmount with new logic
  const calculateFinalAmount = (baseAmount: number) => {
    if (!selectedPromocode) return baseAmount;
    
    switch (selectedPromocode.type) {
      case 'multiplier':
        return baseAmount * 2;
      case 'cashback':
        return baseAmount;
      default:
        return baseAmount;
    }
  };

  // Add function to get promo description
  const getPromoDescription = (promo: Promocode) => {
    switch (promo.type) {
      case 'multiplier':
        return '2X Your Deposit';
      case 'cashback':
        return `${promo.discount_percentage}% Cashback to Withdrawal Wallet`;
    }
  };

  // Add null check for crypto object
  const handleSubmit = async (investment: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedCrypto = availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType);
      if (!selectedCrypto?.symbol || !selectedCrypto?.name) {
        throw new Error('Please select a valid cryptocurrency');
      }

      const finalAmount = calculateFinalAmount(investment);

      const { data, error } = await supabase.from('deposits').insert({
        user_id: user.id,
        amount: investment,
        crypto_name: selectedCrypto.name,
        crypto_symbol: selectedCrypto.symbol,
        network: selectedCrypto.network,
        status: 'pending',
        promocode_id: selectedPromocode?.id
      }).select().single();

      if (error) throw error;

      // Apply promocode effects
      if (selectedPromocode) {
        const { error: promoError } = await supabase
          .rpc('apply_promocode', { 
            p_deposit_id: data.id,
            p_promocode_id: selectedPromocode.id 
          });

        if (promoError) throw promoError;
      }

      toast({
        title: "Success",
        description: "Deposit request submitted successfully."
      });

      setCryptoType('');
      setNetwork('');
      
      // Optionally navigate to transactions or dashboard
      navigate('/platform');
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while submitting the deposit request.",
        variant: "destructive"
      });
    }
  };

  // Update generateQRCode with better validation
  const generateQRCode = async (address: string | null | undefined, amount: number, symbol: string | null | undefined, net: string | null) => {
    if (!address || !symbol || amount <= 0) return;
    
    try {
      // Format the URI according to BIP21/EIP67 standards for wallet compatibility
      let qrData;
      const cryptoAmount = calculateCryptoAmount(amount, symbol);
      const cleanSymbol = symbol.toLowerCase();
      
      // Different format for different cryptocurrencies
      switch(cleanSymbol) {
        case 'btc':
          qrData = `bitcoin:${address}?amount=${cryptoAmount}`;
          break;
        case 'eth':
          qrData = `ethereum:${address}${net ? `@${net}` : ''}?value=${cryptoAmount}`;
          break;
        case 'bnb':
          if (net?.toLowerCase().includes('bsc')) {
            qrData = `bnb:${address}@56?amount=${cryptoAmount}`; // BSC Mainnet
          } else {
            qrData = `bnb:${address}?amount=${cryptoAmount}`; // BNB Chain
          }
          break;
        default:
          // Generic format for other tokens
          qrData = `${cleanSymbol}:${address}?amount=${cryptoAmount}${net ? `&network=${net}` : ''}`;
      }
      
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000', // QR code color (white)
          light: '#ffffff' // Background color
        }
      });
      
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  // Update effect to watch for amount changes and regenerate QR code
  useEffect(() => {
    const selectedCrypto = availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType);
    if (!selectedCrypto?.deposit_address || !amount || isNaN(parseFloat(amount))) {
      return;
    }

    generateQRCode(
      selectedCrypto.deposit_address,
      parseFloat(amount),
      selectedCrypto.symbol || '',
      selectedCrypto.network || null
    );
  }, [cryptoType, amount, availableCryptos]);

  // Update the calculate function to use 3 decimals
  const calculateCryptoAmount = (investment: number, symbol: string) => {
    const price = cryptoPrices[symbol.toLowerCase()]?.usd || 0;
    return price > 0 ? (investment / price).toFixed(3) : '0';
  };

  const validateAmount = (value: string) => {
    const numValue = parseFloat(value);
    if (!value || isNaN(numValue)) {
      setAmountError("Please enter a valid amount");
      return false;
    }
    if (numValue <= 0) {
      setAmountError("Amount must be greater than 0");
      return false;
    }
    if (numValue < 10) {
      setAmountError("Minimum deposit amount is $10");
      return false;
    }
    if (numValue > 10000000) {
      setAmountError("Maximum deposit amount is $10,000,000");
      return false;
    }
    setAmountError("");
    return true;
  };

  // Update the amount input to prevent negative values
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow positive numbers
    if (value && parseFloat(value) < 0) return;
    
    setAmount(value);
    validateAmount(value);
  };

  function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(" ");
  }

  // Add function to handle promo code application
  const handleApplyPromoCode = async () => {
    try {
      setIsApplyingPromo(true);
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', promoInput)
        .eq('is_active', true)
        .gt('expiry_date', new Date().toISOString())
        .single();

      if (error || !data) {
        toast({
          title: "Invalid Code",
          description: "This promo code is invalid or has expired",
          variant: "destructive"
        });
        return;
      }

      // Validate amount restrictions
      const amountValue = parseFloat(amount || '0');
      if (amountValue < data.min_amount) {
        toast({
          title: "Invalid Amount",
          description: `Minimum amount for this code is $${data.min_amount}`,
          variant: "destructive"
        });
        return;
      }

      if (data.max_amount && amountValue > data.max_amount) {
        toast({
          title: "Invalid Amount",
          description: `Maximum amount for this code is $${data.max_amount}`,
          variant: "destructive"
        });
        return;
      }

      setSelectedPromocode(data);
      setPromoInput("");
      toast({
        title: "Success",
        description: "Promo code applied successfully"
      });
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast({
        title: "Error",
        description: "Failed to apply promo code",
        variant: "destructive"
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Add this useEffect to set the first crypto option by default
  useEffect(() => {
    if (availableCryptos.length > 0 && !cryptoType) {
      const firstCrypto = availableCryptos[0];
      const displayName = formatCryptoDisplayName(firstCrypto);
      if (displayName) {
        setCryptoType(displayName);
      }
    }
  }, [availableCryptos]);

  // Update truncateAddress to be more defensive
  const truncateAddress = (address: string | null | undefined, start = 6, end = 4) => {
    if (!address) return '';
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  };

  // Add function to fetch deposit history
  const fetchDepositHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Format deposits to match Transaction interface with status mapping
      const formattedDeposits = (data || []).map(deposit => ({
        ...deposit,
        type: 'deposit',
        status: deposit.status === 'approved' ? 'Completed' : 
                deposit.status === 'rejected' ? 'Failed' : deposit.status,
        description: `Deposit ${deposit.crypto_symbol} ${deposit.network ? `via ${deposit.network}` : ''}`,
        statusColor: deposit.status === 'rejected' ? '#FF005C' : undefined
      }));
      
      setDeposits(formattedDeposits);
    } catch (error) {
      console.error('Error fetching deposit history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to fetch deposit history
  useEffect(() => {
    fetchDepositHistory();
  }, []);

  // Add copy handler for TransactionTable
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  const filteredAndSortedDeposits = [...deposits].sort((a, b) => {
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

  const handleBalanceClick = () => {
    if (window.location.pathname === '/cashier') {
      window.location.reload();
    } else {
      navigate('/cashier');
    }
  };

  // Fetch user profile for NameDialog
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single();
      setUserProfile(data);
    };
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Topbar 
        title="Cashier"
        leftContent={
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="regular" />
          </Button>
        }
      />

      <div className="container mx-auto max-w-[1000px] px-4 py-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <Tabs defaultValue="add-funds" className="w-full">
            <div className="flex items-center justify-between w-full">
              <TabsList className="grid grid-cols-2 w-[200px] sm:w-[300px]">
                <TabsTrigger value="add-funds">Add Funds</TabsTrigger>
                <TabsTrigger value="withdraw">Payouts</TabsTrigger>
              </TabsList>
              
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2 text-xs sm:text-sm"
                onClick={() => setShowPromoDialog(true)}
              >
                <span className="hidden sm:inline">Have a Promocode?</span>
                <span className="sm:hidden">Have Code?</span>
                <Badge variant="secondary">PROMO</Badge>
              </Button>
            </div>

            <TabsContent value="add-funds">
              <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="space-y-6">
                  {/* Remove Card and CardContent wrappers for deposit form */}
                  <form>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="crypto" className="text-foreground">Currency</Label>
                        <Select
                          value={cryptoType || ''}
                          onValueChange={setCryptoType}
                        >
                          <SelectTrigger className="bg-secondary border-none text-foreground">
                            <SelectValue placeholder="Select cryptocurrency" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto sm:max-h-none">
                            {/* Group USDT and USDC first, showing all networks and displaying the network */}
                            {['usdt', 'usdc'].flatMap(symbol => {
                              return availableCryptos
                                .filter(c => c.symbol.toLowerCase() === symbol)
                                .map(crypto => {
                                  const price = cryptoPrices[crypto.symbol.toLowerCase()]?.usd || 0;
                                  const displayName = formatCryptoDisplayName(crypto);
                                  if (!displayName) return null;
                                  return (
                                    <SelectItem key={displayName} value={displayName}>
                                      <div className="flex items-center justify-between w-full gap-4">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {crypto.logo_url && (
                                            <img src={crypto.logo_url} alt={crypto.name} className="w-6 h-6" />
                                          )}
                                          <span className="truncate">{crypto.name} ({crypto.symbol.toUpperCase()})</span>
                                          {crypto.network && (
                                            <span className="ml-2 px-2 py-0.5 rounded bg-secondary-foreground text-xs text-foreground">
                                              {crypto.network}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground ml-auto">
                                          ${price.toLocaleString()}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                });
                            })}
                            {/* Divider if there are other cryptos */}
                            {availableCryptos.some(
                              c => !['usdt', 'usdc'].includes(c.symbol.toLowerCase())
                            ) && (
                              <div className="px-2 py-1 text-xs text-muted-foreground">Other Cryptos</div>
                            )}
                            {/* Render the rest */}
                            {availableCryptos
                              .filter(c => !['usdt', 'usdc'].includes(c.symbol.toLowerCase()))
                              .map(crypto => {
                                const price = cryptoPrices[crypto.symbol.toLowerCase()]?.usd || 0;
                                // Only show the network as a badge if present, not the full displayName
                                return (
                                  <SelectItem key={formatCryptoDisplayName(crypto)} value={formatCryptoDisplayName(crypto)}>
                                    <div className="flex items-center justify-between w-full gap-4">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {crypto.logo_url && (
                                          <img src={crypto.logo_url} alt={crypto.name} className="w-6 h-6" />
                                        )}
                                        <span className="truncate">{crypto.name} ({crypto.symbol.toUpperCase()})</span>
                                        {/* Do not display network for other cryptos */}
                                      </div>
                                      <span className="text-sm font-medium text-muted-foreground ml-auto">
                                        ${price.toLocaleString()}
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount Input */}
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-foreground">Enter the amount you're depositing</Label>
                        <div className="relative">
                          <Input
                            id="amount"
                            type="number"
                            min="0"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={handleAmountChange}
                            className="pr-16 bg-secondary border-none text-foreground placeholder:text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-foreground">
                            USD
                          </div>
                        </div>
                        {amountError && (
                          <p className="text-sm text-destructive">{amountError}</p>
                        )}
                      </div>

                      {/* Deposit Details Section */}
                      {cryptoType && amount && !amountError && (
                        <div className="space-y-4">
                          <div className="rounded-xl bg-secondary overflow-hidden">
                            {/* Amount Display */}
                            <div className="p-3 sm:p-5 bg-secondary border-b border-secondary">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                                <div>
                                  <div className="text-sm text-foreground mb-1">You're Sending</div>
                                  <div className="text-xl font-mono sm:text-2xl font-semibold text-foreground">
                                    ${parseFloat(amount).toLocaleString()} USD
                                  </div>
                                </div>
                                <div className="sm:text-right">
                                  <div className="text-sm text-foreground mb-1">You'll Get</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xl sm:text-2xl font-semibold text-primary break-all">
                                      {calculateCryptoAmount(parseFloat(amount || '0'), availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType)?.symbol || '')}
                                    </div>
                                    <div className="text-bold sm:text-lg text-foreground">
                                      {availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType)?.symbol.toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 sm:p-5 space-y-4">
                              {/* QR Code */}
                              {qrCodeUrl && (
                                <div className="flex justify-center mb-4">
                                  <div className="p-2 sm:p-3 bg-foreground rounded-lg">
                                    <img src={qrCodeUrl} alt="Deposit QR Code" className="w-32 h-32 sm:w-40 sm:h-40" />
                                  </div>
                                </div>
                              )}

                              {/* Deposit Address */}
                              <div>
                                <div className="text-sm text-foreground/60 mb-2">Deposit Address</div>
                                <div className="flex items-center gap-2 bg-secondary-foreground rounded-lg p-2 sm:p-3">
                                  <code className="flex-1 font-mono text-xs sm:text-sm text-foreground break-all sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap">
                                    {availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType)?.deposit_address}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-[#1E1E1E] border-0 hover:bg-[#252525]"
                                    type="button"
                                    onClick={() => handleCopyAddress(availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType)?.deposit_address || '')}
                                  >
                                    <Copy className="text-white h-4 w-4 sm:h-5 sm:w-5" weight="bold" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    
                    </div>
                    <div className="mt-6">
                      <Button 
                        type="submit"
                        className="w-full bg-primary text-white"
                        size="lg"
                        disabled={!amount || !cryptoType || !!amountError}
                        onClick={async (e) => {
                          e.preventDefault();
                          const selectedCrypto = availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType);
                          if (selectedCrypto) {
                            await handleSubmit(parseFloat(amount));
                            navigate('/platform');
                          }
                        }}
                      >
                        Confirm Deposit
                      </Button>
                    </div>
                  </form>

                  {/* Promo code section */}
                  {selectedPromocode && (
                    <div className="rounded-lg bg-[#212121] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">Applied Code:</span>
                        <Badge>{selectedPromocode.code}</Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={selectedPromocode.type === 'multiplier' ? 'default' : 'outline'}>
                            {selectedPromocode.type === 'multiplier' ? '2X Deposit' : `${selectedPromocode.discount_percentage}% Cashback`}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedPromocode.description}
                        </p>
                      </div>

                      {amount && (
                        <div className="space-y-2 pt-2 border-t border-[#212121]">
                          <div className="flex justify-between text-sm">
                            <span className="text-secondary-foreground">Original Amount</span>
                            <span className="text-secondary">${parseFloat(amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-primary">Final Amount</span>
                            <span className="text-primary">${calculateFinalAmount(parseFloat(amount)).toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      <Button 
                        variant="secondary" 
                        className="w-full hover:bg-secondary/80"
                        onClick={() => setSelectedPromocode(null)}
                      >
                        Remove Code
                      </Button>
                    </div>
                  )}
                </div>
                {/* System Info - Hidden on Mobile */}
                <div className="hidden md:block">
                  <Card className="border-none bg-secondary h-fit">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="font-semibold text-foreground mb-4">System Information</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Average Payment Time</span>
                          <span className="text-sm text-foreground">5 Mins</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Fees</span>
                          <span className="text-sm text-foreground">0 USD</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">System Status</span>
                          <span className="text-sm text-success">100% Uptime</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Blockchain Status</span>
                          <span className="text-sm text-success">87.32% Uptime</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {/* Remove Card and CardContent wrappers for deposit history */}
              <div className="mt-8">
                {/* Deposit History Header and Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-foreground">Deposit History</h2>
                    <div className="flex items-center gap-2">
                      <Select
                        id="history-filter"
                        value={historySortField}
                        onValueChange={setHistorySortField}
                      >
                        <SelectTrigger className="w-[120px] bg-secondary border-none text-foreground">
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
                        className="text-foreground bg-secondary hover:bg-secondary/80"
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
                </div>
                <div className="border-b border-foreground/10 mb-2" />
                {/* Filtered and sorted table */}
                {isLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <div className="mt-4 text-sm text-muted-foreground">Loading deposits...</div>
                  </div>
                ) : filteredAndSortedDeposits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No deposits found
                  </div>
                ) : (
                  <TransactionTable 
                    transactions={filteredAndSortedDeposits}
                    onCopyId={handleCopyId}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="withdraw" className="w-full">
              {/* Render Withdrawals page instead of placeholder */}
              <Withdrawals />
              {/* Transaction table below the form */}
              {/* You may remove the transaction table below if Withdrawals already includes it */}
              {/* 
              <div className="mt-8">
                <Card className="border-none bg-black">
                  <CardContent className="p-6">
                    {isLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <div className="mt-4 text-sm text-muted-foreground">Loading deposits...</div>
                      </div>
                    ) : deposits.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No deposits found
                      </div>
                    ) : (
                      <TransactionTable 
                        transactions={deposits}
                        onCopyId={handleCopyId}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
              */}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Promo Code Dialog */}
      <AlertDialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <AlertDialogContent className="max-w-full w-[95vw] sm:w-[400px] p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-2xl font-bold">Enter Promo Code</AlertDialogTitle>
            <AlertDialogDescription className="text-base sm:text-lg">
              Enter your promo code to get special bonuses on your deposit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex gap-2 py-4">
            <Input
              placeholder="Enter code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              className="uppercase placeholder:text-foreground"
            />
            <Button 
              variant="outline"
              disabled={!promoInput || isApplyingPromo}
              onClick={() => {
                handleApplyPromoCode();
                if (!isApplyingPromo) setShowPromoDialog(false);
              }}
            >
              Apply
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}