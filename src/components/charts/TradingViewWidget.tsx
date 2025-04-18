import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "light" | "dark";
}

function TradingViewWidget({ symbol, theme = "light" }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

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
        "timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
        "theme": theme,
        "style": "1",
        "locale": "en",
        "hide_legend": true,
        "hide_side_toolbar": false,
        "enable_publishing": false,
        "allow_symbol_change": true,
        "save_image": false,
        "support_host": "https://www.tradingview.com",
        "container_id": "tradingview_chart"
      });

      container.current.appendChild(script);
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <div className="tradingview-widget-container w-full h-full relative" ref={container}>
      <div 
        id="tradingview_chart" 
        className="absolute inset-0"
      />
    </div>
  );
}

export default memo(TradingViewWidget);
