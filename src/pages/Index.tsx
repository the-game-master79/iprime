import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui-components";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, ChevronDown, Clock, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { Fire, Brain, Cpu, Globe, ShieldStar, Users, Gift, Envelope, Lightning, Cloud } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Hero } from "@/components/shared/Hero";
import { Companies } from "@/components/shared/Companies";
import { SEO } from "@/components/shared/SEO";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Index = () => {
  const [showContact, setShowContact] = useState(false);
  const navigate = useNavigate();
  
  // Add scroll animation hook
  useScrollAnimation();

  const handleNavigation = (section: string) => {
    // If it's a section scroll, handle it
    if (section.startsWith('#')) {
      const element = document.getElementById(section.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    // Otherwise navigate to the new page
    navigate(section);
  };

  return (
    <PageTransition>
      <SEO
        title="Advanced Trading Platform"
        description="Experience next-gen cloud forex trading with AI-powered analytics and 4X CPU boost technology for lightning-fast execution."
        keywords="cloud forex, AI trading, advanced trading platform, forex trading, cryptocurrency trading"
      />
      <div className="flex min-h-screen flex-col bg-[#F3F4F6] tracking-tight overflow-hidden">
        {/* Magic Gradient Orb - Add this before header */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        {/* Add relative z-index to main content sections */}
        <main className="relative z-10">
          <Navbar />

          <Hero 
            badge={{
              icon: <Lightning className="h-5 w-5" />,
              text: "2X CPU Power | Advanced AI Trading"
            }}
            title="Experience the Future of Trading with CloudForex"
            description="AI-Powered Trading Platform with Lightning-Fast Execution."
            action={{
              text: "Start Trading",
              href: "/auth/login"
            }}
            lottie={
              <DotLottieReact
                src="https://lottie.host/abd384dc-554e-43bf-a1b2-217ad2d3e236/W7AiNxsfEp.lottie"
                loop
                autoplay
              />
            }
          />
          
          <Companies />

          {/* Quick Features Section */}
          <section className="py-16 bg-background/5">
            <div className="container max-w-[1200px] mx-auto px-4">
            <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-full bg-white border border-primary/20 px-3 py-1 text-sm font-medium text-primary">
                    <Fire className="w-4 h-4 mr-1" weight="fill" />
                    Trusted Brokerage since 2022
                  </div>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">Time to Make a Profit</h2>
                <p className="text-muted-foreground">
                  Our motto is Speed or nothing.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[120px]">
                
                {/* Featured Card - Spans 2 rows and 2 columns */}
                <div className="relative md:col-span-2 md:row-span-2 h-[200px] md:h-auto animate-on-scroll opacity-0 translate-y-4 transition-all duration-700">
                  <div className="h-full w-full bg-white p-2 rounded-2xl border group hover:border-primary/50 transition-colors">
                    <div className="relative h-full w-full border rounded-xl p-6 overflow-hidden bg-primary group-hover:bg-primary/90 transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex flex-col h-full items-center justify-center text-center">
                        <div className="bg-white/10 rounded-xl w-16 h-16 flex items-center justify-center mb-4 md:mb-6">
                          <Clock className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="font-semibold text-lg md:text-xl mb-1 md:mb-2 text-white">Instant Withdrawals</h3>
                        <p className="text-sm text-white/80">Fastest Payouts in Seconds</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regular Cards */}
                <div className="relative md:col-span-2 animate-on-scroll opacity-0 translate-y-4 transition-all duration-700 delay-100">
                  <div className="h-full w-full bg-white p-2 rounded-2xl border group hover:border-primary/50 transition-colors">
                    <div className="relative h-full w-full border rounded-xl p-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-4">
                        <div className="bg-primary/10 rounded-xl w-12 h-12 flex items-center justify-center">
                          <ChevronDown className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Lowest Spreads</h3>
                          <p className="text-sm text-muted-foreground">Starting from 0.1 pips</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support Card - Spans 2 columns */}
                <div className="relative md:col-span-2 animate-on-scroll opacity-0 translate-y-4 transition-all duration-700 delay-200">
                  <div className="h-full w-full bg-white p-2 rounded-2xl border group hover:border-primary/50 transition-colors">
                    <div className="relative h-full w-full border rounded-xl p-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-4">
                        <div className="bg-primary/10 rounded-xl w-12 h-12 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">24/7 Support</h3>
                          <p className="text-sm text-muted-foreground">Always here to help you</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commission Card - Spans 4 columns */}
                <div className="relative md:col-span-4 animate-on-scroll opacity-0 translate-y-4 transition-all duration-700 delay-300">
                  <div className="h-full w-full bg-white p-2 rounded-2xl border group hover:border-primary/50 transition-colors">
                    <div className="relative h-full w-full border rounded-xl p-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-4">
                        <div className="bg-primary/10 rounded-xl w-12 h-12 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Zero Commission</h3>
                          <p className="text-sm text-muted-foreground">Trade with no extra fees</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* How it Works Section - Replace Stats Section */}
          <section className="my-24">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-full bg-white border border-primary/20 px-3 py-1 text-sm font-medium text-primary">
                    <Fire className="w-4 h-4 mr-1" weight="fill" />
                    Getting Started
                  </div>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
                <p className="text-muted-foreground">
                  Start your investment journey with CloudForex in three simple steps
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="relative h-full w-full border rounded-xl p-6 overflow-hidden">
                    <div className="pt-2 pb-40"> {/* Increased padding to make room for circles */}
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-primary mb-3">
                        Deposit
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Fund Your Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Start by depositing funds into your account using our secure payment methods. Choose from multiple deposit options.
                      </p>
                    </div>
                    
                    {/* Semi-visible Concentric Circles with Logo */}
                    <div className="absolute -bottom-[30%] left-1/2 -translate-x-1/2">
                      <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                        {/* Center logo */}
                        <div className="absolute z-10 w-[100px] h-[100px] rounded-full border border-primary/30 flex items-center justify-center bg-white shadow-lg backdrop-blur-sm">
                          <img 
                            src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cflogo.svg"
                            alt="CloudForex Logo"
                            className="w-14 h-14"
                          />
                        </div>

                        {/* Outer orbit */}
                        <OrbitingCircles 
                          radius={120} 
                          iconSize={40}
                          speed={0.8}
                          className="bg-white shadow-lg p-2"
                        >
                          <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//usdt.svg" alt="USDT" className="w-6 h-6" />
                          <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//eth.svg" alt="ETH" className="w-6 h-6" />
                          <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//eur-gbp.svg" alt="EUR/GBP" className="w-6 h-6" />
                          <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//bnb.svg" alt="BNB" className="w-6 h-6" />
                        </OrbitingCircles>

                        {/* Inner orbit */}
                        <OrbitingCircles 
                          radius={80} 
                          iconSize={36} 
                          speed={1.2} 
                          reverse
                          className="bg-white shadow-lg p-2"
                        >
                          <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//btc.svg" alt="BTC" className="w-5 h-5" />
                          <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//sol.svg" alt="SOL" className="w-5 h-5" />
                          <img src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//eur-usd.svg" alt="EUR/USD" className="w-5 h-5" />
                        </OrbitingCircles>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6 relative">
                    <div className="pt-2 pb-16">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-primary mb-3">
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
                      <div className="absolute top-0 right-8 bg-primary text-white text-xs px-2 py-1 rounded animate-fade-in-up">
                        $48,350.00
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6">
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
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-16 bg-white border rounded-lg shadow-sm transform rotate-[-4deg] opacity-40" />
                        
                        {/* Middle Container */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[92%] h-16 bg-white border rounded-lg shadow-sm transform rotate-[-2deg] opacity-70" />
                        
                        {/* Top Container */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full h-16 bg-white border rounded-lg shadow-md">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Gift className="w-4 h-4 text-primary" />
                              </div>
                              <div className="text-sm font-medium">Premium Package</div>
                            </div>
                            <div className="text-sm font-semibold text-primary">$1,000</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Features */}
          <section id="advanced-trading" className="py-16 md:py-24 bg-background/5">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12 md:mb-16">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-full bg-white border border-primary/20 px-3 py-1 text-sm font-medium text-primary">
                    <Fire className="w-4 h-4 mr-1" weight="fill" />
                    Features
                  </div>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold">Advanced Trading Features</h2>
                <p className="text-lg text-muted-foreground">
                  Experience the future of forex trading with our cutting-edge platform powered by AI and cloud technology.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6">
                    <div className="flex flex-col gap-4">
                      <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/20 before:bg-gradient-to-br before:from-white/10 before:to-transparent">
                        <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                          <Brain className="h-8 w-8 text-primary" weight="fill" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-xl text-center">Powered by GenSpark 2.0</h3>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6">
                    <div className="flex flex-col gap-4">
                      <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/20 before:bg-gradient-to-br before:from-white/10 before:to-transparent">
                        <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                          <Cpu className="h-8 w-8 text-primary" weight="fill" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-xl text-center">Upto 18X CPU Power</h3>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6">
                    <div className="flex flex-col gap-4">
                      <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/20 before:bg-gradient-to-br before:from-white/10 before:to-transparent">
                        <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                          <Globe className="h-8 w-8 text-primary" weight="fill" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-xl text-center">Access to Global Markets</h3>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6">
                    <div className="flex flex-col gap-4">
                      <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/20 before:bg-gradient-to-br before:from-white/10 before:to-transparent">
                        <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                          <Gift className="h-8 w-8 text-primary" weight="fill" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-xl text-center">Exclusive Rewards & Bonuses</h3>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6">
                    <div className="flex flex-col gap-4">
                      <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/20 before:bg-gradient-to-br before:from-white/10 before:to-transparent">
                        <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                          <ShieldStar className="h-8 w-8 text-primary" weight="fill" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-xl text-center">TLS & WAF Security</h3>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white p-2 rounded-2xl border">
                  <div className="h-full w-full border rounded-xl p-6">
                    <div className="flex flex-col gap-4">
                      <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/20 before:bg-gradient-to-br before:from-white/10 before:to-transparent">
                        <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                          <Users className="h-8 w-8 text-primary" weight="fill" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-xl text-center">24/7 Support</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq-section" className="py-12 md:py-16 bg-background/5">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto mb-8">
                <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
                <p className="text-muted-foreground">
                  Find your next answer.
                </p>
              </div>
              <div className="max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="w-full space-y-3">
                  <AccordionItem value="item-1" className="border rounded-lg bg-white px-4 shadow-sm">
                    <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <div className="font-medium">What makes CloudForex different from other trading platforms?</div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="text-muted-foreground text-sm">
                      CloudForex stands out with its unique combination of AI-powered analytics, 4X CPU boost technology, and a user-friendly interface. Our platform is designed to provide traders with the fastest execution speeds and the most accurate market insights.
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border rounded-lg bg-white px-4 shadow-sm">
                    <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <div className="font-medium">How secure is my investment with CloudForex?</div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="text-muted-foreground text-sm">
                        We implement cryptographic security measures, including end-to-end encryption, regular security audits, and secure cold storage for digital assets. Your funds are protected by multiple layers of security protocols.
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border rounded-lg bg-white px-4 shadow-sm">
                    <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <div className="font-medium">What are the minimum deposit requirements?</div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="text-muted-foreground text-sm">
                        Our platform is designed to accommodate traders of all levels. You can start package purchase with as little as $10, making it accessible while still providing access to all our advanced features.
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="border rounded-lg bg-white px-4 shadow-sm">
                    <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <div className="font-medium">Can I access the platform from anywhere?</div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="text-muted-foreground text-sm">
                        CloudForex can be accessed from anywhere in the world. Our platform is web-based and mobile-friendly, allowing you to trade on the go or from the comfort of your home.
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5" className="border rounded-lg bg-white px-4 shadow-sm">
                    <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <div className="font-medium">What kind of support do you offer?</div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="text-muted-foreground text-sm">
                        We provide 24/7 customer support through multiple channels including live chat, email, and phone. Our dedicated team of trading experts is always ready to assist you with any questions or concerns.
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </section>

          {/* Wall of Love Section */}
          <section className="py-16 md:py-24">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12">
                <div className="inline-flex items-center rounded-full bg-white border border-primary/20 px-3 py-1 text-sm font-medium text-primary">
                  <Fire className="w-4 h-4 mr-1" weight="fill" />
                  Client Testimonials
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">Wall of Love</h2>
                <p className="text-muted-foreground">
                  See what our users have to say about their experience with CloudForex
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    name: "Sarah Mitchell",
                    role: "Professional Trader",
                    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
                    content: "The AI-powered analytics have completely transformed how I approach trading. The platform's speed and reliability are unmatched."
                  },
                  {
                    name: "James Wilson",
                    role: "Investment Analyst",
                    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
                    content: "CloudForex's 24/7 support team is exceptional. They've helped me optimize my trading strategy and maximize returns."
                  },
                  {
                    name: "Emma Thompson",
                    role: "Retail Investor",
                    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
                    content: "As a beginner, I appreciate how user-friendly the platform is. The educational resources have helped me grow my portfolio significantly."
                  },
                  {
                    name: "Michael Chen",
                    role: "Day Trader",
                    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
                    content: "The execution speed is incredible. I've never experienced such fast order processing before switching to CloudForex."
                  },
                  {
                    name: "Sofia Rodriguez",
                    role: "Forex Specialist",
                    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2",
                    content: "The advanced charting tools and technical indicators have given me a competitive edge in the market."
                  },
                  {
                    name: "David Park",
                    role: "Portfolio Manager",
                    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                    content: "CloudForex's risk management features help me maintain a disciplined trading approach. Excellent platform!"
                  },
                  {
                    name: "Anna Kowalski",
                    role: "Crypto Trader",
                    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
                    content: "The seamless integration of crypto and forex markets makes diversification effortless. Love the platform!"
                  },
                  {
                    name: "Thomas Weber",
                    role: "Financial Analyst",
                    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7",
                    content: "The AI predictions have been remarkably accurate. It's like having a professional analyst by your side."
                  },
                  {
                    name: "Lisa Johnson",
                    role: "Swing Trader",
                    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956",
                    content: "The mobile app is fantastic. I can manage my trades on the go without compromising on features."
                  },
                ].map((testimonial, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border animate-on-scroll opacity-0 translate-y-4 transition-all duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={`${testimonial.image}?auto=format&fit=crop&w=100&h=100`}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-medium">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{testimonial.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 md:py-24">
            <div className="container max-w-[1200px] mx-auto px-4">
                <div className="relative border rounded-lg p-6 bg-white/95 backdrop-blur-sm overflow-hidden">
                  {/* Animated Grid Background */}
                  <div className="absolute inset-0 w-full h-full">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
                                      linear-gradient(180deg, rgba(0,0,0,0.03) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                      mask: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
                    }} />
                    <div className="absolute inset-0 animate-[grid-move_20s_linear_infinite]" style={{
                      backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
                                      linear-gradient(180deg, rgba(0,0,0,0.03) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                      mask: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
                    }} />
                  </div>

                  <div className="absolute inset-2 border rounded-lg pointer-events-none"></div>
                  <div className="relative flex flex-col items-center text-center gap-8">
                    <div className="max-w-xl space-y-4">
                      <h2 className="text-2xl md:text-3xl font-bold">Ready to start your investment journey?</h2>
                      <p className="text-muted-foreground">
                        Join thousands of investors who are already growing their wealth with CloudForex.
                      </p>
                    </div>
                    <Link to="/auth/login">
                      <Button 
                        size="lg" 
                        className="px-8 gap-2 bg-primary hover:bg-primary/90 text-white relative overflow-hidden group"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                        Get Started
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
          </section>

          {/* Footer */}
          <footer className="border-t bg-background/5 py-8 md:py-12">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
                    alt="ProfitLink Logo" 
                    className="h-8 w-auto" 
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
                  <Link to="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </Link>
                  <Link to="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </Link>
                  <button 
                    onClick={() => setShowContact(true)} 
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Contact Us
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} CloudForex. All rights reserved.
                </div>
              </div>
            </div>
          </footer>

          {/* Contact Dialog */}
          <Dialog open={showContact} onOpenChange={setShowContact}>
            <DialogContent className="bg-white shadow-md backdrop-blur-sm backdrop-filter backdrop-opacity-90 border border-gray-200">
              <DialogHeader>
                <DialogTitle>Contact Us</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg">
                    <Envelope className="h-5 w-5 text-primary" />
                    <a 
                      href="mailto:support@cloudforex.club" 
                      className="text-sm hover:text-primary transition-colors"
                    >
                      support@cloudforex.club
                    </a>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </PageTransition>
  );
};

export default Index;
