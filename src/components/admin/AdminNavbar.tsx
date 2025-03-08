
import React from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Shield, User } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
  const { user, signOut } = useAdminAuth();
  const navigate = useNavigate();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-700 bg-slate-900/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 lg:px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg text-white">Admin Panel</span>
      </div>
      
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white">
                <User className="h-4 w-4" />
              </div>
              <span>Admin</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-800 text-white border-slate-700">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              onClick={() => navigate('/admin/profile')}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              className="text-red-400 hover:text-red-300 hover:bg-slate-700 cursor-pointer"
              onClick={signOut}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminNavbar;
