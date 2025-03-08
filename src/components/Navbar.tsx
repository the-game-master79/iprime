import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowDown, ArrowUp, LogOut, User } from 'lucide-react';
import { DepositModal } from '@/components/DepositModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Navbar = () => {
  const { user, profile, signOut, deposit, withdraw } = useAuth();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [withdrawalMethod, setWithdrawalMethod] = useState('');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [usdtPrice, setUsdtPrice] = useState(1); // USDT price is typically pegged to $1

  const WITHDRAWAL_METHODS = [
    { id: 'usdt_trc20', name: 'USDT TRC20', network: 'Tron' },
    { id: 'usdt_erc20', name: 'USDT ERC20', network: 'Ethereum' },
    { id: 'usdt_bep20', name: 'USDT BEP20', network: 'BSC' },
  ];

  const handleDeposit = async (amount: number, methodId: string) => {
    try {
      const method = await supabase
        .from('deposit_methods')
        .select('*')
        .eq('id', methodId)
        .single();

      if (!method.data) throw new Error('Invalid deposit method');

      await deposit(amount);
      toast({
        title: "Deposit initiated",
        description: `Please follow the payment instructions sent to your email.`,
      });
    } catch (error: any) {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (amount > 0 && withdrawalMethod && withdrawalAddress) {
      try {
        await withdraw(amount, withdrawalMethod, withdrawalAddress);
        setWithdrawAmount('');
        setWithdrawalMethod('');
        setWithdrawalAddress('');
        setIsWithdrawDialogOpen(false);
      } catch (error: any) {
        console.error('Withdrawal error:', error);
      }
    }
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setLoading(true);
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <div className="border-b w-full">
      <div className="flex h-16 items-center px-6">
        <Link to="/dashboard" className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 mr-2 text-primary"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <div className="flex flex-col">
            <span className="text-lg font-bold">AffiliNet</span>
            <span className="text-xs text-muted-foreground">Marketing Platform</span>
          </div>
        </Link>
        
        <div className="ml-auto flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 gap-1 button-hover"
            onClick={() => setShowDepositModal(true)}
          >
            <ArrowDown className="h-4 w-4" />
            <span>Deposit</span>
          </Button>

          <DepositModal
            isOpen={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            onDeposit={handleDeposit}
          />
          
          <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1 button-hover">
                <ArrowUp className="h-4 w-4" />
                <span>Withdraw</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass">
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
                <DialogDescription>
                  Enter the withdrawal details to process your request.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleWithdraw}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Withdrawal Method</Label>
                    <Select
                      value={withdrawalMethod}
                      onValueChange={setWithdrawalMethod}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select withdrawal method" />
                      </SelectTrigger>
                      <SelectContent>
                        {WITHDRAWAL_METHODS.map((method) => (
                          <SelectItem 
                            key={method.id} 
                            value={method.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{method.name}</span>
                              <span className="text-sm text-muted-foreground">
                                ${usdtPrice.toFixed(2)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="withdraw-amount">Amount (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="withdraw-amount"
                        type="number"
                        min="0"
                        max={profile?.investment_total || 0}
                        step="0.01"
                        className="pl-8"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        required
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Available balance: ${profile?.investment_total?.toFixed(2) || '0.00'}
                    </span>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="withdrawal-address">Wallet Address</Label>
                    <Input
                      id="withdrawal-address"
                      type="text"
                      value={withdrawalAddress}
                      onChange={(e) => setWithdrawalAddress(e.target.value)}
                      placeholder={`Enter your ${withdrawalMethod?.split('_')[1]?.toUpperCase() || 'wallet'} address`}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit"
                    disabled={
                      !withdrawAmount || 
                      !withdrawalMethod ||
                      !withdrawalAddress ||
                      parseFloat(withdrawAmount) <= 0 || 
                      parseFloat(withdrawAmount) > (profile?.investment_total || 0)
                    }
                  >
                    Withdraw Now
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.username || ''} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {profile?.full_name || 'My Account'}
                {profile?.username && (
                  <span className="block text-xs text-muted-foreground">
                    @{profile.username}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex w-full cursor-pointer items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  handleSignOut(e as unknown as React.MouseEvent);
                }}
                className="text-red-600 cursor-pointer flex items-center w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

function toast({ title, description, variant = "default" }: { title: string; description: string; variant?: string }) {
  const toastContainer = document.createElement('div');
  toastContainer.className = `toast ${variant}`;
  toastContainer.innerHTML = `
    <div class="toast-header">
      <strong class="mr-auto">${title}</strong>
    </div>
    <div class="toast-body">
      ${description}
    </div>
  `;
  document.body.appendChild(toastContainer);

  setTimeout(() => {
    toastContainer.classList.add('show');
  }, 100);

  setTimeout(() => {
    toastContainer.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toastContainer);
    }, 300);
  }, 3000);
}

