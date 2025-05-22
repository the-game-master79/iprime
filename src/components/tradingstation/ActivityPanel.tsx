import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, X, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Add this import at the top

interface ActivityPanelProps {
  isCollapsed: boolean;
  activityCollapsed: boolean;
  setActivityCollapsed: (value: boolean) => void;
  activityHeight: number;
  activeTradeTab: "open" | "pending" | "closed";
  setActiveTradeTab: (value: "open" | "pending" | "closed") => void;
  openCount: number;
  pendingCount: number;
  closedCount: number;
  totalOpenPnL: number;
  totalClosedPnL: number;
  renderOpenTrades: (trades: any[]) => React.ReactNode;
  renderPendingTrades: (trades: any[]) => React.ReactNode;
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
  pendingTrades?: any[];
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
  pendingCount,
  closedCount,
  totalOpenPnL,
  totalClosedPnL,
  renderOpenTrades,
  renderPendingTrades,
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
  pendingTrades = [],
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
  const handleTabChange = (tab: "open" | "pending" | "closed") => {
    setActiveTradeTab(tab);
  };
  
  const activityPanelRef = useRef<HTMLDivElement>(null);
  // Add ref to track previous tab to avoid unnecessary state updates
  const prevTabRef = useRef<"open" | "pending" | "closed">(activeTradeTab);
  // State to track expanded rows
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Track if any groups are expanded (for toggling all)
  const [anyExpanded, setAnyExpanded] = useState(false);
  // Track if there are trades that can be expanded
  const [hasExpandableTrades, setHasExpandableTrades] = useState(false);

  // Check for expandable trades on tab change or trades update
  useEffect(() => {
    // Avoid unnecessary updates by checking current values against new values
    const tradesArray = activeTradeTab === "open" ? openTrades : 
                       (activeTradeTab === "pending" ? pendingTrades : []);
    
    // Only update hasExpandableTrades if it's actually changed
    const hasTradesExpandable = tradesArray.length > 0;
    if (hasExpandableTrades !== hasTradesExpandable) {
      setHasExpandableTrades(hasTradesExpandable);
    }
    
    // Only reset expansion state when switching tabs, not on every render
    // Use a ref to track the previous tab
    if (prevTabRef.current !== activeTradeTab) {
      setExpandedGroups({});
      setAnyExpanded(false);
      prevTabRef.current = activeTradeTab;
    }
  }, [activeTradeTab, openTrades, pendingTrades, hasExpandableTrades]);

  // Handle expanding/collapsing a group
  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newState = {
        ...prev,
        [groupKey]: !prev[groupKey]
      };
      
      // Check if any groups are expanded after this toggle
      const hasExpanded = Object.values(newState).some(value => value);
      setAnyExpanded(hasExpanded);
      
