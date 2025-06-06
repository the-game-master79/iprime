import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, UserCircle, GearSix, SignOut, Wallet } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "@/components/ui/use-toast"; // Add this import

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  amount?: number;
}

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
        {/* No DialogFooter */}
      </DialogContent>
    </Dialog>
  );
}

export const DashboardTopbar = ({ currentUser: propCurrentUser }: { currentUser?: any } = {}) => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser || null);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [hasActivePlan, setHasActivePlan] = useState<boolean>(false);
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
      fetchNotices();
      fetchAvailableBalance();
      fetchActivePlans();
    }
  }, [currentUser]);

  const fetchNotices = async () => {
    try {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .or(`user_id.eq.${currentUser.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

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

  // Fetch if user has at least 1 active plan
  const fetchActivePlans = async () => {
    try {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('plans_subscriptions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('status', 'approved')
        .limit(1);
      if (error) throw error;
      setHasActivePlan((data?.length || 0) > 0);
    } catch (error) {
      setHasActivePlan(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!currentUser) return;

      await supabase
        .from('notices')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);

      fetchNotices();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // AQ Button click handler
  const handleAQClick = () => {
    navigate("/plans");
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
      <header className="flex items-center justify-between py-4 bg-secondary w-full px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Logo: show icon only on mobile, full logo on md+ */}
              <img
                src={
                  theme === "dark"
                    ? "/ct-logo-dark.svg"
                    : "/ct-logo-light.svg"
                }
                alt="CloudForex"
                className="h-6 w-auto cursor-pointer hover:opacity-80 transition-opacity md:hidden"
                onClick={() => window.location.reload()}
              />
              <img
                src={
                  theme === "dark"
                    ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-dark.svg"
                    : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-light.svg"
                }
                alt="CloudForex"
                className="h-6 w-auto cursor-pointer hover:opacity-80 transition-opacity hidden md:block"
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
                <Badge className="flex items-center gap-1 px-3 py-3 rounded-md text-xs font-medium bg-secondary-foreground text-foreground">
                  <Wallet className="w-4 h-4 mr-1" weight="bold" />
                  {Number(availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </Badge>
              </div>
              {/* AQ Button */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-lg relative hover:bg-secondary-foreground ${
                  hasActivePlan ? "bg-success" : "bg-destructive"
                }`}
                onClick={handleAQClick}
                aria-label="AlphaQuant"
              >
                <span className={`font-bold text-sm ${
                  hasActivePlan ? "text-white" : "text-white"
                }`}>AQ</span>
              </Button>
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10 rounded-lg relative bg-secondary-foreground hover:bg-secondary-foreground"
                  >
                    <Bell className="h-5 w-5 text-foreground" weight="bold" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="default" 
                        className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[380px] bg-card text-card-foreground border-border">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                    <DropdownMenuLabel className="text-foreground">Notifications</DropdownMenuLabel>
                    {notices.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs hover:text-primary"
                        onClick={handleMarkAllAsRead}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-auto">
                    {notices.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        No notifications
                      </div>
                    ) : (
                      notices.map((notice) => (
                        <DropdownMenuItem key={notice.id} className="px-4 py-3 cursor-default hover:bg-accent">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{notice.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {notice.content.replace(
                                /\$?([\d,.]+)(\.\d+)?/g,
                                (match, whole, decimal) => {
                                  const num = parseFloat(match.replace(/[$,]/g, ''));
                                  return isNaN(num) ? match : `$${num.toFixed(2)}`;
                                }
                              )}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-lg bg-secondary hover:bg-secondary-foreground rounded-lg"
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
                  <DropdownMenuItem className="bg-destructive text-white" onClick={handleLogout}>
                    <SignOut className="mr-2 h-4 w-4" weight="bold" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
