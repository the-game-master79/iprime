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
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TRADING_PAIRS } from "@/pages/trade/tradingPairs"; 

const TradingPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");

  const filteredPairs = TRADING_PAIRS[activeTab as keyof typeof TRADING_PAIRS].filter(pair =>
    pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pair.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F3F4F6]">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <Navbar />

        <main className="relative z-10">
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

              <div className="bg-white border rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
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

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPairs.map((pair) => (
                    <div
                      key={pair.symbol}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {pair.symbol.includes('BINANCE:') ? (
                          <img
                            src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${pair.shortName.toLowerCase()}.png`}
                            alt={pair.name}
                            className="h-8 w-8"
                            onError={(e) => {
                              e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                            }}
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <TrendUp className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{pair.name}</div>
                          <div className="text-sm text-muted-foreground">{pair.shortName}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="hover:bg-primary/10">
                        Trade
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* Rest of the trading page content */}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default TradingPage;
