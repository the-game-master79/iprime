import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, Check, QrCode, ArrowRight, ArrowLeft, Info, Wallet } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Helper function to format crypto display name
const formatCryptoDisplayName = (symbol: string, network?: string | null) => {
  if (!network) return symbol.toUpperCase();
  return `${symbol.toUpperCase()} (${network})`;
};

interface Promocode {
  id: string;
  code: string;
  description: string;
  type: 'multiplier' | 'cashback';
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
  [key: string]: {
    usd: number;
  };
}

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepositSuccess?: () => void;
  onWithdrawSuccess?: () => void;
  currentUser: any;
  defaultTab?: 'deposit' | 'withdraw';
  isPayout?: boolean;
}

export function DepositDialog({ 
  open, 
  onOpenChange, 
  onDepositSuccess, 
  onWithdrawSuccess,
  currentUser, 
  defaultTab = 'deposit',
  isPayout = false
}: DepositDialogProps) {
  const { toast } = useToast();
  const [cryptoType, setCryptoType] = useState<string>("");
  const [network, setNetwork] = useState<string>("");
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, { usd: number }>>({});
  const [amount, setAmount] = useState<string>("");
  const [amountError, setAmountError] = useState<string>("");
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [selectedPromocode, setSelectedPromocode] = useState<Promocode | null>(null);
  const [promoInput, setPromoInput] = useState<string>("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [showDepositConfirm, setShowDepositConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(defaultTab);
  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawCrypto, setWithdrawCrypto] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [kycStatus, setKycStatus] = useState<'pending' | 'completed' | 'rejected' | null>(null);

  // Fetch user balance and KYC status
  useEffect(() => {
    setActiveTab(isPayout ? 'withdraw' : defaultTab);
  }, [defaultTab, isPayout]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch user balance and KYC status in parallel
        const [
          { data: profileData },
          { data: kycData }
        ] = await Promise.all([
          // Get user's balance
          supabase
            .from('profiles')
            .select('withdrawal_wallet')
            .eq('id', currentUser.id)
            .single(),
            
          // Get KYC status from kyc table
          supabase
            .from('kyc')
            .select('status')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        ]);
        
        if (profileData) {
          setUserBalance(profileData.withdrawal_wallet || 0);
        }
        
        // Set KYC status (default to null if no KYC record exists)
        setKycStatus(kycData?.status || null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setKycStatus(null);
      }
    };
    
    if (open) {
      fetchUserData();
    }
  }, [currentUser, open]);

  // Get unique payment methods and sort them in desired order
  const methodOrder = { crypto: 1, bank_transfer: 2, upi: 3 };
  const uniqueMethods = [...new Set(depositMethods.map(m => m.method))]
    .sort((a, b) => methodOrder[a] - methodOrder[b]);

  // Memoize availableCryptos for deposits (all cryptos) and withdrawals (only USDT/USDC)
  const availableCryptos = useMemo(() => {
    const methods = depositMethods.filter(m => m.method === 'crypto' && m.is_active);
    
    // For deposits, show all cryptos; for withdrawals, filter to only USDT and USDC
    const filteredMethods = activeTab === 'withdraw' 
      ? methods.filter(m => ['USDT', 'USDC'].includes(m.crypto_symbol?.toUpperCase() || ''))
      : methods;
    
    // Group by symbol
    const groupedCryptos = filteredMethods.reduce((acc, m) => {
      const symbol = m.crypto_symbol?.toLowerCase();
      if (!symbol) return acc;
      
      if (!acc[symbol]) {
        acc[symbol] = {
          symbol: symbol.toUpperCase(),
          name: m.crypto_name!,
          networks: [],
          logo_url: m.logo_url,
          isSingleNetwork: !m.network,
          deposit_address: m.deposit_address
        };
      }
      
      if (m.network) {
        acc[symbol].networks.push({
          id: `${symbol}-${m.network}`,
          name: m.network,
          deposit_address: m.deposit_address,
          network: m.network
        });
        
        // Set default network for USDT/USDC
        if (['USDT', 'USDC'].includes(symbol.toUpperCase())) {
          acc[symbol].defaultNetwork = m.network;
        }
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedCryptos);
  }, [depositMethods, activeTab]);

  // Fetch deposit methods and promocodes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch deposit methods
        const { data: methodsData, error: methodsError } = await supabase
          .from('deposit_methods')
          .select('*')
          .order('method', { ascending: true });

        if (methodsError) throw methodsError;
        setDepositMethods(methodsData || []);

        // Fetch active promocodes
        const { data: promocodesData, error: promosError } = await supabase
          .from('promocodes')
          .select('*')
          .eq('is_active', true);

        if (promosError) throw promosError;
        setPromocodes(promocodesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load deposit methods or promocodes",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

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
        'usdt': 'tether',
        'usdc': 'usd-coin',
        'sol': 'solana',
        'xrp': 'ripple',
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

  // Get selected crypto details
  const selectedCrypto = useMemo(() => {
    if (!cryptoType) return null;
    const crypto = availableCryptos.find(c => formatCryptoDisplayName(c.symbol, c.network) === cryptoType);
    return crypto;
  }, [cryptoType, availableCryptos]);

  // Auto-select network when crypto is selected and has only one network
  useEffect(() => {
    if (selectedCrypto?.networks?.length === 1) {
      setNetwork(selectedCrypto.networks[0].id);
    } else if (selectedCrypto?.defaultNetwork) {
      const defaultNetwork = selectedCrypto.networks?.find(
        n => n.network === selectedCrypto.defaultNetwork
      );
      if (defaultNetwork) {
        setNetwork(defaultNetwork.id);
      }
    }
  }, [selectedCrypto]);

  // Get selected network details (for USDT/USDC)
  const selectedNetwork = useMemo(() => {
    if (!selectedCrypto?.networks?.length || !network) return null;
    return selectedCrypto.networks.find(n => n.id === network);
  }, [selectedCrypto, network]);

  // Get current deposit address based on selection
  const currentDepositAddress = useMemo(() => {
    if (selectedCrypto?.isSingleNetwork) {
      return selectedCrypto.deposit_address || '';
    }
    if (selectedNetwork) {
      return selectedNetwork.deposit_address || '';
    }
    return '';
  }, [selectedCrypto, selectedNetwork]);

  // Reset copied status after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyAddress = () => {
    if (!currentDepositAddress) return;
    navigator.clipboard.writeText(currentDepositAddress);
    setCopied(true);
    toast({
      title: "Address copied to clipboard",
      variant: "default",
    });
  };

  // State for showing/hiding QR code
  const [showQRCode, setShowQRCode] = useState(false);

  // QR code component
  const renderQRCode = () => {
    if (!currentDepositAddress) return null;
    
    // Create a crypto URI with amount if available
    let uri = `crypto:${currentDepositAddress}`;
    if (amountValue > 0) {
      uri += `?amount=${amountValue}`;
    }
    
    return (
      <div className="flex flex-col items-center space-y-3">
        <div className="p-4 bg-white rounded-lg border-2 border-primary/20 shadow-sm">
          <QRCodeSVG
            value={uri}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Scan this QR code with your wallet
        </p>
      </div>
    );
  };

  const calculateFinalAmount = (baseAmount: number) => {
    if (!selectedPromocode) return baseAmount;
    
    switch (selectedPromocode.type) {
      case 'multiplier':
        return baseAmount * 2;
      case 'cashback':
        return baseAmount * (1 + selectedPromocode.discount_percentage / 100);
      default:
        return baseAmount;
    }
  };

  const getPromoDescription = (promo: Promocode) => {
    switch (promo.type) {
      case 'multiplier':
        return '2X Your Deposit';
      case 'cashback':
        return `${promo.discount_percentage}% Cashback to Withdrawal Wallet`;
      default:
        return '';
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and one decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      
      // Clear error if amount is valid
      if (value && parseFloat(value) >= minAmount) {
        setAmountError('');
      } else if (value) {
        setAmountError(`Minimum deposit amount is $${minAmount}`);
      } else {
        setAmountError('');
      }
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    
    setIsApplyingPromo(true);
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', promoInput.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) throw new Error('Invalid or expired promocode');
      
      setSelectedPromocode(data);
      setPromoInput('');
      setShowPromoDialog(false);
      
      toast({
        title: "Promo Applied",
        description: `Promo code ${data.code} has been applied successfully!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid or expired promocode",
        variant: "destructive"
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setSelectedPromocode(null);
  };

  // Determine minimum amount based on selected cryptocurrency
  const getMinAmount = () => {
    if (!cryptoType) return 10; // Default minimum
    const symbol = cryptoType.split('-')[0].toLowerCase();
    return (symbol === 'btc' || symbol === 'eth') ? 50 : 10;
  };
  const minAmount = getMinAmount();
  const amountValue = parseFloat(amount) || 0;
  const isAmountValid = amount && amountValue >= minAmount;
  const showAmountError = amount && !isAmountValid;
  const isFormValid = isAmountValid && cryptoType && (selectedCrypto?.isSingleNetwork || network);

  const validateBlockchainAddress = (address: string, network: string): { isValid: boolean; error?: string } => {
    if (!address) return { isValid: false, error: 'address:Wallet address is required' };
    
    const cleanAddress = address.trim();
    if (!cleanAddress) return { isValid: false, error: 'address:Wallet address cannot be empty' };
    
    // ERC20 (Ethereum) - 42 chars starting with 0x
    if (network === 'erc20') {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(cleanAddress);
      return {
        isValid,
        error: !isValid ? 'address:Invalid ERC20 address. Must be 42 characters long and start with 0x' : undefined
      };
    }
    
    // BEP20 (BSC) - 42 chars starting with 0x
    if (network === 'bep20') {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(cleanAddress);
      return {
        isValid,
        error: !isValid ? 'address:Invalid BEP20 address. Must be 42 characters long and start with 0x' : undefined
      };
    }
    
    // TRC20 (Tron) - 34 chars starting with T
    if (network === 'trc20') {
      const isValid = /^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(cleanAddress);
      return {
        isValid,
        error: !isValid ? 'address:Invalid TRC20 address. Must be 34 characters long and start with T' : undefined
      };
    }
    
    // Solana - 32-44 base58 chars
    if (network === 'solana') {
      const isValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddress);
      return {
        isValid,
        error: !isValid ? 'address:Invalid Solana address. Must be 32-44 base58 characters' : undefined
      };
    }
    
    // Default validation if network is not recognized
    const isValid = cleanAddress.length >= 20 && cleanAddress.length <= 60;
    return {
      isValid,
      error: !isValid ? 'address:Invalid wallet address' : undefined
    };
  };

  // Fetch user balance
  const fetchUserBalance = async () => {
    if (!currentUser) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserBalance(profile.balance || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  // Handle withdrawal amount change
  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWithdrawAmount(value);
    
    // Clear amount error when user starts typing
    if (withdrawError && value) {
      const amount = parseFloat(value);
      if (!isNaN(amount) && amount >= 10 && amount <= userBalance) {
        setWithdrawError('');
      }
    }
  };

  // Handle wallet address change
  const handleWithdrawAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWithdrawAddress(value);
    
    // Clear address error when user starts typing
    if (withdrawError && value) {
      const { isValid } = validateBlockchainAddress(value, withdrawNetwork);
      if (isValid) {
        setWithdrawError('');
      }
    }
  };

  // Handle crypto selection change
  const handleWithdrawCryptoChange = (value: string) => {
    setWithdrawCrypto(value);
    setWithdrawNetwork('');
    setWithdrawAddress('');
    setWithdrawError('');
  };

  // Handle network selection change
  const handleWithdrawNetworkChange = (value: string) => {
    setWithdrawNetwork(value);
    setWithdrawAddress('');
    setWithdrawError('');
  };

  // Check if withdraw form is valid
  const isWithdrawFormValid = useMemo(() => {
    // Check if all required fields are filled
    if (!withdrawAmount || !withdrawCrypto || !withdrawNetwork || !withdrawAddress) {
      return false;
    }

    // Check amount is valid
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 10 || amount > userBalance) {
      return false;
    }

    // Check if address is valid for the selected network
    if (withdrawAddress && withdrawNetwork) {
      const { isValid } = validateBlockchainAddress(withdrawAddress, withdrawNetwork);
      return isValid;
    }

    return false;
  }, [withdrawAmount, withdrawCrypto, withdrawNetwork, withdrawAddress, userBalance]);
  
  // Format error message to be more user-friendly
  const formatError = (error: string) => {
    if (!error) return '';
    // Remove the error type prefix (e.g., 'address:')
    return error.includes(':') ? error.split(':')[1] : error;
  };
  
  const confirmDeposit = async () => {
    if (!currentUser) return;
    
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 10) {
      setAmountError("Invalid deposit amount");
      return;
    }
    
    setIsDepositing(true);
    try {
      // Here you would typically process the deposit
      // For now, we'll just show a success message
      toast({
        title: "Deposit Instructions",
        description: `Please send $${depositAmount.toFixed(2)} ${cryptoType} to the provided address.`,
      });
      
      // Reset form
      setAmount("");
      setCryptoType("");
      setNetwork("");
      setShowDepositConfirm(false);
      
      // Notify parent component
      if (onDepositSuccess) {
        onDepositSuccess();
      }
    } catch (error) {
      console.error("Error processing deposit:", error);
      toast({
        title: "Error",
        description: "Failed to process deposit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDepositing(false);
    }
  };
  
  const handleDeposit = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to deposit",
        variant: "destructive"
      });
      return;
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 10) {
      setAmountError("Minimum deposit amount is $10");
      return;
    }
    
    // Get selected crypto details
    let selectedCrypto = availableCryptos.find(c => {
      // Check if the crypto matches the selected type (with or without network)
      const displayName = formatCryptoDisplayName(c.symbol, null);
      return displayName === cryptoType;
    });
    
    let selectedNetwork = null;
    
    // If crypto wasn't found, try to find it with network included in the cryptoType
    if (!selectedCrypto) {
      for (const crypto of availableCryptos) {
        if (crypto.networks?.length > 0) {
          for (const net of crypto.networks) {
            const displayName = formatCryptoDisplayName(crypto.symbol, net.network);
            if (displayName === cryptoType) {
              selectedCrypto = crypto;
              selectedNetwork = net;
              break;
            }
          }
          if (selectedCrypto) break;
        }
      }
    }
    
    // If we have a crypto with networks and no network is selected yet, use the one from the network state
    if (selectedCrypto?.networks?.length > 0 && !selectedNetwork) {
      selectedNetwork = selectedCrypto.networks.find(n => n.id === network);
    }
  
    if (!selectedCrypto?.symbol) {
      toast({
        title: "Error",
        description: "Please select a valid cryptocurrency",
        variant: "destructive"
      });
      return;
    }
    
    // For cryptos with networks, make sure a network is selected and valid
    if (selectedCrypto.networks?.length > 0) {
      if (!selectedNetwork) {
        // Try to find the network by the network state if it's not already set
        selectedNetwork = selectedCrypto.networks.find(n => n.id === network);
      }
      
      if (!selectedNetwork) {
        toast({
          title: "Error",
          description: "Please select a valid network",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsDepositing(true);
    try {
      // Get the deposit address based on whether a network was selected
      const depositAddress = selectedNetwork?.deposit_address || selectedCrypto.deposit_address;
      const networkName = selectedNetwork?.network || selectedCrypto.network;
      
      // Submit deposit to database
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          user_id: currentUser.id,
          amount: depositAmount,
          crypto_name: selectedCrypto.symbol,
          crypto_symbol: selectedCrypto.symbol,
          network: networkName,
          status: 'pending',
          promocode_id: selectedPromocode?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Apply promocode if available
      if (selectedPromocode) {
        const { error: promoError } = await supabase
          .rpc('apply_promocode', { 
            p_deposit_id: data.id,
            p_promocode_id: selectedPromocode.id 
          });

        if (promoError) throw promoError;
      }

      // Show success message with deposit instructions
      toast({
        title: "Deposit Request Submitted",
        description: `Your deposit request for $${depositAmount.toFixed(2)} ${selectedCrypto.symbol} has been submitted.`,
      });
      
      // Reset form
      setAmount("");
      setCryptoType("");
      setNetwork("");
      setSelectedPromocode(null);
      
      // Notify parent component
      if (onDepositSuccess) {
        onDepositSuccess();
      }
      
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error processing deposit:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process deposit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to withdraw",
        variant: "destructive"
      });
      return;
    }

    // Reset previous errors
    setWithdrawError('');

    // Validate KYC status
    if (kycStatus !== 'completed') {
      setWithdrawError("Please complete KYC verification before withdrawing");
      return;
    }

    // Validate amount
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 10) {
      setWithdrawError("amount:Please enter a valid amount (minimum $10)");
      return;
    }

    if (amount > userBalance) {
      setWithdrawError(`amount:Insufficient balance. Maximum withdrawal: $${userBalance.toFixed(2)}`);
      return;
    }

    // Validate network selection
    if (!withdrawNetwork) {
      setWithdrawError("network:Please select a network");
      return;
    }

    // Validate wallet address
    if (!withdrawAddress) {
      setWithdrawError("address:Please enter a wallet address");
      return;
    }

    // Validate wallet address format
    const { isValid, error } = validateBlockchainAddress(withdrawAddress, withdrawNetwork);
    if (!isValid) {
      setWithdrawError(error || 'address:Invalid wallet address');
      return;
    }

    setIsWithdrawing(true);
    try {
      const amount = parseFloat(withdrawAmount);
      
      // Get the selected crypto details
      const selectedCrypto = availableCryptos.find(c => c.symbol === withdrawCrypto);
      
      if (!selectedCrypto) {
        throw new Error('Selected cryptocurrency not found');
      }

      // Create withdrawal record in the database
      const { data: withdrawal, error } = await supabase
        .from('withdrawals')
        .insert([
          {
            user_id: currentUser.id,
            amount: amount,
            crypto_name: selectedCrypto.name,
            crypto_symbol: selectedCrypto.symbol,
            network: withdrawNetwork,
            wallet_address: withdrawAddress,
            status: 'Pending', // Ensure status matches the check constraint (case-sensitive)
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update user balance in the profiles table
      const { error: updateError } = await supabase.rpc('decrement_withdrawal_balance', {
        user_id: currentUser.id,
        amount: amount,
      });

      if (updateError) {
        // If the RPC function fails, try a direct update as fallback
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('withdrawal_wallet')
          .eq('id', currentUser.id)
          .single();
          
        if (profileError) throw profileError;
        
        const newBalance = (profile.withdrawal_wallet || 0) - amount;
        
        const { error: updateBalanceError } = await supabase
          .from('profiles')
          .update({ withdrawal_wallet: newBalance })
          .eq('id', currentUser.id);
          
        if (updateBalanceError) throw updateBalanceError;
      }

      // Refresh user balance
      await fetchUserBalance();

      // Show success message
      toast({
        title: "Withdrawal Requested",
        description: `Your withdrawal request of $${amount.toFixed(2)} ${selectedCrypto.symbol} has been submitted.`,
      });

      // Reset form
      setWithdrawAmount('');
      setWithdrawAddress('');
      setWithdrawNetwork('');
      setWithdrawCrypto('');

      // Close the dialog
      onOpenChange(false);

      // Notify parent component of successful withdrawal
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit withdrawal request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ... (rest of the code remains the same)

  const renderDepositTab = () => (
    <div className="space-y-6">
      {/* Cryptocurrency Selection */}
      <div className="space-y-2">
        <Select
          value={cryptoType}
          onValueChange={(value) => {
            setCryptoType(value);
            setNetwork('');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a cryptocurrency" />
          </SelectTrigger>
          <SelectContent>
            {availableCryptos.map((crypto) => (
              <SelectItem 
                key={`${crypto.symbol}-${crypto.network || 'default'}`} 
                value={formatCryptoDisplayName(crypto.symbol, crypto.network)}
              >
                <div className="flex items-center gap-2">
                  {crypto.logo_url && (
                    <img 
                      src={crypto.logo_url} 
                      alt={crypto.symbol} 
                      className="w-5 h-5"
                    />
                  )}
                  {formatCryptoDisplayName(crypto.symbol, crypto.network)}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Network Selection for USDT/USDC */}
      {selectedCrypto?.networks?.length > 0 && (
        <div className="space-y-2">
          <Select
            value={network}
            onValueChange={setNetwork}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a network" />
            </SelectTrigger>
            <SelectContent>
              {selectedCrypto.networks.map((net) => (
                <SelectItem key={net.id} value={net.id}>
                  {net.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Amount Input */}
      <div className="space-y-2">
        <Input
          label={`Enter amount (min $${minAmount})`}
          id="deposit-amount"
          type="text"
          value={amount}
          onChange={handleAmountChange}
          className={showAmountError ? 'border-red-500' : ''}
        />
        {showAmountError && (
          <p className="text-sm text-red-500">
            Minimum deposit amount is ${minAmount}
          </p>
        )}
      </div>

      {/* Promo Code */}
      <div className="space-y-2">
        <button 
          onClick={() => setShowPromoDialog(true)}
          className="text-sm text-primary hover:underline"
        >
          View Available Promos
        </button>
        {selectedPromocode && (
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <div>
              <div className="font-medium">{selectedPromocode.code}</div>
              <div className="text-sm text-muted-foreground">
                {getPromoDescription(selectedPromocode)}
              </div>
            </div>
            <button
              onClick={handleRemovePromo}
              className="text-sm text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Deposit Address */}
      {currentDepositAddress && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Deposit Address</Label>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 border rounded-md bg-muted/30 overflow-x-auto font-mono text-sm">
                {currentDepositAddress}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 w-9 p-0 flex-shrink-0"
                onClick={handleCopyAddress}
                title="Copy address"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            {showQRCode ? (
              <div className="flex justify-center">
                {renderQRCode()}
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowQRCode(true)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Show QR Code
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Deposit Button */}
      <div className="pt-2">
        <InteractiveHoverButton
          type="button"
          onClick={handleDeposit}
          disabled={!cryptoType || !amount || parseFloat(amount) < 10 || isDepositing}
          className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          dotColor="bg-background"
          hoverTextColor="text-foreground"
          title={!cryptoType ? 'Please select a cryptocurrency' : !amount ? 'Please enter an amount' : parseFloat(amount) < 10 ? 'Minimum deposit is $10' : ''}
        >
          {isDepositing ? 'Processing...' : 'Deposit'}
        </InteractiveHoverButton>
      </div>
    </div>
  );

  const renderWithdrawTab = () => (
    <>
      <div className="space-y-6">
        {/* Available Balance */}
        <div className="bg-secondary/30 rounded-xl p-6 mb-4 border border-primary/20">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Available for Payout</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              ${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Withdraw Form */}
        <div className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Input
              label="Amount (USD)"
              id="withdraw-amount"
              type="number"
              min="10"
              step="0.01"
              value={withdrawAmount}
              onChange={handleWithdrawAmountChange}
              className={`text-base ${withdrawError && withdrawError.includes('amount') ? 'border-red-500' : ''}`}
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                Minimum withdrawal: $10.00
              </p>
              {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
                <p className="text-xs text-muted-foreground">
                  Balance after Payout: ${(userBalance - parseFloat(withdrawAmount)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Cryptocurrency Selection - Only USDT and USDC */}
          <div className="space-y-2">
            <Select
              value={withdrawCrypto}
              onValueChange={handleWithdrawCryptoChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {availableCryptos
                  .filter(crypto => ['USDT', 'USDC'].includes(crypto.symbol))
                  .map((crypto) => (
                    <SelectItem 
                      key={`withdraw-${crypto.symbol}`}
                      value={crypto.symbol}
                    >
                      <div className="flex items-center gap-2">
                        {crypto.logo_url ? (
                          <img 
                            src={crypto.logo_url} 
                            alt={crypto.symbol} 
                            className="w-5 h-5"
                          />
                        ) : null}
                        {crypto.symbol}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Network Selection */}
          {withdrawCrypto && (
            <div className="space-y-2">
              <Select
                value={withdrawNetwork}
                onValueChange={handleWithdrawNetworkChange}
                disabled={!withdrawCrypto}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a network" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'erc20', name: 'ERC20 (Ethereum)' },
                    { id: 'bep20', name: 'BEP20 (BSC)' },
                    { id: 'trc20', name: 'TRC20 (Tron)' },
                    { id: 'solana', name: 'Solana' },
                  ].map((net) => (
                    <SelectItem key={`network-${net.id}`} value={net.id}>
                      {net.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Wallet Address */}
          <div className="space-y-1 relative">
            <Input
              id="wallet-address"
              value={withdrawAddress}
              onChange={handleWithdrawAddressChange}
              disabled={!withdrawNetwork}
              className={`pt-5 pb-1 ${withdrawError && withdrawError.includes('address') ? 'border-red-500' : ''} ${!withdrawAddress ? 'text-muted-foreground' : ''}`}
              placeholder=" "
            />
            <Label 
              htmlFor="wallet-address" 
              className="absolute left-3 top-1 text-xs text-muted-foreground pointer-events-none"
            >
              {withdrawNetwork ? 
                withdrawNetwork.includes('erc20') ? 'ERC20 (Ethereum) Address' :
                withdrawNetwork.includes('bep20') ? 'BEP20 (BSC) Address' :
                withdrawNetwork.includes('trc20') ? 'TRC20 (Tron) Address' :
                withdrawNetwork.includes('solana') ? 'Solana Wallet Address' :
                'Wallet Address'
              : 'Select a network first'}
            </Label>
            {withdrawNetwork && (
              <p className="text-xs text-muted-foreground mt-1">
                {withdrawNetwork.includes('erc20') ? 'Example: 0x1234...5678 (42 characters, starts with 0x)' :
                 withdrawNetwork.includes('bep20') ? 'Example: 0x1234...5678 (42 characters, starts with 0x)' :
                 withdrawNetwork.includes('trc20') ? 'Example: TYmk...XyZ (34 characters, starts with T)' :
                 withdrawNetwork.includes('solana') ? 'Example: 5KKT...xYz (32-44 base58 characters)' :
                 'Enter a valid wallet address for the selected network'}
              </p>
            )}
          </div>

          {/* Error Message */}
          {withdrawError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{formatError(withdrawError)}</span>
              </div>
            </div>
          )}

          {/* KYC Status */}
          {kycStatus !== 'completed' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 text-sm text-yellow-700 dark:text-yellow-300">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">KYC Verification Required</p>
                  <p className="text-sm">Please complete KYC verification to withdraw funds.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="mt-6">
        <InteractiveHoverButton
          type="button"
          onClick={handleWithdraw}
          disabled={!isWithdrawFormValid || isWithdrawing || kycStatus !== 'completed'}
          className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          dotColor="bg-background"
          hoverTextColor="text-foreground"
          title={!isWithdrawFormValid ? 'Please fill in all required fields correctly' : ''}
        >
          {isWithdrawing ? 'Processing...' : 'Request Withdrawal'}
        </InteractiveHoverButton>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-visible p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {isPayout ? 'Payout' : activeTab === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
          </DialogTitle>
          <DialogDescription>
            {isPayout 
              ? 'Withdraw your funds to your preferred wallet.'
              : activeTab === 'deposit' 
                ? 'Add funds to your account using your preferred payment method.'
                : 'Withdraw your funds to your preferred wallet.'
            }
          </DialogDescription>
        </DialogHeader>
          
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'deposit' | 'withdraw')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>
          
          <TabsContent value="deposit" className="focus-visible:outline-none -mx-2 px-2">
            {renderDepositTab()}
          </TabsContent>
          
          <TabsContent value="withdraw" className="focus-visible:outline-none -mx-2 px-2">
            {renderWithdrawTab()}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Promo Code Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Promo Code</DialogTitle>
            <DialogDescription>
              Enter your promo code below to apply a discount to your deposit.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Promo Code</Label>
              <Input
                placeholder="Enter promo code"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Available Promotions</h4>
              {promocodes.length > 0 ? (
                <div className="space-y-2">
                  {promocodes.map((promo) => (
                    <div 
                      key={promo.id} 
                      className="p-3 border rounded-md cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setPromoInput(promo.code);
                      }}
                    >
                      <div className="font-medium">{promo.code}</div>
                      <div className="text-sm text-muted-foreground">
                        {getPromoDescription(promo)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Min. deposit: ${promo.min_amount}
                        {promo.max_amount && ` • Max. bonus: $${promo.max_amount}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active promotions available at the moment.
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPromoDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="ghost"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim() || isApplyingPromo}
              className="text-primary hover:bg-transparent hover:text-primary/80"
            >
              {isApplyingPromo ? 'Applying...' : 'Apply Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      

    </Dialog>
  );
}
