import { User, LineChart, ArrowLeftRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NavigationFooter() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current path is trade-related
  const isTradeRoute = location.pathname.startsWith('/trade');

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[#525252] bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 mb-4">
      <div className="container max-w-lg mx-auto">
        <div className="grid h-16 grid-cols-3">
          <button
            onClick={() => navigate('/account')}
            className="flex flex-col items-center justify-center relative"
          >
            {location.pathname === '/account' && (
              <div className="absolute top-0 left-1/2 w-12 h-0.5 bg-primary -translate-x-1/2" />
            )}
            <div className={cn("flex flex-col items-center", location.pathname === '/account' && "text-primary")}>
              <User className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Account</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/trade')}
            className="flex flex-col items-center justify-center relative transition-colors hover:text-primary"
          >
            {isTradeRoute && (
              <div className="absolute top-0 left-1/2 w-12 h-0.5 bg-primary -translate-x-1/2" />
            )}
            <div className={cn("flex flex-col items-center", isTradeRoute && "text-primary")}>
              <ArrowLeftRight className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Trade</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/performance')}
            className="flex flex-col items-center justify-center relative transition-colors hover:text-primary"
          >
            {location.pathname === '/performance' && (
              <div className="absolute top-0 left-1/2 w-12 h-0.5 bg-primary -translate-x-1/2" />
            )}
            <div className={cn("flex flex-col items-center", location.pathname === '/performance' && "text-primary")}>
              <LineChart className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Performance</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
