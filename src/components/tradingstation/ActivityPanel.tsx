import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, X, Copy, Check } from "lucide-react";

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
  handleCloseTrade = () => {},
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
                  <span className="mr-2">{formatPairName(g.pair)}</span>
                  {/* Only show expand button if there are multiple trades */}
                  {g.trades.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0 rounded-full opacity-70 hover:opacity-100 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click from triggering
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
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {g.type.toUpperCase()}
                </span>
                {isHedged && (
                  <span className="px-2 py-1 rounded-full border border-blue-400 text-blue-400 bg-blue-500/10 text-xs font-semibold transition-all ml-1 hover:bg-blue-500/20">
                    Hedged
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-2">
              <span className="px-2 py-1 rounded-full bg-white text-gray-800 text-xs font-semibold hover:bg-gray-100 transition-all">
                {g.totalLots.toFixed(2)}
              </span>
            </td>
            <td className="px-4 py-2 text-xs">
              {Number(firstTrade.open_price).toFixed(decimals)}
            </td>
            <td className="px-4 py-2 text-xs">
              {Number(currentPrice).toFixed(decimals)}
            </td>
            <td className="px-4 py-2 text-xs">
              ${g.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
            <td className="px-4 py-2">
              <span
                className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                  firstTrade.leverage <= 20
                    ? "bg-green-500 hover:bg-green-600"
                    : firstTrade.leverage <= 500
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                1:{firstTrade.leverage}
              </span>
            </td>
            <td className="px-4 py-2 text-xs">
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
              {/* Show X button for open trades (all trades in group are open) */}
              {g.trades.every((t) => t.status === "open") && (
                <Button
                  variant={hasMultiplePositions ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => g.trades.forEach((t) => handleCloseTrade(t))}
                  className={`
                    ${hasMultiplePositions 
                      ? "w-8 h-8 p-0 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30" 
                      : "w-8 h-8 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500"
                    }
                  `}
                  title={hasMultiplePositions ? "Close All Positions" : "Close Position"}
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
                          ? "bg-blue-500 hover:bg-blue-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {trade.type?.toUpperCase() || "UNKNOWN"}
                    </span>
                    {/* Only show hedged badge for truly hedged positions */}
                    {isTradeHedged && (
                      <span className="px-2 py-1 rounded-full border border-blue-400 text-blue-400 bg-blue-500/10 text-xs font-semibold transition-all ml-1 hover:bg-blue-500/20">
                        H
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-white text-gray-800 text-xs hover:bg-gray-100 transition-all">
                    {Number(trade.lots).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">
                  {Number(trade.open_price).toFixed(decimals)}
                </td>
                <td className="px-4 py-2 text-xs">
                  {Number(currentPrice).toFixed(decimals)}
                </td>
                <td className="px-4 py-2 text-xs">
                  ${Number(trade.margin_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2 text-xs">
                  <span
                    className={`px-2 py-1 rounded-full text-white text-xs font-semibold transition-all ${
                      trade.leverage <= 20
                        ? "bg-green-500 hover:bg-green-600"
                        : trade.leverage <= 500
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    1:{trade.leverage}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">
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
                      <span className={individualPnL >= 0 ? "text-green-500" : "text-red-500"}>
                        ${individualPnL.toFixed(2)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-2 text-xs">
                  {trade.status === "open" && (
                    <div
                      onClick={() => handleCloseTrade(trade)}
                      className="w-6 h-6 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center cursor-pointer"
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
            <h2 className="text-xl font-semibold">Trading Activity</h2>
          </div>
        )}
      
        {/* Tabs for open, pending, and closed */}
        <div 
          className={`flex items-center ${fullPage ? "px-4 py-2" : "bg-muted/20 border-b border-border/50 px-4"}`}
          style={fullPage ? {} : { minHeight: 44, height: 44, paddingTop: 6, paddingBottom: 6 }}
        >
          <div className="flex gap-2">
            <Button
              variant={activeTradeTab === "open" ? "default" : "outline"}
              onClick={() => handleTabChange("open")}
              className={`flex items-center gap-1 ${fullPage ? "text-xs h-8 px-3" : "h-8 text-sm px-4"}`}
            >
              Open
              <span className={`ml-1 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold`}>{openCount}</span>
            </Button>
            <Button
              variant={activeTradeTab === "pending" ? "default" : "outline"}
              onClick={() => handleTabChange("pending")}
              className={`flex items-center gap-1 ${fullPage ? "text-xs h-8 px-3" : "h-8 text-sm px-4"}`}
            >
              Pending
              <span className={`ml-1 bg-yellow-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold`}>{pendingCount}</span>
            </Button>
            <Button
              variant={activeTradeTab === "closed" ? "default" : "outline"}
              onClick={() => handleTabChange("closed")}
              className={`flex items-center gap-1 ${fullPage ? "text-xs h-8 px-3" : "h-8 text-sm px-4"}`}
            >
              Closed
              <span className={`ml-1 bg-gray-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold`}>{closedCount}</span>
            </Button>
          </div>
          
          {/* Expand/Collapse All button - only show in desktop mode */}
          {hasExpandableTrades && !fullPage && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-8 text-xs flex items-center gap-1"
              onClick={() => toggleAllGroups(!anyExpanded)}
              title={anyExpanded ? "Collapse All" : "Expand All"}
            >
              {anyExpanded ? (
                <>
                  <ChevronsUp size={14} />
                  <span className="hidden sm:inline">Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronsDown size={14} />
                  <span className="hidden sm:inline">Expand All</span>
                </>
              )}
            </Button>
          )}
          
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
                    ? "text-green-500"
                    : (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) < 0
                    ? "text-red-500"
                    : "text-gray-400"
                }`}
              >
                ${(activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL).toFixed(2)}
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
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="9" width="12" height="2" rx="1" fill="currentColor"/>
                <rect x="9" y="4" width="2" height="12" rx="1" fill="currentColor"/>
              </svg>
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
                    ? "text-green-500"
                    : (activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL) < 0
                    ? "text-red-500"
                    : "text-gray-400"
                }`}
              >
                ${(activeTradeTab === "closed" ? totalClosedPnL : totalOpenPnL).toFixed(2)}
              </span>
            </div>
            
            {/* Close All button - only show for open trades with positions */}
            {activeTradeTab === "open" && openTrades && openTrades.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openTrades.forEach(trade => handleCloseTrade(trade))}
                className="h-9 px-3 gap-1 text-xs"
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
              }}
            >
              <table className="w-full text-left border-collapse">
                <thead className="top-0 bg-muted/30 sticky">
                  {activeTradeTab === "closed" ? (
                    <tr>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>Pair</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>Type</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>Lots</th>
                      {!fullPage && (
                        <>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Open Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Close Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Margin</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Leverage</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Closed At</th>
                        </>
                      )}
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>P&L</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>Pair</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>Type</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>Lots</th>
                      {!fullPage && (
                        <>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Open Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Current Price</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Margin</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Leverage</th>
                          <th className="px-4 py-2 font-medium text-sm text-muted-foreground">Opened At</th>
                        </>
                      )}
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>P&L</th>
                      <th className={`px-4 py-2 font-medium ${fullPage ? "text-xs" : "text-sm"} text-muted-foreground`}>Action</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {activeTradeTab === "closed" ? (
                    closedTrades && closedTrades.length > 0 && fullPage ? (
                      <tr>
                        <td colSpan={4} className="p-0 border-0">
                          <div className="flex flex-col gap-1 py-2">
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
                                    
                                    <span className={`font-bold text-base ${isProfitable ? "text-green-500" : "text-red-500"}`}>
                                      {isProfitable ? "+" : ""}${pnl.toFixed(2)}
                                    </span>
                                  </div>
                                  
                                  {/* Second row: Type badge, lots badge */}
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span
                                      className={`px-2 py-1 rounded-md text-white text-xs font-semibold ${
                                        trade.type?.toLowerCase() === "buy"
                                          ? "bg-blue-500/80"
                                          : "bg-red-500/80"
                                      }`}
                                    >
                                      {trade.type?.toUpperCase() || "UNKNOWN"}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-gray-200 text-gray-800 text-xs font-medium">
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
                                    <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                                      Open: {Number(openPrice).toFixed(decimals)}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-800 text-xs font-medium">
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
                        // If using expandable grouped trades, make the accumulated group rows scrollable
                        <tr>
                          <td colSpan={fullPage ? 5 : 10} className="p-0 border-0">
                            <div className="max-h-[320px] overflow-y-auto">
                              {typeof renderOpenTrades === 'function'
                                ? renderOpenTrades(openTrades)
                                : renderOpenTrades}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        // ...existing code for mobile/fullPage
                        <tr>
                          <td colSpan={5} className="p-0 border-0">
                            <div className="flex flex-col gap-2 py-2">
                              {openTrades.map((trade, idx) => {
                                const currentPrice = localPrices[trade.pair]?.price !== undefined
                                  ? parseFloat(localPrices[trade.pair].price)
                                  : parseFloat(trade.open_price);
                                const openPrice = parseFloat(trade.open_price);
                                
                                // Calculate PnL (simplified from renderExpandableTrades)
                                let livePnL = 0;
                                let pipSize = 0.0001;
                                let lotSize = 100000;
                                
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
                                const formattedPnL = livePnL.toFixed(2);
                                const isProfitable = livePnL >= 0;

                                // Check if this trade is part of a hedged pair
                                const tradeType = trade.type?.toLowerCase();
                                const isHedged = openTrades.some(t => 
                                  t.pair === trade.pair && 
                                  t.type?.toLowerCase() !== tradeType &&
                                  t.id !== trade.id
                                );

                                return (
                                  <div key={`open-${trade.id || idx}`} className="px-3 py-4 mx-2 mb-2 mt-2 border border-border/60 rounded-lg last:mb-0 bg-muted/5 shadow-sm hover:bg-muted/10 transition-colors">
                                    {/* First row: Icon, Pair name and PnL with close button */}
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
                                      
                                      <div className="flex items-center gap-2">
                                        <span className={`font-bold text-base ${isProfitable ? "text-green-500" : "text-red-500"}`}>
                                          {isProfitable ? "+" : ""}${formattedPnL}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleCloseTrade(trade)}
                                          className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500"
                                        >
                                          <X size={16} />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Second row: Type badge, lots badge, prices */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                      <span
                                        className={`px-2 py-1 rounded-md text-white text-xs font-semibold ${
                                          trade.type?.toLowerCase() === "buy"
                                            ? "bg-blue-500/80"
                                            : "bg-red-500/80"
                                        }`}
                                      >
                                        {trade.type?.toUpperCase() || "UNKNOWN"}
                                      </span>
                                      {isHedged && (
                                        <span className="px-2 py-1 rounded-md border border-blue-400 text-blue-400 bg-blue-500/10 text-xs font-semibold">
                                          H
                                        </span>
                                      )}
                                      <span className="px-2 py-1 rounded-md bg-gray-200 text-gray-800 text-xs font-medium">
                                        {Number(trade.lots).toFixed(2)} lot{Number(trade.lots) !== 1 ? 's' : ''}
                                      </span>
                                      <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                                        O: {Number(openPrice).toFixed(decimals)}
                                      </span>
                                      <div className="flex-grow"></div>
                                      <span className="px-2 py-1 rounded-md bg-green-50 text-green-800 text-xs font-medium">
                                        {Number(currentPrice).toFixed(decimals)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))
                    :
                      // Fix here: Call renderOpenTrades as a function if it is one, otherwise use it directly
                      typeof renderOpenTrades === 'function' ? null : renderOpenTrades || (
                        <tr>
                          <td colSpan={fullPage ? 5 : 10} className="text-center py-8 text-muted-foreground">
                            No open trades
                          </td>
                        </tr>
                      )
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
                                    ? "bg-blue-500 hover:bg-blue-600"
                                    : "bg-red-500 hover:bg-red-600"
                                }`}
                              >
                                {trade.type?.toUpperCase() || "UNKNOWN"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-1 rounded-full bg-white text-gray-800 text-xs font-semibold">
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
                  className={`${fullPage ? "px-3 py-1 text-xs" : "px-4 py-2"} bg-muted/30 rounded-lg text-sm font-medium hover:bg-muted/40 disabled:opacity-50`}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className={`${fullPage ? "text-xs" : "text-sm"} font-medium text-muted-foreground`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className={`${fullPage ? "px-3 py-1 text-xs" : "px-4 py-2"} bg-muted/30 rounded-lg text-sm font-medium hover:bg-muted/40 disabled:opacity-50`}
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
        <div className="flex justify-between w-full gap-4 text-sm font-medium mb-2 border-t border-border/50 pt-4">
          <div className="flex-1 text-center">
            Equity: <span className="font-bold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
          </div>
          <div className="flex-1 text-center text-gray-400">
            Used Margin: <span className="font-bold">${usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex-1 text-center text-gray-400">
            Free Margin: 
            <span className={`font-bold flex items-center justify-center gap-1 transition-colors ${
              freeMarginChange === 'increase' ? 'text-green-500' : 
              freeMarginChange === 'decrease' ? 'text-red-500' : ''
            }`}>
              ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })
              }
              {freeMarginChange && (
                <span className={`text-xs ${freeMarginChange === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                  {freeMarginChange === 'increase' ? '↑' : '↓'}
                </span>
              )}
            </span>
          </div>
          <div className="flex-1 text-center text-gray-400">
            Margin Level: 
            <span className={`font-bold flex items-center justify-center gap-1 transition-colors ${
              marginLevelChange === 'increase' ? 'text-green-500' : 
              marginLevelChange === 'decrease' ? 'text-red-500' : ''
            }`}>
              {usedMargin > 0 ? marginLevel.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "100.00"}%
              {marginLevelChange && (
                <span className={`text-xs ${marginLevelChange === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                  {marginLevelChange === 'increase' ? '↑' : '↓'}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      
      {/* Mobile summary stats at bottom of full page view */}
      {fullPage && (
        <div className="fixed bottom-0 left-0 w-full z-50 grid grid-cols-2 gap-2 p-4 bg-muted/5 border-t border-border/50 mb-12">
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
              freeMarginChange === 'increase' ? 'text-green-500' : 
              freeMarginChange === 'decrease' ? 'text-red-500' : ''
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
              marginLevelChange === 'increase' ? 'text-green-500' : 
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


export default ActivityPanel;