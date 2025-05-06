import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/ui-components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Envelope, Lightning } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { SEO } from "@/components/shared/SEO";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { QuickFeatures } from "@/components/shared/QuickFeatures";
import { HowItWorks } from "@/components/shared/HowItWorks";
import { Features } from "@/components/shared/Features";
import FaqPage from "./faq/FaqPage";
import WallOfLove from "./testimonials/WallOfLove";
import CtaPage from "./cta/CtaPage";

const Index = () => {
  const [showContact, setShowContact] = useState(false);
  const navigate = useNavigate();
  
  // Add scroll animation hook
  useScrollAnimation();

  const handleNavigation = (section: string) => {
    // If it's a section scroll, handle it
    if (section.startsWith('#')) {
      const element = document.getElementById(section.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    // Otherwise navigate to the new page
    navigate(section);
  };

  return (
    <PageTransition>
      <SEO
        title="Advanced Trading Platform"
        description="Experience next-gen cloud forex trading with AI-powered analytics and 4X CPU boost technology for lightning-fast execution."
        keywords="cloud forex, AI trading, advanced trading platform, forex trading, cryptocurrency trading"
      />
      <div className="flex min-h-screen flex-col bg-background tracking-tight overflow-hidden">
        {/* Magic Gradient Orb - Updated for dark mode */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        {/* Add relative z-index to main content sections */}
        <main className="relative z-10">
          <Navbar />

          <Hero 
            badge={{
              icon: <Lightning className="h-5 w-5" />,
              text: "2X CPU Power | Advanced AI Trading"
            }}
            title="Experience the Future of Trading with CloudForex"
            description="AI-Powered Trading Platform with Lightning-Fast Execution."
            action={{
              text: "Start Trading",
              href: "/auth/login"
            }}
            lottie={
              <DotLottieReact
                src="https://lottie.host/abd384dc-554e-43bf-a1b2-217ad2d3e236/W7AiNxsfEp.lottie"
                loop
                autoplay
              />
            }
          />

          <QuickFeatures />

          <HowItWorks />
          
          <Features />

          <FaqPage />

          <WallOfLove />

          <CtaPage />

          <Footer />

          {/* Contact Dialog - Updated for dark mode */}
          <Dialog open={showContact} onOpenChange={setShowContact}>
            <DialogContent className="bg-card shadow-md backdrop-blur-sm backdrop-filter backdrop-opacity-90 border border-border/50">
              <DialogHeader>
                <DialogTitle>Contact Us</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <Envelope className="h-5 w-5 text-primary" />
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

        </main>
      </div>
    </PageTransition>
  );
};

export default Index;
