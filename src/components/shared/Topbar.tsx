import { ArrowLeft, Bell, Info, AlertCircle, CheckCircle, Menu, UserCircle } from "lucide-react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  variant?: 'default' | 'minimal' | 'transparent';
  hideBalance?: boolean;
  hideNotifications?: boolean;
  hideBackButton?: boolean;
  className?: string;
  backButtonAction?: () => void;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'admin' | 'system' | 'referral';
  is_active: boolean;
  read_at: string | null;
  created_at: string;
  user_id: string | null;
}

export const Topbar = ({ 
  title, 
  variant = 'default',
  hideBalance = false,
  hideNotifications = false,
  hideBackButton = false,
  className,
  backButtonAction
}: TopbarProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [balance, setBalance] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUserBalance();
    fetchNotices();
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

  const fetchNotices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .or(`category.eq.admin,and(user_id.eq.${user.id},category.in.(referral,system))`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
      setUnreadCount(data?.filter(n => 
        (n.category === 'admin' && n.is_active) || 
        ((n.category === 'referral' || n.category === 'system') && !n.read_at)
      ).length || 0);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notices')
        .update({ is_active: false })
        .eq('category', 'admin');

      await supabase
        .from('notices')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('category', ['referral', 'system'])
        .is('read_at', null);

      fetchNotices();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNoticeIcon = (type: Notice['type']) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const handleBalanceClick = () => {
    if (window.location.pathname === '/deposit') {
      // If already on deposit page, reload the page
      window.location.reload();
    } else {
      // Otherwise navigate to deposit page
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
            className="flex items-center gap-2"
            onClick={backButtonAction || (() => window.history.back())}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="hidden md:block">
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!hideBalance && (
          <div onClick={handleBalanceClick} className="flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 shadow-sm transition-colors hover:bg-accent">
            <span className="text-sm font-medium">${balance.toLocaleString()}</span>
            <Plus className="h-4 w-4 rounded-full bg-primary p-0.5 text-white hover:bg-primary/90" />
          </div>
        )}

        {!hideNotifications && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px]">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={handleMarkAllAsRead}>
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-auto py-2">
                  {notices.length === 0 ? (
                    <div className="px-4 py-2 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notices.map((notice) => (
                      <div 
                        key={notice.id} 
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted ${
                          ((notice.category === 'admin' && notice.is_active) || 
                           ((notice.category === 'referral' || notice.category === 'system') && !notice.read_at)) 
                            ? 'bg-muted/50' : ''
                        }`}
                      >
                        {getNoticeIcon(notice.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notice.title}</p>
                          <p className="truncate text-sm text-muted-foreground">{notice.content}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(notice.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <UserCircle className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  const renderMinimalContent = () => (
    <>
      <div className="flex flex-col items-center gap-1">
        <img 
          src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudtrade-1.svg" 
          alt="CloudTrade Logo" 
          className="h-8 w-auto" 
        />
      </div>
      
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-primary/10"
          onClick={() => navigate('/profile')}
        >
          <UserCircle className="h-5 w-5" />
        </Button>
      </div>
    </>
  );

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full",
      variant === 'default' && "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      variant === 'minimal' && "bg-transparent",
      variant === 'transparent' && "absolute bg-transparent border-none",
      className
    )}>
      <div className="container flex h-14 max-w-[1200px] items-center px-4">
        <div className="flex flex-1 items-center justify-between gap-4">
          {variant === 'minimal' ? renderMinimalContent() : renderDefaultContent()}
        </div>
      </div>
      
      {variant === 'default' && (
        <div className="border-b md:hidden">
          <div className="container px-4 py-2">
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </div>
      )}
    </header>
  );
};
