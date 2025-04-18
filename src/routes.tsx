import { lazy } from "react";
import { TradeRouteGuard } from "@/components/guards/TradeRouteGuard";

const Trade = lazy(() => import("@/pages/trade/Trade"));
const SelectPairs = lazy(() => import("@/pages/trade/SelectPairs"));
const ChartView = lazy(() => import("@/pages/trade/ChartView"));

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

  // ...existing code...
];

export default routes;
