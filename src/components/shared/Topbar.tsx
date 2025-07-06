import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { User, CaretLeft, Wallet, ChartLine, ChartBar, Users, ClockCounterClockwise } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/use-theme";

type Theme = 'light' | 'dark';

interface TopbarProps {
  currentUser?: any;
  title?: string;
  platform?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  onWalletClick?: () => void;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  amount?: number;
}

export const Topbar = ({
  currentUser: propCurrentUser,
  title,
  platform,
  showBackButton = false,
  onBack,
  onWalletClick,
}: TopbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);

  const { theme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser || null);
  const [availableBalance, setAvailableBalance] = useState<number>(0);

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
      return;
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    getUser();
  }, [propCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchAvailableBalance();
    }
  }, [currentUser]);

  const fetchAvailableBalance = async () => {
    try {
      if (!currentUser) return;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;
      const withdrawalWallet = profileData?.withdrawal_wallet || 0;
      setAvailableBalance(withdrawalWallet);
    } catch (error) {
      console.error('Error fetching available balance:', error);
    }
  };

  return (
    <>
      <header className="flex flex-col bg-background w-full md:px-4 md:py-2 px-4 py-2 border-b border-border"
        style={{
          ['--topbar-height' as any]: window.innerWidth >= 768 ? '64px' : '56px',
        }}
      >
        <div className="mx-auto w-full">
          {/* First row: Logo and Back button */}
          <div className="flex items-center w-full min-h-[48px] md:min-h-[64px]">
            {/* Left items: Back button and Logo */}
            <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0">
              {/* Back Button */}
              {!platform && (
                <Button
                  className="h-9 w-9 md:h-10 md:w-10 rounded-lg relative bg-secondary hover:bg-secondary-foreground mr-1"
                  onClick={() => navigate('/platform')}
                  aria-label="Back"
                >
                  <CaretLeft className="h-5 w-5 text-foreground" weight="bold" />
                </Button>
              )}
              {/* Logo: show icon only on mobile, full logo on md+ */}
              <img
                src={
                  theme === "dark"
                    ? "/arthaa-logo-dark.svg"
                    : "/arthaa-logo-light.svg"
                }
                alt="Arthaa"
                className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity md:hidden"
                style={{ maxWidth: 140 }}
                onClick={() => window.location.reload()}
              />
              <img
                src={
                  theme === "dark"
                    ? "/arthaa-dark.svg"
                    : "/arthaa-light.svg"
                }
                alt="Arthaa"
                className="h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity hidden md:block"
                style={{ maxWidth: 200 }}
                onClick={() => window.location.reload()}
              />
            </div>
            {/* Center Navigation Items */}
            <div className="hidden md:flex items-center absolute left-1/2 transform -translate-x-1/2">
              <Tabs 
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value);
                  navigate(value);
                }}
                className="w-full"
                defaultValue={activeTab}
              >
                <div className="flex overflow-x-auto w-full">
                  <TabsList className="flex flex-nowrap gap-1 sm:gap-2 w-auto bg-transparent">
                    {[
                      { 
                        label: "Wallet", 
                        path: "#",
                        icon: <Wallet className="h-4 w-4 flex-shrink-0" weight="bold" />,
                        onClick: onWalletClick
                      },
                      { 
                        label: "Trade", 
                        path: "/tradingstation",
                        icon: <ChartLine className="h-4 w-4 flex-shrink-0" weight="bold" />
                      },
                      { 
                        label: "AlphaQuant", 
                        path: "/plans",
                        icon: <ChartBar className="h-4 w-4 flex-shrink-0" weight="bold" />
                      },
                      { 
                        label: "Affiliates", 
                        path: "/affiliate",
                        icon: <Users className="h-4 w-4 flex-shrink-0" weight="bold" />
                      },
                      { 
                        label: "History", 
                        path: "/history",
                        icon: <ClockCounterClockwise className="h-4 w-4 flex-shrink-0" weight="bold" />
                      }
                    ].map((item) => (
                      <TabsTrigger 
                        key={item.path} 
                        value={item.path}
                        className="text-sm sm:text-base"
                        data-state={activeTab === item.path ? 'active' : 'inactive'}
                        asChild={!!item.onClick}
                      >
                        <div 
                          onClick={(e) => {
                            if (item.onClick) {
                              e.preventDefault();
                              item.onClick();
                            } else {
                              navigate(item.path);
                            }
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>
            </div>

            {/* Right items: Balance, Notifications, Profile */}
            <div className="flex items-center min-w-0 gap-2 md:gap-2 ml-auto">
              {/* Available Balance: Badge for mobile, text for desktop */}
              <div 
                onClick={onWalletClick} 
                className={onWalletClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
              >
                {/* Mobile: Badge with wallet icon */}
                <span className="flex md:hidden items-center min-w-[120px]">
                  <Badge className="flex items-center gap-1 px-2 py-2 rounded-md text-xs font-medium bg-secondary-foreground text-foreground">
                    <Wallet className="w-4 h-4 mr-1 flex-shrink-0" weight="bold" />
                    <span className="truncate">
                      {Number(availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                  </Badge>
                </span>
                {/* Desktop: Text */}
                <div className="hidden md:flex items-center bg-gradient-to-r from-primary/5 to-primary/10 px-2 py-1 rounded-lg border border-primary/10">
                  <div className="flex flex-col items-end mr-0">
                    <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      ${Number(availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-primary/20 mx-2"></div>
                  <div className="text-primary font-medium text-sm">
                    USD
                  </div>
                </div>
              </div>

              {/* Profile Button */}
              <button
                onClick={() => navigate("/profile")}
                className="relative h-9 w-9 md:h-10 md:w-10 rounded-xl p-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all duration-200 flex items-center justify-center border border-primary/10"
                title="Profile"
              >
                <User className="h-5 w-5 text-primary" weight="fill" />
              </button>


            </div>
          </div>
          {/* New row: Title below logo */}
          {title && !platform && (
            <div className="flex w-full mt-2 md:mt-3">
              <span className="font-bold text-2xl md:text-4xl text-foreground tracking-tight text-left">
                {title}
              </span>
            </div>
          )}
        </div>
        {/* Removed separate title row at the end */}
      </header>
    </>
  );
};
