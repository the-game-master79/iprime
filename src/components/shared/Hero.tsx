import { useMemo } from "react";
import { AuthActionButton } from "./AuthActionButton";
import { Users } from "@phosphor-icons/react";

interface HeroProps {
  title: string | React.ReactNode;
  subtitle: string;
  description?: string;
  action?: {
    text: string;
    href: string;
  };
  badge?: {
    icon: React.ReactNode;
    text: string;
  };
}

export const Hero = ({ 
  title, 
  subtitle, 
  description, 
  action,
  badge 
}: HeroProps) => {
  // Generate a weekly-random number between 2000 and 6000, same for all users each week
  const weeklyNumber = useMemo(() => {
    const now = new Date();
    // Get the ISO week number
    const getWeek = (d: Date) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
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

  return (
    <section id="hero" className="relative w-full pt-40 pb-36 md:pt-48 md:pb-40 overflow-hidden bg-background">
      {/* Hero background image with corner radius and margins */}
      <div className="absolute inset-2 md:inset-3 lg:inset-4 z-0 rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/hero-bg.png)'
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>
      
      {/* Cinematic background gradients and light rays */}
      <div className="pointer-events-none absolute inset-2 md:inset-3 lg:inset-4 z-10 rounded-2xl overflow-hidden">
        <div className="absolute w-[900px] h-[900px] -top-[350px] -left-[300px] bg-gradient-to-br from-primary/30 via-primary/0 to-transparent blur-[120px] opacity-70 animate-pulse-slow" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120vw] h-40 bg-gradient-to-b from-white/60 via-white/0 to-transparent blur-2xl opacity-40" />
      </div>
      <div className="relative z-20 w-full max-w-[1200px] mx-auto px-4 flex flex-col items-center text-center">
        {/* Content */}
        <div className="flex-1 flex flex-col items-center text-center w-full">
          {/* Badge for users joined in last 7 days - moved just above the title */}
          <div className="relative w-full flex flex-col items-center text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white shadow-lg text-sm md:text-base font-medium animate-fade-in-up border border-white/20">
                <Users size={18} weight="fill" />
                {weeklyNumber.toLocaleString()} joined in 7 days
              </span>
            </div>
            <div className="container relative z-10 mx-auto px-4 text-center">
              {badge && (
                <div className="inline-flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {badge.icon}
                  {badge.text}
                </div>
              )}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground">
                {typeof title === 'string' && title.includes('.') ? (
                  <>
                    {title.split('.')[0]}.
                    <br />
                    {title.split('.')[1].trim()}
                  </>
                ) : (
                  title
                )}
              </h1>
              <p className="text-2xl md:text-3xl text-white max-w-3xl mx-auto font-thin mb-16 animate-fade-in-up delay-200">
                {subtitle}
              </p>
              {/* Auth-aware action button */}
              <div className="flex justify-center">
                <AuthActionButton className="px-6 py-4 text-2xl font-semibold shadow-lg"/>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};