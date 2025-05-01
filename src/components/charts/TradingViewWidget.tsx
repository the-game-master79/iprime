import React, { useEffect, useRef, memo } from 'react';
import { useBreakpoints } from "@/hooks/use-breakpoints";

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "light" | "dark";
}

function TradingViewWidget({ symbol, theme = "light" }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoints();

  useEffect(() => {
    if (container.current) {
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

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, theme, isMobile]);

  return (
    <div className="tradingview-widget-container flex flex-col h-full w-full relative" ref={container}>
      <div 
        id="tradingview_chart" 
        className="flex-1 w-full"
        style={{ height: "calc(100% - 32px)" }}
      />
      <div className="tradingview-widget-copyright h-8 px-2 flex items-center text-xs text-muted-foreground">
        <a 
          href="https://www.tradingview.com/" 
          rel="noopener nofollow" 
          target="_blank"
          className="hover:text-primary"
        >
          Track all markets on TradingView
        </a>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
