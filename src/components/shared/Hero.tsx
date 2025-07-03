import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Moon, SealCheck, Bank, UsersThree } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";
import { Navbar } from "@/components/shared/Navbar";
import { AccessPlatformButton } from "@/components/shared/AccessPlatformButton";

interface HeroProps {
  title: string;
  subtitle: string;
}

export const Hero = ({ title, subtitle }: HeroProps) => {
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
    <>
    <section id="hero" className="relative w-full pt-40 pb-32 md:pt-56 md:pb-44 overflow-hidden bg-background">
      <Navbar />
      {/* Cinematic background gradients and light rays */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute w-[900px] h-[900px] -top-[350px] -left-[300px] bg-gradient-to-br from-primary/30 via-primary/0 to-transparent blur-[120px] opacity-70 animate-pulse-slow" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120vw] h-40 bg-gradient-to-b from-white/60 via-white/0 to-transparent blur-2xl opacity-40" />
      </div>
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 flex flex-col items-center text-center">
        {/* Content */}
        <div className="flex-1 flex flex-col items-center text-center w-full">
          {/* Badge for users joined in last 7 days - moved just above the title */}
          <div className="relative w-full flex flex-col items-center text-center">
            <div className="mb-6">
                <span className="inline-flex items-center px-4 py-1 rounded-full bg-secondary text-foreground shadow-lg text-sm md:text-base font-normal animate-fade-in-up">
                {weeklyNumber.toLocaleString()} joined in 7 days
                </span>
            </div>
            {/* Cinematic, powerful header */}
            <div className="w-full flex flex-col items-center text-center">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-tight text-foreground mb-3 animate-fade-in-up">
                {title}
              </h1>
              <p className="text-2xl md:text-3xl text-foreground max-w-3xl mx-auto font-thin mb-16 animate-fade-in-up delay-200">
                {subtitle}
              </p>
            </div>
          </div>
          {/* Show Login or Access Platform based on user authentication */}
          <div className="block pt-8 w-full">
            <AccessPlatformButton mobileOnly />
            <AccessPlatformButton desktopOnly />
          </div>
        </div>
      </div>
    </section>
    {/* Features Section - Row with Icons on Left */}
    <section className="w-full pt-4 pb-8 border-t border-border">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row gap-6 md:gap-0 justify-between items-center text-center">
        <div className="flex items-center gap-2">
          <SealCheck size={22} weight="duotone" className="text-foreground" />
          <span className="text-base md:text-lg font-semibold">Regulated Tier-1 Liquidity</span>
        </div>
        <div className="flex items-center gap-2">
          <Bank size={22} weight="duotone" className="text-foreground" />
          <span className="text-base md:text-lg font-semibold">$500M+ AUM</span>
        </div>
        <div className="flex items-center gap-2">
          <UsersThree size={22} weight="duotone" className="text-foreground" />
          <span className="text-base md:text-lg font-semibold">50K+ Active Traders</span>
        </div>
        <div className="flex items-center gap-2">
          <Moon size={22} weight="duotone" className="text-foreground" />
          <span className="text-base md:text-lg font-semibold">Fully Decentralised</span>
        </div>
      </div>
    </section>
    </>
  );
};
