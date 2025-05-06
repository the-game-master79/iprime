import { PageTransition } from "@/components/ui-components";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Building, Trophy, Target, Users, Rocket, ShieldCheck } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/shared/SEO";

const CompanyPage = () => {
  return (
    <PageTransition>
      <SEO
        title="About Us"
        description="Learn about CloudForex's mission to revolutionize financial markets with cutting-edge technology and unparalleled trading solutions."
        keywords="forex trading company, online trading platform, financial technology, trading solutions"
      />
      <div className="min-h-screen bg-background">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <Navbar />

        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <Building className="h-5 w-5 animate-pulse text-primary" />,
              text: "About Us"
            }}
            title="Leading the Future of Trading"
            description="Empowering traders worldwide with cutting-edge technology and unparalleled support."
            action={{
              text: "Get Started",
              href: "/auth/login"
            }}
          />

          {/* Mission Section */}
          <section className="py-16 md:py-24">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    <Target className="w-4 h-4 mr-2" weight="fill" />
                    Our Mission
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Revolutionizing Financial Markets</h2>
                  <p className="text-muted-foreground">
                    Our mission is to democratize financial markets by providing traders of all levels with professional-grade tools and resources. We believe in transparency, innovation, and putting our users first.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { number: "50K+", label: "Active Traders" },
                    { number: "$100M+", label: "Monthly Volume" },
                    { number: "99.9%", label: "Uptime" },
                    { number: "24/7", label: "Support" },
                  ].map((stat, i) => (
                    <Card key={i} className="border-border/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-colors">
                      <CardContent className="p-6">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.number}</div>
                        <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Values Section */} 
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <ShieldCheck className="w-4 h-4 mr-2" weight="fill" />
                  Our Values
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">What We Stand For</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: <Trophy className="h-8 w-8" weight="fill" />,
                    title: "Excellence",
                    description: "We strive for excellence in everything we do, from our platform's performance to our customer service."
                  },
                  {
                    icon: <Rocket className="h-8 w-8" weight="fill" />,
                    title: "Innovation",
                    description: "Constantly pushing boundaries to provide cutting-edge trading solutions and features."
                  },
                  {
                    icon: <Users className="h-8 w-8" weight="fill" />,
                    title: "Community",
                    description: "Building a strong, supportive community of traders who learn and grow together."
                  }
                ].map((value, i) => (
                  <div key={i} className="relative bg-card/40 backdrop-blur-sm p-2 rounded-2xl border border-border/20">
                    <div className="h-full w-full border border-border/20 rounded-xl p-6">
                      <div className="space-y-4">
                        {/* Gradient Background Container */}
                        <div className="w-full h-24 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:bg-gradient-to-br before:from-white/5 before:to-transparent">
                          <div className="relative w-16 h-16 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center shadow-lg shadow-primary/5">
                            <div className="text-primary">{value.icon}</div>
                          </div>
                        </div>
                        <h3 className="font-semibold text-xl text-center text-foreground">{value.title}</h3>
                        <p className="text-muted-foreground text-center">{value.description}</p>
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

export default CompanyPage;
