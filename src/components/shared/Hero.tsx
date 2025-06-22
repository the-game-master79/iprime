import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Rabbit as RabbitIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowCircleRight, Moon, Sun, SealCheck } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Navbar } from "@/components/shared/Navbar"; // <-- Add this import

interface HeroProps {
  badge: {
    icon: React.ReactNode;
    text: string;
  };
  badges?: {
    icon: React.ReactNode;
    text: string;
  }[];
  title: string;
  subtitle?: string; // Optional subtitle prop
  description: string;
  action?: {
    text: string;
    href: string;
  };
  lottie?: React.ReactNode;
}

export const Hero = ({
  title = "Institutional Liquidity.",
  subtitle = "Experience lightning-fast execution, smart analytics, and pro-grade tools—all in one powerful platform.",
}: Partial<HeroProps> = {}) => {
  const { user } = useAuth();

  // Navbar logic
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme, theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Generate a weekly-random number between 2000 and 6000, same for all users each week
  const weeklyNumber = useMemo(() => {
    const now = new Date();
    // Get the ISO week number
    const getWeek = (d: Date) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1)/7);
    };
    const week = getWeek(now);
    const year = now.getUTCFullYear();
    // Deterministic seed based on year and week
    const seed = year * 100 + week;
    // Simple LCG for deterministic pseudo-random
    let x = Math.sin(seed) * 10000;
    let num = Math.floor((x - Math.floor(x)) * 4000) + 2000;
    return num;
  }, []);

  // Use local webp hero image instead of Unsplash and iPhone mockup
  const mockupImg = "/arthaa-hero.webp";
  return (
    <section className="relative w-full pt-32 pb-10 md:pb-20 overflow-hidden bg-primary">
      <Navbar /> {/* <-- Use the shared Navbar at the top */}
      {/* Cinematic background gradients and light rays */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute w-[900px] h-[900px] -top-[350px] -left-[300px] bg-gradient-to-br from-primary/30 via-primary/0 to-transparent blur-[120px] opacity-70 animate-pulse-slow" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120vw] h-40 bg-gradient-to-b from-white/60 via-white/0 to-transparent blur-2xl opacity-40" />
      </div>
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 flex flex-col items-center md:items-start md:text-left">
        {/* Content */}
        <div className="flex-1 flex flex-col items-start md:items-start md:text-left">
          {/* Cinematic, powerful header */}
          <div className="w-full flex flex-col items-start md:items-start md:text-left">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-tight text-white mb-3 animate-fade-in-up">
              {title}
            </h1>
            {subtitle && (
              <p className="text-2xl md:text-3xl text-white max-w-3xl mx-auto md:mx-0 font-thin mb-16 animate-fade-in-up delay-200">
                {subtitle}
              </p>
            )}
          </div>
          {/* Show Login or Access Platform based on user authentication */}
          <div className="block pt-8 w-full">
            {user ? (
              <>
                {/* Mobile button */}
                <Link to="/platform" className="block md:hidden w-full">
                  <Button
                    size="sm"
                    className="gap-2 px-6 bg-card text-card-foreground hover:bg-card/95 text-base transition-all h-14 rounded-md w-full"
                  >
                    Access Platform
                  </Button>
                </Link>
                {/* Desktop button */}
                <Link to="/platform" className="hidden md:inline-block">
                  <Button
                    size="lg"
                    className="gap-2 px-7 h-14 bg-card text-card-foreground hover:bg-card/95 text-lg md:text-2xl transition-all rounded-md"
                  >
                    Access Platform
                  </Button>
                </Link>
                {/* SealCheck icons row always directly below the button */}
                <div className="w-full flex flex-row flex-wrap items-center justify-center gap-4 mt-6" style={{ maxWidth: 340 }}>
                  <div className="flex flex-row items-center gap-2 whitespace-nowrap">
                    <SealCheck size={24} className="text-white" weight="fill" />
                    <span className="text-white text-md font-book tracking-tight">Zero commissions</span>
                  </div>
                  <div className="flex flex-row items-center gap-2 whitespace-nowrap">
                    <SealCheck size={24} className="text-white" weight="fill" />
                    <span className="text-white text-md font-book tracking-tight">1.5X faster payouts</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-0 w-full">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-start md:justify-start gap-6 w-full">
                  <Link to="/auth/login" className="block w-full md:w-auto">
                    <Button
                      size="lg"
                      className="gap-4 px-12 py-8 h-14 text-lg md:text-2xl font-extrabold bg-card text-card-foreground hover:bg-card/95 transition-all rounded-md w-full md:w-auto"
                    >
                      <span className="hidden md:inline">Get your Free Account</span>
                      <span className="inline md:hidden">Register</span>
                    </Button>
                  </Link>
                  {/* Stats: always next to the button on desktop */}
                  <div className="hidden md:flex flex-row items-center gap-4 justify-start w-full md:w-auto mt-6 md:mt-0">
                    <RabbitIcon size={40} weight="bold" className="text-white" />
                    <div className="flex flex-col items-start">
                      <span className="text-base md:text-lg font-bold text-white leading-tight tracking-tight">
                        {weeklyNumber.toLocaleString()} traders joined 
                      </span>
                      <span className="text-base md:text-lg font-regular text-white mt-0 leading-tight tracking-tight" style={{ marginTop: 0, lineHeight: "1.1" }}>
                        Arthaa in the last 7 days
                      </span>
                    </div>
                  </div>
                </div>
                {/* Mobile: SealCheck row first, then stats row */}
                <div className="flex flex-row flex-wrap items-center justify-center gap-4 mt-4 md:hidden" style={{ maxWidth: 340 }}>
                  <div className="flex flex-row items-center gap-2 whitespace-nowrap">
                    <SealCheck size={24} className="text-white" weight="fill" />
                    <span className="text-white text-sm font-medium tracking-tight">Zero commissions</span>
                  </div>
                  <div className="flex flex-row items-center gap-2 whitespace-nowrap">
                    <SealCheck size={24} className="text-white" weight="fill" />
                    <span className="text-white text-sm font-medium tracking-tight">1.5X faster payouts</span>
                  </div>
                </div>
                <div className="flex md:hidden flex-row items-center gap-4 justify-start w-full mt-6">
                  <RabbitIcon size={40} weight="bold" className="text-white" />
                  <div className="flex flex-col items-start">
                    <span className="text-base md:text-lg font-bold text-white leading-tight tracking-tight">
                      {weeklyNumber.toLocaleString()} traders joined 
                    </span>
                    <span className="text-base md:text-lg font-regular text-white mt-0 leading-tight tracking-tight" style={{ marginTop: 0, lineHeight: "1.1" }}>
                      Arthaa in the last 7 days
                    </span>
                  </div>
                </div>
                {/* Desktop: SealCheck row below button as before */}
                <div className="hidden md:flex flex-row flex-wrap items-center justify-center gap-4" style={{ maxWidth: 340, marginTop: 24 }}>
                  <div className="flex flex-row items-center gap-2 whitespace-nowrap">
                    <SealCheck size={24} className="text-white" weight="fill" />
                    <span className="text-white text-sm font-medium tracking-tight">Zero commissions</span>
                  </div>
                  <div className="flex flex-row items-center gap-2 whitespace-nowrap">
                    <SealCheck size={24} className="text-white" weight="fill" />
                    <span className="text-white text-sm font-medium tracking-tight">1.5X faster payouts</span>
                  </div>
                </div>
              </div>
            )}
            {/* ...existing code... */}
          </div>
        </div>
      </div>
    </section>
  );
};
