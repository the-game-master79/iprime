import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  BanknoteIcon, 
  GanttChartIcon, 
  Gift, 
  LayoutDashboard, 
  Layers, 
  Menu, 
  Package, 
  Settings, 
  Users, 
  X, 
  BellIcon, 
  LogOut,
  DollarSign,
  Trophy,
  ChevronLeft,
  HelpCircle // Add this import
} from "lucide-react";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // Add this import
import { supabase } from "@/lib/supabase";

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  category: 'admin' | 'referral' | 'system'; // Add this
  reference_id?: string;  // Add this for linking to related transactions
}

export const ShellLayout = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isMobile, isTablet } = useBreakpoints();
  const location = useLocation();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const { logout } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Close sidebar on mobile when navigating to a new page
  useEffect(() => {
    if ((isMobile || isTablet) && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [location.pathname, isMobile, isTablet]);

  const fetchNotices = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .or(`category.eq.system,category.eq.referral,and(category.eq.admin,is_active.eq.true),user_id.eq.${user.user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
      setUnreadCount((data?.filter(n => n.category === 'admin' && n.is_active) || []).length);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  useEffect(() => {
    fetchNotices();

    // Set up realtime subscriptions for new notices
    const noticesSubscription = supabase
      .channel('custom-notices')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notices',
          filter: `is_active=eq.true`
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
  }, []);

  const toggleSidebar = () => {
    if (isMobile || isTablet) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Only update admin notifications to is_active = false
      const { error } = await supabase
        .from('notices')
        .update({ is_active: false })
        .eq('category', 'admin');

      if (error) throw error;

      // Refresh notifications
      const { data, error: fetchError } = await supabase
        .from('notices')
        .select('*')
        .or(`category.eq.system,category.eq.referral,and(category.eq.admin,is_active.eq.true),user_id.eq.${user.user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotices(data || []);
      setUnreadCount((data?.filter(n => n.category === 'admin' && n.is_active) || []).length);
      
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <aside
        id="sidebar"
        className={cn(
          "fixed inset-y-0 z-50 flex h-full flex-col border-r bg-sidebar transition-transform duration-300 ease-in-out",
          (isMobile || isTablet)
            ? `w-[280px] ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : (isCollapsed ? "w-20" : "w-64")
        )}
      >
        <div className="flex h-14 items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/cloudforex.svg" 
              alt="cloudforex Logo" 
              className={cn(
                "h-8 transition-all duration-300",
                isCollapsed && !isMobile && "w-8"
              )} 
            />
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full px-3">
            <nav className="flex flex-col gap-2 py-4">
              <SidebarItem
                collapsed={isCollapsed && !isMobile}
                icon={<LayoutDashboard />}
                label="Dashboard"
                href="/dashboard"
                active={location.pathname === '/dashboard'}
              />
              <SidebarItem
                collapsed={isCollapsed && !isMobile}
                icon={<Trophy />}
                label="My Rank"
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
                icon={<Settings />}
                label="Settings"
                href="/profile"
                active={location.pathname === '/profile'}
              />

            </nav>
          </ScrollArea>
        </div>
        
        <div className="border-t p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {(!isCollapsed || isMobile) && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile/Tablet overlay */}
      {(isMobile || isTablet) && isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
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
          
          <Button 
            variant="default"
            className="hidden sm:flex mr-2"
            onClick={() => setDepositDialogOpen(true)}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Deposit
          </Button>

          <Button 
            variant="default"
            size="icon"
            className="sm:hidden mr-2"
            onClick={() => setDepositDialogOpen(true)}
          >
            <DollarSign className="h-4 w-4" />
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
            <DropdownMenuContent align="end" className="w-[380px]">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-semibold">Notifications</span>
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
                  <div className="max-h-[300px] overflow-auto">
                    {notices.filter(n => n.category === 'admin').length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No admin notifications
                      </div>
                    ) : (
                      notices.filter(n => n.category === 'admin').map((notice) => (
                        <DropdownMenuItem key={notice.id} className="px-4 py-3 cursor-default">
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
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="referral" className="mt-0">
                  <div className="max-h-[300px] overflow-auto">
                    {notices.filter(n => n.category === 'referral').length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No referral notifications
                      </div>
                    ) : (
                      notices.filter(n => n.category === 'referral').map((notice) => (
                        <DropdownMenuItem key={notice.id} className="px-4 py-3 cursor-default">
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
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="system" className="mt-0">
                  <div className="max-h-[300px] overflow-auto">
                    {notices.filter(n => n.category === 'system').length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No system notifications
                      </div>
                    ) : (
                      notices.filter(n => n.category === 'system').map((notice) => (
                        <DropdownMenuItem key={notice.id} className="px-4 py-3 cursor-default">
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
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </DropdownMenuContent>
          </DropdownMenu>

          <DepositDialog 
            open={depositDialogOpen} 
            onOpenChange={setDepositDialogOpen} 
          />
        </header>
        
        <div className="container py-4 md:py-10 px-3 md:px-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
}

const SidebarItem = ({
  icon,
  label,
  href,
  active,
  collapsed,
}: SidebarItemProps) => {
  return (
    <Link to={href}>
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2 transition-all",
          collapsed && "justify-center px-0"
        )}
      >
        <span>{icon}</span>
        {!collapsed && <span>{label}</span>}
      </Button>
    </Link>
  );
};

export default ShellLayout;
