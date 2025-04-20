import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowCircleRight, CaretDown } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1200px]">
      <div className="mx-auto backdrop-blur-sm bg-background/95 border rounded-full px-4 py-2 shadow-lg">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
              alt="CloudForex Logo" 
              className="h-8 w-auto" 
            />
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className={cn(
                    "text-sm font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-1",
                    "text-muted-foreground",
                    "hover:text-primary hover:bg-primary/10",
                    (isActive('/trading') || isActive('/margin-calculator')) && "text-primary bg-primary/10"
                  )}
                >
                  Trading
                  <CaretDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleNavigation('/trading')}>
                  Trading Platform
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation('/margin-calculator')}>
                  Margin Calculator
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {['investing', 'partners', 'company'].map((item) => (
              <button 
                key={item}
                onClick={() => handleNavigation(`/${item}`)} 
                className={cn(
                  "text-sm font-medium px-4 py-2 rounded-full transition-colors",
                  "text-muted-foreground",
                  "hover:text-primary hover:bg-primary/10",
                  isActive(`/${item}`) && "text-primary bg-primary/10"
                )}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to={user ? "/dashboard" : "/auth/login"}>
              <Button variant="default" className="rounded-full px-6 gap-2">
                {user ? "Go to App" : "Get Started"}
                <ArrowCircleRight weight="bold" className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
