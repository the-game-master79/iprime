import { ReactNode, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { 
  Users, 
  BarChart3, 
  DollarSign, 
  ArrowDownToLine, 
  ArrowUpToLine,
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Shield,
  CreditCard,
  Briefcase, // Add this import
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/ui-components";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface AdminLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const AdminLayout = ({ children, requireAuth = true }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { isAdminAuthenticated, logoutAdmin } = useAdminAuth();

  // Update auth check to use context
  if (requireAuth && !isAdminAuthenticated) {
    return <Navigate to="/admin/login" />;
  }
  
  return (
    <PageTransition>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 z-20 flex h-full flex-col border-r bg-sidebar transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-20"
          )}
        >
          {/* Sidebar Header */}
          <div className="flex h-14 items-center border-b px-4">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              {sidebarOpen && <span className="text-lg font-semibold">Admin Panel</span>}
            </Link>
          </div>
          
          {/* Navigation Items */}
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
                to="/admin/settings" 
                icon={<Settings className="h-5 w-5" />} 
                label="Settings" 
                active={location.pathname === '/admin/settings'} 
                collapsed={!sidebarOpen} 
                />

            </nav>
          </ScrollArea>
          
          {/* Sidebar Footer */}
          <div className="border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={logoutAdmin}
            >
              <LogOut className="h-4 w-4" />
              {sidebarOpen && <span>Logout</span>}
            </Button>
            
            <Separator className="my-3" />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            sidebarOpen ? "md:ml-64" : "md:ml-20"
          )}
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
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
          
          {/* Page Content */}
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
