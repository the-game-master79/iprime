import React, { useEffect, useRef, memo } from 'react';
import { useBreakpoints } from "@/hooks/use-breakpoints";

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "light" | "dark";
}

function TradingViewWidget({ symbol, theme = "dark" }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoints();

  useEffect(() => {
    // Clean up any existing content
    if (container.current) {
      const existingWidget = container.current.querySelector('script');
      if (existingWidget) {
        existingWidget.remove();
      }
      container.current.innerHTML = '';
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": symbol,
        "interval": "1",
        "timezone": "Etc/UTC",
        "theme": theme,
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "hide_top_toolbar": isMobile,
        "hide_symbol": isMobile,
        "hide_legend": isMobile,
        "save_image": false,
        "calendar": false,
        "hide_volume": false,
        "support_host": "https://www.tradingview.com",
        "container_id": "tradingview_chart",
        "hide_side_toolbar": isMobile,
        "withdateranges": false,
        "details": false,
        "hotlist": false,
        "width": "100%",
        "height": "100%"
      });

      container.current.appendChild(script);
    }

    // Cleanup function
    return () => {
      if (container.current) {
        const existingWidget = container.current.querySelector('script');
        if (existingWidget) {
          existingWidget.remove();
        }
        container.current.innerHTML = '';
      }
    };
  }, [theme, isMobile, symbol]); // Add symbol to dependencies

  return (
    <div className="tradingview-widget-container flex flex-col h-full w-full relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" ref={container}>
      <div 
        id="tradingview_chart" 
        className="flex-1 w-full overflow-hidden"
        style={{ height: "calc(100% - 28px)" }}
      />
      <div className="tradingview-widget-copyright h-7 px-3 flex items-center justify-end text-xs text-muted-foreground/80 bg-background/50 backdrop-blur-sm">
        <a 
          href="https://www.tradingview.com/" 
          rel="noopener nofollow" 
          target="_blank"
          className="hover:text-primary transition-colors duration-200"
        >
          Track all markets on TradingView
        </a>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
