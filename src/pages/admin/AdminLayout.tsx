import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  ChevronLeft
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileView) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobileView]);

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (requireAuth && !adminAuth && location.pathname !== '/admin/login') {
      navigate('/admin/login');
    }
  }, [requireAuth, navigate, location.pathname]);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/admin/login');
  };

  if (requireAuth && !isAdminAuthenticated && location.pathname !== '/admin/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <Shield className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Restricted Access</h1>
          <p className="text-muted-foreground">
            Please log in with valid admin credentials to access this area.
          </p>
          <Button onClick={() => navigate('/admin/login')} className="w-full sm:w-auto">
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen">
        {showSidebar && isAdminAuthenticated && (
          <>
            {/* Overlay for mobile */}
            {isMobileView && sidebarOpen && (
              <div
                className="fixed inset-0 z-10 bg-background/80 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            
            <aside
              className={cn(
                "fixed inset-y-0 z-20 flex h-full flex-col border-r bg-sidebar transition-all duration-300 ease-in-out",
                isMobileView
                  ? `w-64 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
                  : sidebarOpen ? "w-64" : "w-20"
              )}
            >
              {/* Updated Sidebar Header with Logo */}
              <div className="flex h-14 items-center justify-center border-b px-4">
                <Link to="/admin/dashboard" className="flex items-center gap-2">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
                    alt="CloudForex" 
                    className={cn(
                      "transition-all duration-300",
                      sidebarOpen ? "h-8 w-auto" : "h-6 w-auto"
                    )} 
                  />
                </Link>
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
                    to="/admin/deposits" 
                    icon={<ArrowDownToLine className="h-5 w-5" />} 
                    label="Plans Subscription" 
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
                    to="/admin/support" 
                    icon={<HelpCircle className="h-5 w-5" />} 
                    label="Support Tickets" 
                    active={location.pathname === '/admin/support'} 
                    collapsed={!sidebarOpen} 
                  />
                  <SidebarLink 
                    to="/admin/settings" 
                    icon={<Settings className="h-5 w-5" />} 
                    label="Settings" 
                    active={location.pathname === '/admin/settings'} 
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
        
        <main 
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            showSidebar && isAdminAuthenticated 
              ? isMobileView 
                ? "ml-0" 
                : (sidebarOpen ? "md:ml-64" : "md:ml-20") 
              : "md:ml-0"
          )}
        >
          <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            {showSidebar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={cn(
                  isMobileView ? "flex" : "hidden",
                  "mr-2"
                )}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            
            <div className="ml-auto flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                asChild
              >
                <Link to="/">View Site</Link>
              </Button>
            </div>
          </header>
          
          <div className="container py-6">{children}</div>
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
