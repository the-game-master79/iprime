import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Component imports
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { StatusDialog } from "@/components/dialogs/StatusDialog";

// Hooks
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { usePwaInstall } from "@/hooks/use-pwa-install";

// Icons
import {
  BanknoteIcon, GanttChartIcon, LayoutDashboard, Menu, Package,
  Settings, Users, X, BellIcon, LogOut, DollarSign, Trophy,
  ChevronLeft, HelpCircle, Download, InfoIcon, User, LineChart
} from "lucide-react";

// Types
interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  category: 'admin' | 'referral' | 'system';
  reference_id?: string;
  user_id?: string;
  is_active?: boolean;
  read_at?: string;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
}

// Notification components
const NotificationsList: React.FC<{ notices: Notice[], category: Notice['category'] }> = ({ notices, category }) => {
  const filteredNotices = notices.filter(n => n.category === category);
  
  if (filteredNotices.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No {category} notifications
      </div>
    );
  }

  return (
    <div className="max-h-[300px] overflow-auto">
      {filteredNotices.map((notice) => (
        <NotificationItem key={notice.id} notice={notice} />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{ notice: Notice }> = ({ notice }) => (
  <DropdownMenuItem className="px-4 py-3 cursor-default">
    <div className="flex gap-3 w-full">
      <div className={`w-1.5 shrink-0 rounded-full ${
        notice.type === 'info' ? 'bg-blue-500' :
        notice.type === 'warning' ? 'bg-yellow-500' :
        notice.type === 'success' ? 'bg-green-500' :
        'bg-red-500'
      }`} />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{notice.title}</p>
        <p className="text-sm text-muted-foreground">{notice.content}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(notice.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  </DropdownMenuItem>
);

// Sidebar components
const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, href, active, collapsed }) => (
  <Link to={href} className="mb-2"> {/* Added mb-2 class for bottom margin */}
    <Button
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start gap-3 h-12",
        collapsed && "justify-center p-0",
        active && "bg-primary/10 text-primary font-medium hover:bg-primary/15"
      )}
    >
      <div className={cn(
        "flex items-center gap-3 flex-1",
        collapsed && "justify-center"
      )}>
        <span className="flex h-5 w-5 items-center">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
    </Button>
  </Link>
);

interface SidebarProps {
  isCollapsed: boolean;
  isMobile: boolean;
  isMobileSidebarOpen: boolean;
  onLogout: () => void;
  location: any;
  canInstall: boolean;
  onInstall: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  isMobile, 
  isMobileSidebarOpen, 
  onLogout, 
  location, 
  canInstall, 
  onInstall 
}) => (
  <aside
    className={cn(
      "fixed inset-y-0 z-50 flex h-full w-[280px] flex-col bg-card border-r shadow-sm transition-all duration-300",
      isMobile ? `${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}` : 
      isCollapsed ? "w-[80px]" : "w-[280px]"
    )}
  >
    {/* Logo Section */}
    <div className="flex h-[60px] items-center border-b px-6">
      <Link to="/" className="flex items-center gap-3">
        {isCollapsed ? (
          <img 
            src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cflogo.svg" 
            alt="CloudForex Logo" 
            className="h-8 w-8 transition-all duration-200"
          />
        ) : (
          <img 
            src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/cloudforex.svg" 
            alt="CloudForex Logo" 
            className="h-8 w-auto transition-all duration-200"
          />
        )}
        {!isCollapsed && <span className="text-lg font-semibold"></span>}
      </Link>
    </div>

    {/* Navigation Section */}
    <div className="flex-1 overflow-auto">
      <ScrollArea className="h-full px-4">
        <nav className="space-y-1 py-4">
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<LayoutDashboard />}
            label="Dashboard"
            href="/dashboard"
            active={location.pathname === '/dashboard'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<LineChart className="h-5 w-5" />} 
            label="Trade"
            href="/trade"
            active={location.pathname === '/trade'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<Trophy />}
            label="Ranks"
            href="/rank"
            active={location.pathname === '/rank'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<Package />}
            label="Plans"
            href="/plans"
            active={location.pathname === '/plans'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<Users />}
            label="Affiliate"
            href="/affiliate"
            active={location.pathname === '/affiliate'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<BanknoteIcon />}
            label="Payments"
            href="/payments"
            active={location.pathname === '/payments'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<GanttChartIcon />}
            label="Withdrawals"
            href="/withdrawals"
            active={location.pathname === '/withdrawals'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<HelpCircle />}
            label="Support"
            href="/support"
            active={location.pathname === '/support'}
          />
          <SidebarItem
            collapsed={isCollapsed && !isMobile}
            icon={<User />}
            label="My Profile"
            href="/profile"
            active={location.pathname === '/profile'}
          />
        </nav>
      </ScrollArea>
    </div>

    {/* Footer Actions */}
    <div className="border-t p-4">
      <div className="space-y-2">
        {canInstall && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3"
            onClick={onInstall}
          >
            <Download className="h-5 w-5" />
            {(!isCollapsed || isMobile) && <span>Install App</span>}
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          {(!isCollapsed || isMobile) && <span>Logout</span>}
        </Button>
      </div>
    </div>
  </aside>
);

