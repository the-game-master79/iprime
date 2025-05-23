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
      className="flex"
      style={{
        position: "absolute",
        top: 48, // 48px navbar
        left: isCollapsed ? 48 : 368, // 48px sidebar or 48+320
        right: 350,
        // Remove all paddings and margins
        padding: 0,
        margin: 0,
        height: "calc(100vh - 48px)", // fill below navbar
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
          padding: 0,
          margin: 0,
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
