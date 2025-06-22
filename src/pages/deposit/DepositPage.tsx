import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/shared/Topbar";
import { supabase } from "@/lib/supabase";
import { Copy } from "@phosphor-icons/react"; // Changed from lucide-react
import { useToast } from "@/hooks/use-toast";
import QRCodeStyling from "qr-code-styling";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label"; // Add this import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { KycVariant } from "@/components/shared/KycVariants";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { PlatformSidebar } from "@/components/shared/PlatformSidebar";

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

// --- Withdrawals Types ---
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
  kyc_status: 'pending' | 'completed' | 'rejected' | null;
}

export default function CashierPage() {
  const { profile, loading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- Withdrawals State ---
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [withdrawForm, setWithdrawForm] = useState<WithdrawalFormData>({
    amount: '',
    cryptoId: '',
    network: '',
    walletAddress: '',
  });
  const [withdrawIsSubmitting, setWithdrawIsSubmitting] = useState(false);
  const [withdrawAmountError, setWithdrawAmountError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<'pending' | 'processing' | 'completed' | 'rejected' | 'required'>('pending');
  const [kycDate, setKycDate] = useState<Date | undefined>(undefined);
  const [withdrawTransactions, setWithdrawTransactions] = useState<any[]>([]);
  const [withdrawHistorySortField, setWithdrawHistorySortField] = useState<'date' | 'amount' | 'status'>('date');
  const [withdrawHistorySortDirection, setWithdrawHistorySortDirection] = useState<'asc' | 'desc'>('desc');
  const [withdrawCopied, setWithdrawCopied] = useState(false);
  const [withdrawAddressError, setWithdrawAddressError] = useState<string | null>(null);

  const qrCodeRef = useRef<HTMLDivElement>(null); // Add this ref

  useEffect(() => {
    if (currentUser) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [currentUser]);

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
  
  // Memoize availableCryptos
  const availableCryptos = useMemo(() => {
    return depositMethods
      .filter(m => m.method === 'crypto' && m.is_active)
      .map(m => ({
        symbol: m.crypto_symbol!,
        name: m.crypto_name!,
        network: m.network,
        logo_url: m.logo_url,
        deposit_address: m.deposit_address
      }));
  }, [depositMethods]);

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
      if (!currentUser) throw new Error('Not authenticated');
      const selectedCrypto = availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType);
      if (!selectedCrypto?.symbol || !selectedCrypto?.name) {
        throw new Error('Please select a valid cryptocurrency');
      }
      const finalAmount = calculateFinalAmount(investment);
      const { data, error } = await supabase.from('deposits').insert({
        user_id: currentUser.id,
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
      navigate('/platform');
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while submitting the deposit request.",
        variant: "destructive"
      });
    }
  };

  // Replace generateQRCode with qr-code-styling logic
  const generateQRCode = (
    address: string | null | undefined,
    amount: number,
    symbol: string | null | undefined,
    net: string | null
  ) => {
    if (!address || !symbol || amount <= 0) return;

    // Format the URI according to BIP21/EIP67 standards for wallet compatibility
    let qrData;
    const cryptoAmount = calculateCryptoAmount(amount, symbol);
    const cleanSymbol = symbol.toLowerCase();

    switch (cleanSymbol) {
      case "btc":
        qrData = `bitcoin:${address}?amount=${cryptoAmount}`;
        break;
      case "eth":
        qrData = `ethereum:${address}${net ? `@${net}` : ""}?value=${cryptoAmount}`;
        break;
      case "bnb":
        if (net?.toLowerCase().includes("bsc")) {
          qrData = `bnb:${address}@56?amount=${cryptoAmount}`;
        } else {
          qrData = `bnb:${address}?amount=${cryptoAmount}`;
        }
        break;
      default:
        qrData = `${cleanSymbol}:${address}?amount=${cryptoAmount}${net ? `&network=${net}` : ""}`;
    }

    // Find the logo for the selected crypto
    const selectedCrypto = availableCryptos.find(
      (c) => c.symbol.toLowerCase() === cleanSymbol && (!net || c.network === net)
    );
    const logoImage = selectedCrypto?.logo_url || "";

    // Create and render QR code (bigger, rounded, with logo in center)
    const qrCode = new QRCodeStyling({
      width: 240,
      height: 240,
      data: qrData,
      dotsOptions: {
        color: "#000000",
        type: "extra-rounded"
      },
      backgroundOptions: {
        color: "#ffffff"
      },
      image: logoImage,
      imageOptions: {
        crossOrigin: "anonymous",
        hideBackgroundDots: true,
        imageSize: 0.25, // 25% of QR code area
        margin: 2
      }
    });

    if (qrCodeRef.current) {
      qrCodeRef.current.innerHTML = ""; // Clear previous QR
      qrCode.append(qrCodeRef.current);
    }
  };

  // Update effect to watch for amount changes and regenerate QR code
  useEffect(() => {
    const selectedCrypto = availableCryptos.find(
      (c) => formatCryptoDisplayName(c) === cryptoType
    );
    if (
      !selectedCrypto?.deposit_address ||
      !amount ||
      isNaN(parseFloat(amount))
    ) {
      if (qrCodeRef.current) qrCodeRef.current.innerHTML = "";
      return;
    }

    generateQRCode(
      selectedCrypto.deposit_address,
      parseFloat(amount),
      selectedCrypto.symbol || "",
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
    // Determine selected crypto symbol for min amount logic
    let selectedSymbol = "";
    if (cryptoType) {
      const selectedCrypto = availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType);
      selectedSymbol = selectedCrypto?.symbol?.toLowerCase() || "";
    }
    // BTC/ETH: $50 min, others: $10 min
    if ((selectedSymbol === "btc" || selectedSymbol === "eth") && numValue < 50) {
      setAmountError("Minimum deposit amount for BTC and ETH is $50");
      return false;
    }
    if (!(selectedSymbol === "btc" || selectedSymbol === "eth") && numValue < 10) {
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
          variant: "destructive",
          className: "text-white"
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
        title: "Promo code applied!",
        description: getPromoDescription(data),
        className: "text-green-600 font-bold"
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

  // Add function to fetch deposit history from transactions table
  const fetchDepositHistory = async () => {
    try {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('type', 'deposit')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format transactions to match TransactionTable expectations
      const formattedDeposits = (data || []).map(tx => ({
        ...tx,
        type: 'deposit',
        status: tx.status,
        amount: tx.amount,
        created_at: tx.created_at,
        crypto_symbol: tx.method,
        description: tx.description,
        network: undefined, // If you want to display network, you can join with deposits table if needed
      }));

      setDeposits(formattedDeposits);
    } catch (error) {
      console.error('Error fetching deposit history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchDepositHistory();
  }, [currentUser]);
  
  // Add copy handler for TransactionTable
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  // Memoize filteredAndSortedDeposits
  const filteredAndSortedDeposits = useMemo(() => {
    return [...deposits].sort((a, b) => {
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
  }, [deposits, historySortField, historySortDirection]);

  const handleBalanceClick = () => {
    if (window.location.pathname === '/cashier') {
      window.location.reload();
    } else {
      navigate('/cashier');
    }
  };

  // --- Withdrawals Effects ---
  useEffect(() => {
    fetchWithdrawals();
    fetchUserBalance();
    fetchKycStatus();
    fetchWithdrawalTransactions();
  // eslint-disable-next-line
  }, [currentUser]);

  // --- Withdrawals Functions ---
  const fetchWithdrawals = async () => {
    try {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (error) return;
      setWithdrawals(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load withdrawal history",
        variant: "destructive"
      });
    }
  };
  const fetchUserBalance = async () => {
    try {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', currentUser.id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { id: currentUser.id, withdrawal_wallet: 0, investment_wallet: 0 }
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
      toast({
        title: "Error",
        description: "Failed to load withdrawal wallet balance. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };
  const fetchKycStatus = async () => {
    try {
      if (!currentUser) return;
      // Fetch the latest KYC record for the user from the kyc table
      const { data: kycArr, error } = await supabase
        .from('kyc')
        .select('status, updated_at')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      let kycDateValue: Date | undefined = undefined;
      let kycStatusValue: 'pending' | 'processing' | 'completed' | 'rejected' | 'required' = 'pending';
      if (Array.isArray(kycArr) && kycArr.length > 0) {
        kycStatusValue = kycArr[0]?.status || 'pending';
        if (kycArr[0]?.updated_at) {
          kycDateValue = new Date(kycArr[0].updated_at);
        }
      }
      setKycStatus(kycStatusValue);
      setKycDate(kycDateValue);
    } catch (error) {
      // fallback to pending
      setKycStatus('pending');
      setKycDate(undefined);
    }
  };
  const fetchWithdrawalTransactions = async () => {
    try {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((w: Withdrawal) => ({
        id: w.id,
        amount: w.amount,
        status: w.status,
        created_at: w.created_at,
        updated_at: w.updated_at,
        type: 'withdrawal',
        description: `Withdrawal ${w.crypto_symbol || ''} ${w.network ? `via ${w.network}` : ''}`,
        wallet_address: w.wallet_address,
        crypto_symbol: w.crypto_symbol,
        network: w.network,
      }));
      setWithdrawTransactions(mapped);
    } catch {}
  };
  const getNetworksForCrypto = (cryptoSymbol: string): string[] => {
    return depositMethods
      .filter(m => m.crypto_symbol === cryptoSymbol && m.network)
      .map(m => m.network!)
      .filter((value, index, self) => self.indexOf(value) === index);
  };
  const withdrawCryptoOptions = [...new Set(
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
  const withdrawSelectedCrypto = withdrawCryptoOptions.find(c => c.id === withdrawForm.cryptoId);
  const withdrawNetworks = withdrawForm.cryptoId ? 
    getNetworksForCrypto(depositMethods.find(m => m.id === withdrawForm.cryptoId)?.crypto_symbol || '') : 
    [];
  const validateWithdrawAmount = (amount: string) => {
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      setWithdrawAmountError("Please enter a valid amount");
      return false;
    }
    if (amountValue > userBalance) {
      setWithdrawAmountError("Amount exceeds available balance");
      return false;
    }
    const selectedPaymentMethod = depositMethods.find(m => m.id === withdrawForm.cryptoId);
    if (selectedPaymentMethod && amountValue < selectedPaymentMethod.min_amount) {
      setWithdrawAmountError(`Minimum withdrawal amount is $${selectedPaymentMethod.min_amount}`);
      return false;
    }
    setWithdrawAmountError(null);
    return true;
  };
  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    setWithdrawForm(prev => ({ ...prev, amount: newAmount }));
    validateWithdrawAmount(newAmount);
  };
  const handleWithdrawAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWithdrawForm(prev => ({ ...prev, walletAddress: value }));
    // Validate address on change
    const selectedMethod = depositMethods.find(m => m.id === withdrawForm.cryptoId);
    const network = selectedMethod?.network || withdrawForm.network;
    if (!isValidAddress(value, network)) {
      setWithdrawAddressError("Invalid wallet address for selected network.");
    } else {
      setWithdrawAddressError(null);
    }
  };
  const canSubmit = 
    kycStatus === 'completed' &&
    !withdrawIsSubmitting &&
    !withdrawAmountError &&
    !withdrawAddressError &&
    withdrawForm.cryptoId &&
    withdrawForm.network &&
    withdrawForm.walletAddress &&
    withdrawForm.amount &&
    parseFloat(withdrawForm.amount) > 0;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawIsSubmitting) return; // Prevent double submit
    if (kycStatus !== 'completed') {
      toast({
        title: "KYC Required",
        description: "Please complete your KYC verification before making withdrawals.",
        variant: "destructive",
      });
      return;
    }
    try {
      const amountValue = parseFloat(withdrawForm.amount);
      if (!withdrawForm.cryptoId) {
        toast({
          title: "Error",
          description: "Please select a cryptocurrency.",
          variant: "destructive",
        });
        return;
      }
      if (!withdrawForm.network) {
        toast({
          title: "Error",
          description: "Please select a network.",
          variant: "destructive",
        });
        return;
      }
      if (!withdrawForm.walletAddress) {
        toast({
          title: "Error",
          description: "Please enter your wallet address.",
          variant: "destructive",
        });
        return;
      }
      // Validate wallet address using isValidAddress
      const selectedPaymentMethod = depositMethods.find(m => m.id === withdrawForm.cryptoId);
      const network = selectedPaymentMethod?.network || withdrawForm.network;
      if (!isValidAddress(withdrawForm.walletAddress, network)) {
        toast({
          title: "Error",
          description: "Invalid wallet address for the selected network.",
          variant: "destructive",
        });
        setWithdrawAddressError("Invalid wallet address for selected network.");
        return;
      }
      const selectedCrypto = depositMethods.find(m => m.id === withdrawForm.cryptoId);
      if (!selectedCrypto) throw new Error('Invalid cryptocurrency selected');
      setWithdrawIsSubmitting(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: currentUser.id,
          amount: parseFloat(withdrawForm.amount),
          crypto_name: selectedCrypto.crypto_name,
          crypto_symbol: selectedCrypto.crypto_symbol,
          network: withdrawForm.network,
          wallet_address: withdrawForm.walletAddress,
          status: 'Pending'
        })
        .select()
        .single();
      if (error) throw error;
      toast({
        title: "Withdrawal Request Submitted",
        description: `Your withdrawal request for $${withdrawForm.amount} via ${selectedCrypto.crypto_name} has been submitted.`,
      });
      setWithdrawForm({
        amount: '',
        cryptoId: '',
        network: '',
        walletAddress: '',
      });
      fetchWithdrawals();
      fetchWithdrawalTransactions();
      fetchUserBalance();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive"
      });
    } finally {
      setWithdrawIsSubmitting(false);
    }
  };
  const handleWithdrawCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setWithdrawCopied(true);
      setTimeout(() => setWithdrawCopied(false), 2000);
    } catch {}
  };
  const withdrawPending = withdrawals.filter(w => w.status === 'Pending').reduce((sum, w) => sum + w.amount, 0);
  const withdrawSuccess = withdrawals.filter(w => w.status === 'Completed').reduce((sum, w) => sum + w.amount, 0);
  const filteredAndSortedWithdrawTransactions = [...withdrawTransactions]
    .sort((a, b) => {
      if (withdrawHistorySortField === 'amount') {
        return withdrawHistorySortDirection === 'asc'
          ? a.amount - b.amount
          : b.amount - a.amount;
      }
      if (withdrawHistorySortField === 'status') {
        return withdrawHistorySortDirection === 'asc'
          ? (a.status || '').localeCompare(b.status || '')
          : (b.status || '').localeCompare(a.status || '');
      }
      return withdrawHistorySortDirection === 'asc'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Add a utility function for address validation (basic for USDT/USDC: TRC20, ERC20, etc.)
  function isValidAddress(address: string, network: string): boolean {
    if (!address) return false;
    // TRC20 (starts with T, 34 chars)
    if (network?.toUpperCase().includes('TRC20')) {
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    }
    // ERC20 (Ethereum, starts with 0x, 42 chars)
    if (network?.toUpperCase().includes('ERC20')) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    // BEP20 (same as ERC20)
    if (network?.toUpperCase().includes('BEP20')) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    // Add more networks as needed
    // Fallback: require at least 20 chars
    return address.length >= 20;
  }

  // Manual sanitization function (basic)
  function sanitize(str: string | undefined | null): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // If you don't already have a Spinner component, you can use a minimal inline spinner:
  function Spinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
    const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
    return (
      <svg className={`animate-spin text-white ${sizes[size] || sizes.sm}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    );
  }

  // --- Tab state synced with URL ---
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState(tabParam === "payout" ? "withdraw" : "add-funds");

  // Sync tab state with URL param
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "payout" && tab !== "withdraw") {
      setTab("withdraw");
    } else if ((!currentTab || currentTab === "deposit") && tab !== "add-funds") {
      setTab("add-funds");
    }
  }, [searchParams]);

  // When tab changes, update URL param
  const handleTabChange = (value: string) => {
    setTab(value);
    if (value === "withdraw") {
      setSearchParams({ tab: "payout" });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Topbar at the top */}
      <Topbar title="Cashier" />
      {/* Flex row: sidebar and main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar for desktop */}
        <PlatformSidebar />
        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="container mx-auto max-w-[1200px] px-4 py-6 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
                <div className="flex items-center justify-between w-full">
                  <TabsList className="grid grid-cols-2 w-[200px] sm:w-[300px]">
                    <TabsTrigger value="add-funds">Add Funds</TabsTrigger>
                    <TabsTrigger value="withdraw">Payout</TabsTrigger>
                  </TabsList>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2 text-xs sm:text-sm rounded-md"
                    onClick={() => setShowPromoDialog(true)}
                  >
                    <span className="hidden sm:inline">Have a Promocode?</span>
                    <span className="sm:hidden">Have Code?</span>
                    <Badge variant="secondary">PROMO</Badge>
                  </Button>
                </div>

                <TabsContent value="add-funds">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-6 max-w-[400px]">
                      {/* Deposit form remains unchanged */}
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
                                              <span className="truncate">{sanitize(crypto.name)} ({crypto.symbol.toUpperCase()})</span>
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
                                          <span className="truncate">{sanitize(crypto.name)} ({crypto.symbol.toUpperCase()})</span>
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
                          <div className="relative">
                            <Input
                              id="amount"
                              type="number"
                              min="0"
                              value={amount}
                              label="Amount"
                              onChange={handleAmountChange}
                              className="pr-16 bg-secondary border-none text-foreground placeholder:text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              helperText={
                                selectedPromocode && !amountError && amount && !isNaN(parseFloat(amount)) ? (() => {
                                  const baseAmount = parseFloat(amount);
                                  let bonus = 0;
                                  if (selectedPromocode.type === 'multiplier') {
                                    bonus = baseAmount;
                                  } else if (selectedPromocode.type === 'cashback') {
                                    bonus = baseAmount * (selectedPromocode.discount_percentage / 100);
                                  }
                                  return bonus > 0
                                    ? `Bonus applied: $${bonus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : undefined;
                                })() : undefined
                              }
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-foreground">
                              USD
                            </div>
                          </div>
                          {amountError && (
                            <p className="text-sm text-destructive">{amountError}</p>
                          )}
                          {/* Helper badge for selected crypto and network */}
                          {cryptoType && (
                            <div className="mt-2 flex flex-col gap-1 max-w-full">
                              <div className="flex flex-row flex-wrap items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="flex flex-nowrap items-center gap-1 px-2 py-1 text-xs font-mono max-w-full rounded-md"
                                  style={{ minWidth: 0 }}
                                >
                                  {(() => {
                                    const selected = availableCryptos.find(
                                      (c) => formatCryptoDisplayName(c) === cryptoType
                                    );
                                    if (!selected) return null;
                                    const isUSDTorUSDC = ['usdt', 'usdc'].includes(selected.symbol.toLowerCase());
                                    return (
                                      <>
                                        {selected.logo_url && (
                                          <img
                                            src={selected.logo_url}
                                            alt={selected.name}
                                            className="w-4 h-4 mr-1 rounded-full bg-white border border-gray-200 flex-shrink-0"
                                            style={{ minWidth: '1rem', minHeight: '1rem' }}
                                          />
                                        )}
                                        <span className="font-semibold">{selected.symbol.toUpperCase()}</span>
                                        {isUSDTorUSDC && selected.network && (
                                          <span className="ml-2 px-2 py-0.5 rounded bg-muted text-xs text-foreground border border-muted-foreground whitespace-nowrap">
                                            {selected.network}
                                          </span>
                                        )}
                                        {/* Warning text inside the badge */}
                                        <span className="ml-2 text-xs text-gray-500 font-normal">
                                          Using wrong network/crypto results in permanent asset loss
                                        </span>
                                      </>
                                    );
                                  })()}
                                </Badge>
                              </div>
                            </div>
                          )}

                        {/* Deposit Details Section */}
                        {cryptoType && amount && !amountError && (
                          <div className="space-y-4 mt-6">
                            <div className="rounded-xl bg-secondary overflow-hidden">
                              {/* Amount Display */}
                              <div className="p-3 sm:p-5 bg-secondary border-b border-secondary">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                                  {/* Left: You're Sending (crypto) */}
                                  <div>
                                    <div className="text-sm text-foreground mb-1">You're Sending</div>
                                    <div className="flex items-center gap-2 text-xl font-mono sm:text-2xl font-semibold text-primary">
                                      {calculateCryptoAmount(parseFloat(amount || '0'), availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType)?.symbol || '')}
                                      <span className="text-bold sm:text-lg text-primary">
                                        {availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType)?.symbol.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Right: You'll Get (USD) */}
                                  <div className="sm:text-right">
                                    <div className="text-sm text-foreground mb-1">You'll Get</div>
                                    <div className="text-xl sm:text-2xl font-semibold text-foreground break-all">
                                      {parseFloat(amount).toLocaleString()} USD
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-3 sm:p-5 space-y-4">
                                {/* QR Code */}
                                <div className="flex justify-center mb-4">
                                  {/* Make the QR code itself rounded-xl, remove extra bg/rounded wrappers */}
                                  <div
                                    className="overflow-hidden rounded-xl flex items-center justify-center"
                                    style={{ width: 240, height: 240, background: "#fff" }}
                                  >
                                    <div ref={qrCodeRef} />
                                  </div>
                                </div>

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
                                      className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-secondary border-0 hover:bg-secondary-foreground rounded-md"
                                      type="button"
                                      onClick={() => handleCopyAddress(availableCryptos.find(c => formatCryptoDisplayName(c) === cryptoType)?.deposit_address || '')}
                                    >
                                      <Copy className="text-foreground h-4 w-4 sm:h-5 sm:w-5" weight="bold" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      
                      </div>
                    </form> {/* Close deposit form */}
                    </div> {/* Close grid column for deposit form */}
                  </div> {/* Close grid for add-funds */}
                </TabsContent>
                {/* Withdrawals tab remains unchanged */}
                <TabsContent value="withdraw" className="w-full">
                  {/* Withdrawals Implementation */}
                  <div className="w-full min-h-screen bg-background">
                    <div className="container max-w-[1200px] mx-auto">
                      {/* KYC Status */}
                      <div className="max-w-lg mx-auto mb-8">
                        {kycStatus !== 'completed' && (
                          <KycVariant status={kycStatus as any} date={kycDate} />
                        )}
                      </div>
                      {/* Withdraw Form only, payout history removed */}
                      <div className="grid gap-8 lg:grid-cols-2">
                        <div className="w-full max-w-[400px]"> {/* Withdraw form */}
                          {kycStatus === 'completed' ? (
                            <form onSubmit={handleWithdrawSubmit} className="space-y-6">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-normal">Select Currency</Label>
                                  <Select 
                                    value={withdrawForm.cryptoId || withdrawCryptoOptions[0]?.id} 
                                    onValueChange={(value) => {
                                      const selectedMethod = depositMethods.find(m => m.id === value);
                                      const network = selectedMethod?.network || '';
                                      setWithdrawForm(prev => ({ 
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
                                  <Label htmlFor="walletAddress" className="text-xs font-normal text-foreground">Wallet Address</Label>
                                  <Input
                                    id="walletAddress"
                                    placeholder={`Enter ${
                                      withdrawSelectedCrypto?.name?.toUpperCase() || 'USDT'
                                    } ${withdrawForm.network || 'TRC20'} address`}
                                    value={withdrawForm.walletAddress}
                                    onChange={handleWithdrawAddressChange}
                                    className="placeholder:text-foreground bg-secondary text-foreground"
                                  />
                                  {withdrawAddressError && (
                                    <p className="text-sm text-red-500">{withdrawAddressError}</p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="amount" className="text-xs font-normal text-foreground">Amount</Label>
                                  <div className="relative">
                                    <Input
                                      id="amount"
                                      type="number"
                                      min="0"
                                      placeholder="Enter amount"
                                      className={`${withdrawAmountError ? 'border-red-500' : ''} placeholder:text-foreground bg-secondary text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                      value={withdrawForm.amount}
                                      onChange={handleWithdrawAmountChange}
                                    />
                                    <span className="absolute right-3 top-2.5 text-foreground">USD</span>
                                  </div>
                                  {withdrawAmountError && (
                                    <p className="text-sm text-red-500">{withdrawAmountError}</p>
                                  )}
                                  {withdrawForm.amount && !withdrawAmountError && (
                                    <p className="text-sm text-muted-foreground">
                                      Your balance after withdrawal → {(userBalance - parseFloat(withdrawForm.amount)).toLocaleString()} USD
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-md" disabled={withdrawIsSubmitting || !canSubmit}>
                                {withdrawIsSubmitting ? "Processing..." : "Request Payout"}
                              </Button>
                            </form>
                          ) : null}
                        </div>
                        {/* Remove payout history column */}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          {/* Promo Code Dialog */}
          <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
            <DialogContent className="max-w-full w-[95vw] sm:w-[400px] p-4 sm:p-6 bg-background">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-2xl font-bold text-foreground">Enter Promo Code</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 py-4">
                <Input
                  label="Enter code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={handleApplyPromoCode}
                  disabled={isApplyingPromo || !promoInput}
                  className="w-full"
                >
                  {isApplyingPromo ? "Verifying..." : "Verify"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}