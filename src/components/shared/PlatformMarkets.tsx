import React, { useEffect, useState, useMemo } from "react";
import { motion } from 'framer-motion';
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { cn } from "@/lib/utils";

// Update TradingViewWidget to hide all but the chart
const TradingViewWidget: React.FC<{ symbol: string }> = ({ symbol }) => (
  <iframe
    src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=15&theme=light&style=1&hide_top_toolbar=1&hide_legend=1&hide_side_toolbar=1&withdateranges=0&saveimage=0&studies=[]&show_popup_button=0&hideideas=1&toolbar_bg=white`}
    style={{ width: "100%", height: 320, border: 0 }}
    allowFullScreen
    title="TradingView Chart"
  />
);

interface MarketItemProps {
  symbol: string;
  name?: string;
  price: string;
  isPriceUp?: boolean;
  image_url?: string;
  isForex?: boolean;
  marketClosed?: boolean;
}

const MarketItem = React.forwardRef<HTMLDivElement, MarketItemProps>(({
  symbol,
  name,
  price,
  isPriceUp,
  image_url,
  isForex = false,
  marketClosed = false
}, ref) => {
  const priceChangeClass = isPriceUp ? 'text-green-600' : 'text-red-600';
  const bgColor = isPriceUp ? 'bg-green-50' : isPriceUp === false ? 'bg-red-50' : 'bg-gray-50';
  const arrow = isPriceUp ? '↑' : '↓';
  
  return (
    <div 
      ref={ref}
      className={`flex items-center ${bgColor} rounded-xl px-4 py-2.5 mx-2 shadow-sm min-w-[220px] hover:shadow-md transition-all duration-200 border border-gray-100`}
    >
      {image_url ? (
        <img 
          src={image_url} 
          alt={symbol} 
          className="w-8 h-8 mr-3"
          onError={(e) => {
            // Fallback to showing the first letter if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'w-8 h-8 mr-3 bg-gray-100 flex items-center justify-center text-gray-500';
            fallback.textContent = symbol.charAt(0);
            target.parentNode?.insertBefore(fallback, target.nextSibling);
          }}
        />
      ) : (
        <div className="w-8 h-8 mr-3 bg-gray-100 flex items-center justify-center text-gray-500">
          {symbol.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900 truncate">
            {isForex ? symbol.replace('/', '') : symbol}
          </span>
          <span className={`ml-2 font-bold ${priceChangeClass} text-sm`}>
            {price} {!marketClosed && arrow}
          </span>
        </div>
        {name && <div className="text-xs text-gray-500 truncate mt-0.5">{name}</div>}
      </div>
    </div>
  );
});

MarketItem.displayName = 'MarketItem';

const MarqueeRow: React.FC<{ items: React.ReactNode[]; reverse?: boolean; delay?: number }> = ({
  items,
  reverse = false,
  delay = 0,
}) => {
  // Duplicate items for seamless looping
  const duplicatedItems = [...items, ...items, ...items, ...items];
  // Adjust content width based on screen size
  const [contentWidth, setContentWidth] = useState(items.length * 240); // Default for mobile

  useEffect(() => {
    // Update content width on window resize
    const updateWidth = () => {
      const isMobile = window.innerWidth < 768; // Tailwind's 'md' breakpoint
      setContentWidth(items.length * (isMobile ? 200 : 240));
    };

    // Set initial width
    updateWidth();
    
    // Add event listener for window resize
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [items.length]);
  
  return (
    <div className="relative overflow-hidden w-full">
      <motion.div 
        className="flex items-center py-2 whitespace-nowrap"
        style={{
          display: 'inline-flex',
          whiteSpace: 'nowrap',
        }}
        initial={{ x: reverse ? '0%' : `-${contentWidth / 2}px` }}
        animate={{ 
          x: reverse ? `-${contentWidth / 2}px` : '0%',
        }}
        transition={{
          duration: window.innerWidth < 768 ? 40 : 50, // Faster on mobile
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
          delay: delay,
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div key={`item-${index}`} className="flex-shrink-0">
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export const PlatformMarkets: React.FC<{
  cryptoData: { symbol: string; image_url: string; name?: string }[];
  forexData: { symbol: string; image_url: string; name?: string }[];
  marketPrices: Record<string, { price: string; bid?: number; ask?: number; isPriceUp?: boolean }>;
  getPriceChangeClass: (isUp?: boolean) => string;
  renderPriceWithBigDigits: (
    value: number | undefined,
    marketClosed?: boolean,
    isUp?: boolean
  ) => React.ReactNode;
  forexMarketOpen: boolean;
  navigate: (path: string) => void;
}> = ({
  cryptoData,
  forexData,
  marketPrices,
  getPriceChangeClass,
  renderPriceWithBigDigits,
  forexMarketOpen,
  navigate,
}) => {
  const [selectedMarket, setSelectedMarket] = useState<string>('BINANCE:BTCUSDT');
  // Prepare crypto market items
  const cryptoItems = useMemo(() => {
    return cryptoData.map((crypto) => {
      const marketData = marketPrices[crypto.symbol] || { price: '0', isPriceUp: false };
      const symbol = `BINANCE:${crypto.symbol.replace('/', '')}`;
      return (
        <div 
          key={`crypto-${crypto.symbol}`}
          onClick={() => setSelectedMarket(symbol)}
          className="cursor-pointer"
        >
          <MarketItem
            symbol={crypto.symbol}
            name={crypto.name}
            price={marketData.price}
            isPriceUp={marketData.isPriceUp}
            image_url={crypto.image_url}
          />
        </div>
      );
    });
  }, [cryptoData, marketPrices]);

  // Prepare forex market items
  const forexItems = useMemo(() => {
    return forexData.map((forex) => {
      const marketData = marketPrices[forex.symbol] || { price: '0', isPriceUp: false };
      const symbol = `FX:${forex.symbol.replace('/', '')}`;
      return (
        <div 
          key={`forex-${forex.symbol}`}
          onClick={() => setSelectedMarket(symbol)}
          className="cursor-pointer"
        >
          <MarketItem
            symbol={forex.symbol}
            name={forex.name}
            price={marketData.price}
            isPriceUp={marketData.isPriceUp}
            image_url={forex.image_url}
            isForex={true}
            marketClosed={!forexMarketOpen}
          />
        </div>
      );
    });
  }, [forexData, marketPrices, forexMarketOpen]);

  // --- Countdown logic for next forex market open ---
  const getForexMarketStatus = () => {
    const now = new Date();
    const utcDay = now.getUTCDay();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    let isOpen = false;
    let nextOpen: Date | null = null;

    if (
      (utcDay > 0 && utcDay < 5) ||
      (utcDay === 5 && utcHour < 21) ||
      (utcDay === 0 && (utcHour > 22 || (utcHour === 22 && utcMinute >= 0)))
    ) {
      isOpen = true;
    } else {
      nextOpen = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0, 0));
      let daysUntilSunday = (7 - utcDay) % 7;
      if (utcDay === 0 && utcHour < 22) {
        // Today is Sunday, before 22:00
      } else {
        nextOpen.setUTCDate(now.getUTCDate() + daysUntilSunday);
      }
      if (utcDay === 0 && utcHour >= 22) {
        nextOpen.setUTCDate(nextOpen.getUTCDate() + 7);
      }
    }
    return { isOpen, nextOpen };
  };

  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!forexMarketOpen) {
      const interval = setInterval(() => {
        const { nextOpen } = getForexMarketStatus();
        if (!nextOpen) {
          setCountdown("");
          clearInterval(interval);
          return;
        }
        const now = new Date();
        const diff = nextOpen.getTime() - now.getTime();
        if (diff <= 0) {
          setCountdown("Market is opening...");
          clearInterval(interval);
        } else {
          const totalSeconds = Math.floor(diff / 1000);
          const days = Math.floor(totalSeconds / (60 * 60 * 24));
          const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
          const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
          const seconds = totalSeconds % 60;
          let formatted = "";
          if (days > 0) {
            formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          } else if (hours > 0) {
            formatted = `${hours}h ${minutes}m ${seconds}s`;
          } else if (minutes > 0) {
            formatted = `${minutes}m ${seconds}s`;
          } else {
            formatted = `${seconds}s`;
          }
          setCountdown(formatted);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [forexMarketOpen]);

  // Separate crypto and forex items for different rows
  const cryptoMarketItems = useMemo(() => cryptoItems, [cryptoItems]);
  const forexMarketItems = useMemo(() => forexItems, [forexItems]);

  const handleViewAllMarkets = () => {
    // Navigate to platform page with view=all query parameter
    navigate('/platform?view=all');
    // Scroll to markets section if we're already on the platform page
    const marketsSection = document.getElementById('markets-section');
    if (marketsSection) {
      marketsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-gray-50 py-4 rounded-xl overflow-hidden">
      {/* Market Status Bar */}
      <div className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center rounded-t-xl">
        <div className="flex items-center space-x-3">
          <span className="font-medium text-lg">Markets</span>
          {!forexMarketOpen && (
            <div className="bg-amber-600/20 text-amber-300 text-xs px-3 py-1 rounded-full">
              <span className="font-medium">Forex Closed</span>: Opens in {countdown}
            </div>
          )}
        </div>
        <InteractiveHoverButton
          onClick={handleViewAllMarkets}
          className="px-4 py-2 text-sm font-medium transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:shadow-lg hover:shadow-blue-500/20"
          dotColor="bg-white"
          hoverTextColor="text-black"
        >
          View All Markets
        </InteractiveHoverButton>
      </div>

      {/* Marquee Rows */}
      <div className="relative bg-white/50 px-2">
        <div className="py-2 space-y-2 overflow-x-hidden">
          <MarqueeRow items={cryptoMarketItems} reverse={false} delay={0} />
          <MarqueeRow items={forexMarketItems} reverse={true} delay={0} />
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-6">
        <div className="mb-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedMarket.includes('BINANCE:') 
                ? `${selectedMarket.replace('BINANCE:', '')} Chart` 
                : `${selectedMarket.replace('FX:', '')} Chart`}
            </h3>
            {selectedMarket.startsWith('FX:') && !forexMarketOpen && (
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Market Closed
              </span>
            )}
          </div>
          <InteractiveHoverButton
            onClick={() => {
              const symbol = selectedMarket.includes('BINANCE:') 
                ? selectedMarket.replace('BINANCE:', '')
                : selectedMarket.replace('FX:', '');
              navigate(`/tradingstation?symbol=${symbol}`);
            }}
            disabled={selectedMarket.startsWith('FX:') && !forexMarketOpen}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all duration-300",
              selectedMarket.startsWith('FX:') && !forexMarketOpen
                ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300"
                : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:shadow-lg hover:shadow-blue-500/20"
            )}
            dotColor={selectedMarket.startsWith('FX:') && !forexMarketOpen ? "bg-gray-400" : "bg-white"}
            hoverTextColor="text-black"
          >
            Trade
          </InteractiveHoverButton>
        </div>
        <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
          <TradingViewWidget symbol={selectedMarket} />
        </div>
      </div>
    </div>
  );
};