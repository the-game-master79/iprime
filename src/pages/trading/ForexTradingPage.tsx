import { PageTransition } from "@/components/ui-components";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { ChartLineUp, Lightning, CurrencyDollar, Users, Rocket } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

const ForexTradingPage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-green-500/10 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <ChartLineUp className="h-5 w-5 animate-pulse text-primary" />, 
              text: "Forex & Crypto Trading Online"
            }}
            title="Automated Forex Trading App"
            subtitle="Trade Forex & Crypto Effortlessly"
            description="Experience secure forex trading and crypto trading with our advanced, automated forex trading app. Enjoy seamless forex auto trading and real-time analytics."
            action={{
              text: "Start Forex Trading",
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
                    Why Trade Forex & Crypto
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Crypto and Forex Trading Made Simple</h2>
                  <p className="text-lg text-muted-foreground">
                    Access global markets with our secure forex trading platform. Trade forex and crypto with ultra-low latency, advanced charting, and automated trading tools designed for all traders.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { number: "50+", label: "Forex Pairs" },
                    { number: "30+", label: "Crypto Assets" },
                    { number: "0.01s", label: "Lightning Execution" },
                    { number: "24/7", label: "Auto Trading" },
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
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">Why Choose Our Forex Auto Trading</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Discover the advantages of automated forex trading and crypto trading online. Our platform empowers you with secure, reliable, and intelligent trading solutions.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Automated Forex Trading</h3>
                  <p className="text-base text-muted-foreground">
                    Harness the power of forex auto trading with advanced bots and automation. Let our app trade for you 24/7, maximizing your opportunities.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Crypto and Forex Trading</h3>
                  <p className="text-base text-muted-foreground">
                    Trade both crypto and forex assets in one place. Enjoy seamless switching and portfolio management with our unified platform.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Secure Forex Trading</h3>
                  <p className="text-base text-muted-foreground">
                    Your funds and data are protected with bank-grade security, ensuring safe and secure forex trading at all times.
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
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Ready to Trade Forex & Crypto?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Sign up now and experience the best in forex & crypto trading online. Fast, secure, and automated for your success.
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
                  Advanced Forex & Crypto Trading
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">The Best Automated Forex Trading App</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Our automated forex trading app is designed for both beginners and professionals. Enjoy smart trading, instant execution, and AI-powered analytics for forex & crypto trading online.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Forex Auto Trading</h3>
                  <p className="text-base text-muted-foreground">
                    Automate your forex trades with intelligent algorithms and bots. Let technology work for you and never miss an opportunity.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">AI-Powered Analytics</h3>
                  <p className="text-base text-muted-foreground">
                    Leverage AI to analyze forex and crypto markets, predict trends, and optimize your trading strategies for better results.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Unified Trading Platform</h3>
                  <p className="text-base text-muted-foreground">
                    Trade forex and crypto side by side with a single, secure account. Manage all your assets and strategies in one place.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Why Choose Us Section */}
          <section className="py-16 bg-accent/10">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <ChartLineUp className="w-4 h-4 mr-2" weight="fill" />
                  Why Choose Us
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">Your Partner for Forex & Crypto Trading Online</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of traders who trust our platform for secure forex trading and crypto trading online. Enjoy innovative features, global access, and dedicated support.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Comprehensive Asset Coverage</h3>
                  <p className="text-base text-muted-foreground">
                    Trade major forex pairs, cryptocurrencies, and more—all in one place. Diversify your portfolio with ease.
                  </p>
                </div>
                <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Trusted & Secure</h3>
                  <p className="text-base text-muted-foreground">
                    Our platform is trusted by traders worldwide for secure forex trading, transparency, and performance.
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

export default ForexTradingPage;