      return newState;
    });
  };

  // Expand or collapse all groups
  const toggleAllGroups = (expand: boolean) => {
    if (activeTradeTab === "open" && openTrades.length > 0) {
      const newState: Record<string, boolean> = {};
      openTrades.forEach(trade => {
        const key = `${trade.pair}|${(trade.type || "").toLowerCase()}`;
        newState[key] = expand;
      });
      setExpandedGroups(newState);
      setAnyExpanded(expand);
    } else if (activeTradeTab === "pending" && pendingTrades.length > 0) {
      const newState: Record<string, boolean> = {};
      pendingTrades.forEach(trade => {
        const key = `${trade.pair}|${(trade.type || "").toLowerCase()}`;
        newState[key] = expand;
      });
      setExpandedGroups(newState);
      setAnyExpanded(expand);
    }
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
                    isForexTrade(g.trades[0]) && !isForexMarketOpen
                      ? "Market is closed. You can only close forex trades when the market is open."
                      : hasMultiplePositions ? "Close All Positions" : "Close Position"
                  }
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
                    const currentPriceValue = parseFloat(currentPrice);
                    
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

  return (
    <div
      className={`${fullPage 
        ? "w-full h-full bg-background flex flex-col" 
        : "fixed bottom-0 left-0 right-0 bg-background text-white flex flex-col items-center justify-center border-t border-gray-700"
      } transition-all duration-300`}
      ref={activityPanelRef}
      style={fullPage ? { minHeight: "100dvh", paddingBottom: fullPage ? 88 : undefined } : {
        marginLeft: isCollapsed ? "60px" : "460px",
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
        style={fullPage ? {height: "100%"} : {height: "100%"}}
        aria-labelledby="activity-panel-title"
      >
        {/* Header for full page mode */}
        {fullPage && (
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <h2 className="text-xl font-semibold" id="activity-panel-title">Trading Activity</h2>
          </div>
        )}
      
        {/* Tabs for open, pending, and closed */}
        <div 
          className={`flex items-center ${fullPage ? "px-4 py-2" : "bg-muted/20 border-b border-border/50 px-4"}`}
          style={fullPage ? {} : { minHeight: 44, height: 44, paddingTop: 6, paddingBottom: 6 }}
        >
          <div className="flex gap-2">
            {/* 
            <Button
              variant={activeTradeTab === "open" ? "default" : "outline"}
              onClick={() => handleTabChange("open")}
              className={`flex text-foreground items-center gap-1 ${fullPage ? "text-xs h-8 px-3" : "h-8 text-sm px-4"}`}
            >
              Open
              <span className={`ml-1 bg-background text-foreground rounded-full px-2 py-0.5 text-xs font-semibold`}>{openCount}</span>
            </Button>
            */}
            <Button
              variant={activeTradeTab === "pending" ? "default" : "outline"}
              onClick={() => handleTabChange("pending")}
              className={`flex text-foreground items-center gap-1 ${fullPage ? "text-xs h-8 px-3" : "h-8 text-sm px-4"}`}
            >
              Pending
              <span className={`ml-1 bg-background text-foreground rounded-full px-2 py-0.5 text-xs font-semibold`}>{pendingCount}</span>
            </Button>
            <Button
              variant={activeTradeTab === "closed" ? "default" : "outline"}
              onClick={() => handleTabChange("closed")}
              className={`flex text-foreground items-center gap-1 ${fullPage ? "text-xs h-8 px-3" : "h-8 text-sm px-4"}`}
            >
              Closed
              <span className={`ml-1 bg-background text-foreground rounded-full px-2 py-0.5 text-xs font-semibold`}>{closedCount}</span>
            </Button>
          </div>
          
          <div className="flex-1" />
          
          {/* Total PnL display - only for desktop */}
          {!fullPage && (
            <div className="flex items-center gap-2 pr-2">
              <span className={`text-xs font-medium text-muted-foreground`}>
                {activeTradeTab === "closed" ? "Total Closed P&L:" : "Total P&L:"}
              </span>
              <span
                className={`font-bold font-mono text-sm ${
                  (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) > 0
                    ? "text-success"
                    : (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
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
              className="ml-2 h-8 w-8"
              onClick={() => setActivityCollapsed((v) => !v)}
              aria-label={activityCollapsed ? "Expand" : "Collapse"}
            >
              {/* Show fullscreen icon when collapsed, minimize icon when expanded */}
              {activityCollapsed ? (
                // Fullscreen icon
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
                // Minimize icon
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
                className={`font-bold font-mono text-xl ${
                  (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) > 0
                    ? "text-success"
                    : (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) < 0
                    ? "text-destructive"
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
                className="h-9 px-3 gap-1 text-xs bg-destructive text-white hover:bg-destructive/90"
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
            
            {/* Cancel All button - only show for pending trades */}
            {activeTradeTab === "pending" && pendingTrades && pendingTrades.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => pendingTrades.forEach(trade => handleCloseTrade(trade))}
                className="h-9 px-3 gap-1 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              >
                <X size={14} />
                Cancel All ({pendingTrades.length})
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
                                  return (
                                    <div key={`open-group-${g.key}-${idx}`} className="px-3 py-4 mx-2 mb-2 mt-2 border border-border/60 rounded-lg last:mb-0 bg-muted/5 shadow-sm hover:bg-muted/10 transition-colors">
                                      {/* First row: Icon, Pair name and PnL with close button */}
                                      <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
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
                                                  isForex && !isForexMarketOpen
                                                    ? "Market is closed. You can only close forex trades when the market is open."
                                                    : g.trades.length > 1 ? "Close All" : "Close"
                                                }
                                              >
                                                <X size={16} />
                                              </Button>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      {/* Second row: Type badge, lots badge, prices, and expand arrow */}
                                      <div className="flex flex-wrap gap-2 items-center">
                                        <span
                                          className={`px-2 py-1 rounded-md text-white text-xs font-semibold ${
                                            g.type === "buy"
                                              ? "bg-primary/80"
                                              : "bg-destructive/80"
                                          }`}
                                        >
                                          {g.type.toUpperCase()}
                                        </span>
                                        {/* Show Hedged badge for group if hedged */}
                                        {isHedged && (
                                          <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold transition-all ml-1 hover:bg-primary/20">
                                            Hedged
                                          </span>
                                        )}
                                        <span className="px-2 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold">
                                          {g.totalLots.toFixed(2)} lot{g.totalLots !== 1 ? 's' : ''}
                                        </span>
                                        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                                          O: {Number(g.openPrice).toFixed(g.decimals)}
                                          {/* Arrow button for expand/collapse if multiple trades */}
                                          {g.trades.length > 1 && (
                                            <button
                                              type="button"
                                              className="ml-1 rounded-full p-1 hover:bg-muted/20 transition"
                                              onClick={() => toggleMobileGroupExpand(g.key)}
                                              aria-label={isExpanded ? "Collapse" : "Expand"}
                                            >
                                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                          )}
                                        </span>
                                        <div className="flex-grow"></div>
                                        <span className="px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium">
                                          {Number(g.currentPrice).toFixed(g.decimals)}
                                        </span>
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

                                            // --- HEDGED BADGE LOGIC FOR MOBILE ---
                                            // Use precomputed hedged status
                                            const isTradeHedged = groupHedgedStatus[g.key]?.[tIdx] ?? false;

                                            return (
                                              <div key={`open-group-${g.key}-trade-${tIdx}`} className="flex items-center gap-3 py-3 border-b border-dashed border-border/20 last:border-0" style={{ minHeight: 44 }}>
                                                <span className="text-xs text-muted-foreground min-w-[90px]">
                                                  ID: {trade.id.substring(0, 8)}...
                                                </span>
                                                <span className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold min-w-[48px] text-center">
                                                  {Number(trade.lots).toFixed(2)}
                                                </span>
                                                {/* Show H badge for hedged positions */}
                                                {isTradeHedged && (
                                                  <span className="px-2 py-1 rounded-full border border-primary text-primary bg-primary/10 text-xs font-semibold ml-1 hover:bg-primary/20 min-w-[28px] text-center">
                                                    H
                                                  </span>
                                                )}
                                                <span className="px-2 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold min-w-[60px] text-center">
                                                  {Number(openPrice).toFixed(decimals)}
                                                </span>
                                                <span className={`font-mono text-xs ${isProfitable ? "text-success" : "text-destructive"} min-w-[60px] text-center`}>
                                                  ${livePnL.toFixed(2)}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleCloseTrade(trade)}
                                                  className="w-7 h-7 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500"
                                                  title="Close Position"
                                                  style={{ minWidth: 28, minHeight: 28 }}
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
                    pendingTrades && pendingTrades.length > 0 ?
                      (!fullPage ? (
                        // Fix here: Call renderPendingTrades as a function if it is one
                        typeof renderPendingTrades === 'function' ? renderPendingTrades(pendingTrades) : renderPendingTrades
                      ) :
                        // Simple view for pending trades on mobile/full page
                        pendingTrades.map((trade, idx) => (
                          <tr key={`pending-${trade.id || idx}`} className="border-t border-border/50">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <img
                                  src={
                                    trade.pair.endsWith("USDT")
                                      ? getCryptoImageForSymbol(trade.pair)
                                      : getForexImageForSymbol(trade.pair)
                                  }
                                  alt={trade.pair}
                                  className="h-6 w-6"
                                />
                                <span>{formatPairName(trade.pair)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                                  trade.type?.toLowerCase() === "buy"
                                    ? "bg-primary hover:bg-primary/90"
                                    : "bg-destructive hover:bg-destructive/90"
                                }`}
                              >
                                {trade.type?.toUpperCase() || "UNKNOWN"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                                {Number(trade.lots).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-gray-400">Pending</span>
                            </td>
                            <td className="px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCloseTrade(trade)}
                                className="w-8 h-8 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500"
                              >
                                <X size={16} />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )
                    :
                      // Fix here: Call renderPendingTrades as a function if it is one, otherwise use it directly
                      typeof renderPendingTrades === 'function' ? null : renderPendingTrades || (
                        <tr>
                          <td colSpan={fullPage ? 5 : 10} className="text-center py-8 text-muted-foreground">
                            No pending trades
                          </td>
                        </tr>
                      )
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
                  className={`${fullPage ? "px-3 py-1 text-xs" : "px-4 py-2"} bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/40 disabled:opacity-50`}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className={`${fullPage ? "text-xs" : "text-sm"} font-medium text-foreground`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className={`${fullPage ? "px-3 py-1 text-xs" : "px-4 py-2"} bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/40 disabled:opacity-50`}
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
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
              />
            )}
          </>
        )}
      </div>
      
      {/* Bottom Badge - only show in desktop view and when not collapsed */}
      {!activityCollapsed && !fullPage && (
        <div
          className="flex w-full gap-0 text-sm font-medium mb-2 border-t border-border/50 pt-4"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "nowrap",
          }}
        >
          <div className="flex-1 text-center text-foreground whitespace-nowrap flex flex-col items-center justify-center">
            <span>Equity:</span>
            <span className="font-bold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
          </div>
          <div className="flex-1 text-center text-foreground whitespace-nowrap flex flex-col items-center justify-center">
            <span>Used Margin:</span>
            <span className="font-bold">${usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex-1 text-center text-foreground whitespace-nowrap flex flex-col items-center justify-center">
            <span>Free Margin:</span>
            <span className={`font-bold flex items-center justify-center gap-1 transition-colors ${
              freeMarginChange === 'increase' ? 'text-success' : 
 
              freeMarginChange === 'decrease' ? 'text-destructive' : ''
            }`}>
              ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              {freeMarginChange && (
                <span className={`text-xs ${freeMarginChange === 'increase' ? 'text-success' : 'text-destructive'}`}>
                  {freeMarginChange === 'increase' ? '↑' : '↓'}
                </span>
              )}
            </span>
          </div>
          <div className="flex-1 text-center text-foreground whitespace-nowrap flex flex-col items-center justify-center">
            <span>Margin Level:</span>
            <span className={`font-bold flex items-center justify-center gap-1 transition-colors ${
              marginLevelChange === 'increase' ? 'text-success' : 
              marginLevelChange === 'decrease' ? 'text-destructive' : ''
            }`}>
              {usedMargin > 0 ? marginLevel.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "100.00"}%
              {marginLevelChange && (
                <span className={`text-xs ${marginLevelChange === 'increase' ? 'text-success' : 'text-destructive'}`}>
                  {marginLevelChange === 'increase' ? '↑' : '↓'}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      
      {/* Mobile summary stats at bottom of full page view */}
      {fullPage && (
        <div className="fixed bottom-0 left-0 w-full z-50 grid grid-cols-2 gap-2 p-4 bg-secondary border-t border-border/50 mb-12">
          <div className="p-3 rounded-lg bg-muted/20">
            <div className="text-xs text-muted-foreground">Equity</div>
            <div className="font-bold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/20">
            <div className="text-xs text-muted-foreground">Used Margin</div>
            <div className="font-bold">${usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/20">
            <div className="text-xs text-muted-foreground">Free Margin</div>
            <div className={`font-bold flex items-center gap-1 ${
              freeMarginChange === 'increase' ? 'text-success' : 
              freeMarginChange === 'decrease' ? 'text-destructive' : ''
            }`}>
              ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })
              }
              {freeMarginChange && (
                <span className="text-xs">{freeMarginChange === 'increase' ? '↑' : '↓'}</span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/20">
            <div className="text-xs text-muted-foreground">Margin Level</div>
            <div className={`font-bold flex items-center gap-1 ${
              marginLevelChange === 'increase' ? 'text-success' : 
              marginLevelChange === 'decrease' ? 'text-destructive' : ''
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
  return !trade.pair.endsWith("USDT") && trade.pair !== "XAUUSD";
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