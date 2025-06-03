import { Fire } from "@phosphor-icons/react";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";

export const HowItWorks = () => {
  return (
    <section className="my-24">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full bg-card/80 border border-border/30 px-3 py-1 text-sm font-medium text-primary">
              <Fire className="w-4 h-4 mr-1" weight="fill" />
              Getting Started
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">How Our AI Forex Trading Platform Works</h2>
          <p className="text-muted-foreground">
            Getting started with our AI-powered forex trading platform and cryptocurrency trading system is simple. Just follow these three easy steps to begin your investment journey on the leading cloud trading platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative bg-card/80 p-2 rounded-2xl border border-border/30">
            <div className="relative h-full w-full border border-border/20 rounded-xl p-6 overflow-hidden">
              <div className="pt-2 pb-40">
                <div className="inline-flex items-center rounded-full border border-border/30 px-2.5 py-0.5 text-xs font-semibold text-primary mb-3">
                  Deposit
                </div>
                <h3 className="text-lg font-semibold mb-2">Fund Your Account</h3>
                <p className="text-sm text-muted-foreground">
                  Add money to your account quickly and securely. Choose from a variety of trusted payment methods on our secure trading and investment platform.
                </p>
              </div>
              
              {/* Semi-visible Concentric Circles with Logo */}
              <div className="absolute -bottom-[30%] left-1/2 -translate-x-1/2  ">
                <div className="relative w-[300px] h-[300px] flex items-center justify-center ">
                  {/* Center logo */}
                  <div className="absolute z-10 w-[100px] h-[100px] rounded-full border border-border/30 flex items-center justify-center bg-card shadow-lg backdrop-blur-sm">
                    <img 
                      src="/cflogo.svg"
                      alt="CloudForex Logo"
                      className="w-14 h-14"
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                  </div>

                  {/* Outer orbit */}
                  <OrbitingCircles 
                    radius={120} 
                    iconSize={40}
                    speed={0.8}
                    className="bg-card/80 shadow-lg p-2"
                  >
                    <img src="/usdt.svg" alt="USDT" className="w-6 h-6" loading="lazy" decoding="async" fetchPriority="low" />
                    <img src="/eth.svg" alt="ETH" className="w-6 h-6" loading="lazy" decoding="async" fetchPriority="low" />
                    <img src="/eur-gbp.svg" alt="EUR/GBP" className="w-6 h-6" loading="lazy" decoding="async" fetchPriority="low" />
                    <img src="/bnb.svg" alt="BNB" className="w-6 h-6" loading="lazy" decoding="async" fetchPriority="low" />
                  </OrbitingCircles>

                  {/* Inner orbit */}
                  <OrbitingCircles 
                    radius={80} 
                    iconSize={36} 
                    speed={1.2} 
                    reverse
                    className="bg-card/80 shadow-lg p-2"
                  >
                    <img src="/btc.svg" alt="BTC" className="w-5 h-5" loading="lazy" decoding="async" fetchPriority="low" />
                    <img src="/sol.svg" alt="SOL" className="w-5 h-5" loading="lazy" decoding="async" fetchPriority="low" />
                    <img src="/eur-usd.svg" alt="EUR/USD" className="w-5 h-5" loading="lazy" decoding="async" fetchPriority="low" />
                  </OrbitingCircles>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-card/80 p-2 rounded-2xl border border-border/30">
            <div className="h-full w-full border border-border/20 rounded-xl p-6 relative">
            <div className="pt-2 pb-16">
                      <div className="inline-flex items-center rounded-full border border-border/30 px-2.5 py-0.5 text-xs font-semibold text-primary mb-3">
                        Trading
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Execute Trades Seamlessly</h3>
                      <p className="text-sm text-muted-foreground">
                        Access advanced trading tools and AI-powered insights to execute trades across global forex markets.
                      </p>
                    </div>

                    {/* Animated Chart */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full h-32">
                      <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                        {/* Background Grid */}
                        <pattern id="grid" width="15" height="15" patternUnits="userSpaceOnUse">
                          <path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="0.5"/>
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                        
                        {/* Animated Chart Line */}
                        <path
                          d="M0,50 L10,45 L20,55 L30,40 L40,60 L50,45 L60,50 L70,35 L80,55 L90,40 L100,45 L110,35 L120,50 L130,30 L140,45 L150,35 L160,55 L170,40 L180,45 L190,35 L200,50 L210,40 L220,55 L230,45 L240,50 L250,35 L260,45 L270,40 L280,50 L290,45 L300,40"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-draw-line"
                        />
                        
                        {/* Gradient Area Under Chart */}
                        <path
                          d="M0,50 L10,45 L20,55 L30,40 L40,60 L50,45 L60,50 L70,35 L80,55 L90,40 L100,45 L110,35 L120,50 L130,30 L140,45 L150,35 L160,55 L170,40 L180,45 L190,35 L200,50 L210,40 L220,55 L230,45 L240,50 L250,35 L260,45 L270,40 L280,50 L290,45 L300,40 L300,100 L0,100 Z"
                          fill="url(#gradient)"
                          opacity="0.2"
                          className="animate-fade-in"
                        />
                        
                        {/* Gradient Definition */}
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      {/* Animated Price Points */}
                      <div className="absolute top-0 right-8 bg-secondary text-green-500 text-xs px-2 py-1 rounded animate-fade-in-up">
                        +$48,350
                      </div>
                    </div>
            </div>
          </div>

          <div className="relative bg-card/80 p-2 rounded-2xl border border-border/30">
            <div className="h-full w-full border border-border/20 rounded-xl p-6">
            <div className="pt-2 pb-16">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-primary mb-3">
                        Investing
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Grow Your Portfolio</h3>
                      <p className="text-sm text-muted-foreground">
                        Diversify your investments with our range of trading packages and earn consistent returns.
                      </p>
                    </div>

                    {/* Stacked Containers */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%]">
                      <div className="relative h-32">
                        {/* Background Container */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-16 bg-card/80 border-border/20 border rounded-lg shadow-sm transform rotate-[-4deg] opacity-40" />
                        
                        {/* Middle Container */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[92%] h-16 bg-card/80 border-border/20 border rounded-lg shadow-sm transform rotate-[-2deg] opacity-70" />
                        
                        {/* Top Container */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full h-16 bg-card/80 border-border/20 border rounded-lg shadow-md">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Fire className="w-4 h-4 text-primary" />
                              </div>
                              <div className="text-sm font-medium text-foreground">Premium Package</div>
                            </div>
                            <div className="text-sm font-semibold text-green-500">$1,000</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
          </div>
        </div>
      </div>
    </section>
  );
};
