import { PageTransition } from "@/components/ui-components";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Wallet, ChartPie, Trophy, Lightning, CurrencyCircleDollar } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Companies } from "@/components/shared/Companies";

const InvestingPage = () => {
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
              text: "Investment Plans"
            }}
            title="Grow Your Wealth"
            description="Choose from our range of investment plans designed for optimal returns."
            action={{
              text: "View Plans",
              href: "/auth/login"
            }}
          />

          <Companies />

          {/* Investment Plans */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: <Wallet className="h-8 w-8" weight="fill" />,
                    title: "Starter Package",
                    price: "$100",
                    features: ["Daily ROI", "24/7 Support", "Instant Withdrawal"]
                  },
                  {
                    icon: <ChartPie className="h-8 w-8" weight="fill" />,
                    title: "Growth Package",
                    price: "$500",
                    features: ["Higher ROI", "Priority Support", "Advanced Analytics"]
                  },
                  {
                    icon: <Trophy className="h-8 w-8" weight="fill" />,
                    title: "Premium Package",
                    price: "$1000",
                    features: ["Maximum ROI", "VIP Support", "Custom Strategy"]
                  }
                ].map((plan, index) => (
                  <div key={index} className="bg-white p-2 rounded-2xl border">
                    <div className="border rounded-xl p-6">
                      <div className="flex flex-col gap-4">
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                          <div className="text-primary">{plan.icon}</div>
                        </div>
                        <h3 className="text-xl font-semibold">{plan.title}</h3>
                        <div className="text-2xl font-bold text-primary">{plan.price}</div>
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CurrencyCircleDollar className="h-4 w-4 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Link to="/auth/login">
                          <Button className="w-full">Choose Plan</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default InvestingPage;