export const ShellLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Move PWA hook after other hooks
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isMobile, isTablet } = useBreakpoints();
  // ...other state hooks...
  
  // Use PWA hook
  const pwaSupport = usePwaInstall();
  const canInstall = pwaSupport.canInstall;
  const install = pwaSupport.install;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [performanceData, setPerformanceData] = useState<{ value: number }[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Hooks
  const location = useLocation();
  const { logout } = useAuth();

  // Effects
  useEffect(() => {
    if ((isMobile || isTablet) && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [location.pathname, isMobile, isTablet]);

  // Notifications subscription
  useEffect(() => {
    const setupNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetchNotices();

      const noticesSubscription = supabase
        .channel('custom-notices')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notices',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setNotices(current => [payload.new as Notice, ...current]);
            setUnreadCount(count => count + 1);
          }
        )
        .subscribe();

      return () => {
        noticesSubscription.unsubscribe();
      };
    };

    setupNotifications();
  }, []);

  useEffect(() => {
    const setupBalanceTracking = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Initial balance fetch
        const { data, error } = await supabase
          .from('profiles')
          .select('withdrawal_wallet')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserBalance(data?.withdrawal_wallet || 0);

        // Setup real-time subscription
        const channel = supabase
          .channel('profile-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              setUserBalance((payload.new as { withdrawal_wallet: number }).withdrawal_wallet || 0);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up wallet tracking:', error);
      }
    };

    setupBalanceTracking();
  }, []);

  // Handlers
  const fetchNotices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .or(
          `and(category.eq.system,user_id.eq.${user.id}),` +
          `and(category.eq.referral,user_id.eq.${user.id}),` + 
          `and(category.eq.admin,is_active.eq.true)`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
      
      // Count unread notifications that belong to the user
      setUnreadCount(
        (data?.filter(n => 
          (n.category === 'admin' && n.is_active) || 
          ((n.category === 'referral' || n.category === 'system') && 
           !n.read_at && n.user_id === user.id)
        ) || []).length
      );
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark admin notices as inactive
      await supabase
        .from('notices')
        .update({ is_active: false })
        .eq('category', 'admin');

      // Mark user's referral and system notifications as read
      await supabase
        .from('notices')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('category', ['referral', 'system'])
        .is('read_at', null);

      // Refresh notifications
      await fetchNotices();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const toggleSidebar = () => {
    if (isMobile || isTablet) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <Sidebar 
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onLogout={logout}
        location={location}
        canInstall={canInstall}
        onInstall={install}
      />

      {/* Mobile/Tablet overlay */}
      {(isMobile || isTablet) && isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main 
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          (isMobile || isTablet) ? "ml-0 w-full" : (isCollapsed ? "ml-20" : "ml-64")
        )}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-6">
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className="flex md:hidden"
          >
            {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className="hidden md:flex"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1" />

          <div 
            className="flex items-center gap-2 mr-2 bg-black/5 backdrop-blur-sm px-3 py-1.5 rounded-full cursor-pointer hover:bg-black/10 transition-colors"
            onClick={() => setStatusDialogOpen(true)}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-500">Bot is Live</span>
          </div>

          <Button 
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => setInfoDialogOpen(true)}
          >
            <InfoIcon className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-[380px]"
              aria-describedby="notifications-description"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-semibold">Notifications</span>
                <span id="notifications-description" className="sr-only">
                  View and manage your notifications
                </span>
                {notices.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-xs"
                    onClick={handleMarkAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <Tabs defaultValue="admin" className="w-full">
                <div className="px-4 py-2 border-b">
                  <TabsList className="w-full">
                    <TabsTrigger value="admin" className="flex-1">Admin</TabsTrigger>
                    <TabsTrigger value="referral" className="flex-1">Referrals</TabsTrigger>
                    <TabsTrigger value="system" className="flex-1">System</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="admin" className="mt-0">
                  <NotificationsList notices={notices} category="admin" />
                </TabsContent>

                <TabsContent value="referral" className="mt-0">
                  <NotificationsList notices={notices} category="referral" />
                </TabsContent>

                <TabsContent value="system" className="mt-0">
                  <NotificationsList notices={notices} category="system" />
                </TabsContent>
              </Tabs>
            </DropdownMenuContent>
          </DropdownMenu>

          <InfoDialog 
            open={infoDialogOpen}
            onOpenChange={setInfoDialogOpen}
          />
          
          <DepositDialog 
            open={depositDialogOpen} 
            onOpenChange={setDepositDialogOpen} 
          />

          <StatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
          />
        </header>
        
        <div className="container py-4 md:py-10 px-3 md:px-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ShellLayout;
