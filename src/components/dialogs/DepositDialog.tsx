import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { checkDepositLimit } from "@/lib/rateLimit";

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

export function DepositDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [cryptoType, setCryptoType] = useState<string>("");
  const [network, setNetwork] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, { usd: number }>>({});

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

    if (open) {
      fetchDepositMethods();
    }
  }, [open]);

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

    if (open && depositMethods.length > 0) {
      fetchCryptoPrices();
      const interval = setInterval(fetchCryptoPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [open, depositMethods]);

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
    if (!amount || !cryptoType) return 0;
    const price = cryptoPrices[cryptoType.toLowerCase()]?.usd || 0;
    return Number(amount) * price;
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "The deposit address has been copied to your clipboard.",
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal point
    const value = e.target.value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    if (value.split('.').length > 2) return;
    setAmount(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check rate limits
      if (!checkDepositLimit(user.id)) {
        toast({
          title: "Rate Limited",
          description: "You have exceeded the maximum number of deposits allowed. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      // Calculate the USD value before submitting
      const totalUsdValue = calculateTotalUSD();

      const { error } = await supabase.from('deposits').insert({
        user_id: user.id,
        user_name: user.email?.split('@')[0] || 'Unknown',
        amount: totalUsdValue, // Store the USD value instead of crypto amount
        method: paymentMethod === 'crypto' ? `${cryptoType} (${network})` : paymentMethod,
        status: 'Pending'
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
      
      onOpenChange(false);
      setAmount('');
      setPaymentMethod('');
      setCryptoType('');
      setNetwork('');
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while submitting the deposit request.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[525px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="payment-method">Available Methods</Label>
            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {uniqueMethods.map(method => {
                  const isMethodActive = depositMethods.some(m => m.method === method && m.is_active);
                  return (
                    <SelectItem 
                      key={method} 
                      value={method}
                      disabled={!isMethodActive}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>
                          {method === 'bank_transfer' ? 'Bank Transfer' :
                           method === 'upi' ? 'UPI' :
                           'Cryptocurrency'}
                        </span>
                        {(method === 'bank_transfer' || method === 'upi') && (
                          <Badge variant={isMethodActive ? "default" : "secondary"} className="ml-2">
                            {isMethodActive ? 'Active' : 'Coming Soon'}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "crypto" && (
            <>
              {cryptoType && (
                <div className="mb-2 p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">
                    {depositMethods.find(m => m.crypto_symbol === cryptoType)?.crypto_name} Price
                  </div>
                  <div className="text-2xl font-bold">
                    ${(cryptoPrices[cryptoType.toLowerCase()]?.usd || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} USD
                  </div>
                </div>
              )}
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="crypto-type">Crypto</Label>
                  <Select 
                    onValueChange={(value) => {
                      setCryptoType(value);
                      setNetwork("");
                      setAmount(""); // Reset amount when crypto changes
                    }} 
                    value={cryptoType}
                  >
                    <SelectTrigger id="crypto-type">
                      <SelectValue placeholder="Select cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCryptos.map((symbol) => {
                        const crypto = depositMethods.find(m => m.crypto_symbol === symbol);
                        if (!crypto) return null;
                        
                        return (
                          <SelectItem key={symbol} value={symbol}>
                            <div className="flex items-center gap-2">
                              {crypto.logo_url && (
                                <img src={crypto.logo_url} alt={crypto.crypto_name || ''} className="w-5 h-5" />
                              )}
                              <span>{crypto.crypto_name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {cryptoType && (
                  <div className="grid gap-2">
                    <Label htmlFor="network">Network</Label>
                    <Select onValueChange={setNetwork} value={network}>
                      <SelectTrigger id="network">
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableNetworks.map((net) => (
                          <SelectItem key={net} value={net}>
                            {net}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {cryptoType && network && (
                  <>
                    <div className="rounded-lg border p-4">
                      <div className="flex justify-center mb-4">
                        {depositMethods.find(m => m.crypto_symbol === cryptoType && m.network === network)?.qr_code_url && (
                          <img 
                            src={depositMethods.find(m => m.crypto_symbol === cryptoType && m.network === network)?.qr_code_url!} 
                            alt="Deposit QR Code"
                            className="w-40 h-40"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded bg-muted p-2 text-sm overflow-auto">
                            {depositMethods.find(m => m.crypto_symbol === cryptoType && m.network === network)?.deposit_address}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyAddress(depositMethods.find(m => m.crypto_symbol === cryptoType && m.network === network)?.deposit_address || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount ({cryptoType})</Label>
                      <div className="relative">
                        <Input
                          id="amount"
                          type="text"
                          min="0"
                          placeholder={`Enter amount in ${cryptoType}`}
                          value={amount}
                          onChange={handleAmountChange}
                          pattern="[0-9]*\.?[0-9]*"
                          className="pl-3"
                        />
                      </div>
                      {amount && (
                        <div className="text-sm text-muted-foreground">
                          Total Value: ${calculateTotalUSD().toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} USD
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <Button 
            className="w-full mt-2" 
            disabled={!amount || (paymentMethod === "crypto" && (!cryptoType || !network))}
            onClick={handleSubmit}
          >
            Submit Deposit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
