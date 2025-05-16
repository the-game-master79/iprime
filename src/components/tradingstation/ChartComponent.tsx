import React from "react";
import TradingViewWidget from "../charts/TradingViewWidget";

interface ChartComponentProps {
  symbol: string;
  timezone: string;
  isCollapsed: boolean;
  activityCollapsed: boolean;
  activityHeight: number;
  totalPnL?: number; // Add PnL prop
  closeAllTrades?: () => void; // Add new prop
}

const ChartComponent: React.FC<ChartComponentProps> = ({
  symbol,
  timezone,
  isCollapsed,
  activityCollapsed,
  activityHeight,
  totalPnL, // Destructure PnL
  closeAllTrades, // Destructure the prop
}) => {
  // Format symbol for TradingView if needed
  const formattedSymbol = symbol.includes(":")
    ? symbol
    : `CMCMARKETS:${symbol}`;

  return (
    <div
      className="flex mt-16"
      style={{
        position: "absolute",
        top: 8,
        left: isCollapsed ? 60 : 460,
        right: 350,
        padding: "24px 24px 0 24px",
        height: "calc(100vh - 4rem - 0px)",
        minHeight: 200,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        transition: "left 0.2s",
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      <div
        className="w-full bg-muted/20 border border-border/50 rounded-lg flex flex-col items-center justify-center shadow p-0"
        style={{
          height: `calc(100% - ${
            activityCollapsed ? 80 : activityHeight + 50
          }px)`,
          width: "100%",
          transition: "height 0.2s, width 0.2s, left 0.2s",
          pointerEvents: "auto",
          overflow: "hidden",
        }}
      >
        <TradingViewWidget
          symbol={formattedSymbol}
          timezone={timezone}
          theme="dark"
          interval="1"
          hide_legend={true}
          totalPnL={totalPnL} // Pass totalPnL to widget
          closeAllTrades={closeAllTrades} // Pass the prop to TradingViewWidget
        />
      </div>
    </div>
  );
};

export default ChartComponent;
