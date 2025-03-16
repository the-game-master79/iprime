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
  ChevronLeft
} from "lucide-react";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { useAuth } from '@/contexts/AuthContext';

export const ShellLayout = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isMobile, isTablet } = useBreakpoints();
  const location = useLocation();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const { logout } = useAuth();
  
  // Close sidebar on mobile when navigating to a new page
  useEffect(() => {
    if ((isMobile || isTablet) && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [location.pathname, isMobile, isTablet]);

  const toggleSidebar = () => {
    if (isMobile || isTablet) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsCollapsed(!isCollapsed);
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

          <Button variant="ghost" size="icon">
            <BellIcon className="h-5 w-5" />
          </Button>

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
