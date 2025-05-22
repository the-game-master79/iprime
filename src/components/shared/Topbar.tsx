import { CaretLeft, Wallet as WalletIcon, User, Sun, Moon, UserCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  plansCount = 0,
  currentUser: propCurrentUser
}: TopbarProps & { currentUser?: any }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [balance, setBalance] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser || null);

  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
      return;
    }
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    if (!propCurrentUser) fetchUser();
  }, [propCurrentUser]);

  useEffect(() => {
    fetchUserBalance();
  }, [currentUser]);

  const fetchUserBalance = async () => {
    try {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      setBalance(data?.withdrawal_wallet || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleBalanceClick = () => {
    if (window.location.pathname === '/cashier') {
      window.location.reload();
    } else {
      navigate('/cashier');
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
            src={
              theme === "dark"
                ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-dark.svg"
                : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-light.svg"
            }
            alt="CloudForex" 
            className="h-8 w-auto"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!hideBalance && (
          <div onClick={handleBalanceClick} className="flex items-center gap-2 rounded-full bg-[#3D3D3D] px-4 py-1.5 shadow-sm transition-colors hover:bg-[#3D3D3D]/80 cursor-pointer">
            <WalletIcon className="h-4 w-4 text-white" weight="fill" />
            <span className="text-sm font-medium text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
        "sticky top-0 z-50 w-full bg-secondary",
        variant === 'default' && "",
        variant === 'minimal' && "bg-transparent",
        variant === 'transparent' && "absolute bg-transparent",
        variant === 'ai' && "border-none",
        className
      )}>
        <div className="mx-auto flex h-14 max-w-[1000px] items-center px-4">
          <div className="flex flex-1 items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {!hideBackButton && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-foreground hover:bg-secondary-foreground"
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
                  src={
                    theme === "dark"
                      ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-dark.svg"
                      : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-light.svg"
                  }
                  alt="CloudForex" 
                  className="h-6 sm:h-8 w-auto"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!hideBalance && (
                <div
                  onClick={handleBalanceClick}
                  className="flex items-center gap-2 rounded-full bg-secondary-foreground px-2 py-1.5 shadow-sm cursor-pointer"
                >
                  <WalletIcon className="h-4 w-4 text-primary" weight="fill" />
                  <span className="text-sm font-medium text-foreground">
                    {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Theme toggle button */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg bg-secondary-foreground text-primary hover:bg-secondary"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-yellow-400" weight="bold" />
                ) : (
                  <Moon className="h-5 w-5 text-blue-500" weight="bold" />
                )}
              </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-lg bg-secondary hover:bg-secondary-foreground"
              onClick={() => navigate('/profile')}
            >
              <Avatar className="h-10 w-10 bg-primary hover:bg-primary/90 rounded-lg transition-colors">
                <AvatarFallback className="bg-primary rounded-lg">
                  <UserCircle weight="bold" className="h-6 w-6 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
            </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="bg-secondary">
        <div className="mx-auto max-w-[1000px] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {variant === 'ai' && (
                <img
                  src={
                    theme === "dark"
                      ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//ai-dark.svg"
                      : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//ai-light.svg"
                  }
                  alt="AI Trading"
                  className="h-6 w-6"
                />
              )}
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
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
                    plansCount > 0 ? "bg-success" : "bg-error",
                    plansCount > 0 ? "shadow-success" : "shadow-error"
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
