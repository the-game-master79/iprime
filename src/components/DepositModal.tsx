import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CryptoMethod, CryptoWithPrice } from '@/types/crypto';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, method: string, cryptoId?: string | null) => Promise<void>;
}

const DEPOSIT_METHODS = [
  { id: 'crypto', name: 'Crypto', disabled: false },
  { id: 'upi', name: 'UPI', disabled: true },
  { id: 'bank', name: 'Bank Transfer', disabled: true },
];

const TOP_CRYPTO_METHODS = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'btc',
    image_url: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    is_active: true,
    qr_code_url: '/qr/btc.png'
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'eth',
    image_url: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    is_active: true,
    qr_code_url: '/qr/eth.png'
  },
  {
    id: 'tether',
    name: 'USDT',
    symbol: 'usdt',
    image_url: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    is_active: true,
    qr_code_url: '/qr/usdt.png'
  }
];

export const DepositModal = ({ isOpen, onClose, onDeposit }: DepositModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [cryptoMethods, setCryptoMethods] = useState<CryptoWithPrice[]>([]);
  const [amount, setAmount] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (selectedMethod === 'crypto') {
      fetchCryptoMethods();
    }
  }, [selectedMethod]);

  const fetchCryptoMethods = async () => {
    try {
      // First fetch deposit methods from database
      const { data: dbMethods, error: dbError } = await supabase
        .from('deposit_methods')
        .select('*')
        .eq('is_active', true);

      if (dbError) throw dbError;

      // Then fetch prices from CoinGecko
      const cryptoIds = dbMethods.map(crypto => crypto.id).join(',');
      const pricesResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd`
      );
      const prices = await pricesResponse.json();

      const cryptosWithPrices = dbMethods.map(crypto => ({
        ...crypto,
        current_price: prices[crypto.id]?.usd || 0
      }));

      setCryptoMethods(cryptosWithPrices);
    } catch (error: any) {
      toast({
        title: "Failed to fetch crypto methods",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod || !amount) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const numericAmount = parseFloat(amount);
      let totalValue = numericAmount;
      let cryptoPrice = null;

      // Calculate total value for crypto deposits
      if (selectedMethod === 'crypto' && selectedCrypto) {
        const selectedCryptoDetails = cryptoMethods.find(c => c.id === selectedCrypto);
        if (selectedCryptoDetails) {
          cryptoPrice = selectedCryptoDetails.current_price;
          totalValue = numericAmount * cryptoPrice;
        }
      }

      // Create deposit record first
      const { data: deposit, error: depositError } = await supabase
        .from('deposits')
        .insert([{
          user_id: user.id,
          crypto_id: selectedMethod === 'crypto' ? selectedCrypto : null,
          amount: numericAmount,
          crypto_price: cryptoPrice,
          total_value: totalValue,
          method: selectedMethod,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (depositError) throw depositError;

      // Create account history entry with deposit_id
      const { error: historyError } = await supabase
        .from('account_history')
        .insert([{
          user_id: user.id,
          deposit_id: deposit.id, // Link to deposit
          amount: totalValue,
          type: 'deposit',
          description: `Deposit via ${selectedMethod}${selectedMethod === 'crypto' ? ` using ${selectedCryptoDetails?.name}` : ''}`,
          status: 'pending',
          created_at: deposit.created_at // Use same timestamp
        }]);

      if (historyError) throw historyError;

      onClose();
      setSelectedMethod('');
      setAmount('');
      setSelectedCrypto('');

      toast({
        title: "Deposit submitted",
        description: "Your deposit request has been submitted for approval.",
      });
    } catch (error: any) {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectedCryptoDetails = cryptoMethods.find(crypto => crypto.id === selectedCrypto);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px] glass"> {/* Increased width */}
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Choose your preferred deposit method
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Method and Crypto Selection Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Select
                value={selectedMethod}
                onValueChange={(value) => setSelectedMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deposit method" />
                </SelectTrigger>
                <SelectContent>
                  {DEPOSIT_METHODS.map((method) => (
                    <SelectItem 
                      key={method.id} 
                      value={method.id}
                      disabled={method.disabled}
                      className="flex items-center justify-between"
                    >
                      <span>{method.name}</span>
                      {method.disabled && (
                        <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
                          Coming Soon
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMethod === 'crypto' && (
              <div className="space-y-2">
                <Select
                  value={selectedCrypto}
                  onValueChange={(value) => setSelectedCrypto(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cryptocurrency" />
                  </SelectTrigger>
                  <SelectContent className="w-[400px]"> {/* Increased width */}
                    {cryptoMethods.map((crypto) => (
                      <SelectItem 
                        key={crypto.id} 
                        value={crypto.id}
                      >
                        <div className="grid grid-cols-3 w-full items-center gap-4">
                          <div className="flex items-center gap-2">
                            <img 
                              src={crypto.image_url} 
                              alt={crypto.name} 
                              className="w-6 h-6 rounded-full"
                            />
                            <span>{crypto.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            ${crypto.current_price.toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* QR Code Display */}
          {selectedMethod === 'crypto' && selectedCryptoDetails && (
            <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg">
              <img 
                src={selectedCryptoDetails.qr_code_url} 
                alt={`${selectedCryptoDetails.name} QR Code`}
                className="w-48 h-48"
              />
              <p className="text-sm text-muted-foreground">
                Scan QR code to make payment
              </p>
            </div>
          )}

          {/* Amount Input */}
          {selectedMethod && (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-8"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button 
                className="w-full"
                onClick={handleSubmit}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                Submit Deposit
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
