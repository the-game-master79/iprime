import { PageTransition } from "@/components/ui-components";
import { Handshake, Users, ChartLineUp, Diamond, Lightning } from "@phosphor-icons/react";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";

const PartnersPage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <Lightning className="h-5 w-5 animate-pulse text-primary" />, 
              text: "Partner Program"
            }}
            title="Partner With CloudForex"
            subtitle="Earn. Grow. Succeed Together."
            description="Join our exclusive partnership program and earn substantial commissions while helping others discover professional trading. Benefit from our multi-tier commission structure and comprehensive support system."
            action={{
              text: "Join Partner Program",
              href: "/auth/login"
            }}
          />

          {/* Overview Section */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Your Path to Financial Success</h2>
                  <p className="text-lg text-muted-foreground">
                    Our partnership program is designed to reward dedicated affiliates who share our vision of 
                    democratizing trading. Whether you're an individual influencer or a large organization, 
                    we provide the tools and support you need to succeed.
                  </p>
                  <div className="grid gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-lg">1</div>
                      <div>
                        <h4 className="font-semibold text-lg">Register as Partner</h4>
                        <p className="text-base text-muted-foreground">Complete our simple registration process and get instant access to your affiliate dashboard</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-lg">2</div>
                      <div>
                        <h4 className="font-semibold text-lg">Share Your Link</h4>
                        <p className="text-base text-muted-foreground">Promote your unique referral link through your network and marketing channels</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-lg">3</div>
                      <div>
                        <h4 className="font-semibold text-lg">Start Earning</h4>
                        <p className="text-base text-muted-foreground">Earn commissions from your referrals' trading activity and build your passive income</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-2xl font-bold mb-4 text-primary">Commission Structure</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/5">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Standard Level</span>
                        <span className="text-primary font-bold">Up to 25%</span>
                      </div>
                      <p className="text-base text-muted-foreground mt-2">Perfect for individual affiliates and small networks</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Premium Level</span>
                        <span className="text-primary font-bold">Up to 30%</span>
                      </div>
                      <p className="text-base text-muted-foreground mt-2">For established partners with consistent performance</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Elite Level</span>
                        <span className="text-primary font-bold">Up to 34%</span>
                      </div>
                      <p className="text-base text-muted-foreground mt-2">Exclusive rates for top-performing partners</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Partner Benefits */}
          <section className="py-16 bg-accent/5">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <Lightning className="w-4 h-4 mr-2" weight="fill" />
                  Partner Benefits
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">Why Partner With Us</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: <Handshake className="h-8 w-8" weight="fill" />,
                    title: "High Commissions",
                    description: "Earn up to 34% commission on referred trades"
                  },
                  {
                    icon: <Users className="h-8 w-8" weight="fill" />,
                    title: "Multi-Level Rewards",
                    description: "Earn from your entire referral network"
                  },
                  {
                    icon: <ChartLineUp className="h-8 w-8" weight="fill" />,
                    title: "Real-Time Tracking",
                    description: "Monitor your earnings and network growth"
                  },
                  {
                    icon: <Diamond className="h-8 w-8" weight="fill" />,
                    title: "Exclusive Benefits",
                    description: "Access special rewards and bonuses"
                  }
                ].map((benefit, i) => (
                  <div key={i} className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg flex flex-col items-center text-center">
                    <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10">
                      <span className="text-primary">{benefit.icon}</span>
                    </div>
                    <h3 className="font-semibold text-xl text-foreground">{benefit.title}</h3>
                    <p className="text-base text-muted-foreground">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Marketing Support Section */}
        <section className="py-16">
          <div className="container max-w-[1200px] mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Marketing Support</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We provide comprehensive marketing support to help you maximize your earnings potential.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                <h3 className="text-lg font-semibold mb-3">Marketing Materials</h3>
                <ul className="space-y-2 text-base text-muted-foreground">
                  <li>• Professional banners and logos</li>
                  <li>• Landing page templates</li>
                  <li>• Social media content kits</li>
                  <li>• Email marketing templates</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                <h3 className="text-lg font-semibold mb-3">Analytics Dashboard</h3>
                <ul className="space-y-2 text-base text-muted-foreground">
                  <li>• Real-time performance tracking</li>
                  <li>• Conversion analytics</li>
                  <li>• Revenue statistics</li>
                  <li>• Network growth insights</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                <h3 className="text-lg font-semibold mb-3">Partner Support</h3>
                <ul className="space-y-2 text-base text-muted-foreground">
                  <li>• Dedicated account manager</li>
                  <li>• 24/7 priority support</li>
                  <li>• Regular performance reviews</li>
                  <li>• Strategy consultation</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-accent/5">
          <div className="container max-w-[1200px] mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get quick answers to common questions about our partner program.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                <h3 className="font-semibold mb-2">How are commissions calculated?</h3>
                <p className="text-base text-muted-foreground">
                  Commissions are calculated based on the trading volume of your referred clients. 
                  The percentage increases as you reach higher partnership tiers.
                </p>
              </div>
              <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                <h3 className="font-semibold mb-2">When do I get paid?</h3>
                <p className="text-base text-muted-foreground">
                  Partner commissions are processed and paid out on a weekly basis, provided your 
                  balance meets the minimum withdrawal threshold.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default PartnersPage;
