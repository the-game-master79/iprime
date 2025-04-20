import { PageTransition } from "@/components/ui-components";
import { Lightning, TrendUp, ChartLineUp, Globe } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Companies } from "@/components/shared/Companies";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/shared/SEO";

interface TradingPair {
  symbol: string;
  name: string;
  short_name: string;
  type: 'crypto' | 'forex';
  pip_value: number;
  min_lots: number;
  max_lots: number;
  min_leverage: number;
  max_leverage: number;
  image_url: string;
  is_active: boolean;
}

const TradingPage = () => {
  const { isMobile } = useBreakpoints();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTradingPairs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('trading_pairs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setTradingPairs(data);
      } catch (error) {
        console.error('Error fetching trading pairs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradingPairs();
  }, []);

  const filteredPairs = tradingPairs.filter(pair => 
    pair.type === activeTab && (
      pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.short_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleTrade = (pair: TradingPair) => {
    if (isMobile) {
      navigate('/trade/select');
    } else {
      navigate(`/trade/${encodeURIComponent(pair.symbol)}`);
    }
  };

  function cn(...classes: string[]): string {
    return classes.filter(Boolean).join(" ");
  }

  return (
    <PageTransition>
      <SEO
        title="Trading Platform"
        description="Access advanced trading tools and AI-powered insights for optimal performance in forex and cryptocurrency markets."
        keywords="forex trading, crypto trading, online trading platform, trading tools, market analysis"
      />
      <div className="relative min-h-screen bg-[#F3F4F6]">
        {/* Update Magic Gradient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-slower" 
            style={{ animation: 'pulse-gradient 8s ease-in-out infinite' }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse-slowest"
            style={{ animation: 'pulse-gradient 12s ease-in-out infinite' }}
          />
        </div>

        {/* Make content position relative and increase z-index */}
        <div className="relative z-[1]">
          <Navbar />
          <main>
            <Hero 
              badge={{
                icon: <Lightning className="h-5 w-5 animate-pulse" />,
                text: "Professional Trading"
              }}
              title="Trade Like a Pro"
              description="Access advanced trading tools and features for optimal performance."
              action={{
                text: "Start Trading",
                href: "/auth/login"
              }}
            />

            <Companies />

            {/* Trading Pairs Section */}
            <section className="py-16 md:py-24">
              <div className="container max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold tracking-tight mb-4">Available Markets</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Trade a wide range of cryptocurrencies and forex pairs with competitive spreads and advanced tools
                  </p>
                </div>

                {/* Double border nested container */}
                <div className="bg-white p-2 rounded-xl border shadow-sm">
                  <div className="border rounded-xl p-6">
                    <div className="flex flex-col space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                          <Input
                            placeholder="Search markets..."
                            className="pl-9 max-w-md"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Tabs defaultValue="crypto" className="w-full sm:w-auto" onValueChange={setActiveTab}>
                          <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                            <TabsTrigger value="crypto" className="flex items-center gap-2">
                                <ChartLineUp className="h-4 w-4" />
                                Cryptocurrency
                            </TabsTrigger>
                            <TabsTrigger value="forex" className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Forex
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Update pairs count display */}
                      <div className="flex justify-between items-center">
                        <div className="flex-1" /> {/* Spacer */}
                        <h3 className="text-lg font-bold">
                          {filteredPairs.length} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Pairs
                        </h3>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                      {isLoading ? (
                        <div className="col-span-full flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredPairs.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          No trading pairs found
                        </div>
                      ) : (
                        filteredPairs.map((pair) => (
                          <div
                            key={pair.symbol}
                            onClick={() => handleTrade(pair)}
                            className="group relative overflow-hidden flex flex-col p-4 rounded-xl border bg-white hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                          >
                            {/* Decorative gradient background */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                            </div>

                            {/* Content wrapper */}
                            <div className="relative space-y-1">
                              {/* Header with icon and main info */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-slow" />
                                    <div className="relative bg-white p-1.5 rounded-full shadow-sm">
                                      <img 
                                        src={pair.image_url || `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png`}
                                        alt={pair.name}
                                        className="h-8 w-8"
                                        onError={(e) => {
                                          e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-lg">{pair.name}</div>
                                    <div className="text-sm text-muted-foreground font-medium">{pair.short_name}</div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                  {pair.max_leverage}x
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Rest of the trading page content */}
          </main>

          <Footer />
        </div>
      </div>
    </PageTransition>
  );
};

export default TradingPage;
