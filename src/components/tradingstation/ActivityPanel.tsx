import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, X, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ActivityPanelProps {
  isCollapsed: boolean;
  activityCollapsed: boolean;
  setActivityCollapsed: (value: boolean) => void;
  activityHeight: number;
  activeTradeTab: "open" | "closed"; // Only open/closed
  setActiveTradeTab: (value: "open" | "closed") => void;
  openCount: number;
  closedCount: number;
  totalOpenPnL: number;
  totalClosedPnL: number;
  renderOpenTrades: (trades: any[]) => React.ReactNode;
  renderClosedTrades: React.ReactNode;
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  balance: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
  onResizeStart: (e: React.MouseEvent) => void;
  // Add new props for expanded functionality
  groupedTrades?: Record<string, any[]>;
  openTrades?: any[];
  localPrices?: Record<string, any>;
  handleCloseTrade?: (trade: any) => void;
  formatPairName?: (symbol: string) => string;
  getCryptoImageForSymbol?: (symbol: string) => string;
  getForexImageForSymbol?: (symbol: string) => string;
  getPriceDecimals?: (symbol: string) => number;
  closedTrades?: any[];
  // Add prop for fullPage mode
  fullPage?: boolean;
  // Add prop for mobile view pagination limit
  mobilePaginationLimit?: number;
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({
  isCollapsed,
  activityCollapsed,
  setActivityCollapsed,
  activityHeight,
  activeTradeTab,
  setActiveTradeTab,
  openCount,
  closedCount,
  totalOpenPnL,
  totalClosedPnL,
  renderOpenTrades,
  renderClosedTrades,
  currentPage,
  totalPages,
  handlePageChange,
  balance,
  usedMargin,
  freeMargin,
  marginLevel,
  onResizeStart,
  // Expanded functionality props with defaults
  groupedTrades = {},
  openTrades = [],
  localPrices = {},
  handleCloseTrade = undefined, // allow undefined to override below
  formatPairName = (s) => s,
  getCryptoImageForSymbol = () => "",
  getForexImageForSymbol = () => "",
  getPriceDecimals = () => 2,
  closedTrades = [],
  // Full page mode prop
  fullPage = false,
  // Default mobile pagination limit
  mobilePaginationLimit = 10
}) => {

  // Simple function to update the active tab
  const handleTabChange = (tab: "open" | "closed") => {
    setActiveTradeTab(tab);
  };
  
  const activityPanelRef = useRef<HTMLDivElement>(null);
  // Add ref to track previous tab to avoid unnecessary state updates
  const prevTabRef = useRef<"open" | "closed">(activeTradeTab);

  // Check for expandable trades on tab change or trades update
  useEffect(() => {
    // Only update hasExpandableTrades if it's actually changed
    const hasTradesExpandable = openTrades.length > 0;
    if (hasTradesExpandable) {
      // Only reset expansion state when switching tabs, not on every render
      // Use a ref to track the previous tab
      if (prevTabRef.current !== activeTradeTab) {
        prevTabRef.current = activeTradeTab;
      }
    }
  }, [activeTradeTab, openTrades]);

  // Add this state at the top-level of the component, not inside any function or render
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroupExpand = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Function to render the trades in an expanded way
  const renderExpandableTrades = (trades: any[]) => {
    // Group trades by pair and type
    const grouped: Record<string, { 
      key: string,
      pair: string, 
      type: string, 
      trades: any[], 
      totalLots: number, 
      totalMargin: number, 
      totalLivePnl: number, 
      openedAt: string,
      hedgingTracker?: {
        hedgedBuyLots: number,
        hedgedSellLots: number,
        maxHedgedBuyLots: number,
        maxHedgedSellLots: number
      }
    }> = {};
    
    trades.forEach((trade) => {
      const key = `${trade.pair}|${(trade.type || "").toLowerCase()}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          pair: trade.pair,
          type: (trade.type || "").toLowerCase(),
          trades: [],
          totalLots: 0,
          totalMargin: 0,
          totalLivePnl: 0,
          openedAt: trade.created_at,
        };
      }
      grouped[key].trades.push(trade);
      grouped[key].totalLots += Number(trade.lots) || 0;
      grouped[key].totalMargin += Number(trade.margin_amount) || 0;
      
      // Calculate live PnL for this trade
      const currentPrice =
        localPrices[trade.pair]?.price !== undefined
          ? parseFloat(localPrices[trade.pair].price)
          : parseFloat(trade.open_price);
      const openPrice = parseFloat(trade.open_price);

      let pipSize = 0.0001;
      let lotSize = 100000;
      if (trade.pair.endsWith("USDT")) {
        pipSize = 1;
        lotSize = 1;
      } else if (trade.pair === "XAUUSD") {
        pipSize = 0.01;
        lotSize = 100;
      } else if (trade.pair.endsWith("JPY")) {
        pipSize = 0.01;
        lotSize = 100000;
      }
      const lots = Number(trade.lots) || 0;
      let pipValue = 0;
      if (trade.pair === "XAUUSD") {
        pipValue = pipSize * lots * 100;
      } else {
        pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
      }

      let livePnl = 0;
      if (trade.pair.endsWith("USDT")) {
        if (trade.type?.toLowerCase() === "buy") {
          livePnl = currentPrice - openPrice;
        } else if (trade.type?.toLowerCase() === "sell") {
          livePnl = openPrice - currentPrice;
        }
      } else {
        if (trade.type?.toLowerCase() === "buy") {
          livePnl = ((currentPrice - openPrice) / pipSize) * pipValue;
        } else if (trade.type?.toLowerCase() === "sell") {
          livePnl = ((openPrice - currentPrice) / pipSize) * pipValue;
        }
      }
      grouped[key].totalLivePnl += livePnl;
      
      // Use earliest openedAt for group
      if (new Date(trade.created_at) < new Date(grouped[key].openedAt)) {
        grouped[key].openedAt = trade.created_at;
      }
    });

    // For each pair, check if both buy and sell exist and calculate hedging capacity
    const pairTypes: Record<string, { buyLots: number, sellLots: number, hedgedBuyLots: number, hedgedSellLots: number }> = {};
    Object.values(grouped).forEach((g) => {
      if (!pairTypes[g.pair]) pairTypes[g.pair] = { buyLots: 0, sellLots: 0, hedgedBuyLots: 0, hedgedSellLots: 0 };
      if (g.type === "buy") pairTypes[g.pair].buyLots += g.totalLots;
      if (g.type === "sell") pairTypes[g.pair].sellLots += g.totalLots;
    });
    
    // Calculate hedged lots for each pair
    Object.keys(pairTypes).forEach(pair => {
      // Hedged lots equals the minimum of buy and sell lots (that's all that can be hedged)
      const hedgedLots = Math.min(pairTypes[pair].buyLots, pairTypes[pair].sellLots);
      pairTypes[pair].hedgedBuyLots = hedgedLots;
      pairTypes[pair].hedgedSellLots = hedgedLots;
    });

    // Render the groups with expandable rows
    return Object.values(grouped).map((g) => {
      const decimals = getPriceDecimals(g.pair);
      const isHedged = pairTypes[g.pair].buyLots > 0 && pairTypes[g.pair].sellLots > 0;
      const firstTrade = g.trades[0];
      const currentPrice =
        localPrices[g.pair]?.price !== undefined
          ? parseFloat(localPrices[g.pair].price)
          : parseFloat(firstTrade.open_price);
      // Use expandedGroups state for expansion
      const isExpanded = expandedGroups[g.key] || false;
      const hasMultiplePositions = g.trades.length > 1;
      
      // Create a hedging tracker for this group - will keep state of how many lots
      // have been marked as hedged as we render each trade
      g.hedgingTracker = { 
        hedgedBuyLots: 0, 
        hedgedSellLots: 0,
        maxHedgedBuyLots: pairTypes[g.pair].hedgedBuyLots,
        maxHedgedSellLots: pairTypes[g.pair].hedgedSellLots
      };
      
      return (
        <React.Fragment key={g.key}>
          {/* Main group row */}
          <tr className={`group border-t border-border/50 ${isExpanded ? 'bg-accent/10' : ''}`}>
            <td className="px-4 py-2">
              <button
                onClick={g.trades.length > 1 ? () => toggleGroupExpand(g.key) : undefined}
                className={`flex items-center gap-2 w-full text-left ${g.trades.length > 1 ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* Remove the left-side expand arrow */}
                <div className="flex items-center gap-2">
                  <img
                    src={
                      g.pair.endsWith("USDT")
                        ? getCryptoImageForSymbol(g.pair)
                        : getForexImageForSymbol(g.pair)
                    }
                    alt={g.pair}
                    className="h-6 w-6"
                  />
                  <span className="mr-2 text-foreground">{formatPairName(g.pair)}</span>
                  {/* Only show expand button if there are multiple trades */}
                  {g.trades.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0 rounded-full opacity-70 hover:opacity-100 flex items-center justify-center bg-secondary text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupExpand(g.key);
                      }}
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </Button>
                  )}
                </div>
              </button>
            </td>
            <td className="px-4 py-2">
              {/* Show buy/sell and hedged badges in the type column */}
              <div className="flex gap-1 items-center">
                <span
                  className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                    g.type === "buy"
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-destructive hover:bg-destructive/90"
                  }`}
                >
                  {g.type.toUpperCase()}
                </span>
                {isHedged && (
                  <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold transition-all ml-1 hover:bg-primary/20">
                    Hedged
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                {/* Remove arrow from lots column, keep only the one for pair */}
                {/* {g.trades.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 rounded-full hover:bg-muted/30"
                    onClick={() => toggleGroupExpand(g.key)}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                )} */}
                <span className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">
                  {g.totalLots.toFixed(2)}
                </span>
                <span className="ml-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {g.trades.length} open
                </span>
              </div>
              {/* Remove expanded individual positions for desktop */}
              {/* {g.trades.length > 1 && isExpanded && (
                <div className="mt-2 border-t border-border/20">
                  {g.trades.map((trade, idx) => (
                    <div key={trade.id} className="flex items-center gap-2 py-1">
                      <span className="text-xs text-muted-foreground">ID: {trade.id.substring(0, 8)}...</span>
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">
                        {Number(trade.lots).toFixed(2)} lot
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCloseTrade(trade)}
                        className="w-6 h-6 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500"
                        title="Close Position"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )} */}
            </td>
            <td className="px-4 py-2 text-xs text-foreground">
              {Number(firstTrade.open_price).toFixed(decimals)}
            </td>
            <td className="px-4 py-2 text-xs text-foreground">
              {Number(currentPrice).toFixed(decimals)}
            </td>
            <td className="px-4 py-2 text-xs text-foreground">
              ${g.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
            <td className="px-4 py-2">
              <span
                className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                  firstTrade.leverage <= 20
                    ? "bg-success hover:bg-success/90"
                    : firstTrade.leverage <= 500
                    ? "bg-warning hover:bg-warning/90"
                    : "bg-destructive hover:bg-destructive/90"
                }`}
              >
                1:{firstTrade.leverage}
              </span>
            </td>
            <td className="px-4 py-2 text-xs text-foreground">
              {new Date(g.openedAt).toLocaleString("en-US", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: true,
              })}
            </td>
            <td className={`px-4 py-2 text-xs ${g.totalLivePnl >= 0 ? "text-green-500" : "text-red-500"}`}>
              ${g.totalLivePnl.toFixed(2)}
            </td>
            <td className="px-4 py-2 text-xs">
              {g.trades.every((t) => t.status === "open") && (
                <Button
                  variant={hasMultiplePositions ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => g.trades.forEach((t) => handleCloseTrade(t))}
                  className={`
                    w-8 h-8 p-0 rounded-full
                    text-destructive
                    hover:bg-destructive/10
                    ${hasMultiplePositions ? "bg-destructive/10" : ""}
                  `}
                  title={
                    isForexTrade(g.trades[0])
                      ? "You can only close forex trades when the market is open."
                      : hasMultiplePositions ? "Close All Positions" : "Close Position"
                  }
                  // FIX: Only disable if forex and market is closed
                  disabled={isForexTrade(g.trades[0]) && !isForexMarketOpen}
                >
                  <X size={16} />
                </Button>
              )}
            </td>
          </tr>

          {/* Expanded individual trade rows */}
          {isExpanded && g.trades.map((trade, idx) => {
            // Determine if this specific trade is hedged based on available hedging capacity
            const type = trade.type?.toLowerCase();
            const lots = Number(trade.lots) || 0;
            let isTradeHedged = false;
            
            if (isHedged) {
              if (type === "buy" && g.hedgingTracker.hedgedBuyLots < g.hedgingTracker.maxHedgedBuyLots) {
                // This buy position can be hedged (still have hedging capacity)
                isTradeHedged = true;
                g.hedgingTracker.hedgedBuyLots += lots;
                // Cap at maximum to prevent exceeding due to rounding
                if (g.hedgingTracker.hedgedBuyLots > g.hedgingTracker.maxHedgedBuyLots) {
                  g.hedgingTracker.hedgedBuyLots = g.hedgingTracker.maxHedgedBuyLots;
                }
              } else if (type === "sell" && g.hedgingTracker.hedgedSellLots < g.hedgingTracker.maxHedgedSellLots) {
                // This sell position can be hedged (still have hedging capacity)
                isTradeHedged = true;
                g.hedgingTracker.hedgedSellLots += lots;
                // Cap at maximum to prevent exceeding due to rounding
                if (g.hedgingTracker.hedgedSellLots > g.hedgingTracker.maxHedgedSellLots) {
                  g.hedgingTracker.hedgedSellLots = g.hedgingTracker.maxHedgedSellLots;
                }
              }
            }
            
            return (
              <tr key={`${g.key}-${idx}`} className="bg-accent/5 border-t border-dashed border-border/30">
                <td className="px-4 py-2 pl-10 text-xs text-muted-foreground">
                  {/* Make trade ID copyable */}
                  <div className="flex items-center gap-1">
                    <span>ID: {trade.id.substring(0, 8)}...</span>
                    <CopyButton text={trade.id} />
                  </div>
                </td>
                <td className="px-4 py-2 text-xs">
                  <div className="flex gap-1 items-center">
                    <span
                      className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                        trade.type?.toLowerCase() === "buy"
                          ? "bg-primary hover:bg-primary/90"
                          : "bg-destructive hover:bg-destructive/90"
                      }`}
                    >
                      {trade.type?.toUpperCase() || "UNKNOWN"}
                    </span>
                    {/* Only show hedged badge for truly hedged positions */}
                    {isTradeHedged && (
                      <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold transition-all ml-1 hover:bg-primary/20">
                        H
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">
                    {Number(trade.lots).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-foreground">
                  {Number(trade.open_price).toFixed(decimals)}
                </td>
                <td className="px-4 py-2 text-xs text-foreground">
                  {Number(currentPrice).toFixed(decimals)}
                </td>
                <td className="px-4 py-2 text-xs text-foreground">
                  ${Number(trade.margin_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2 text-xs">
                  <span
                    className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                      trade.leverage <= 20
                        ? "bg-success hover:bg-success/90"
                        : trade.leverage <= 500
                        ? "bg-warning hover:bg-warning/90"
                        : "bg-destructive hover:bg-destructive/90"
                    }`}
                  >
                    1:{trade.leverage}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-foreground">
                  {new Date(trade.created_at).toLocaleString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                    hour12: true,
                  })}
                </td>
                <td className={`px-4 py-2 text-xs`}>
                  {/* Calculate and display individual PnL */}
                  {(() => {
                    let individualPnL = 0;
                    const openPrice = parseFloat(trade.open_price);
                    // FIX: currentPrice is already a number
                    const currentPriceValue = currentPrice;
                    
                    let pipSize = 0.0001;
                    let lotSize = 100000;
                    if (trade.pair.endsWith("USDT")) {
                      pipSize = 1;
                      lotSize = 1;
                      
                      if (trade.type?.toLowerCase() === "buy") {
                        individualPnL = currentPriceValue - openPrice;
                      } else {
                        individualPnL = openPrice - currentPriceValue;
                      }
                    } else if (trade.pair === "XAUUSD") {
                      pipSize = 0.01;
                      lotSize = 100;
                      
                      const lots = Number(trade.lots) || 0;
                      const pipValue = pipSize * lots * 100;
                      
                      if (trade.type?.toLowerCase() === "buy") {
                        individualPnL = ((currentPriceValue - openPrice) / pipSize) * pipValue;
                      } else {
                        individualPnL = ((openPrice - currentPriceValue) / pipSize) * pipValue;
                      }
                    } else {
                      // Forex
                      if (trade.pair.endsWith("JPY")) {
                        pipSize = 0.01;
                      }
                      
                      const lots = Number(trade.lots) || 0;
                      const pipValue = (pipSize * lotSize * lots) / currentPriceValue;
                      
                      if (trade.type?.toLowerCase() === "buy") {
                        individualPnL = ((currentPriceValue - openPrice) / pipSize) * pipValue;
                      } else {
                        individualPnL = ((openPrice - currentPriceValue) / pipSize) * pipValue;
                      }
                    }
                    
                    return (
                      <span className={individualPnL >= 0 ? "text-success" : "text-destructive"}>
                        ${individualPnL.toFixed(2)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-2 text-xs">
                  {trade.status === "open" && (
                    <div
                      onClick={() => _handleCloseTrade({ ...trade, id: typeof trade.id === "string" ? trade.id.trim() : String(trade.id ?? "").trim() })}
                      className="w-6 h-6 p-0 rounded-full flex items-center justify-center cursor-pointer text-destructive hover:bg-destructive/10"
                      title="Close Position"
                    >
                      <X size={14} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </React.Fragment>
      );
    });
  };

  // Helper component for copying text
  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Failed to copy text: ', err));
    };
    
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleCopy}
        className="h-5 w-5 p-0 rounded-full hover:bg-muted/20 opacity-70 hover:opacity-100"
        title="Copy ID"
      >
        {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
      </Button>
    );
  };

  // Function to get limited trades for mobile view
  const getLimitedClosedTrades = () => {
    if (!closedTrades || !fullPage) return closedTrades;
    
    // For mobile view, limit the number of displayed trades
    // Calculate the starting index based on the current page and limit
    const startIndex = (currentPage - 1) * mobilePaginationLimit;
    // Return a slice of trades based on the pagination limit
    return closedTrades.slice(startIndex, startIndex + mobilePaginationLimit);
  };

  // Add refs to track previous values for comparison
  const prevFreeMarginRef = useRef<number>(freeMargin);
  const prevMarginLevelRef = useRef<number>(marginLevel);
  
  // State to track changes for visual indicators
  const [freeMarginChange, setFreeMarginChange] = useState<'increase' | 'decrease' | null>(null);
  const [marginLevelChange, setMarginLevelChange] = useState<'increase' | 'decrease' | null>(null);
  
  // Reset change indicators after a delay
  useEffect(() => {
    if (freeMarginChange) {
      const timer = setTimeout(() => setFreeMarginChange(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [freeMarginChange]);
  
  useEffect(() => {
    if (marginLevelChange) {
      const timer = setTimeout(() => setMarginLevelChange(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [marginLevelChange]);
  
  // Compare current values with previous values to detect changes
  useEffect(() => {
    // Only check for changes if we have open trades
    if (openTrades && openTrades.length > 0) {
      // Check for free margin changes
      if (freeMargin !== prevFreeMarginRef.current) {
        setFreeMarginChange(freeMargin > prevFreeMarginRef.current ? 'increase' : 'decrease');
        prevFreeMarginRef.current = freeMargin;
      }
      
      // Check for margin level changes
      if (marginLevel !== prevMarginLevelRef.current) {
        setMarginLevelChange(marginLevel > prevMarginLevelRef.current ? 'increase' : 'decrease');
        prevMarginLevelRef.current = marginLevel;
      }
    } else {
      // Reset refs to current values when there are no open trades
      prevFreeMarginRef.current = freeMargin;
      prevMarginLevelRef.current = marginLevel;
    }
  }, [freeMargin, marginLevel, openTrades]);

  // Add this state at the top-level of the component, not inside any function or render
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleMobileGroupExpand = (key: string) => {
    setMobileExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // --- Add: Proper closeTrade handler using backend function ---
  async function closeTradeWithWalletUpdate(trade: any) {
    // Defensive: ensure trade.id is a string and trimmed
    const tradeId = typeof trade.id === "string" ? trade.id.trim() : String(trade.id ?? "").trim();

    // Debug: Log the trade object and ID before calling the backend
    console.log("[closeTradeWithWalletUpdate] Attempting to close trade:", {
      trade,
      tradeId,
      status: trade?.status,
      isOpen: trade?.status === "open"
    });

    if (!tradeId) {
      // Optionally show error toast here
      // toast({ title: "Invalid Trade", description: "Trade ID is missing or invalid.", variant: "destructive" });
      console.error("Invalid trade object passed to closeTradeWithWalletUpdate:", trade);
      return;
    }

    // Calculate current price
    const currentPrice =
      localPrices[trade.pair]?.price !== undefined
        ? parseFloat(localPrices[trade.pair].price)
        : parseFloat(trade.open_price);

    // Calculate PnL
    let pnl = 0;
    const openPrice = parseFloat(trade.open_price);
    let pipSize = 0.0001;
    let lotSize = 100000;
    if (trade.pair.endsWith("USDT")) {
      pipSize = 1;
      lotSize = 1;
    } else if (trade.pair === "XAUUSD") {
      pipSize = 0.01;
      lotSize = 100;
    } else if (trade.pair.endsWith("JPY")) {
      pipSize = 0.01;
      lotSize = 100000;
    }
    const lots = Number(trade.lots) || 0;
    let pipValue = 0;
    if (trade.pair === "XAUUSD") {
      pipValue = pipSize * lots * 100;
    } else {
      pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
    }

    if (trade.pair.endsWith("USDT")) {
      if (trade.type?.toLowerCase() === "buy") {
        pnl = currentPrice - openPrice;
      } else if (trade.type?.toLowerCase() === "sell") {
        pnl = openPrice - currentPrice;
      }
    } else {
      if (trade.type?.toLowerCase() === "buy") {
        pnl = ((currentPrice - openPrice) / pipSize) * pipValue;
      } else if (trade.type?.toLowerCase() === "sell") {
        pnl = ((openPrice - currentPrice) / pipSize) * pipValue;
      }
    }

    // Call backend function to close trade and update wallet
    const { data, error } = await supabase.rpc("close_trade", {
      p_trade_id: tradeId,
      p_close_price: currentPrice,
      p_pnl: pnl,
    });

    if (error) {
      // Log the trade object and error for debugging
      console.error("Failed to close trade:", { trade, tradeId, error });
      // Optionally show error toast
      // toast({ title: "Close Trade Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Optionally update UI state here if needed (parent should refresh trades/balance)
  }

  // Use the correct close handler
  const _handleCloseTrade = handleCloseTrade || closeTradeWithWalletUpdate;

  // --- Calculate sidebar width dynamically for marginLeft ---
  const sidebarWidth = isCollapsed ? 48 : 368;

  // Add pairNameMap for display names
  const pairNameMap: Record<string, string> = {
    "XAUUSD": "Gold",
    "BTCUSDT": "Bitcoin",
    "ETHUSDT": "Ethereum",
    "SOLUSDT": "Solana",
    "LINKUSDT": "Chainlink",
    "BNBUSDT": "Binance Coin",
    "DOGEUSDT": "Dogecoin",
    "ADAUSDT": "Cardano",
    "TRXUSDT": "TRON",
    "DOTUSDT": "Polkadot",
    // ...add more as needed...
  };

  // --- MOBILE PAIRS CARDS RENDERING ---
  // Helper to detect mobile (simple window width check)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

  // Mobile version: render open trades as cards like DashboardTabs closed trades
  const renderMobilePairs = (trades: any[]) => {
    if (!trades || trades.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <span className="h-16 w-16 mb-4 text-white/20">📉</span>
          <p className="text-base">No open trades found</p>
          <p className="text-sm text-white/50 mt-1">Your open trades will appear here</p>
        </div>
      );
    }
    // Group by pair and type for mobile, or just flat list if needed
    return (
      <div className="space-y-4">
        {trades.map((trade: any) => {
          const decimals =
            trade.pair === "XAUUSD" ? 2 :
            trade.pair.endsWith("JPY") ? 3 :
            trade.pair.endsWith("USDT") && ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT", "BNBUSDT"].includes(trade.pair) ? 2 :
            trade.pair === "DOGEUSDT" ? 5 :
            trade.pair === "ADAUSDT" || trade.pair === "TRXUSDT" ? 4 :
            trade.pair === "DOTUSDT" ? 3 :
            !trade.pair.endsWith("USDT") ? 5 : 2;
          const isProfitable = trade.pnl >= 0;
          const openAt = trade.created_at;
          const currentPrice = localPrices[trade.pair]?.price !== undefined
            ? parseFloat(localPrices[trade.pair].price)
            : parseFloat(trade.open_price);
          return (
            <div
              key={trade.id}
              className="p-4 rounded-xl border border-border bg-muted/10 shadow-sm flex flex-col"
            >
              <div className="flex items-center gap-3 mb-2">
                {/* Buy/Sell circle indicator */}
                <span
                  className={`h-3 w-3 rounded-full ${
                    trade.type?.toLowerCase() === "buy"
                      ? "bg-primary"
                      : "bg-error"
                  }`}
                  title={trade.type?.toUpperCase()}
                />
                {/* Display name instead of symbol */}
                <span className="font-bold text-base">
                  {pairNameMap[trade.pair] || trade.pair}
                </span>
                <span className={`ml-auto font-bold ${isProfitable ? "text-success" : "text-error"}`}>
                  {isProfitable ? "+" : ""}
                  {trade.pnl?.toFixed(2)} USD
                </span>
              </div>
              {/* Lots/open price line and close price in same row */}
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  <span
                    className={
                      trade.type?.toLowerCase() === "buy"
                        ? "text-primary font-medium"
                        : "text-error font-medium"
                    }
                  >
                    {`${trade.type?.charAt(0).toUpperCase() + trade.type?.slice(1).toLowerCase()} ${Number(trade.lots).toFixed(2)} Lot`}
                  </span>
                  {` at ${Number(trade.open_price).toFixed(decimals)}`}
                </span>
                <span className="text-md text-foreground font-medium ml-2">
                  {Number(currentPrice).toFixed(decimals)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`${fullPage 
        ? "w-full h-full bg-background flex flex-col" 
        : "fixed bottom-0 left-0 right-0 bg-background text-white flex flex-col items-center justify-center border-t border-border shadow-lg"
      } transition-all duration-300`}
      ref={activityPanelRef}
      style={fullPage ? { minHeight: "100dvh", paddingBottom: fullPage ? 88 : undefined } : {
        marginLeft: `${sidebarWidth}px`,
        marginRight: "350px",
        height: activityCollapsed ? 56 : activityHeight + 24,
        minHeight: activityCollapsed ? 56 : 200 + 24,
        maxHeight: 500 + 24,
        zIndex: 40,
      }}
      role="region"
      aria-label="Trading activity panel"
    >
      {/* Trading Activity Section */}
      <div
        className={`w-full ${fullPage ? "h-full flex flex-col" : "bg-muted/10 border-t border-border/50 flex flex-col"} transition-all duration-300 ${
          activityCollapsed && !fullPage ? "overflow-hidden" : "overflow-hidden"
        }`}
        style={fullPage ? { height: "100%" } : { height: "100%" }}
        aria-labelledby="activity-panel-title"
      >
        {/* Header for full page mode */}
        {fullPage && (
          <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-background/80">
            <h2 className="text-xl font-semibold tracking-tight" id="activity-panel-title">Trading Activity</h2>
          </div>
        )}

        {/* Tabs */}
        <div
          className={`flex items-center ${fullPage ? "px-4 py-2" : "bg-muted/20 border-b border-border/50 px-4"}`}
          style={fullPage ? {} : { minHeight: 44, height: 44, paddingTop: 6, paddingBottom: 6 }}
        >
          <Tabs value={activeTradeTab} onValueChange={setActiveTradeTab} className="mr-4">
            <TabsList>
              <TabsTrigger value="open">
                Open
                <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-xs font-semibold border border-primary/30">
                  {openCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed
                <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-xs font-semibold border border-primary/30">
                  {closedCount}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex-1" />
          {/* Total PnL display - only for desktop */}
          {!fullPage && (
            <div className="flex items-center gap-2 pr-2">
              <span className="text-xs font-medium text-muted-foreground">
                {activeTradeTab === "closed" ? "Total Closed P&L:" : "Total P&L:"}
              </span>
              <span
                className={`font-mono font-semibold text-base px-2 py-1 rounded-full transition-colors ${
                  (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) > 0
                    ? "bg-green-500/10 text-green-600"
                    : (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) < 0
                    ? "bg-red-500/10 text-red-500"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {formatAmountCompact(activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL)} USD
              </span>
            </div>
          )}
          {/* Collapse/minimize button - only show in desktop mode */}
          {!fullPage && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setActivityCollapsed(!activityCollapsed)}
              aria-label={activityCollapsed ? "Expand" : "Collapse"}
              tabIndex={0}
            >
              {activityCollapsed ? (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="4" height="2" rx="1" fill="currentColor"/>
                  <rect x="3" y="3" width="2" height="4" rx="1" fill="currentColor"/>
                  <rect x="13" y="3" width="4" height="2" rx="1" fill="currentColor"/>
                  <rect x="15" y="3" width="2" height="4" rx="1" fill="currentColor"/>
                  <rect x="3" y="15" width="4" height="2" rx="1" fill="currentColor"/>
                  <rect x="3" y="13" width="2" height="4" rx="1" fill="currentColor"/>
                  <rect x="13" y="15" width="4" height="2" rx="1" fill="currentColor"/>
                  <rect x="15" y="13" width="2" height="4" rx="1" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="9" width="12" height="2" rx="1" fill="currentColor"/>
                </svg>
              )}
            </Button>
          )}
        </div>

        {/* Mobile PnL display container - only for fullPage mode */}
        {fullPage && (
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/5">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                {activeTradeTab === "closed" ? "Total Closed P&L" : "Total P&L"}
              </span>
              <span
                className={`font-mono font-bold text-xl ${
                  (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) > 0
                    ? "text-green-600"
                    : (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {formatAmountCompact(activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL)} USD
              </span>
            </div>
            
            {/* Close All button - only show for open trades with positions */}
            {activeTradeTab === "open" && openTrades && openTrades.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openTrades.forEach(trade => handleCloseTrade(trade))}
                className="h-9 px-3 gap-1 text-xs bg-error text-white hover:bg-error/90 rounded-md"
                disabled={
                  openTrades.some(isForexTrade) && !isForexMarketOpen
                }
                title={
                  openTrades.some(isForexTrade) && !isForexMarketOpen
                    ? "Market is closed. You can only close forex trades when the market is open."
                    : "Close All"
                }
              >
                <X size={14} />
                Close All ({openTrades.length})
              </Button>
            )}
          </div>
        )}
        
        {/* Only show table and resize handle if not collapsed or in fullPage mode */}
        {(!activityCollapsed || fullPage) && (
          <>
            {/* Trading Activity Table */}
            <div
              className={`flex-grow overflow-auto ${fullPage ? "flex flex-col" : ""}`}
              style={{
                scrollbarColor: "#525252 #18181b",
                scrollbarWidth: "thin",
                height: fullPage ? "auto" : undefined,
                minHeight: 0,
                ...(fullPage && activeTradeTab === "closed"
                  ? { paddingBottom: "112px" } // Add bottom padding so closed trades don't go behind the summary
                  : {}),
                ...(fullPage && activeTradeTab === "open"
                  ? { paddingBottom: 0, marginBottom: 0 }
                  : {}),
              }}
            >
              <table className="w-full text-left border-collapse">
                <thead
                  className={`top-0 bg-muted/30${fullPage ? " hidden" : ""}`}
                  style={!fullPage ? {} : {}}
                >
                  {activeTradeTab === "closed" ? (
                    <tr>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>Pair</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>Type</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>Lots</th>
                      {!fullPage && (
                        <>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Open Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Close Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Margin</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Leverage</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Closed At</th>
                        </>
                      )}
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>P&L</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>Pair</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>Type</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>Lots</th>
                      {!fullPage && (
                        <>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Open Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Current Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Margin</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Leverage</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Opened At</th>
                        </>
                      )}
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>P&L</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-foreground`}>Action</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {activeTradeTab === "closed" ? (
                    closedTrades && closedTrades.length > 0 && fullPage ? (
                      <tr>
                        <td colSpan={4} className="p-0 border-0">
                          <div className="flex flex-col gap-1 py-2">
                            {/* Pagination controls for mobile/fullPage mode */}
                            <div className="flex justify-between items-center px-2 pb-2">
                              <button
                                className="px-3 py-1 text-xs bg-muted/30 rounded-lg font-medium hover:bg-muted/40 disabled:opacity-50"
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </button>
                              <span className="text-xs font-medium text-muted-foreground">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                className="px-3 py-1 text-xs bg-muted/30 rounded-lg font-medium hover:bg-muted/40 disabled:opacity-50"
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                              >
                                Next
                              </button>
                            </div>
                            {getLimitedClosedTrades().map((trade, idx) => {
                              const openPrice = parseFloat(trade.open_price);
                              const closePrice = parseFloat(trade.close_price || "0");
                              const decimals = getPriceDecimals(trade.pair);
                              const pnl = parseFloat(trade.pnl || "0");
                              const isProfitable = pnl >= 0;
                              const closedAt = new Date(trade.closed_at || trade.updated_at);

                              return (
                                <div key={`closed-${trade.id || idx}`} className="px-3 py-4 mx-2 mb-2 mt-2 border border-border/60 rounded-lg last:mb-0 bg-muted/5 shadow-sm hover:bg-muted/10 transition-colors">
                                  {/* First row: Icon, Pair name and PnL */}
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={
                                          trade.pair.endsWith("USDT")
                                            ? getCryptoImageForSymbol(trade.pair)
                                            : getForexImageForSymbol(trade.pair)
                                        }
                                        alt={trade.pair}
                                        className="h-7 w-7"
                                      />
                                      <span className="font-semibold text-base">{formatPairName(trade.pair)}</span>
                                    </div>
                                    
                                    <span className={`font-bold text-base ${isProfitable ? "text-success" : "text-destructive"}`}>
                                      {isProfitable ? "+" : ""}${pnl.toFixed(2)}
                                    </span>
                                  </div>
                                  
                                  {/* Second row: Type badge, lots badge */}
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span
                                      className={`px-2 py-1 rounded-md text-white text-xs font-semibold ${
                                        trade.type?.toLowerCase() === "buy"
                                          ? "bg-primary/80"
                                          : "bg-destructive/80"
                                      }`}
                                    >
                                      {trade.type?.toUpperCase() || "UNKNOWN"}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-muted text-foreground text-xs font-medium">
                                      {Number(trade.lots).toFixed(2)} lot{Number(trade.lots) !== 1 ? 's' : ''}
                                    </span>
                                    <div className="flex-grow"></div>
                                    <span className="text-xs text-muted-foreground">
                                      {closedAt.toLocaleString("en-US", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "numeric",
                                        minute: "numeric",
                                        hour12: true,
                                      })}
                                    </span>
                                  </div>

                                  {/* Third row: Open and Close prices */}
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                      Open: {Number(openPrice).toFixed(decimals)}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                                      Close: {Number(closePrice).toFixed(decimals)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // Fix here: ensure renderClosedTrades is a valid ReactNode, not a function
                      typeof renderClosedTrades === 'function' ? null : renderClosedTrades || (
                        <tr>
                          <td colSpan={fullPage ? 4 : 9} className="text-center py-8 text-muted-foreground">
                            No closed trades found
                          </td>
                        </tr>
                      )
                    )
                  ) : activeTradeTab === "open" ? (
                    openTrades && openTrades.length > 0 ?
                      (!fullPage ? (
                        // Only use renderExpandableTrades for desktop open trades table (table look)
                        <>
                          {renderExpandableTrades(openTrades)}
                        </>
                      ) : (
                        // Add scroll area for open positions in mobile/fullPage mode
                        <tr>
                          <td colSpan={5} className="p-0 border-0">
                            <div
                              className="overflow-y-auto flex flex-col gap-2 py-2 pb-32"
                              style={{
                                // Ensure the scroll area does not go behind the summary
                                maxHeight: "calc(100dvh - 220px)", // 220px = approx header + summary height
                                minHeight: 0,
                              }}
                            >
                              {/* Group open trades by pair and type for mobile */}
                              {(() => {
                                // Group trades by pair and type
                                const grouped: Record<string, { 
                                  key: string,
                                  pair: string,
                                  type: string,
                                  trades: any[],
                                  totalLots: number,
                                  totalLivePnL: number,
                                  openPrice: number,
                                  currentPrice: number,
                                  decimals: number,
                                  hedgingTracker?: {
                                    hedgedBuyLots: number,
                                    hedgedSellLots: number,
                                    maxHedgedBuyLots: number,
                                    maxHedgedSellLots: number
                                  }
                                }> = {};
                                openTrades.forEach((trade) => {
                                  const key = `${trade.pair}|${(trade.type || "").toLowerCase()}`;
                                  if (!grouped[key]) {
                                    grouped[key] = {
                                      key,
                                      pair: trade.pair,
                                      type: (trade.type || "").toLowerCase(),
                                      trades: [],
                                      totalLots: 0,
                                      totalLivePnL: 0,
                                      openPrice: 0,
                                      currentPrice: 0,
                                      decimals: getPriceDecimals(trade.pair)
                                    };
                                  }
                                  grouped[key].trades.push(trade);
                                  grouped[key].totalLots += Number(trade.lots) || 0;
                                });

                                // Calculate total PnL and prices for each group
                                Object.values(grouped).forEach((g) => {
                                  let totalPnL = 0;
                                  let totalLots = 0;
                                  let openPriceSum = 0;
                                  let currentPriceSum = 0;
                                  g.trades.forEach((trade) => {
                                    const currentPrice = localPrices[trade.pair]?.price !== undefined
                                      ? parseFloat(localPrices[trade.pair].price)
                                      : parseFloat(trade.open_price);
                                    const openPrice = parseFloat(trade.open_price);
                                    let pipSize = 0.0001;
                                    let lotSize = 100000;
                                    let livePnL = 0;
                                    if (trade.pair.endsWith("USDT")) {
                                      pipSize = 1;
                                      lotSize = 1;
                                      if (trade.type?.toLowerCase() === "buy") {
                                        livePnL = currentPrice - openPrice;
                                      } else {
                                        livePnL = openPrice - currentPrice;
                                      }
                                    } else if (trade.pair === "XAUUSD") {
                                      pipSize = 0.01;
                                      lotSize = 100;
                                      const lots = Number(trade.lots) || 0;
                                      const pipValue = pipSize * lots * 100;
                                      if (trade.type?.toLowerCase() === "buy") {
                                        livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                      } else {
                                        livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                      }
                                    } else {
                                      if (trade.pair.endsWith("JPY")) {
                                        pipSize = 0.01;
                                      }
                                      const lots = Number(trade.lots) || 0;
                                      const pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
                                      if (trade.type?.toLowerCase() === "buy") {
                                        livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                      } else {
                                        livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                      }
                                    }
                                    totalPnL += livePnL;
                                    totalLots += Number(trade.lots) || 0;
                                    openPriceSum += openPrice * (Number(trade.lots) || 0);
                                    currentPriceSum += currentPrice * (Number(trade.lots) || 0);
                                  });
                                  g.totalLivePnL = totalPnL;
                                  g.totalLots = totalLots;
                                  g.openPrice = totalLots > 0 ? openPriceSum / totalLots : 0;
                                  g.currentPrice = totalLots > 0 ? currentPriceSum / totalLots : 0;
                                });

                                // --- HEDGING LOGIC FOR MOBILE ---
                                // Find buy/sell lots per pair
                                const pairTypes: Record<string, { buyLots: number, sellLots: number, hedgedBuyLots: number, hedgedSellLots: number }> = {};
                                Object.values(grouped).forEach((g) => {
                                  if (!pairTypes[g.pair]) pairTypes[g.pair] = { buyLots: 0, sellLots: 0, hedgedBuyLots: 0, hedgedSellLots: 0 };
                                  if (g.type === "buy") pairTypes[g.pair].buyLots += g.totalLots;
                                  if (g.type === "sell") pairTypes[g.pair].sellLots += g.totalLots;
                                });
                                Object.keys(pairTypes).forEach(pair => {
                                  const hedgedLots = Math.min(pairTypes[pair].buyLots, pairTypes[pair].sellLots);
                                  pairTypes[pair].hedgedBuyLots = hedgedLots;
                                  pairTypes[pair].hedgedSellLots = hedgedLots;
                                });

                                // Attach hedging tracker to each group
                                Object.values(grouped).forEach((g) => {
                                  g.hedgingTracker = {
                                    hedgedBuyLots: 0,
                                    hedgedSellLots: 0,
                                    maxHedgedBuyLots: pairTypes[g.pair]?.hedgedBuyLots || 0,
                                    maxHedgedSellLots: pairTypes[g.pair]?.hedgedSellLots || 0
                                  };
                                });

                                // --- FIX: Do not mutate g.hedgingTracker during render ---
                                // Instead, precompute which trades are hedged before rendering
                                // This avoids setState or mutation during render

                                // For each group, build an array of booleans for hedged status
                                const groupHedgedStatus: Record<string, boolean[]> = {};
                                Object.values(grouped).forEach((g) => {
                                  const isHedged = pairTypes[g.pair]?.buyLots > 0 && pairTypes[g.pair]?.sellLots > 0;
                                  let buyHedgeLeft = g.hedgingTracker!.maxHedgedBuyLots;
                                  let sellHedgeLeft = g.hedgingTracker!.maxHedgedSellLots;
                                  groupHedgedStatus[g.key] = g.trades.map((trade) => {
                                    const type = trade.type?.toLowerCase();
                                    const lots = Number(trade.lots) || 0;
                                    if (!isHedged) return false;
                                    if (type === "buy" && buyHedgeLeft > 0) {
                                      const hedged = buyHedgeLeft >= lots;
                                      buyHedgeLeft -= lots;
                                      return hedged || buyHedgeLeft >= 0;
                                    }
                                    if (type === "sell" && sellHedgeLeft > 0) {
                                      const hedged = sellHedgeLeft >= lots;
                                      sellHedgeLeft -= lots;
                                      return hedged || sellHedgeLeft >= 0;
                                    }
                                    return false;
                                  });
                                });

                                return Object.values(grouped).map((g, idx) => {
                                  const isProfitable = g.totalLivePnL >= 0;
                                  const isExpanded = mobileExpandedGroups[g.key] || false;
                                  // Is this group hedged at all?
                                  const isHedged = pairTypes[g.pair]?.buyLots > 0 && pairTypes[g.pair]?.sellLots > 0;
                                  const typeColor = g.type === "buy" ? "bg-primary" : "bg-destructive";
                                  const typeLabel = g.type.charAt(0).toUpperCase() + g.type.slice(1).toLowerCase();
                                  return (
                                    <div key={`open-group-${g.key}-${idx}`} className="px-3 py-4 mx-2 mb-2 mt-2 border border-border/60 rounded-lg last:mb-0 bg-muted/5 shadow-sm hover:bg-muted/10 transition-colors">
                                      {/* First row: colored circle, logo, pair name, PnL, close button */}
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                          {/* Colored circle for buy/sell */}
                                          <span className={`h-3 w-3 rounded-full mr-2 ${typeColor}`} title={g.type.toUpperCase()} />
                                          <img
                                            src={
                                              g.pair.endsWith("USDT")
                                                ? getCryptoImageForSymbol(g.pair)
                                                : getForexImageForSymbol(g.pair)
                                            }
                                            alt={g.pair}
                                            className="h-7 w-7"
                                          />
                                          <span className="font-semibold text-base">{formatPairName(g.pair)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`font-bold text-base ${isProfitable ? "text-success" : "text-destructive"}`}>
                                            {isProfitable ? "+" : ""}${g.totalLivePnL.toFixed(2)}
                                          </span>
                                          {(() => {
                                            const isForex = isForexTrade(g.trades[0]);
                                            return (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => g.trades.forEach(trade => handleCloseTrade(trade))}
                                                className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500"
                                                disabled={isForex && !isForexMarketOpen}
                                                title={
                                                  isForex
                                                    ? "You can only close forex trades when the market is open."
                                                    : g.trades.length > 1 ? "Close All" : "Close"
                                                }
                                              >
                                                <X size={16} />
                                              </Button>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      {/* Second row: full sentence for trade summary and live price right-aligned below PnL */}
                                      <div className="flex items-center mb-1 ml-8">
                                        <div className="text-sm text-foreground/80 flex-1">
                                          {`${typeLabel} ${g.totalLots.toFixed(2)} Lot${g.totalLots !== 1 ? 's' : ''} at ${Number(g.openPrice).toFixed(g.decimals)}`}
                                        </div>
                                        <span className="px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium ml-auto">
                                          {Number(g.currentPrice).toFixed(g.decimals)}
                                        </span>
                                      </div>
                                      {/* Third row: expand/collapse if multiple trades */}
                                      <div className="flex items-center ml-8 gap-2">
                                        {g.trades.length > 1 && (
                                          <button
                                            type="button"
                                            className="rounded-full p-1 hover:bg-muted/20 transition"
                                            onClick={() => toggleMobileGroupExpand(g.key)}
                                            aria-label={isExpanded ? "Collapse" : "Expand"}
                                          >
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                          </button>
                                        )}
                                      </div>
                                      {/* Expanded individual trades for mobile */}
                                      {isExpanded && (
                                        <div className="mt-2 border-t border-border/20 pt-2">
                                          {g.trades.map((trade, tIdx) => {
                                            // Calculate individual PnL
                                            const currentPrice = localPrices[trade.pair]?.price !== undefined
                                              ? parseFloat(localPrices[trade.pair].price)
                                              : parseFloat(trade.open_price);
                                            const openPrice = parseFloat(trade.open_price);
                                            let pipSize = 0.0001;
                                            let lotSize = 100000;
                                            let livePnL = 0;
                                            if (trade.pair.endsWith("USDT")) {
                                              pipSize = 1;
                                              lotSize = 1;
                                              if (trade.type?.toLowerCase() === "buy") {
                                                livePnL = currentPrice - openPrice;
                                              } else {
                                                livePnL = openPrice - currentPrice;
                                              }
                                            } else if (trade.pair === "XAUUSD") {
                                              pipSize = 0.01;
                                              lotSize = 100;
                                              const lots = Number(trade.lots) || 0;
                                              const pipValue = pipSize * lots * 100;
                                              if (trade.type?.toLowerCase() === "buy") {
                                                livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                              } else {
                                                livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                              }
                                            } else {
                                              if (trade.pair.endsWith("JPY")) {
                                                pipSize = 0.01;
                                              }
                                              const lots = Number(trade.lots) || 0;
                                              const pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
                                              if (trade.type?.toLowerCase() === "buy") {
                                                livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                              } else {
                                                livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                              }
                                            }
                                            const decimals = getPriceDecimals(trade.pair);
                                            const isProfitable = livePnL >= 0;
                                            const isTradeHedged = groupHedgedStatus[g.key]?.[tIdx] ?? false;
                                            return (
                                              <div key={`open-group-${g.key}-trade-${tIdx}`} className="flex items-center gap-2 py-2 border-b border-dashed border-border/20 last:border-0" style={{ minHeight: 40 }}>
                                                {/* (H) badge if hedged */}
                                                {isTradeHedged && (
                                                  <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold mr-1">H</span>
                                                )}
                                                {/* Lot and price sentence */}
                                                <span className="text-sm text-foreground/90">
                                                  {`${Number(trade.lots).toFixed(2)} Lot at ${Number(openPrice).toFixed(decimals)}`}
                                                </span>
                                                {/* PnL right aligned */}
                                                <span className={`ml-auto font-mono text-sm ${isProfitable ? "text-success" : "text-destructive"}`}
                                                  style={{ minWidth: 70, textAlign: 'right' }}>
                                                  {livePnL >= 0 ? '+' : ''}${livePnL.toFixed(2)}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleCloseTrade(trade)}
                                                  className="w-7 h-7 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500 ml-2"
                                                  title="Close Position"
                                                  style={{ minWidth: 28, minHeight: 28 }}
                                                  disabled={isForexTrade(trade) && !isForexMarketOpen}
                                                >
                                                  <X size={14} />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))
                    :
                      <tr>
                        <td colSpan={fullPage ? 5 : 10} className="text-center py-8 text-muted-foreground">
                          No open trades
                        </td>
                      </tr>
                  ) : (
                    closedTrades && closedTrades.length > 0 ?
                      (!fullPage ? (
                        // Only use renderExpandableTrades for desktop open trades table (table look)
                        <>
                          {renderExpandableTrades(closedTrades)}
                        </>
                      ) : (
                        // Add scroll area for open positions in mobile/fullPage mode
                        <tr>
                          <td colSpan={5} className="p-0 border-0">
                            <div
                              className="overflow-y-auto flex flex-col gap-2 py-2 pb-32"
                              style={{
                                // Ensure the scroll area does not go behind the summary
                                maxHeight: "calc(100dvh - 220px)", // 220px = approx header + summary height
                                minHeight: 0,
                              }}
                            >
                              {/* Group open trades by pair and type for mobile */}
                              {(() => {
                                // Group trades by pair and type
                                const grouped: Record<string, { 
                                  key: string,
                                  pair: string,
                                  type: string,
                                  trades: any[],
                                  totalLots: number,
                                  totalLivePnL: number,
                                  openPrice: number,
                                  currentPrice: number,
                                  decimals: number,
                                  hedgingTracker?: {
                                    hedgedBuyLots: number,
                                    hedgedSellLots: number,
                                    maxHedgedBuyLots: number,
                                    maxHedgedSellLots: number
                                  }
                                }> = {};
                                closedTrades.forEach((trade) => {
                                  const key = `${trade.pair}|${(trade.type || "").toLowerCase()}`;
                                  if (!grouped[key]) {
                                    grouped[key] = {
                                      key,
                                      pair: trade.pair,
                                      type: (trade.type || "").toLowerCase(),
                                      trades: [],
                                      totalLots: 0,
                                      totalLivePnL: 0,
                                      openPrice: 0,
                                      currentPrice: 0,
                                      decimals: getPriceDecimals(trade.pair)
                                    };
                                  }
                                  grouped[key].trades.push(trade);
                                  grouped[key].totalLots += Number(trade.lots) || 0;
                                });

                                // Calculate total PnL and prices for each group
                                Object.values(grouped).forEach((g) => {
                                  let totalPnL = 0;
                                  let totalLots = 0;
                                  let openPriceSum = 0;
                                  let currentPriceSum = 0;
                                  g.trades.forEach((trade) => {
                                    const currentPrice = localPrices[trade.pair]?.price !== undefined
                                      ? parseFloat(localPrices[trade.pair].price)
                                      : parseFloat(trade.open_price);
                                    const openPrice = parseFloat(trade.open_price);
                                    let pipSize = 0.0001;
                                    let lotSize = 100000;
                                    let livePnL = 0;
                                    if (trade.pair.endsWith("USDT")) {
                                      pipSize = 1;
                                      lotSize = 1;
                                      if (trade.type?.toLowerCase() === "buy") {
                                        livePnL = currentPrice - openPrice;
                                      } else {
                                        livePnL = openPrice - currentPrice;
                                      }
                                    } else if (trade.pair === "XAUUSD") {
                                      pipSize = 0.01;
                                      lotSize = 100;
                                      const lots = Number(trade.lots) || 0;
                                      const pipValue = pipSize * lots * 100;
                                      if (trade.type?.toLowerCase() === "buy") {
                                        livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                      } else {
                                        livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                      }
                                    } else {
                                      if (trade.pair.endsWith("JPY")) {
                                        pipSize = 0.01;
                                      }
                                      const lots = Number(trade.lots) || 0;
                                      const pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
                                      if (trade.type?.toLowerCase() === "buy") {
                                        livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                      } else {
                                        livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                      }
                                    }
                                    totalPnL += livePnL;
                                    totalLots += Number(trade.lots) || 0;
                                    openPriceSum += openPrice * (Number(trade.lots) || 0);
                                    currentPriceSum += currentPrice * (Number(trade.lots) || 0);
                                  });
                                  g.totalLivePnL = totalPnL;
                                  g.totalLots = totalLots;
                                  g.openPrice = totalLots > 0 ? openPriceSum / totalLots : 0;
                                  g.currentPrice = totalLots > 0 ? currentPriceSum / totalLots : 0;
                                });

                                // --- HEDGING LOGIC FOR MOBILE ---
                                // Find buy/sell lots per pair
                                const pairTypes: Record<string, { buyLots: number, sellLots: number, hedgedBuyLots: number, hedgedSellLots: number }> = {};
                                Object.values(grouped).forEach((g) => {
                                  if (!pairTypes[g.pair]) pairTypes[g.pair] = { buyLots: 0, sellLots: 0, hedgedBuyLots: 0, hedgedSellLots: 0 };
                                  if (g.type === "buy") pairTypes[g.pair].buyLots += g.totalLots;
                                  if (g.type === "sell") pairTypes[g.pair].sellLots += g.totalLots;
                                });
                                Object.keys(pairTypes).forEach(pair => {
                                  const hedgedLots = Math.min(pairTypes[pair].buyLots, pairTypes[pair].sellLots);
                                  pairTypes[pair].hedgedBuyLots = hedgedLots;
                                  pairTypes[pair].hedgedSellLots = hedgedLots;
                                });

                                // Attach hedging tracker to each group
                                Object.values(grouped).forEach((g) => {
                                  g.hedgingTracker = {
                                    hedgedBuyLots: 0,
                                    hedgedSellLots: 0,
                                    maxHedgedBuyLots: pairTypes[g.pair]?.hedgedBuyLots || 0,
                                    maxHedgedSellLots: pairTypes[g.pair]?.hedgedSellLots || 0
                                  };
                                });

                                // --- FIX: Do not mutate g.hedgingTracker during render ---
                                // Instead, precompute which trades are hedged before rendering
                                // This avoids setState or mutation during render

                                // For each group, build an array of booleans for hedged status
                                const groupHedgedStatus: Record<string, boolean[]> = {};
                                Object.values(grouped).forEach((g) => {
                                  const isHedged = pairTypes[g.pair]?.buyLots > 0 && pairTypes[g.pair]?.sellLots > 0;
                                  let buyHedgeLeft = g.hedgingTracker!.maxHedgedBuyLots;
                                  let sellHedgeLeft = g.hedgingTracker!.maxHedgedSellLots;
                                  groupHedgedStatus[g.key] = g.trades.map((trade) => {
                                    const type = trade.type?.toLowerCase();
                                    const lots = Number(trade.lots) || 0;
                                    if (!isHedged) return false;
                                    if (type === "buy" && buyHedgeLeft > 0) {
                                      const hedged = buyHedgeLeft >= lots;
                                      buyHedgeLeft -= lots;
                                      return hedged || buyHedgeLeft >= 0;
                                    }
                                    if (type === "sell" && sellHedgeLeft > 0) {
                                      const hedged = sellHedgeLeft >= lots;
                                      sellHedgeLeft -= lots;
                                      return hedged || sellHedgeLeft >= 0;
                                    }
                                    return false;
                                  });
                                });

                                return Object.values(grouped).map((g, idx) => {
                                  const isProfitable = g.totalLivePnL >= 0;
                                  const isExpanded = mobileExpandedGroups[g.key] || false;
                                  // Is this group hedged at all?
                                  const isHedged = pairTypes[g.pair]?.buyLots > 0 && pairTypes[g.pair]?.sellLots > 0;
                                  const typeColor = g.type === "buy" ? "bg-primary" : "bg-destructive";
                                  const typeLabel = g.type.charAt(0).toUpperCase() + g.type.slice(1).toLowerCase();
                                  return (
                                    <div key={`open-group-${g.key}-${idx}`} className="px-3 py-4 mx-2 mb-2 mt-2 border border-border/60 rounded-lg last:mb-0 bg-muted/5 shadow-sm hover:bg-muted/10 transition-colors">
                                      {/* First row: colored circle, logo, pair name, PnL, close button */}
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                          {/* Colored circle for buy/sell */}
                                          <span className={`h-3 w-3 rounded-full mr-2 ${typeColor}`} title={g.type.toUpperCase()} />
                                          <img
                                            src={
                                              g.pair.endsWith("USDT")
                                                ? getCryptoImageForSymbol(g.pair)
                                                : getForexImageForSymbol(g.pair)
                                            }
                                            alt={g.pair}
                                            className="h-7 w-7"
                                          />
                                          <span className="font-semibold text-base">{formatPairName(g.pair)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`font-bold text-base ${isProfitable ? "text-success" : "text-destructive"}`}>
                                            {isProfitable ? "+" : ""}${g.totalLivePnL.toFixed(2)}
                                          </span>
                                          {(() => {
                                            const isForex = isForexTrade(g.trades[0]);
                                            return (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => g.trades.forEach(trade => handleCloseTrade(trade))}
                                                className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500"
                                                disabled={isForex && !isForexMarketOpen}
                                                title={
                                                  isForex
                                                    ? "You can only close forex trades when the market is open."
                                                    : g.trades.length > 1 ? "Close All" : "Close"
                                                }
                                              >
                                                <X size={16} />
                                              </Button>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      {/* Second row: full sentence for trade summary and live price right-aligned below PnL */}
                                      <div className="flex items-center mb-1 ml-8">
                                        <div className="text-sm text-foreground/80 flex-1">
                                          {`${typeLabel} ${g.totalLots.toFixed(2)} Lot${g.totalLots !== 1 ? 's' : ''} at ${Number(g.openPrice).toFixed(g.decimals)}`}
                                        </div>
                                        <span className="px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium ml-auto">
                                          {Number(g.currentPrice).toFixed(g.decimals)}
                                        </span>
                                      </div>
                                      {/* Third row: expand/collapse if multiple trades */}
                                      <div className="flex items-center ml-8 gap-2">
                                        {g.trades.length > 1 && (
                                          <button
                                            type="button"
                                            className="rounded-full p-1 hover:bg-muted/20 transition"
                                            onClick={() => toggleMobileGroupExpand(g.key)}
                                            aria-label={isExpanded ? "Collapse" : "Expand"}
                                          >
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                          </button>
                                        )}
                                      </div>
                                      {/* Expanded individual trades for mobile */}
                                      {isExpanded && (
                                        <div className="mt-2 border-t border-border/20 pt-2">
                                          {g.trades.map((trade, tIdx) => {
                                            // Calculate individual PnL
                                            const currentPrice = localPrices[trade.pair]?.price !== undefined
                                              ? parseFloat(localPrices[trade.pair].price)
                                              : parseFloat(trade.open_price);
                                            const openPrice = parseFloat(trade.open_price);
                                            let pipSize = 0.0001;
                                            let lotSize = 100000;
                                            let livePnL = 0;
                                            if (trade.pair.endsWith("USDT")) {
                                              pipSize = 1;
                                              lotSize = 1;
                                              if (trade.type?.toLowerCase() === "buy") {
                                                livePnL = currentPrice - openPrice;
                                              } else {
                                                livePnL = openPrice - currentPrice;
                                              }
                                            } else if (trade.pair === "XAUUSD") {
                                              pipSize = 0.01;
                                              lotSize = 100;
                                              const lots = Number(trade.lots) || 0;
                                              const pipValue = pipSize * lots * 100;
                                              if (trade.type?.toLowerCase() === "buy") {
                                                livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                              } else {
                                                livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                              }
                                            } else {
                                              if (trade.pair.endsWith("JPY")) {
                                                pipSize = 0.01;
                                              }
                                              const lots = Number(trade.lots) || 0;
                                              const pipValue = (pipSize * lotSize * lots) / (currentPrice || 1);
                                              if (trade.type?.toLowerCase() === "buy") {
                                                livePnL = ((currentPrice - openPrice) / pipSize) * pipValue;
                                              } else {
                                                livePnL = ((openPrice - currentPrice) / pipSize) * pipValue;
                                              }
                                            }
                                            const decimals = getPriceDecimals(trade.pair);
                                            const isProfitable = livePnL >= 0;
                                            const isTradeHedged = groupHedgedStatus[g.key]?.[tIdx] ?? false;
                                            return (
                                              <div key={`open-group-${g.key}-trade-${tIdx}`} className="flex items-center gap-2 py-2 border-b border-dashed border-border/20 last:border-0" style={{ minHeight: 40 }}>
                                                {/* (H) badge if hedged */}
                                                {isTradeHedged && (
                                                  <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold mr-1">H</span>
                                                )}
                                                {/* Lot and price sentence */}
                                                <span className="text-sm text-foreground/90">
                                                  {`${Number(trade.lots).toFixed(2)} Lot at ${Number(openPrice).toFixed(decimals)}`}
                                                </span>
                                                {/* PnL right aligned */}
                                                <span className={`ml-auto font-mono text-sm ${isProfitable ? "text-success" : "text-destructive"}`}
                                                  style={{ minWidth: 70, textAlign: 'right' }}>
                                                  {livePnL >= 0 ? '+' : ''}${livePnL.toFixed(2)}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleCloseTrade(trade)}
                                                  className="w-7 h-7 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500 ml-2"
                                                  title="Close Position"
                                                  style={{ minWidth: 28, minHeight: 28 }}
                                                  disabled={isForexTrade(trade) && !isForexMarketOpen}
                                                >
                                                  <X size={14} />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))
                    :
                      <tr>
                        <td colSpan={fullPage ? 5 : 10} className="text-center py-8 text-muted-foreground">
                          No closed trades
                        </td>
                      </tr>
                  )}
                </tbody>
              </table>
              
              {/* Show "More trades available" message when limiting display on mobile */}
              {fullPage && activeTradeTab === "closed" && closedTrades && closedTrades.length > mobilePaginationLimit && (
                <div className="text-center py-3 text-xs text-muted-foreground bg-muted/5 border-t border-border/30">
                  Showing {Math.min(mobilePaginationLimit, 
                    Math.min(
                      mobilePaginationLimit, 
                      closedTrades.length - (currentPage - 1) * mobilePaginationLimit
                    ))} of {closedTrades.length} trades
                </div>
              )}
            </div>
            
            {/* Pagination Controls - show for closed trades */}
            {activeTradeTab === "closed" && (
              <div className={`flex justify-between items-center px-4 py-3 ${fullPage ? "border-t border-border/50" : "bg-muted/20 border-t border-border/50"}`}>
                <button
                  className={`${fullPage ? "px-3 py-1 text-xs" : "px-4 py-2"} bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50`}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  tabIndex={0}
                >
                  Previous
                </button>
                <span className={`${fullPage ? "text-xs" : "text-sm"} font-medium text-foreground`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className={`${fullPage ? "px-3 py-1 text-xs" : "px-4 py-2"} bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50`}
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  aria-label="Next page"
                  tabIndex={0}
                >
                  Next
                </button>
              </div>
            )}
            {/* Resize handle - only show in desktop view */}
            {!fullPage && (
              <div
                style={{
                  height: 8,
                  cursor: "ns-resize",
                  background: "transparent",
                  width: "100%",
                  marginTop: -8,
                  zIndex: 50,
                }}
                onMouseDown={onResizeStart}
                aria-label="Resize activity panel"
                tabIndex={0}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom Badge - only show in desktop view and when not collapsed */}
      {!activityCollapsed && !fullPage && (
        <div
          className="flex w-full gap-0 text-sm font-medium mb-2 border-t border-border/50 pt-4 bg-background/90"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "nowrap",
          }}
        >
          <div className="flex flex-row w-full justify-between items-center gap-4 px-4">
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Equity</span>
              <span className="font-mono font-semibold px-3 py-1 rounded-md bg-muted/40 text-foreground">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Used Margin</span>
              <span className="font-mono font-semibold px-3 py-1 rounded-md bg-muted/40 text-foreground">
                ${usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Free Margin</span>
              <span className={`font-mono font-semibold px-3 py-1 rounded-md flex items-center justify-center gap-1 transition-colors ${
                freeMarginChange === 'increase' ? 'bg-green-500/10 text-green-600' :
                freeMarginChange === 'decrease' ? 'bg-red-500/10 text-red-500' : 'bg-muted/40 text-foreground'
              }`}>
                ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {freeMarginChange && (
                  <span className={`text-xs ${freeMarginChange === 'increase' ? 'text-green-600' : 'text-red-500'}`}>
                    {freeMarginChange === 'increase' ? '↑' : '↓'}
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Margin Level</span>
              <span className={`font-mono font-semibold px-3 py-1 rounded-md flex items-center justify-center gap-1 transition-colors ${
                marginLevelChange === 'increase' ? 'bg-green-500/10 text-green-600' :
                marginLevelChange === 'decrease' ? 'bg-red-500/10 text-red-500' : 'bg-muted/40 text-foreground'
              }`}>
                {usedMargin > 0 ? marginLevel.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "100.00"}%
                {marginLevelChange && (
                  <span className={`text-xs ${marginLevelChange === 'increase' ? 'text-green-600' : 'text-red-500'}`}>
                    {marginLevelChange === 'increase' ? '↑' : '↓'}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile summary stats at bottom of full page view */}
      {fullPage && (
        <div className="fixed bottom-0 left-0 w-full z-50 grid grid-cols-2 gap-2 p-4 bg-secondary border-t border-border/50 mb-12">
          <div className="p-3 rounded-md bg-muted/20 shadow-sm">
            <div className="text-xs text-muted-foreground">Equity</div>
            <div className="font-mono font-semibold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="p-3 rounded-md bg-muted/20 shadow-sm">
            <div className="text-xs text-muted-foreground">Used Margin</div>
            <div className="font-mono font-semibold">${usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="p-3 rounded-md bg-muted/20 shadow-sm">
            <div className="text-xs text-muted-foreground">Free Margin</div>
            <div className={`font-mono font-semibold flex items-center gap-1 ${
              freeMarginChange === 'increase' ? 'text-green-600' :
              freeMarginChange === 'decrease' ? 'text-red-500' : ''
            }`}>
              ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })
              }
              {freeMarginChange && (
                <span className="text-xs">{freeMarginChange === 'increase' ? '↑' : '↓'}</span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-md bg-muted/20 shadow-sm">
            <div className="text-xs text-muted-foreground">Margin Level</div>
            <div className={`font-mono font-semibold flex items-center gap-1 ${
              marginLevelChange === 'increase' ? 'text-green-600' :
              marginLevelChange === 'decrease' ? 'text-red-500' : ''
            }`}>
              {usedMargin > 0 ? marginLevel.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "100.00"}%
              {marginLevelChange && (
                <span className="text-xs">{marginLevelChange === 'increase' ? '↑' : '↓'}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to check if a trade is a forex trade (not crypto or XAUUSD)
function isForexTrade(trade: any) {
  // XAUUSD is now considered forex for market open/close logic
  return !trade.pair.endsWith("USDT");
}

// Add a prop or logic to determine if forex market is open
// For simplicity, add a helper here (should be passed as prop in a real app)
function getForexMarketStatus() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  let isOpen = false;
   if (
    (utcDay > 0 && utcDay < 5) ||
    (utcDay === 5 && utcHour < 21) ||
    (utcDay === 0 && (utcHour > 22 || (utcHour === 22 && utcMinute >= 0)))
  ) {
    isOpen = true;
  }
  return isOpen;
}
const isForexMarketOpen = getForexMarketStatus();

export default ActivityPanel;

// Helper for compact amount formatting
function formatAmountCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return (amount / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  }
  if (Math.abs(amount) >= 1_000) {
    return (amount / 1_000).toFixed(2).replace(/\.00$/, "") + "K";
  }
  return amount.toFixed(2).replace(/\.00$/, "");
}