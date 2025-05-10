import { CaretLeft, Wallet as WalletIcon, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  variant?: 'default' | 'minimal' | 'transparent' | 'ai';  // Add 'ai' variant
  hideBalance?: boolean;
  hideBackButton?: boolean;
  className?: string;
  backButtonAction?: () => void;
  plansCount?: number;
}

export const Topbar = ({ 
  title, 
  variant = 'default',
  hideBalance = false,
  hideBackButton = false,
  className,
  backButtonAction,
  plansCount = 0
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
            className="flex items-center gap-2 text-white hover:bg-[#3D3D3D]"
            onClick={backButtonAction || (() => window.history.back())}
          >
            <CaretLeft className="h-4 w-4" />
          </Button>
        )}
        <div 
          className="cursor-pointer"
          onClick={() => navigate('/platform')}
        >
          <img 
            src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
            alt="CloudForex" 
            className="h-8 w-auto"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!hideBalance && (
          <div onClick={handleBalanceClick} className="flex items-center gap-2 rounded-full bg-[#3D3D3D] px-4 py-1.5 shadow-sm transition-colors hover:bg-[#3D3D3D]/80 cursor-pointer">
            <WalletIcon className="h-4 w-4 text-white" weight="fill" />
            <span className="text-sm font-medium text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
          </div>
        )}

        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-lg bg-[#3D3D3D] hover:bg-[#3D3D3D]/80"
          onClick={() => navigate('/profile')}
        >
          <User className="h-5 w-5 text-white" weight="fill" />
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
        variant === 'ai' && "border-b border-[#525252]",
        className
      )}>
        <div className="mx-auto flex h-14 max-w-[1000px] items-center px-4">
          <div className="flex flex-1 items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {!hideBackButton && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-white hover:bg-[#3D3D3D]"
                  onClick={backButtonAction || (() => window.history.back())}
                >
                  <CaretLeft className="h-4 w-4" />
                </Button>
              )}
              <div 
                className="cursor-pointer"
                onClick={() => navigate('/platform')}
              >
                <img 
                  src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
                  alt="CloudForex" 
                  className="h-6 sm:h-8 w-auto"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!hideBalance && (
                <div onClick={handleBalanceClick} className="flex items-center gap-2 rounded-full bg-[#3D3D3D] px-2 py-1.5 shadow-sm transition-colors hover:bg-[#3D3D3D]/80 cursor-pointer">
                  <WalletIcon className="h-4 w-4 text-white" weight="fill" />
                  <span className="text-sm font-medium text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                </div>
              )}

              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-lg bg-[#3D3D3D] hover:bg-[#3D3D3D]/80"
                onClick={() => navigate('/profile')}
              >
                <User className="h-5 w-5 text-white" weight="fill" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="bg-[#141414]">
        <div className="mx-auto max-w-[1000px] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {variant === 'ai' && (
                <img
                  src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//ai-trading.svg"
                  alt="Trading"
                  className="h-6 w-6"
                />
              )}
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
            </div>

            {variant === 'ai' && (
              <div className={cn(
                "px-3 py-1.5 rounded-full text-sm flex items-center gap-2",
                plansCount > 0 
                  ? "bg-green-500/20 text-green-500" 
                  : "bg-red-500/20 text-red-500"
              )}>
                <div className="relative flex h-3 w-3">
                  {/* Outer glow */}
                  <span className={cn(
                    "animate-[ping_2s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full opacity-30",
                    plansCount > 0 ? "bg-green-500" : "bg-red-500"
                  )}></span>
                  {/* Middle glow */}
                  <span className={cn(
                    "animate-[ping_2s_ease-in-out_infinite_0.3s] absolute inline-flex h-[80%] w-[80%] rounded-full opacity-50 top-[10%] left-[10%]",
                    plansCount > 0 ? "bg-green-500" : "bg-red-500"
                  )}></span>
                  {/* Core dot */}
                  <span className={cn(
                    "relative inline-flex rounded-full h-full w-full shadow-[0_0_12px_0_rgba(0,255,0,0.6)]",
                    plansCount > 0 ? "bg-green-500" : "bg-red-500",
                    plansCount > 0 ? "shadow-green-500/50" : "shadow-red-500/50"
                  )}></span>
                </div>
                {plansCount > 0 ? "AI Agent is Working" : "AI Agent Offline"}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
