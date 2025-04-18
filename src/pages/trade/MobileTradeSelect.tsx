import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { Search, CandlestickChart, Globe, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const TRADING_PAIRS = {
  crypto: [
    { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', shortName: 'BTC' },
    { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', shortName: 'ETH' },
    { symbol: 'BINANCE:SOLUSDT', name: 'Solana', shortName: 'SOL' },
    { symbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin', shortName: 'DOGE' },
    { symbol: 'BINANCE:ADAUSDT', name: 'Cardano', shortName: 'ADA' },
    { symbol: 'BINANCE:BNBUSDT', name: 'BNB', shortName: 'BNB' },
    { symbol: 'BINANCE:DOTUSDT', name: 'Polkadot', shortName: 'DOT' },
    { symbol: 'BINANCE:TRXUSDT', name: 'TRON', shortName: 'TRX' }
  ],
  forex: [
    { symbol: 'FX:EUR/USD', name: 'EUR/USD', shortName: 'EURUSD' },
    { symbol: 'FX:USD/JPY', name: 'USD/JPY', shortName: 'USDJPY' },
    { symbol: 'FX:GBP/USD', name: 'GBP/USD', shortName: 'GBPUSD' },
    { symbol: 'FX:AUD/USD', name: 'AUD/USD', shortName: 'AUDUSD' },
    { symbol: 'FX:USD/CAD', name: 'USD/CAD', shortName: 'USDCAD' },
    { symbol: 'FX:USD/CHF', name: 'USD/CHF', shortName: 'USDCHF' },
    { symbol: 'FX:GBP/JPY', name: 'GBP/JPY', shortName: 'GBPJPY' },
    { symbol: 'FX:EUR/JPY', name: 'EUR/JPY', shortName: 'EURJPY' },
    { symbol: 'FX:EUR/GBP', name: 'EUR/GBP', shortName: 'EURGBP' },
    { symbol: 'FX:EUR/CHF', name: 'EUR/CHF', shortName: 'EURCHF' }
  ]
};

const MobileTradeSelect = () => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoints();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");

  // Redirect to desktop version if not mobile
  if (!isMobile) {
    return <Navigate to="/trade" />;
  }

  const filteredPairs = TRADING_PAIRS[activeTab as keyof typeof TRADING_PAIRS]
    .filter(pair => 
      pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.shortName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center px-4 h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <h1 className="font-medium">Select Market</h1>
      </header>

      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search markets..."
            className="pl-9 h-9 text-sm bg-muted/30 border-0 focus-visible:ring-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="crypto" className="flex-1 flex flex-col">
        <TabsList className="h-11 p-1 bg-muted/30 border-b">
          <TabsTrigger value="crypto" onClick={() => setActiveTab("crypto")} className="flex-1 text-xs">
            <CandlestickChart className="h-3.5 w-3.5 mr-2" />
            Crypto
          </TabsTrigger>
          <TabsTrigger value="forex" onClick={() => setActiveTab("forex")} className="flex-1 text-xs">
            <Globe className="h-3.5 w-3.5 mr-2" />
            Forex
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {filteredPairs.map((pair) => {
              const symbol = pair.symbol.includes('BINANCE:') 
                ? pair.symbol.replace('BINANCE:', '').replace('USDT', '').toLowerCase()
                : null;
                
              return (
                <Button
                  key={pair.symbol}
                  variant="ghost"
                  className="w-full justify-between h-14 px-3"
                  onClick={() => navigate(`/trade/${encodeURIComponent(pair.symbol)}`)}
                >
                  <div className="flex items-center gap-3">
                    {pair.symbol.includes('BINANCE:') ? (
                      <img 
                        src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${symbol}.png`}
                        alt={pair.name}
                        className="h-8 w-8"
                        onError={(e) => {
                          e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                        }}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-left">{pair.name}</div>
                      <div className="text-xs text-muted-foreground">{pair.shortName}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default MobileTradeSelect;
