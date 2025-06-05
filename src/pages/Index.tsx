import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/ui-components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Envelope, Lightning } from "@phosphor-icons/react";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { ClEngine } from "@/components/shared/ClEngine";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

// Lazy load non-critical components
const QuickFeatures = lazy(() => import("@/components/shared/QuickFeatures").then(m => ({ default: m.QuickFeatures })));
const HowItWorks = lazy(() => import("@/components/shared/HowItWorks").then(m => ({ default: m.HowItWorks })));
const Features = lazy(() => import("@/components/shared/Features").then(m => ({ default: m.Features })));
const FaqPage = lazy(() => import("./faq/FaqPage"));
const WallOfLove = lazy(() => import("./testimonials/WallOfLove"));
const CtaPage = lazy(() => import("./cta/CtaPage").then(m => ({ default: m.default || m.CtaPage })));

const Index = () => {
  const [showContact, setShowContact] = useState(false);
  const navigate = useNavigate();
  
  // Add scroll animation hook
  useScrollAnimation();

  // Force light theme for this page
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

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
        {/* Removed Dots and grid background overlay */}
        {/* Removed Magic Gradient Orb */}
        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <Lightning className="h-5 w-5 text-primary" />, 
              text: "20X More Profits | Advanced AI Trading"
            }}
            title="Institutional Power."
            subtitle="Retail Access."
            description="Experience the next generation of trading. Our AI-powered forex trading platform delivers lightning-fast execution, advanced analytics, and institutional-grade tools—now available for everyone."
            action={{
              text: "Start Trading",
              href: "/auth/login"
            }}
            lottie={
              <img src="/ai-forex-trading-platform.svg" alt="AI forex trading platform" width={320} height={320} loading="eager" decoding="async" />
            }
          />
          
          {/* Lazy load below-the-fold sections */}
          <Suspense fallback={<div className="min-h-[200px]" />}> <QuickFeatures /> </Suspense>
          <Suspense fallback={<div className="min-h-[200px]" />}> <HowItWorks /> </Suspense>
          <ClEngine />
          <Suspense fallback={<div className="min-h-[200px]" />}> <Features /> </Suspense>
          <Suspense fallback={<div className="min-h-[200px]" />}> <FaqPage /> </Suspense>
          <Suspense fallback={<div className="min-h-[200px]" />}> <WallOfLove /> </Suspense>
          <Suspense fallback={<div className="min-h-[200px]" />}> <CtaPage /> </Suspense>
          <Footer />
          <Dialog open={showContact} onOpenChange={setShowContact}>
            <DialogContent className="bg-card text-foreground shadow-md backdrop-blur-sm backdrop-filter backdrop-opacity-90 border border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Contact Us</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center space-y-2">
                <Envelope className="mx-auto h-8 w-8 text-primary mb-2" />
                <div className="text-base text-foreground font-medium">
                  Have questions, need support, or want to partner with us? Our team is here to help you every step of the way.
                </div>
                <a
                  href="mailto:hello@cloudforex.club"
                  className="text-primary font-semibold underline break-all"
                  aria-label="Email CloudForex support at hello@cloudforex.club"
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
