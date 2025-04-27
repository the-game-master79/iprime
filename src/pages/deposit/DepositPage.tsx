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

export default function DepositPage() {
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
  
  // Get available cryptocurrencies
  const availableCryptos = [...new Set(depositMethods
    .filter(m => m.method === 'crypto' && m.is_active)
    .map(m => m.crypto_symbol))]
    .filter(Boolean) as string[];

  // Get available networks for selected crypto
  const availableNetworks = depositMethods
    .filter(m => m.crypto_symbol === cryptoType && m.is_active)
    .map(m => m.network)
    .filter(Boolean) as string[];

  // Add a function to calculate total USD value
  const calculateTotalUSD = () => {
    if (!cryptoType) return 0;
    const price = cryptoPrices[cryptoType.toLowerCase()]?.usd || 0;
    return price;
  };

  const handleCopyAddress = (address: string) => {
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

  const handleSubmit = async (investment: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedCrypto = depositMethods.find(
        m => m.crypto_symbol === cryptoType && m.network === network
      );

      if (!selectedCrypto) throw new Error('Invalid cryptocurrency selected');

      const finalAmount = calculateFinalAmount(investment);

      const { data, error } = await supabase.from('deposits').insert({
        user_id: user.id,
        amount: investment,
        crypto_name: selectedCrypto.crypto_name,
        crypto_symbol: selectedCrypto.crypto_symbol,
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
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while submitting the deposit request.",
        variant: "destructive"
      });
    }
  };

  // Update generateQRCode function to include amount and network info
  const generateQRCode = async (address: string, amount: number, symbol: string, net: string) => {
    if (amount <= 0) return;
    
    try {
      // Format the URI according to BIP21/EIP67 standards for wallet compatibility
      let qrData;
      const cryptoAmount = calculateCryptoAmount(amount, symbol);
      
      // Different format for different cryptocurrencies
      switch(symbol.toLowerCase()) {
        case 'btc':
          qrData = `bitcoin:${address}?amount=${cryptoAmount}`;
          break;
        case 'eth':
          qrData = `ethereum:${address}@${net}?value=${cryptoAmount}`;
          break;
        case 'bnb':
          if (net.toLowerCase().includes('bsc')) {
            qrData = `bnb:${address}@56?amount=${cryptoAmount}`; // BSC Mainnet
          } else {
            qrData = `bnb:${address}?amount=${cryptoAmount}`; // BNB Chain
          }
          break;
        default:
          // Generic format for other tokens
          qrData = `${symbol.toLowerCase()}:${address}?amount=${cryptoAmount}&network=${net}`;
      }
      
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H', // Highest error correction
        margin: 1,
        width: 300, // Larger size for better scanning
        color: {
          dark: '#000000',
          light: '#ffffff'
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
    const address = depositMethods.find(
      m => m.crypto_symbol === cryptoType && m.network === network
    )?.deposit_address;

    if (address && amount && !isNaN(parseFloat(amount))) {
      generateQRCode(
        address,
        parseFloat(amount),
        cryptoType,
        network
      );
    }
  }, [cryptoType, network, depositMethods, amount]); // Add amount to dependencies

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

  return (
    <div className="min-h-screen bg-background">
      <Topbar 
        title="Deposit Funds"
        leftContent={
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="regular" />
          </Button>
        }
      />

      <div className="container max-w-[800px] mx-auto py-6 px-4 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <form>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="crypto">Currency</Label>
                  <Select
                    value={cryptoType}
                    onValueChange={(value) => {
                      setCryptoType(value);
                      setNetwork("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCryptos.map((symbol) => {
                        const crypto = depositMethods.find(m => m.crypto_symbol === symbol);
                        const price = cryptoPrices[symbol.toLowerCase()]?.usd || 0;
                        
                        return (
                          <SelectItem key={symbol} value={symbol}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-2">
                                {crypto?.logo_url && (
                                  <img src={crypto.logo_url} alt={crypto.crypto_name || ''} className="w-6 h-6" />
                                )}
                                <span>{crypto?.crypto_name}</span>
                                <span className="text-muted-foreground">({symbol.toUpperCase()})</span>
                              </div>
                              <span className="text-sm font-medium">${price.toLocaleString()}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Network Selection */}
                <div className="space-y-2">
                  <Label htmlFor="network">Network*</Label>
                  <Select
                    value={network}
                    onValueChange={setNetwork}
                    disabled={!cryptoType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNetworks.map((net) => (
                        <SelectItem key={net} value={net}>{net}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!cryptoType && (
                    <p className="text-xs text-muted-foreground mt-1">Please select a cryptocurrency first</p>
                  )}
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Enter Amount</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      placeholder="$ Enter Amount"
                      value={amount}
                      onChange={handleAmountChange}
                      className="pl-3"
                    />
                  </div>
                  {amountError && (
                    <p className="text-sm text-destructive">{amountError}</p>
                  )}
                </div>

                {/* Deposit Details */}
                {cryptoType && network && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Deposit Details</h3>
                    <div className="rounded-xl border bg-card p-6 space-y-6">
                      {/* Amount in Crypto */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">
                          Please send exactly
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-2xl font-bold text-primary">
                            {calculateCryptoAmount(parseFloat(amount || '0'), cryptoType)}
                          </div>
                          <div className="text-lg font-medium">
                            {cryptoType.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ≈ ${parseFloat(amount || '0').toLocaleString()}
                        </div>
                      </div>

                      {/* QR Code */}
                      {qrCodeUrl && (
                        <div className="flex justify-center">
                          <div className="p-4 bg-white rounded-lg shadow-sm">
                            <img src={qrCodeUrl} alt="Deposit QR Code" className="w-48 h-48" />
                          </div>
                        </div>
                      )}

                      {/* Deposit Address */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                          <code className="flex-1 break-all font-mono text-sm">
                            {depositMethods.find(m => m.crypto_symbol === cryptoType && m.network === network)?.deposit_address}
                          </code>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCopyAddress(depositMethods.find(m => m.crypto_symbol === cryptoType && m.network === network)?.deposit_address || '')}
                          >
                            <Copy size={16} weight="regular" /> {/* Updated Phosphor icon */}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <Button 
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                  disabled={!amount || !cryptoType || !network || !!amountError}
                  onClick={async (e) => {
                    e.preventDefault();
                    await handleSubmit(parseFloat(amount));
                    navigate('/dashboard');
                  }}
                >
                  Confirm Deposit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Promo Code Card - Moved below main form */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Have a Promo Code?</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="uppercase"
                />
                <Button 
                  variant="outline"
                  disabled={!promoInput || isApplyingPromo}
                  onClick={handleApplyPromoCode}
                >
                  Apply
                </Button>
              </div>
            </div>

            {selectedPromocode && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Applied Code:</span>
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
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Original Amount</span>
                      <span>${parseFloat(amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Final Amount</span>
                      <span className="text-primary">${calculateFinalAmount(parseFloat(amount)).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setSelectedPromocode(null)}
                >
                  Remove Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}