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
import QRCode from "qrcode"; // Add this import

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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(""); // Add this state

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

  // Set crypto as default payment method
  useEffect(() => {
    if (open) {
      setPaymentMethod('crypto');
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[525px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Main container with relative positioning for the connecting line */}
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-4 top-8 bottom-0 w-[1px] border-l-2 border-dashed border-gray-200" />

            {/* Step 1: Select Cryptocurrency */}
            <div className="grid gap-6">
              <div className="relative grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-medium relative z-10">
                    1
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="crypto-type">Select Cryptocurrency</Label>
                  </div>
                </div>
                <Select 
                  onValueChange={(value) => {
                    setCryptoType(value);
                    setNetwork("");
                    setAmount("");
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
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              {crypto.logo_url && (
                                <img src={crypto.logo_url} alt={crypto.crypto_name || ''} className="w-5 h-5" />
                              )}
                              <span>{crypto.crypto_name}</span>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                ${(cryptoPrices[symbol.toLowerCase()]?.usd || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Select Network */}
              {cryptoType && (
                <div className="relative grid gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-medium relative z-10">
                      2
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="network">Select Network</Label>
                    </div>
                  </div>
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

              {/* Step 3: Deposit Details */}
              {cryptoType && network && (
                <div className="relative grid gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-medium relative z-10">
                      3
                    </div>
                    <div className="grid gap-1">
                      <Label>Deposit Address</Label>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex justify-center mb-4">
                      {qrCodeUrl && (
                        <div className="p-2 sm:p-4">
                          <img
                            src={qrCodeUrl}
                            alt="Deposit QR Code"
                            className="w-40 h-40"
                          />
                        </div>
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

                  {/* Step 4: Amount */}
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-medium relative z-10">
                        4
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="amount">Enter Amount</Label>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="relative">
                        <Input
                          id="amount"
                          type="text"
                          min="0"
                          placeholder={`Enter exact amount you're sending in ${cryptoType}`}
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
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button 
            className="w-full mt-2" 
            disabled={!amount || !cryptoType || !network}
            onClick={handleSubmit}
          >
            Submit Deposit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
