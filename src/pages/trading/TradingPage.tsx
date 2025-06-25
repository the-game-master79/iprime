import { PageTransition } from "@/components/ui-components";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { ChartLineUp, Lightning, CurrencyDollar, Users, Rocket } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

const TradingPage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <ChartLineUp className="h-5 w-5 animate-pulse text-primary" />, 
              text: "Trading"
            }}
            title="Trade with Arthaa"
            subtitle="Next-Gen Trading Platform"
            description="Experience lightning-fast execution, advanced tools, and a global community. Start trading with confidence today."
            action={{
              text: "Start Trading",
              href: "/auth/login"
            }}
          />

          {/* Features Section */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    <Lightning className="w-4 h-4 mr-2" weight="fill" />
                    Why Trade with Us
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Powerful, Fast & Secure</h2>
                  <p className="text-lg text-muted-foreground">
                    Trade a wide range of assets with ultra-low latency, advanced charting, and robust security. Our platform is designed for both beginners and pros.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { number: "100+", label: "Trading Pairs" },
                    { number: "0.01s", label: "Avg. Execution" },
                    { number: "$0 Fees", label: "Commission-Free" },
                    { number: "24/7", label: "Global Markets" },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-secondary-foreground dark:bg-card p-6 rounded-2xl shadow-lg">
                      <CardContent className="p-0">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.number}</div>
                        <div className="text-base text-muted-foreground mt-1">{stat.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-16 bg-accent/5">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <CurrencyDollar className="w-4 h-4 mr-2" weight="fill" />
                  Benefits
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">Why Traders Love Arthaa</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Discover the advantages that make Arthaa the preferred choice for thousands of traders worldwide.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Real-Time Analytics</h3>
                  <p className="text-base text-muted-foreground">
                    Access live market data, advanced analytics, and customizable charts to make informed decisions.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Community & Support</h3>
                  <p className="text-base text-muted-foreground">
                    Join a vibrant community and get 24/7 support from our expert team and fellow traders.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Secure & Reliable</h3>
                  <p className="text-base text-muted-foreground">
                    Trade with peace of mind thanks to our bank-grade security and 99.9% uptime.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action Section */}
          <section className="py-16">
            <div className="container max-w-[900px] mx-auto px-4 text-center">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Rocket className="w-4 h-4 mr-2" weight="fill" />
                Get Started
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Ready to Trade?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Sign up now and experience the future of trading with Arthaa. Fast, secure, and built for you.
              </p>
              <a
                href="/auth/register"
                className="inline-block bg-primary text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-primary/90 transition"
              >
                Create Account
              </a>
            </div>
          </section>

          {/* Advanced Trading Facilities Section */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <Users className="w-4 h-4 mr-2" weight="fill" />
                  Advanced Trading Facilities
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">The Best Trading Platform for Every Trader</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Arthaa is recognized as one of the <span className="font-semibold text-primary">best trading platforms</span> for both beginners and professionals. Whether you want the <span className="font-semibold text-primary">best platform to trade currency</span> or access to a wide range of assets, our platform is designed to deliver.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Ultra Fast Trading</h3>
                  <p className="text-base text-muted-foreground">
                    Experience <span className="font-semibold text-primary">ultra fast trading</span> with our state-of-the-art infrastructure, ensuring your orders are executed in milliseconds, giving you the edge in volatile markets.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Smart & Automated Trading</h3>
                  <p className="text-base text-muted-foreground">
                    Unlock <span className="font-semibold text-primary">smart trading</span> tools and strategies. Our platform is also the <span className="font-semibold text-primary">best automated trading platform</span>​, offering advanced bots and automation for effortless trading.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">AI-Powered Trading Platforms</h3>
                  <p className="text-base text-muted-foreground">
                    Leverage <span className="font-semibold text-primary">AI-powered trading platforms</span> to analyze trends, predict market movements, and optimize your trading strategies for maximum returns.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Why Choose Arthaa Section */}
          <section className="py-16 bg-accent/10">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <ChartLineUp className="w-4 h-4 mr-2" weight="fill" />
                  Why Choose Arthaa
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">Your Gateway to the Best Trading Experience</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of traders who trust Arthaa as their preferred <span className="font-semibold text-primary">trading platform</span>. Enjoy seamless access to global markets, innovative features, and dedicated support.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Comprehensive Asset Coverage</h3>
                  <p className="text-base text-muted-foreground">
                    Trade currencies, stocks, crypto, and more—all in one place. Arthaa is the <span className="font-semibold text-primary">best platform to trade currency</span> and diversify your portfolio.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Trusted by Professionals</h3>
                  <p className="text-base text-muted-foreground">
                    Our <span className="font-semibold text-primary">trading platforms</span> are trusted by industry experts for reliability, transparency, and performance.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default TradingPage;
