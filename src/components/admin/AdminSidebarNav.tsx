import React from 'react';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { 
  BarChart2, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Users,
  ArrowDown,
  ArrowUp,
  Shield,
  Package // Add this import
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
  onClick?: () => void;
}

const NavItem = ({ icon: Icon, title, to, isCollapsed, onClick }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all hover:text-primary",
          isActive ? "bg-primary/10 font-medium text-primary" : "text-slate-300",
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

const AdminSidebarNav = ({ isCollapsed, toggleSidebar }: SidebarNavProps) => {
  const { signOut } = useAdminAuth();

  return (
    <div className={cn(
      "flex flex-col h-screen border-r border-slate-700 bg-slate-900 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex items-center text-white">
        {!isCollapsed && (
          <div className="flex items-center gap-2 flex-1">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
        )}
        <Button 
          onClick={toggleSidebar} 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="space-y-1 p-2 flex-1">
        <NavItem
          icon={BarChart2}
          title="Dashboard"
          to="/admin/dashboard"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={ArrowDown}
          title="Approve Deposits"
          to="/admin/deposits"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={ArrowUp}
          title="Approve Withdrawals"
          to="/admin/withdrawals"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={Users}
          title="View Affiliates"
          to="/admin/affiliates"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={Package}
          title="Plans"
          to="/admin/plans"
          isCollapsed={isCollapsed}
        />
      </div>
      
      <div className="p-2 border-t border-slate-700">
        <NavItem
          icon={LogOut}
          title="Log Out"
          to="#"
          isCollapsed={isCollapsed}
          onClick={signOut}
        />
      </div>
    </div>
  );
};

export default AdminSidebarNav;
