import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/ui-components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Envelope, Lightning } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
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

  // Listen for open-contact-dialog event
  useEffect(() => {
    const handler = () => setShowContact(true);
    window.addEventListener("open-contact-dialog", handler);
    return () => window.removeEventListener("open-contact-dialog", handler);
  }, []);

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
      <div className="flex min-h-screen flex-col bg-background text-foreground tracking-tight overflow-hidden relative">
        {/* Dots and grid background overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
        >
          <svg
            width="100%"
            height="100%"
            className="absolute inset-0 w-full h-full"
            style={{ minHeight: '100vh' }}
          >
            {/* Dots */}
            <defs>
              <pattern id="dot-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#d4d4d8" opacity="0.12" />
              </pattern>
              {/* Grid lines */}
              <pattern id="grid-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="32" height="32" fill="none" stroke="#d4d4d8" strokeWidth="0.5" opacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-pattern)" />
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

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
              icon: <Lightning className="h-5 w-5 text-primary" />,
              text: "20X More Profits | Advanced AI Trading"
            }}
            title="Institutional Power."
            subtitle="Retail Access."
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
          <Dialog open={showContact} onOpenChange={setShowContact}>
            <DialogContent className="bg-card text-foreground shadow-md backdrop-blur-sm backdrop-filter backdrop-opacity-90 border border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Contact Us</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center space-y-2">
                <Envelope className="mx-auto h-8 w-8 text-primary mb-2" />
                <div className="text-base text-foreground font-medium">
                  You can email us for any support, marketing or questions to
                </div>
                <a
                  href="mailto:hello@cloudforex.club"
                  className="text-primary font-semibold underline break-all"
                >
                  hello@cloudforex.club
                </a>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </PageTransition>
  );
};

export default Index;
