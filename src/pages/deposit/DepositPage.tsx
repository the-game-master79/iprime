import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/shared/Topbar";
import { supabase } from "@/lib/supabase";
import { Copy, ArrowLeft, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const handleSubmit = async (investment: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedCrypto = depositMethods.find(
        m => m.crypto_symbol === cryptoType && m.network === network
      );

      if (!selectedCrypto) throw new Error('Invalid cryptocurrency selected');

      const { error } = await supabase.from('deposits').insert({
        user_id: user.id,
        amount: investment,
        crypto_name: selectedCrypto.crypto_name,
        crypto_symbol: selectedCrypto.crypto_symbol,
        network: selectedCrypto.network,
        status: 'pending'
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to submit deposit request.",
          variant: "destructive"
        });
        return;
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

  // Replace generateQRCodeUrl with this function
  const generateQRCode = async (address: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(address);
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

  // Add effect to generate QR code when address changes
  useEffect(() => {
    const address = depositMethods.find(
      m => m.crypto_symbol === cryptoType && m.network === network
    )?.deposit_address;

    if (address) {
      generateQRCode(address);
    }
  }, [cryptoType, network, depositMethods]);

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
    if (numValue < 10) {
      setAmountError("Minimum deposit amount is $10");
      return false;
    }
    if (numValue > 1000000) {
      setAmountError("Maximum deposit amount is $1,000,000");
      return false;
    }
    setAmountError("");
    return true;
  };

  function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(" ");
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar 
        title="Deposit Funds"
        leftContent={
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />

      <div className="container max-w-5xl mx-auto py-6 px-4">
        <div className="flex flex-col-reverse md:grid md:grid-cols-[1fr_300px] gap-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Cryptocurrency Selection */}
              <div className="space-y-2">
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
                  <p className="text-sm text-muted-foreground">Please select a cryptocurrency first</p>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="$ Enter Amount"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      validateAmount(e.target.value);
                    }}
                    className="pl-3" // Removed extra padding since we removed the icon
                  />
                </div>
                {amountError && (
                  <p className="text-sm text-destructive">{amountError}</p>
                )}
              </div>

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
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
                disabled={!amount || !cryptoType || !network || !!amountError}
                onClick={async () => {
                  await handleSubmit(parseFloat(amount));
                  navigate('/dashboard');
                }}
              >
                Confirm Deposit
              </Button>
            </CardContent>
          </Card>

          {/* Right Section - Info Box */}
          <div className="space-y-4 md:mt-0">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-4 w-4" />
                <span className="font-medium">This deposit is for trades only.</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                If you're looking to trade, use this deposit form. For investing in packages, then visit our plans page.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/plans')}
                className="w-full"
              >
                View Plans
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}