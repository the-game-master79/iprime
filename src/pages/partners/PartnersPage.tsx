import { PageTransition } from "@/components/ui-components";
import { Handshake, Users, ChartLineUp, Diamond, Lightning } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Companies } from "@/components/shared/Companies";
import { SEO } from "@/components/shared/SEO";

const PartnersPage = () => {
  return (
    <PageTransition>
      <SEO
        title="Partner Program"
        description="Join CloudForex's lucrative partner program. Earn up to 34% commission and unlock exclusive benefits by referring traders to our advanced trading platform."
        keywords="forex affiliate program, trading referral program, forex partnership, high commission trading affiliate"
      />
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
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <Lightning className="w-4 h-4 mr-2" weight="fill" />
                  Partner Benefits
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold">Why Partner With Us</h2>
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
                  <div key={i} className="relative bg-white p-2 rounded-2xl border">
                    <div className="h-full w-full border rounded-xl p-6">
                      <div className="space-y-4">
                        <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/20 before:bg-gradient-to-br before:from-white/10 before:to-transparent">
                          <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10">
                            <div className="text-primary">{benefit.icon}</div>
                          </div>
                        </div>
                        <h3 className="font-semibold text-xl text-center">{benefit.title}</h3>
                        <p className="text-muted-foreground text-center">{benefit.description}</p>
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
