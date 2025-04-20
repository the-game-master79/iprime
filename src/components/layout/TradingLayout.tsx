import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { ArrowLeftCircle, PlusCircle, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBreakpoints } from "@/hooks/use-breakpoints";

interface TradingLayoutProps {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  userBalance: number;
  depositDialogOpen: boolean;
  setDepositDialogOpen: (open: boolean) => void;
}

export const TradingLayout: React.FC<TradingLayoutProps> = ({
  children,
  isSidebarOpen,
  toggleSidebar,
  userBalance,
  depositDialogOpen,
  setDepositDialogOpen
}) => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoints();

  return (
    <div className="flex h-screen">
      <header className="fixed top-0 left-0 right-0 h-14 border-b bg-background/95 backdrop-blur z-50">
        <div className="flex items-center justify-between h-full px-2 md:px-4">
          {/* Left side */}
          <div className="flex items-center gap-1.5 md:gap-4">
            <Button 
              variant="ghost" 
              size={isMobile ? "sm" : "icon"} 
              onClick={() => navigate('/dashboard')}
              className="h-8 w-8 md:h-10 md:w-10"
            >
              <ArrowLeftCircle className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            
            {!isMobile && (
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudtrade-1.svg" 
                  alt="CloudTrade Logo" 
                  className="h-8 w-auto" 
                />
              </Link>
            )}
            
            <Button 
              variant="ghost" 
              size={isMobile ? "sm" : "icon"}
              onClick={toggleSidebar}
              className="h-8 w-8 md:h-10 md:w-10"
            >
              <Menu className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 rounded-full bg-muted/50">
              <span className="text-sm md:text-base font-medium">
                ${userBalance.toLocaleString()}
              </span>
            </div>

            <Button 
              onClick={() => navigate('/deposit')} 
              size={isMobile ? "sm" : "default"}
              className="h-8 md:h-10 bg-[#FFA500] text-black hover:bg-[#FFA500]/90"
            >
              <PlusCircle className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Deposit</span>}
            </Button>
          </div>
        </div>
      </header>

      <main className={cn(
        "flex-1 mt-14 transition-all duration-300",
        isMobile ? "ml-0" : (isSidebarOpen ? "ml-72" : "ml-0")
      )}>
        {children}
      </main>

      <DepositDialog 
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
      />
    </div>
  );
};
