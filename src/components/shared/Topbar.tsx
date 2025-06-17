import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, UserCircle, GearSix, SignOut, Wallet, CaretLeft } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/use-theme";

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "SGD",
  "NZD", "ZAR", "BRL", "HKD", "KRW"
];

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "pl", label: "Polish", native: "Polski" }
];

// SettingsDialog component
function SettingsDialog({ open, onOpenChange, theme, setTheme, currency, setCurrency, language, setLanguage }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <span>
              {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </span>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={checked => setTheme(checked ? "dark" : "light")}
            />
          </div>
          {/* Currency Selector */}
          <div>
            <label className="block text-sm mb-1">Currency</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent className="max-h-48 text-foreground">
                {CURRENCIES.map(cur => (
                  <SelectItem key={cur} value={cur} className="text-foreground">{cur}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Language Selector */}
          <div>
            <label className="block text-sm mb-1">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="max-h-48 text-foreground">
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code} className="text-foreground">{lang.native}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const Topbar = ({
  currentUser: propCurrentUser,
  title,
  hideBackButton = false,
}: {
  currentUser?: any;
  title?: string;
  hideBackButton?: boolean;
} = {}) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser || null);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");

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
    if (currentUser) {
      fetchAvailableBalance();
    }
  }, [currentUser]);

  // Fetch platform available balance (withdrawal_wallet + sum of all subscribed plans)
  const fetchAvailableBalance = async () => {
    try {
      if (!currentUser) return;

      // Fetch withdrawal_wallet
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('withdrawal_wallet')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;
      const withdrawalWallet = profileData?.withdrawal_wallet || 0;

      // Fetch sum of all subscribed plans (status: approved)
      const { data: plansData, error: plansError } = await supabase
        .from('plans_subscriptions')
        .select('amount')
        .eq('user_id', currentUser.id)
        .eq('status', 'approved');

      if (plansError) throw plansError;
      const plansSum = (plansData || []).reduce((sum: number, plan: any) => sum + (Number(plan.amount) || 0), 0);

      setAvailableBalance(Number(withdrawalWallet) + Number(plansSum));
    } catch (error) {
      setAvailableBalance(0);
    }
  };

  return (
    <>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        setTheme={setTheme}
        currency={currency}
        setCurrency={setCurrency}
        language={language}
        setLanguage={setLanguage}
      />
      <div className="w-full flex justify-center px-2 md:px-0 pt-4 pb-2">
        <header
          className="sticky top-0 z-50 w-full max-w-[1200px] rounded-2xl bg-secondary/80 backdrop-blur-md shadow-xl border border-border flex flex-col px-4 md:px-8 py-3 transition-all"
          style={{
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            background: theme === 'dark'
              ? 'rgba(24, 24, 27, 0.85)'
              : 'rgba(255, 255, 255, 0.85)'
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Back Button (conditionally rendered) */}
              {!hideBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-lg relative bg-secondary-foreground/10 hover:bg-secondary-foreground/20 mr-1"
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
                    ? "/ct-logo-dark.svg"
                    : "/ct-logo-light.svg"
                }
                alt="CloudForex"
                className="h-7 w-auto cursor-pointer hover:opacity-80 transition-opacity md:hidden"
                onClick={() => window.location.reload()}
              />
              <img
                src={
                  theme === "dark"
                    ? "/cf-dark.svg"
                    : "/cf-light.svg"
                }
                alt="CloudForex"
                className="h-7 w-auto cursor-pointer hover:opacity-80 transition-opacity hidden md:block"
                onClick={() => window.location.reload()}
              />
            </div>
            <div className="flex items-center gap-3">
              {/* Available Balance */}
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs text-muted-foreground">Available Balance</span>
                <span className="font-regular text-lg text-foreground">
                  {Number(availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="font-bold">USD</span>
                </span>
              </div>
              {/* Mobile: Balance badge with wallet icon */}
              <div className="flex md:hidden items-center">
                <Badge className="flex items-center gap-1 px-3 py-3 rounded-md text-xs font-medium bg-secondary-foreground/10 text-foreground">
                  <Wallet className="w-4 h-4 mr-1" weight="bold" />
                  {Number(availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </Badge>
              </div>
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-secondary/30 hover:bg-secondary-foreground/20 rounded-lg"
                  >
                    <Avatar className="h-10 w-10 bg-primary hover:bg-primary/90 rounded-lg transition-colors">
                      <AvatarFallback className="bg-primary rounded-lg">
                        <UserCircle weight="bold" className="h-6 w-6 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-background text-foreground border-border">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" weight="bold" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <GearSix className="mr-2 h-4 w-4" weight="bold" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="bg-destructive text-white" onClick={() => { (async () => { await supabase.auth.signOut(); navigate("/login"); })(); }}>
                    <SignOut className="mr-2 h-4 w-4" weight="bold" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      </div>
      {title && (
        <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8 mt-2">
          <span className="font-semibold text-4xl text-foreground block text-left">{title}</span>
        </div>
      )}
    </>
  );
};
