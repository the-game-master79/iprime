import { useBreakpoints } from "@/hooks/use-breakpoints";
import { Navigate, useLocation } from "react-router-dom";

export const TradeRouteGuard = () => {
  const { isMobile } = useBreakpoints();
  const location = useLocation();
  
  // For mobile, always redirect /trade to /trade/select
  if (isMobile && location.pathname === '/trade') {
    return <Navigate to="/trade/select" replace />;
  }

  return null;
};
