import { lazy } from "react";
import { TradeRouteGuard } from "@/components/guards/TradeRouteGuard";

const Trade = lazy(() => import("@/pages/trade/Trade"));
const SelectPairs = lazy(() => import("@/pages/trade/SelectPairs"));
const ChartView = lazy(() => import("@/pages/trade/ChartView"));
const MarginCalculator = lazy(() => import("@/pages/trading/MarginCalculator"));

const routes = [
  // ...existing code...

  // Trade routes
  {
    path: "/trade",
    element: (
      <>
        <TradeRouteGuard />
        <Trade />
      </>
    ),
  },
  {
    path: "/trade/select",
    element: (
      <>
        <TradeRouteGuard />
        <SelectPairs />
      </>
    ),
  },
  {
    path: "/trade/:pair",
    element: (
      <>
        <TradeRouteGuard />
        <Trade />
      </>
    ),
  },
  {
    path: "/trade/chart/:symbol",
    element: (
      <>
        <TradeRouteGuard />
        <ChartView />
      </>
    ),
  },
  {
    path: "/trading/calculator",
    element: <MarginCalculator />,
  },

  // ...existing code...
];

export default routes;
