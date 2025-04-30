import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { 
  Users, 
  ChartBar, 
  ArrowLineUp, 
  ArrowLineDown,
  Gear, 
  SignOut, 
  List, 
  X as XIcon, 
  CaretRight, 
  CreditCard,
  Briefcase, 
  Image as ImageIcon,
  Bell as BellIcon,
  CaretLeft,
  ChartLine,
  Tag,
  TrendUp // Add this import
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/ui-components";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface AdminLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  showSidebar?: boolean;
}

const AdminLayout = ({ children, requireAuth = true, showSidebar = true }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated, isLoading, logoutAdmin } = useAdminAuth();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      setSidebarOpen(!isMobile);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobileView) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobileView]);

  // Check admin authentication
  useEffect(() => {
    if (requireAuth && !isAdminAuthenticated && location.pathname !== '/admin/login') {
      navigate('/admin/login', { replace: true });
    }
  }, [requireAuth, isAdminAuthenticated, location.pathname, navigate]);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/admin/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen bg-background">
        {showSidebar && isAdminAuthenticated && (
          <>
            {/* Mobile overlay */}
            {isMobileView && sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* Sidebar */}
            <aside
              className={cn(
                "fixed inset-y-0 z-50 flex h-full w-64 flex-col border-r bg-background transition-transform duration-300",
                isMobileView && !sidebarOpen && "-translate-x-full"
              )}
            >
              {/* Sidebar header */}
              <div className="flex h-14 items-center justify-between border-b px-4">
                <Link to="/admin/dashboard" className="flex items-center gap-2">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
                    alt="CloudForex" 
                    className="h-8 w-auto"
                  />
                </Link>
                {isMobileView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1">
                <nav className="flex flex-col gap-1 p-2">
                  <SidebarLink 
                    to="/admin/dashboard" 
                    icon={<ChartBar className="h-5 w-5" />} 
                    label="Dashboard" 
                    active={location.pathname === '/admin/dashboard'} 
                    collapsed={!sidebarOpen} 
                  />
                  {/* Add the trades link here */}
                  <SidebarLink 
                    to="/admin/trades"
                    icon={<TrendUp className="h-5 w-5" />}
                    label="Trading Activity" 
                    active={location.pathname === '/admin/trades'}
                    collapsed={!sidebarOpen}
                  />
                  <SidebarLink 
                    to="/admin/users" 
                    icon={<Users className="h-5 w-5" />} 
                    label="User Management" 
                    active={location.pathname === '/admin/users'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/affiliates" 
                    icon={<Users className="h-5 w-5" />} 
                    label="Affiliates" 
                    active={location.pathname === '/admin/affiliates'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/payments" 
                    icon={<CreditCard className="h-5 w-5" />} 
                    label="Payments" 
                    active={location.pathname === '/admin/payments'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/withdrawals" 
                    icon={<ArrowLineUp className="h-5 w-5" />} 
                    label="Withdrawals" 
                    active={location.pathname === '/admin/withdrawals'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/plans-subscription" 
                    icon={<ArrowLineDown className="h-5 w-5" />} 
                    label="Plans Subscription" 
                    active={location.pathname === '/admin/plans-subscription'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/deposits" 
                    icon={<ArrowLineDown className="h-5 w-5" />} 
                    label="Deposits" 
                    active={location.pathname === '/admin/deposits'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/promotions"
                    icon={<ImageIcon className="h-5 w-5" />}
                    label="Promotions"
                    active={location.pathname === '/admin/promotions'}
                    collapsed={!sidebarOpen}
                  />
                  <SidebarLink 
                    to="/admin/promocodes"
                    icon={<Tag className="h-5 w-5" />}
                    label="Promocodes"
                    active={location.pathname === '/admin/promocodes'}
                    collapsed={!sidebarOpen}
                  />
                  <SidebarLink 
                    to="/admin/plans" 
                    icon={<Briefcase className="h-5 w-5" />} 
                    label="Plans" 
                    active={location.pathname === '/admin/plans'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/notices" 
                    icon={<BellIcon className="h-5 w-5" />} 
                    label="Notices" 
                    active={location.pathname === '/admin/notices'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/settings" 
                    icon={<Gear className="h-5 w-5" />} 
                    label="Settings" 
                    active={location.pathname === '/admin/settings'} 
                    collapsed={!sidebarOpen} 
                    />
                  <SidebarLink 
                    to="/admin/pairs"
                    icon={<ChartLine className="h-5 w-5" />}
                    label="Trading Pairs"
                    active={location.pathname === '/admin/pairs'}
                    collapsed={!sidebarOpen}
                  />
                  <SidebarLink 
                    to="/admin/live-rates"
                    icon={<ChartLine className="h-5 w-5" />}
                    label="Live Rates" 
                    active={location.pathname === '/admin/live-rates'}
                    collapsed={!sidebarOpen}
                  />
                </nav>
              </ScrollArea>
              
              <div className="border-t p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 mb-2"
                  onClick={handleLogout}
                >
                  <SignOut className="h-4 w-4" />
                  {sidebarOpen && <span>Logout</span>}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden md:flex w-full justify-center"
                >
                  {sidebarOpen ? <CaretLeft className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </Button>
              </div>
            </aside>
          </>
        )}

        {/* Main content */}
        <main 
          className={cn(
            "flex-1 transition-all duration-300",
            showSidebar && isAdminAuthenticated && !isMobileView && "ml-64"
          )}
        >
          {/* Mobile header */}
          {showSidebar && isAdminAuthenticated && isMobileView && (
            <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <List className="h-5 w-5" />
              </Button>
            </header>
          )}

          <div className="py-4 px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}

const SidebarLink = ({
  to,
  icon,
  label,
  active,
  collapsed,
}: SidebarLinkProps) => {
  return (
    <Link to={to}>
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2",
          collapsed && "justify-center p-0"
        )}
      >
        {icon}
        {!collapsed && <span>{label}</span>}
        {!collapsed && active && <CaretRight className="ml-auto h-4 w-4" />}
      </Button>
    </Link>
  );
};

export default AdminLayout;
