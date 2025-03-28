import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageTransition, FeatureCard } from "@/components/ui-components";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Cpu, Brain, Cloud, Shield, ChevronDown, Globe, Bolt, Clock, Users, Gift, Mail } from "lucide-react";
import banner from "@/assets/banner.svg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import Marquee from "react-fast-marquee";

const Index = () => {
  const [showContact, setShowContact] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="bg-background/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 border-b">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
                alt="ProfitLink Logo" 
                className="h-8 w-auto" 
              />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection('advanced-trading')} 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('next-gen-tech')} 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Technology
              </button>
              <button 
                onClick={() => scrollToSection('faq-section')} 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </button>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/auth/login">
                <Button variant="ghost" className="hidden md:flex">Login</Button>
              </Link>
              <Link to="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Marquee */}
        <div className="bg-primary/5 border-b fixed top-16 left-0 right-0 z-40">
          <Marquee
            speed={40}
            gradient={false}
            className="py-2"
          >
            <div className="flex items-center gap-12 px-4">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">1+1 Deposit Offer till 30th March</span>
              </div>
              <span className="text-primary">•</span>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">$300 extra for Sapphire Rank Achievement</span>
              </div>
              <span className="text-primary">•</span>
              <div className="flex items-center gap-2">
                <Bolt className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Unlimited Withdrawal - No Restrictions</span>
              </div>
              <span className="text-primary">•</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">20k+ Active Users</span>
              </div>
              <span className="text-primary">•</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">24/7 Support and Team Help</span>
              </div>
              <span className="text-primary mr-12">•</span>
            </div>
          </Marquee>
        </div>

        {/* Hero */}
        <section className="flex min-h-screen items-center pt-32 pb-16 bg-gradient-to-b from-background to-secondary/20">
          <div className="container">
            <div className="flex flex-col items-center text-center gap-8 md:gap-12 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Bolt className="h-5 w-5" />
                  <span className="text-sm font-semibold">2X CPU Power | Advanced AI Trading</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight md:leading-tight text-primary">
                  Experience Next-Gen Cloud Forex Trading
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Harness the power of AI and cloud computing for sophisticated forex trading. Execute trades at lightning speed with our 2X CPU boost technology.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth/register">
                    <Button size="lg" className="gap-2">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/auth/login">
                    <Button size="lg" variant="outline">
                      Log In
                    </Button>
                  </Link>
                </div>
              </div>
              <img 
                src="/banner.webp" 
                alt="Cloud Forex Trading" 
                className="w-full rounded-xl mx-auto my-8" 
              />
              <div className="pt-8 md:pt-12 animate-bounce">
                <Link to="#features" className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary mx-auto">
                  <ChevronDown className="h-6 w-6" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-secondary/30">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">$50m+</div>
                <div className="text-sm text-muted-foreground">Trading Volume</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">0.01s</div>
                <div className="text-sm text-muted-foreground">Execution Speed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">20k+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="advanced-trading" className="py-16 md:py-24 bg-secondary/50">
          <div className="container">
            <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Advanced Trading Features</h2>
              <p className="text-muted-foreground">
                Experience the future of forex trading with our cutting-edge platform powered by AI and cloud technology.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                title="AI-Powered Analysis"
                description="Real-time market analysis and predictions using advanced machine learning algorithms."
                icon={<Brain className="h-6 w-6" />}
                action={{ text: "Learn more", onClick: () => {} }}
              />
              <FeatureCard
                title="4X CPU Power"
                description="Lightning-fast AI trade execution with our enhanced cloud computing infrastructure."
                icon={<Cpu className="h-6 w-6" />}
                action={{ text: "View specs", onClick: () => {} }}
              />
              <FeatureCard
                title="Global Markets"
                description="Access to all major forex pairs and markets 24/7 without any latency."
                icon={<Globe className="h-6 w-6" />}
                action={{ text: "See markets", onClick: () => {} }}
              />
              <FeatureCard
                title="Exclusive Rewards"
                description="Unlock bonuses and special investment opportunities as you grow your portfolio."
                icon={<Gift className="h-6 w-6" />}
                action={{
                  text: "See rewards",
                  onClick: () => window.location.href = "/plans",
                }}
              />
              <FeatureCard
                title="Secure Investments"
                description="Your funds are protected with cryptographic security and regular audits."
                icon={<Shield className="h-6 w-6" />}
                action={{
                  text: "Read about security",
                  onClick: () => {},
                }}
              />
              <FeatureCard
                title="24/7 Support"
                description="Our dedicated support team is available round the clock to assist you."
                icon={<Users className="h-6 w-6" />}
                action={{
                  text: "Contact support",
                  onClick: () => {},
                }}
              />
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section id="next-gen-tech" className="py-16 md:py-24">
          <div className="container">
            <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Powered by Next-Gen Technology</h2>
              <p className="text-muted-foreground">
                Our platform leverages cutting-edge technology to provide you with the best trading experience.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                title="Max/Nano CPU Power"
                description="Executed trades at unprecedented speeds with our enhanced processing capabilities."
                icon={<Cpu className="h-6 w-6" />}
                action={{ text: "Learn more", onClick: () => {} }}
              />
              <FeatureCard
                title="Advanced AI Analytics"
                description="Make informed decisions with our AI-driven market analysis and prediction system."
                icon={<Brain className="h-6 w-6" />}
                action={{ text: "View details", onClick: () => {} }}
              />
              <FeatureCard
                title="Cloud Infrastructure"
                description="Reliable and scalable cloud infrastructure ensuring 99.9% uptime for seamless payouts."
                icon={<Cloud className="h-6 w-6" />}
                action={{ text: "See specs", onClick: () => {} }}
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq-section" className="py-16 md:py-24 bg-secondary/20">
          <div className="container">
            <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Find answers to common questions about our trading platform.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What makes CloudForex different from other trading platforms?</AccordionTrigger>
                  <AccordionContent>
                    CloudForex stands out with our 4X CPU power technology, advanced AI-driven analytics, and robust cloud infrastructure. We offer faster trade execution, more accurate market predictions, and superior reliability compared to traditional platforms.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How secure is my investment with CloudForex?</AccordionTrigger>
                  <AccordionContent>
                    We implement cryptographic security measures, including end-to-end encryption, regular security audits, and secure cold storage for digital assets. Your funds are protected by multiple layers of security protocols.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>What are the minimum deposit requirements?</AccordionTrigger>
                  <AccordionContent>
                    Our platform is designed to accommodate traders of all levels. You can start package purchase with as little as $10, making it accessible while still providing access to all our advanced features.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I use on mobile devices?</AccordionTrigger>
                  <AccordionContent>
                    Yes, CloudForex offers a fully responsive packaged design that provides an exceptional experience across all devices. Our platform is accessible via web browsers and dedicated mobile apps for iOS and Android.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>What kind of support do you offer?</AccordionTrigger>
                  <AccordionContent>
                    We provide 24/7 customer support through multiple channels including live chat, email, and phone. Our dedicated team of trading experts is always ready to assist you with any questions or concerns.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 md:p-12">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 space-y-4">
                  <h2 className="text-2xl md:text-3xl font-bold">Ready to start your investment journey?</h2>
                  <p className="text-muted-foreground">
                    Join thousands of investors who are already growing their wealth with CloudForex.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth/register">
                    <Button size="lg" className="gap-2">
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/auth/login">
                    <Button size="lg" variant="outline">
                      Log In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-secondary/50 py-8 md:py-12">
          <div className="container">
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
                  <Mail className="h-5 w-5 text-primary" />
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

      </div>
    </PageTransition>
  );
};

export default Index;
