import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1200px]">
      <div className="mx-auto backdrop-blur-sm bg-background/95 border rounded-full px-4 py-2 shadow-lg transition-all duration-300 hover:shadow-primary/20">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
              alt="CloudForex Logo" 
              className="h-8 w-auto" 
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => handleNavigation('/trading')} 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Trading
            </button>
            <button 
              onClick={() => handleNavigation('/investing')} 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Investing
            </button>
            <button 
              onClick={() => handleNavigation('/partners')} 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Partners
            </button>
            <button 
              onClick={() => handleNavigation('/company')} 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Company
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/auth/login">
              <Button variant="default" className="rounded-full px-6">Login</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
