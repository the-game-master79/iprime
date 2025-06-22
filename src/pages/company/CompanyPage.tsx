import { PageTransition } from "@/components/ui-components";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Building, Trophy, Target, Users, Rocket, ShieldCheck } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

const CompanyPage = () => {
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
              icon: <Building className="h-5 w-5 animate-pulse text-primary" />, 
              text: "About Us"
            }}
            title="About Arthaa"
            subtitle="Empowering Traders Worldwide."
            description="Learn about our mission, journey, and values that drive us to empower traders worldwide."
            action={{
              text: "Start Trading",
              href: "/auth/login"
            }}
          />

          {/* Mission Section */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    <Target className="w-4 h-4 mr-2" weight="fill" />
                    Our Mission
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground">Revolutionizing Financial Markets</h2>
                  <p className="text-lg text-muted-foreground">
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
                    <Card key={i} className="bg-white dark:bg-card p-6 rounded-2xl shadow-lg">
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

          {/* Journey Section */}
          <section className="py-16 bg-accent/5">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                  <Rocket className="w-4 h-4 mr-2" weight="fill" />
                  Our Journey
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">From Vision to Reality</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Founded in 2022, Arthaa has grown from a small startup to a leading force in online trading. 
                  Our journey has been marked by continuous innovation, technological advancement, and an unwavering 
                  commitment to our traders' success.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Global Presence</h3>
                  <p className="text-base text-muted-foreground">
                    With traders from over 100 countries, we've built a truly global community. Our platform supports 
                    multiple languages and provides 24/7 localized support to ensure every trader gets the assistance 
                    they need, when they need it.
                  </p>
                </div>
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Technological Innovation</h3>
                  <p className="text-base text-muted-foreground">
                    Our investment in cutting-edge technology sets us apart. From AI-powered trading signals to 
                    ultra-low latency execution, we're constantly pushing the boundaries of what's possible in 
                    online trading.
                  </p>
                </div>
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Security First</h3>
                  <p className="text-base text-muted-foreground">
                    We implement bank-grade security measures and maintain strict regulatory compliance to ensure 
                    our traders' funds and data are always protected. Our platform undergoes regular security 
                    audits and penetration testing.
                  </p>
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
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">What We Stand For</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Our values shape everything we do, from product development to customer service. They're the 
                  foundation of our company culture and guide our decision-making process.
                </p>
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
                  <div key={i} className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg flex flex-col items-center text-center">
                    <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10">
                      <span className="text-primary">{value.icon}</span>
                    </div>
                    <h3 className="font-semibold text-xl text-foreground">{value.title}</h3>
                    <p className="text-base text-muted-foreground">{value.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Why Choose Us Section */}
        <section className="py-16 bg-accent/5">
          <div className="container max-w-[1200px] mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Trophy className="w-4 h-4 mr-2" weight="fill" />
                Why Choose Us
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">The Arthaa Advantage</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                We combine advanced technology with exceptional service to provide our traders with an 
                unmatched trading experience. Here's what sets us apart:
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Advanced Trading Tools</h3>
                  <p className="text-base text-muted-foreground">
                    Access professional-grade charting, real-time market analysis, and AI-powered trading signals. 
                    Our platform provides everything you need to make informed trading decisions.
                  </p>
                </div>
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Educational Resources</h3>
                  <p className="text-base text-muted-foreground">
                    Comprehensive learning materials, webinars, and one-on-one mentoring sessions help traders 
                    at all levels improve their skills and understanding of the markets.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Competitive Pricing</h3>
                  <p className="text-base text-muted-foreground">
                    Enjoy tight spreads, low commissions, and transparent fee structures. We believe in providing 
                    the best possible trading conditions to help maximize your potential returns.
                  </p>
                </div>
                <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-semibold mb-3">Dedicated Support</h3>
                  <p className="text-base text-muted-foreground">
                    Our experienced support team is available 24/7 to assist you with any questions or concerns. 
                    We pride ourselves on providing fast, professional, and personalized support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default CompanyPage;
