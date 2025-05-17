import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, House } from "@phosphor-icons/react";

interface NavbarProps {
  balance: number;
  isMobile?: boolean;
  toggleMobileMenu?: () => void;
}

const Navbar = ({ balance, isMobile = false, toggleMobileMenu }: NavbarProps) => {
  const navigate = useNavigate();

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
            src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudtrade.svg"
            alt="CloudTrade Logo"
            className="h-8"
          />
        </button>
      </div>
      <div className="flex items-center gap-4">
        {isMobile ? (
          // Mobile balance with integrated add funds button
          <div className="bg-secondary rounded-full flex items-center pr-1">
            <div className="text-sm font-medium px-3 py-1">
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 rounded-full bg-primary p-0 flex items-center justify-center"
              onClick={() => navigate("/deposit")}
            >
              <Plus size={14} weight="bold" className="text-background" />
            </Button>
          </div>
        ) : (
          // Desktop separate balance and button
          <>
            <div className="bg-secondary text-sm font-medium px-3 py-1 rounded-full">
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </div>
            <Button variant="default" onClick={() => navigate("/deposit")}>
              Add Funds
            </Button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
