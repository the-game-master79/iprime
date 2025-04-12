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
import * as SelectPrimitive from "@radix-ui/react-select"; // Add this import
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface Plan {
  id: string;
  name: string;
  investment: number;
}

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan?: Plan | null;
  onSuccess?: () => void;
}

export function DepositDialog({ open, onOpenChange, selectedPlan, onSuccess }: DepositDialogProps) {
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

  const handleSubmit = async (investment: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('plans_subscriptions').insert({
        user_id: user.id,
        plan_id: selectedPlan?.id,
        amount: investment,
        status: 'pending',
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to submit plan subscription.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Plan subscription submitted successfully."
      });

      onOpenChange(false);
      setAmount('');
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while submitting the plan subscription.",
        variant: "destructive"
      });
    }
  };

  // Set crypto as default payment method
  useEffect(() => {
    if (open) {
      setPaymentMethod('crypto');
      // Reset other form fields
      setCryptoType('');
      setNetwork('');
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

  // Update the calculate function to use 3 decimals
  const calculateCryptoAmount = (investment: number, symbol: string) => {
    const price = cryptoPrices[symbol.toLowerCase()]?.usd || 0;
    return price > 0 ? (investment / price).toFixed(3) : '0';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] h-[90vh] sm:h-auto p-0 flex flex-col overflow-hidden bg-white rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-background/10 pointer-events-none rounded-2xl" />
        
        <div className="relative shrink-0">
          <DialogHeader className="p-6 pb-0 relative">
            <DialogTitle className="text-2xl tracking-tight">Plan Subscription</DialogTitle>
            {selectedPlan && (
              <div className="mt-4 p-6 bg-gradient-to-r from-primary/5 via-muted/10 to-secondary/5 rounded-xl border border-primary/10 backdrop-blur-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{selectedPlan.name}</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-medium text-muted-foreground">
                        ${selectedPlan.investment.toLocaleString()}
                      </span>
                    </div>
                    {cryptoType && (
                      <div className="text-right">
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-primary">
                            {calculateCryptoAmount(selectedPlan.investment, cryptoType)}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground">
                            {cryptoType.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 relative scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent hover:scrollbar-thumb-primary/20">
          <div className="space-y-6">
            {/* Step 1: Cryptocurrency Selection */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {!cryptoType ? '1' : '✓'}
                </div>
                <div>
                  <h3 className="font-semibold">Select Cryptocurrency</h3>
                  <p className="text-sm text-muted-foreground">Choose your preferred payment method</p>
                </div>
              </div>
              
              <Select value={cryptoType} onValueChange={(value) => {
                setCryptoType(value);
                setNetwork("");
              }}>
                <SelectTrigger className="w-full rounded-xl border-primary/20 hover:border-primary/40 transition-colors">
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent 
                  className="max-h-[300px] overflow-y-auto p-2 rounded-xl border-primary/20"
                  position="popper"
                  sideOffset={4}
                >
                  <div className="grid grid-cols-1 gap-2">
                    {availableCryptos.map((symbol) => {
                      const crypto = depositMethods.find(m => m.crypto_symbol === symbol);
                      if (!crypto) return null;
                      const price = cryptoPrices[symbol.toLowerCase()]?.usd || 0;
                      
                      return (
                        <SelectItem 
                          key={symbol} 
                          value={symbol} 
                          className="p-4 rounded-lg hover:bg-primary/5 focus:bg-primary/5 cursor-pointer transition-colors border border-transparent hover:border-primary/10 data-[highlighted]:bg-primary/5"
                        >
                          <div className="flex items-center justify-between w-full gap-6">
                            <div className="flex items-center gap-4">
                              {crypto.logo_url && (
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted/50 p-1.5 flex items-center justify-center">
                                  <img src={crypto.logo_url} alt={crypto.crypto_name || ''} className="w-7 h-7" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="font-medium">{crypto.crypto_name}</p>
                                <p className="text-xs text-muted-foreground">{symbol.toUpperCase()}</p>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-primary">
                              ${price.toLocaleString()}
                            </p>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {cryptoType && (
              <>
                {/* Step 2: Network Selection */}
                <div className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {!network ? '2' : '✓'}
                    </div>
                    <div>
                      <h3 className="font-semibold">Select Network</h3>
                      <p className="text-sm text-muted-foreground">Choose the transaction network</p>
                    </div>
                  </div>

                  <Select value={network} onValueChange={setNetwork}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNetworks.map((net) => (
                        <SelectItem key={net} value={net} className="p-3">
                          {net}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 3: Only show when both crypto and network are selected */}
                {network && (
                  <div className="relative animate-in fade-in slide-in-from-left-5 duration-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold">Deposit Details</h3>
                        <p className="text-sm text-muted-foreground">Scan QR code or copy the address</p>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6 space-y-6">
                      <div className="flex justify-center">
                        {qrCodeUrl && (
                          <div className="p-4 bg-white rounded-lg shadow-sm">
                            <img src={qrCodeUrl} alt="Deposit QR Code" className="w-48 h-48" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Deposit Address</Label>
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 font-mono text-sm">
                          <code className="flex-1 break-all">
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
              </>
            )}
          </div>
        </div>

        <div className="p-6 bg-gradient-to-t from-muted/20 via-background/5 to-transparent border-t relative shrink-0">
          <Button 
            className="w-full relative bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 rounded-xl"
            size="lg"
            disabled={!cryptoType || !network}
            onClick={async () => {
              if (selectedPlan) {
                await handleSubmit(selectedPlan.investment);
                onSuccess?.();
              }
            }}
          >
            Confirm Subscription
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
