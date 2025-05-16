import { useEffect, useRef, useState } from "react";

interface MiniChartProps {
  symbol: string;
  timezone: string;
}

const MiniChart = ({ symbol, timezone }: MiniChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [tradingViewLoaded, setTradingViewLoaded] = useState(false);
  
  // Load TradingView script first
  useEffect(() => {
    if (window.TradingView) {
      setTradingViewLoaded(true);
      return;
    }
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => setTradingViewLoaded(true);
    
    document.head.appendChild(script);
    
    return () => {
      // Don't remove the TradingView script on unmount as other components might use it
    };
  }, []);
  
  // Create chart only after TradingView is loaded
  useEffect(() => {
    if (!tradingViewLoaded || !containerRef.current || !symbol) return;
    
    // Remove existing chart if any
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    
    // Generate a stable ID for the container
    const containerId = containerRef.current.id;
    
    // Use setTimeout to ensure the DOM has updated
    setTimeout(() => {
      try {
        // Create new TradingView widget directly instead of using script
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: "15",
          timezone: timezone,
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          hide_top_toolbar: true,
          hide_side_toolbar: true,
          allow_symbol_change: false,
          container_id: containerId
        });
      } catch (error) {
        console.error("Error creating TradingView widget:", error);
      }
    }, 0);
    
    // No need to clean up with this approach
  }, [symbol, timezone, tradingViewLoaded]);
  
  // Generate a stable ID for the container
  const uniqueId = useRef(`tradingview-mini-widget-${Math.random().toString(36).substring(2, 9)}`).current;
  
  return (
    <div 
      id={uniqueId}
      className="w-full h-full" 
      ref={containerRef}
    >
      {!tradingViewLoaded && (
        <div className="w-full h-full flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Add type definition for TradingView
declare global {
  interface Window {
    TradingView: any;
  }
}

export default MiniChart;
