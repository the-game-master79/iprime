import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/ui-components";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Envelope, Lightning } from "@phosphor-icons/react";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { ClEngine } from "@/components/shared/ClEngine";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Helmet } from "react-helmet-async";

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
    <>
      <Helmet>
        {/* ✅ Primary SEO Meta Tags */}
        <title>Arthaa | Best Trading Platform for Forex & Crypto</title>
        <meta name="description" content="Arthaa is the best trading platform to trade currency and crypto. Enjoy AI-powered analytics, ultra-fast execution, and zero commissions." />
        {/* ✅ Open Graph / Facebook */}
        <meta property="og:title" content="Arthaa | Best Trading Platform for Forex & Crypto" />
        <meta property="og:description" content="Arthaa is the best platform to trade currency and crypto with AI-powered tools, tight spreads, and real-time execution." />
        <meta property="og:url" content="https://www.arthaa.club/" />
        <meta property="og:image" content="/og-image/home.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Arthaa" />
        {/* ✅ Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Arthaa | Best Trading Platform for Forex & Crypto" />
        <meta name="twitter:description" content="Trade smarter on Arthaa — the best trading platform for forex and crypto in 2025. Zero commissions. 24/7 human support." />
        <meta name="twitter:image" content="/og-image/home.jpg" />
        {/* ✅ Canonical */}
        <link rel="canonical" href="https://www.arthaa.club/" />
      </Helmet>
      <PageTransition>
        <div className="flex min-h-screen flex-col bg-background text-foreground tracking-tight overflow-hidden relative">
          {/* Removed Dots and grid background overlay */}
          {/* Removed Magic Gradient Orb */}
          <main className="relative z-10">
            <Hero 
              title={
                <>
                  Institutional Liquidity.<br />
                  Retail Control.<br />
                  Global Access.
                </>
              }
              subtitle="Experience lightning-fast execution, smart analytics, and pro-grade tools—all in one powerful platform."
              action={{
                text: "Start Trading",
                href: "/auth/login"
              }}
            />
            
            {/* Lazy load below-the-fold sections */}
            <Suspense fallback={<div className="min-h-[200px]" />}> <QuickFeatures /> </Suspense>
            <Suspense fallback={<div className="min-h-[200px]" />}> <HowItWorks /> </Suspense>
            <Suspense fallback={<div className="min-h-[200px]" />}> <ClEngine /> </Suspense>
            <Suspense fallback={<div className="min-h-[200px]" />}> <Features /> </Suspense>
            <Suspense fallback={<div className="min-h-[200px]" />}> <FaqPage /> </Suspense>
            <Suspense fallback={<div className="min-h-[200px]" />}> <WallOfLove /> </Suspense>
            <Suspense fallback={<div className="min-h-[200px]" />}> <CtaPage /> </Suspense>
            <Footer />
            <Dialog open={showContact} onOpenChange={setShowContact}>
              <DialogContent className="bg-background text-foreground shadow-md backdrop-blur-sm backdrop-filter backdrop-opacity-90 border border-border/50 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-center">Contact Us</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center space-y-2">
                  <Envelope className="mx-auto h-8 w-8 text-primary mb-2" />
                  <div className="text-base text-foreground font-medium">
                    Have questions, need support, or want to partner with us? Our team is here to help you every step of the way.
                  </div>
                  <a
                    href="mailto:hello@arthaa.pro"
                    className="text-primary font-semibold underline break-all"
                    aria-label="Email Arthaa support at hello@arthaa.pro"
                  >
                    hello@arthaa.pro
                  </a>
                </div>
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </PageTransition>
    </>
  );
};

export default Index;
