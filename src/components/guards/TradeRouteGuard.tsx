import { useBreakpoints } from "@/hooks/use-breakpoints";
import { Navigate, useLocation } from "react-router-dom";

export const TradeRouteGuard = () => {
  const { isMobile } = useBreakpoints();
  const location = useLocation();

  if (isMobile) {
    // If on mobile and at /trade, redirect to select page
    if (location.pathname === '/trade') {
      return <Navigate to="/trade/select" replace />;
    }
  } else {
    // If on desktop and at /trade/select, redirect to main trade page
    if (location.pathname === '/trade/select') {
      return <Navigate to="/trade" replace />;
    }
  }

  return null;
};
