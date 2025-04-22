import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { 
  Users, 
  BarChart3, 
  ArrowDownToLine, 
  ArrowUpToLine,
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Shield,
  CreditCard,
  Briefcase, 
  Image,
  HelpCircle, 
  Bell,
  ChevronLeft,
  LineChart // Add LineChart icon for trading pairs
} from "lucide-react";
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
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1">
                <nav className="flex flex-col gap-1 p-2">
                  <SidebarLink 
                    to="/admin/dashboard" 
                    icon={<BarChart3 className="h-5 w-5" />} 
                    label="Dashboard" 
                    active={location.pathname === '/admin/dashboard'} 
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
                    icon={<ArrowUpToLine className="h-5 w-5" />} 
                    label="Withdrawals" 
                    active={location.pathname === '/admin/withdrawals'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/plans-subscription" 
                    icon={<ArrowDownToLine className="h-5 w-5" />} 
                    label="Plans Subscription" 
                    active={location.pathname === '/admin/plans-subscription'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/deposits" 
                    icon={<ArrowDownToLine className="h-5 w-5" />} 
                    label="Deposits" 
                    active={location.pathname === '/admin/deposits'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/promotions"
                    icon={<Image className="h-5 w-5" />}
                    label="Promotions"
                    active={location.pathname === '/admin/promotions'}
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
                    icon={<Bell className="h-5 w-5" />} 
                    label="Notices" 
                    active={location.pathname === '/admin/notices'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/settings" 
                    icon={<Settings className="h-5 w-5" />} 
                    label="Settings" 
                    active={location.pathname === '/admin/settings'} 
                    collapsed={!sidebarOpen} 
                    />
                  <SidebarLink 
                    to="/admin/pairs"
                    icon={<LineChart className="h-5 w-5" />}
                    label="Trading Pairs"
                    active={location.pathname === '/admin/pairs'}
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
                  <LogOut className="h-4 w-4" />
                  {sidebarOpen && <span>Logout</span>}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden md:flex w-full justify-center"
                >
                  {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
                <Menu className="h-5 w-5" />
              </Button>
            </header>
          )}

          <div className="container py-4 md:py-8">
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
        {!collapsed && active && <ChevronRight className="ml-auto h-4 w-4" />}
      </Button>
    </Link>
  );
};

export default AdminLayout;
