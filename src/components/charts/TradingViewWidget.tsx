import React, { useEffect, useRef, memo } from 'react';
import { useBreakpoints } from "@/hooks/use-breakpoints";

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "light" | "dark";
  variant?: "full" | "minimal";  // Add variant prop
}

function TradingViewWidget({ symbol, theme = "dark", variant = "full" }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoints();

  useEffect(() => {
    const initWidget = () => {
      if (!container.current) return;

      // Clean up any existing content
      const existingWidget = container.current.querySelector('script');
      if (existingWidget) {
        existingWidget.remove();
      }

      // Important: Don't clear innerHTML here to prevent container being removed
      // Create the container div if it doesn't exist
      let containerDiv = container.current.querySelector('#tradingview_chart');
      if (!containerDiv) {
        containerDiv = document.createElement('div');
        containerDiv.id = 'tradingview_chart';
        containerDiv.className = 'flex-1 w-full overflow-hidden';
        containerDiv.style.height = 'calc(100% - 28px)';
        container.current.appendChild(containerDiv);
      }
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;

      // Configure based on variant
      const config = {
        "autosize": true,
        "symbol": symbol,
        "interval": "1",
        "timezone": "Etc/UTC",
        "theme": theme,
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "calendar": false,
        "container_id": "tradingview_chart",
        ...(variant === "minimal" ? {
          // Minimal variant settings
          "hide_top_toolbar": true,
          "hide_legend": true,
          "hide_side_toolbar": true,
          "hide_volume": true,
          "hide_symbol": true,
          "allow_symbol_change": false,
          "save_image": false,
          "details": false,
          "hotlist": false,
          "show_popup_button": false,
          "withdateranges": false,
          "toolbar_bg": "#000000",
          "disabled_features": [
            "use_localstorage_for_settings",
            "volume_force_overlay",
            "create_volume_indicator_by_default",
            "header_compare",
            "header_symbol_search",
            "header_fullscreen_button",
            "header_settings",
            "header_chart_type",
            "header_resolutions",
            "drawing_tools",
            "timeframes_toolbar",
            "legend_widget",
            "main_series_scale_menu",
            "scales_context_menu",
            "show_chart_property_page",
            "symbol_search_hot_key",
            "context_menus",
            "left_toolbar",
            "control_bar",
            "edit_buttons_in_legend",
            "border_around_the_chart"
          ],
          "overrides": {
            "mainSeriesProperties.showPriceLine": false,
            "paneProperties.background": "#000000",
            "paneProperties.vertGridProperties.color": "#1e1e1e",
            "paneProperties.horzGridProperties.color": "#1e1e1e",
            "scalesProperties.textColor": "#AAA"
          }
        } : {
          // Updated full variant settings
          "hide_top_toolbar": false,
          "hide_legend": false,
          "hide_side_toolbar": false,
          "hide_volume": false,
          "details": false, // Changed to false
          "allow_symbol_change": false,
          "save_image": true,
          "show_popup_button": true,
          "withdateranges": true,
          "disabled_features": [
            "use_localstorage_for_settings",
            "header_symbol_search",
            "symbol_info",
            "header_compare",
            "header_settings"
          ]
        })
      };

      script.innerHTML = JSON.stringify(config);
      container.current.appendChild(script);
    };

    // Initialize after a short delay to ensure DOM is ready
    const timer = setTimeout(initWidget, 0);

    return () => {
      clearTimeout(timer);
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [theme, isMobile, symbol, variant]); // Add variant to dependencies

  return (
    <div className="tradingview-widget-container flex flex-col h-full w-full relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" ref={container}>
      <div id="tradingview_chart" className="flex-1 w-full overflow-hidden" style={{ height: "calc(100% - 28px)" }} />
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
