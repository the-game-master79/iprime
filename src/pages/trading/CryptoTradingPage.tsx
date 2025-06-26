import { PageTransition } from "@/components/ui-components";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { ChartLineUp, Lightning, CurrencyDollar, Users, Rocket } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

const CryptoTradingPage = () => {
  return (
    <>
      <Helmet>
        <title>Trade Crypto Online | Best Crypto Trading Forex Brokers | Arthaa</title>
        <meta name="description" content="Experience the future of crypto options trading and trade cryptos online with the best crypto trading forex brokers. Enjoy secure, fast, and innovative trading tools on Arthaa." />
        <link rel="canonical" href="https://www.arthaa.pro/trading" />
      </Helmet>
      <PageTransition>
        <div className="min-h-screen bg-background">
          {/* Magic Gradient Background */}
          <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse-slower" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-yellow-500/10 to-green-500/10 rounded-full blur-3xl animate-pulse-slowest" />
          </div>

          <main className="relative z-10">
            <Hero 
              badge={{
                icon: <ChartLineUp className="h-5 w-5 animate-pulse text-primary" />, 
                text: "Trade Cryptos Online"
              }}
              title="Trade Crypto Online"
              subtitle="Best Crypto Trading Forex Brokers"
              description="Experience the future of crypto options trading and trade cryptos online with the best crypto trading forex brokers. Enjoy secure, fast, and innovative trading tools."
              action={{
                text: "Start Crypto Trading",
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
                      Why Trade Cryptos Online
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground">Crypto Options Trading Made Easy</h2>
                    <p className="text-lg text-muted-foreground">
                      Trade crypto online with advanced options trading features. Our platform connects you to the best crypto trading forex brokers for seamless, secure, and flexible trading.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { number: "100+", label: "Crypto Assets" },
                      { number: "0.01s", label: "Fast Execution" },
                      { number: "24/7", label: "Global Markets" },
                      { number: "Low Fees", label: "Best Brokers" },
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
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Why Choose Crypto Options Trading</h2>
                  <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Discover the benefits of crypto options trading and trade cryptos online with confidence. Our platform offers security, flexibility, and access to the best crypto trading forex brokers.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">Crypto Options Trading</h3>
                    <p className="text-base text-muted-foreground">
                      Explore a wide range of crypto options trading strategies. Maximize your returns with innovative tools and real-time analytics.
                    </p>
                  </div>
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">Trade Crypto Online</h3>
                    <p className="text-base text-muted-foreground">
                      Trade cryptos online anytime, anywhere. Enjoy instant execution, deep liquidity, and a user-friendly interface.
                    </p>
                  </div>
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">Best Crypto Trading Forex Brokers</h3>
                    <p className="text-base text-muted-foreground">
                      Connect with the best crypto trading forex brokers for secure, regulated, and transparent trading experiences.
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
                <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Ready to Trade Cryptos Online?</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Sign up now and experience the best in crypto options trading. Trade crypto online with the best brokers and advanced tools.
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
                    Advanced Crypto Trading
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Trade Crypto Online with the Best</h2>
                  <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Our platform is built for crypto options trading and lets you trade cryptos online with the best crypto trading forex brokers. Enjoy AI-powered analytics and instant execution.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">Options & Spot Trading</h3>
                    <p className="text-base text-muted-foreground">
                      Trade both crypto options and spot markets. Diversify your strategies and maximize your trading potential.
                    </p>
                  </div>
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">AI-Powered Analytics</h3>
                    <p className="text-base text-muted-foreground">
                      Use AI-driven insights to optimize your crypto options trading and make smarter decisions in real time.
                    </p>
                  </div>
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">Best Crypto Trading Forex Brokers</h3>
                    <p className="text-base text-muted-foreground">
                      Partner with the best crypto trading forex brokers for secure, regulated, and transparent access to global crypto markets.
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
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Your Gateway to Trade Cryptos Online</h2>
                  <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Join thousands of traders who trust our platform to trade crypto online. Enjoy innovative features, global access, and the best crypto trading forex brokers.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">Comprehensive Crypto Coverage</h3>
                    <p className="text-base text-muted-foreground">
                      Trade a wide range of cryptocurrencies, including Bitcoin, Ethereum, and more. Diversify your portfolio with ease.
                    </p>
                  </div>
                  <div className="bg-secondary-foreground dark:bg-card p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-3">Trusted & Regulated Brokers</h3>
                    <p className="text-base text-muted-foreground">
                      Our platform connects you with the best crypto trading forex brokers, ensuring security, transparency, and top-tier support.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <Footer />
        </div>
      </PageTransition>
    </>
  );
};

export default CryptoTradingPage;
