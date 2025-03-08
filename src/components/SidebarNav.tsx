import React from 'react';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  BarChart2, 
  CreditCard, 
  LogOut, 
  Users,
  ChevronLeft, 
  ChevronRight,
  Package // Add Package icon import
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarNavProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

interface NavItemProps {
  icon: React.ElementType;
  title: string;
  to: string;
  isCollapsed: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const NavItem = ({ icon: Icon, title, to, isCollapsed, onClick }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all hover:text-primary",
          isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground",
          isCollapsed && "justify-center px-2"
        )
      }
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      {!isCollapsed && <span>{title}</span>}
    </NavLink>
  );
};

const SidebarNav = ({ isCollapsed, toggleSidebar }: SidebarNavProps) => {
  const { signOut } = useAuth();
  
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen border-r bg-sidebar transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex justify-end">
        <Button 
          onClick={toggleSidebar} 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="space-y-1 p-2 flex-1">
        <NavItem
          icon={BarChart2}
          title="Dashboard"
          to="/dashboard"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={CreditCard}
          title="Payments"
          to="/payments"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={Users}
          title="Affiliates"
          to="/affiliates"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={Package}
          title="Plans"
          to="/plans"
          isCollapsed={isCollapsed}
        />
      </div>
      
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all hover:text-red-500 w-full",
            isCollapsed && "justify-center px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Log Out</span>}
        </Button>
      </div>
    </div>
  );
};

export default SidebarNav;
