import React, { useEffect, useRef, memo, useState } from 'react';
import { useTheme } from "@/hooks/use-theme"; // Add this import

// Define allowed props for the TradingView widget
interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
  timezone?: string;
  theme?: 'light' | 'dark';
  style?: string;
  locale?: string;
  hide_legend?: boolean;
  allow_symbol_change?: boolean;
  totalPnL?: number; // Add PnL prop
  onClosePnLDisplay?: () => void; // Add close handler
  closeAllTrades?: () => void; // Add new prop for closing all trades
}

// Default props if not provided
const defaultProps = {
  symbol: "CMCMARKETS:EURUSD",
  interval: "1",
  timezone: "Etc/UTC",
  theme: "dark" as const,
  style: "1",
  locale: "en",
  hide_legend: true,
  allow_symbol_change: false,
};

function TradingViewWidget({
  symbol,
  interval,
  timezone,
  theme,
  style,
  locale,
  hide_legend,
  allow_symbol_change,
  totalPnL,
  onClosePnLDisplay,
  closeAllTrades,
}: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [showPnL, setShowPnL] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const { theme: userTheme } = useTheme(); // Add this line

  // Combine default props with provided props
  const {
    symbol: defaultSymbol,
    interval: defaultInterval,
    timezone: defaultTimezone,
    theme: defaultTheme,
    style: defaultStyle,
    locale: defaultLocale,
    hide_legend: defaultHideLegend,
    allow_symbol_change: defaultAllowSymbolChange,
  } = { ...defaultProps, ...{
    symbol,
    interval,
    timezone,
    // theme,
    theme: userTheme === "dark" ? "dark" : "light", // Use user theme
    style,
    locale,
    hide_legend,
    allow_symbol_change,
  }};

  // Clean up function
  const cleanupWidget = () => {
    if (scriptRef.current && scriptRef.current.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current);
      scriptRef.current = null;
    }
    
    if (container.current) {
      while (container.current.firstChild) {
        container.current.removeChild(container.current.firstChild);
      }
    }
  };

  useEffect(() => {
    // First clean up any existing widget
    cleanupWidget();
    setIsWidgetReady(false);

    if (container.current) {
      try {
        // Create container divs with a more structured approach
        const widgetContainer = document.createElement("div");
        widgetContainer.className = "tradingview-widget-container__widget";
        widgetContainer.style.height = "calc(100% - 32px)";
        widgetContainer.style.width = "100%";
        
        // Clear container before appending
        while (container.current.firstChild) {
          container.current.removeChild(container.current.firstChild);
        }
        
        // Append elements to the DOM first
        container.current.appendChild(widgetContainer);
        
        // Ensure DOM is updated before loading script
        setTimeout(() => {
          if (!container.current || !widgetContainer) {
            console.error("Container or widget container not available");
            return;
          }
          
          // Create and add script
          const script = document.createElement("script");
          script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
          script.type = "text/javascript";
          script.async = true;
          
          // Set configuration as a string
          const config = {
            autosize: true,
            symbol: defaultSymbol,
            interval: defaultInterval,
            timezone: defaultTimezone,
            theme: defaultTheme,
            style: defaultStyle,
            locale: defaultLocale,
            hide_legend: true, // Hide legend
            allow_symbol_change: false, // Disable symbol change
            save_image: false,
            support_host: "https://www.tradingview.com",
            details: false, // Hide details
            withdateranges: false, // Hide date ranges
            hide_top_toolbar: false, // Show top toolbar
            hide_side_toolbar: true, // Hide side toolbar
            hide_ideas: true, // Hide ideas
            hide_volume: false, // Show volume
            studies: ["Volume@tv-basicstudies"], // Show volume indicator
            hide_symbol_logo: true, // Hide symbol logo
            hide_indicators: false, // Allow indicators (but only volume is shown)
            hide_market_status: true, // Hide market status
            hide_settings: true, // Hide settings button
            hide_symbol_search: true, // Hide symbol search
            hide_compare: true, // Hide compare button
            hide_news: true, // Hide news
            hide_calendar: true, // Hide calendar
            hide_screenshot: true, // Hide screenshot button
            hide_alerts: true, // Hide alerts
            container_id: "tradingview-widget-container"
          };
          
          script.innerHTML = JSON.stringify(config);
          
          // Set an onload event to track when the widget is ready
          script.onload = () => {
            setIsWidgetReady(true);
          };
          
          // Store reference to script for cleanup
          scriptRef.current = script;
          
          // Add script to the widget container specifically
          widgetContainer.appendChild(script);
        }, 100);
      } catch (error) {
        console.error("Error initializing TradingView widget:", error);
      }
    }
    
    // Cleanup function
    return () => {
      cleanupWidget();
    };
  }, [defaultSymbol, defaultInterval, defaultTimezone, defaultTheme, defaultStyle, defaultLocale, defaultHideLegend, defaultAllowSymbolChange]);

  // Handle PnL display close
  const handleClose = () => {
    setShowPnL(false);
    if (onClosePnLDisplay) {
      onClosePnLDisplay();
    }
  };
  
  // New handler to show confirmation dialog instead of directly closing trades
  const handleCloseAllTrades = () => {
    setShowConfirmDialog(true);
  };
  
  // Handle confirmation
  const handleConfirm = () => {
    setShowConfirmDialog(false);
    if (closeAllTrades) {
      // Call closeAllTrades directly without any browser confirmation
      closeAllTrades();
    }
  };
  
  // Handle dialog cancellation
  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div
      key={`${userTheme}-${symbol || ''}`}
      style={{ position: "relative", height: "100%", width: "100%" }}
    >
      {/* PnL display rendered outside the TradingView container */}
      {showPnL && totalPnL !== undefined && (
        <div 
          className="absolute top-0 right-0 z-50 flex mt-2 items-center"
          style={{ pointerEvents: "auto" }}
        >
          <span 
            className={`font-bold font-mono text-xs px-2 py-1 ${
              totalPnL > 0
                ? "text-green-500"
                : totalPnL < 0
                ? "text-red-500"
                : "text-gray-400"
            }`}
          >
            {totalPnL.toFixed(2)} USD
          </span>
        </div>
      )}
      
      {/* Custom confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium mb-4">Close All Positions</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to close all open positions? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm font-medium transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
                type="button"
              >
                Close All
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create a proper container structure for TradingView */}
      <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
        {/* Widget will be mounted here */}
      </div>
    </div>
  );
}

// Declare TradingView on Window object
declare global {
  interface Window {
    TradingView: any;
  }
}

export default memo(TradingViewWidget);
