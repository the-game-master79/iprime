import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, House, Sun, Moon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";

interface NavbarProps {
  balance: number;
  isMobile?: boolean;
  toggleMobileMenu?: () => void;
}

const Navbar = ({ balance, isMobile = false, toggleMobileMenu }: NavbarProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <nav className={`fixed top-0 left-0 w-full h-16 ${isMobile ? 'bg-background' : 'bg-muted/10'} border-b border-border/50 flex items-center px-4 justify-between z-50`}>
      <div className="flex items-center gap-4">
        {/* Home button first */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => navigate("/platform")}
          title="Home"
        >
          <House size={20} weight="bold" />
        </Button>
        {/* Logo: clicking refreshes the page */}
        <button
          onClick={() => window.location.reload()}
          className="focus:outline-none"
          title="Refresh"
        >
          <img
            src={theme === "dark"
              ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/cf-dark.svg"
              : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public/cf-light.svg"
            }
            alt="CloudForex Logo"
            className="h-8"
          />
        </button>
      </div>
      <div className="flex items-center gap-4">
        {isMobile ? (
          // Mobile balance with theme toggle
          <div
            className="bg-secondary rounded-full flex items-center pr-1 cursor-pointer"
            onClick={() => navigate("/cashier")}
          >
            <div className="text-sm font-medium px-3 py-1">
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1 rounded-full bg-secondary-foreground text-primary hover:bg-secondary"
              onClick={e => {
                e.stopPropagation();
                setTheme(theme === "dark" ? "light" : "dark");
              }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-400" weight="bold" />
              ) : (
                <Moon className="h-4 w-4 text-blue-500" weight="bold" />
              )}
            </Button>
          </div>
        ) : (
          // Desktop: Theme toggle, Balance badge, Add Funds (rightmost)
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full bg-secondary-foreground text-primary hover:bg-secondary"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-400" weight="bold" />
              ) : (
                <Moon className="h-4 w-4 text-blue-500" weight="bold" />
              )}
            </Button>
            <div className="bg-secondary text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2">
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </div>
            <Button
              variant="default"
              size="default"
              className="ml-2"
              onClick={() => navigate("/cashier")}
            >
              Add Funds
            </Button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
