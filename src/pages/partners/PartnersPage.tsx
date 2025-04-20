import { PageTransition } from "@/components/ui-components";
import { Handshake, Users, ChartLineUp, Diamond, Lightning } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Companies } from "@/components/shared/Companies";

const PartnersPage = () => {
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
              text: "Partner Program"
            }}
            title="Partner With Us"
            description="Join our affiliate program and earn competitive commissions by referring new traders."
            action={{
              text: "Become a Partner",
              href: "/auth/login"
            }}
          />

          <Companies />

          {/* Partner Benefits */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <Handshake className="h-8 w-8" weight="fill" />,
                    title: "High Commissions",
                    description: "Earn up to 50% commission on referred trades"
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
                ].map((benefit, index) => (
                  <div key={index} className="bg-white p-2 rounded-2xl border">
                    <div className="border rounded-xl p-6">
                      <div className="flex flex-col gap-4">
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                          <div className="text-primary">{benefit.icon}</div>
                        </div>
                        <h3 className="text-xl font-semibold">{benefit.title}</h3>
                        <p className="text-muted-foreground">{benefit.description}</p>
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

export default PartnersPage;
