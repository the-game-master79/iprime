import { ChevronLeft, Wallet, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  variant?: 'default' | 'minimal' | 'transparent';
  hideBalance?: boolean;
  hideBackButton?: boolean;
  className?: string;
  backButtonAction?: () => void;
}

export const Topbar = ({ 
  title, 
  variant = 'default',
  hideBalance = false,
  hideBackButton = false,
  className,
  backButtonAction
}: TopbarProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchUserBalance();
  }, []);

  const fetchUserBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setBalance(data?.withdrawal_wallet || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleBalanceClick = () => {
    if (window.location.pathname === '/deposit') {
      window.location.reload();
    } else {
      navigate('/deposit');
    }
  };

  const renderDefaultContent = () => (
    <>
      <div className="flex items-center gap-4">
        {!hideBackButton && (
          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2 ml-4 text-white hover:bg-[#3D3D3D]"
            onClick={backButtonAction || (() => window.history.back())}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!hideBalance && (
          <div onClick={handleBalanceClick} className="flex items-center gap-2 rounded-full bg-[#3D3D3D] px-4 py-1.5 shadow-sm transition-colors hover:bg-[#3D3D3D]/80">
            <Wallet className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
          </div>
        )}

        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-lg bg-[#3D3D3D] hover:bg-[#3D3D3D]/80"
          onClick={() => navigate('/profile')}
        >
          <UserCircle className="h-5 w-5 text-white" />
        </Button>
      </div>
    </>
  );

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 w-full bg-[#141414]",
        variant === 'default' && "",
        variant === 'minimal' && "bg-transparent",
        variant === 'transparent' && "absolute bg-transparent",
        className
      )}>
        <div className="mx-auto flex h-14 max-w-[1000px] items-center px-4">
          <div className="flex flex-1 items-center justify-between gap-4">
            {renderDefaultContent()}
          </div>
        </div>
      </header>
      
      <div className="bg-[#141414]">
        <div className="mx-auto max-w-[1000px] px-4 py-4">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
        </div>
      </div>
    </>
  );
};
