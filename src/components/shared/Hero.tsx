import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

export const Hero = ({ badge, badges, description, action, title, subtitle }: HeroProps) => {
  const { user } = useAuth();
  // Random image for the iPhone mockup
  const mockupImg = "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80";
  return (
    <section className="relative w-full pt-32 pb-20 overflow-hidden">
      {/* Cinematic background gradients and light rays */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute w-[900px] h-[900px] -top-[350px] -left-[300px] bg-gradient-to-br from-primary/30 via-primary/0 to-transparent blur-[120px] opacity-70 animate-pulse-slow" />
        <div className="absolute w-[700px] h-[700px] -bottom-[250px] -right-[200px] bg-gradient-to-tr from-emerald-400/20 to-primary/0 blur-[100px] opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120vw] h-40 bg-gradient-to-b from-white/60 via-white/0 to-transparent blur-2xl opacity-40" />
      </div>
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left: Content */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          {/* Feature Badges */}
          <div className="flex flex-nowrap gap-2 justify-center md:justify-start mb-2 w-full overflow-x-auto">
            <div className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {badge.icon}
              <span className="ml-1">{badge.text}</span>
            </div>
            <div className="inline-flex items-center rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-400">
              <Cpu className="h-4 w-4" />
              <span className="ml-1">18X CPU Power</span>
            </div>
            <div className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Users className="h-4 w-4" />
              <span className="ml-1">50,000+ Active Users</span>
            </div>
            {badges?.map((extraBadge, i) => (
              <div 
                key={i}
                className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400"
              >
                {extraBadge.icon}
                <span className="ml-1">{extraBadge.text}</span>
              </div>
            ))}
          </div>
          {/* Cinematic, powerful header */}
          <div className="w-full flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-br from-primary via-foreground to-foreground/80 drop-shadow-2xl mb-3 animate-fade-in-up">
              {title}
            </h1>
            {subtitle && (
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-foreground/90 mb-6 animate-fade-in-up delay-100">
                {subtitle}
              </h2>
            )}
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto md:mx-0 font-medium mb-2 animate-fade-in-up delay-200">
              {description}
            </p>
          </div>
          {/* Show Login or Access Platform based on user authentication */}
          <div className="block pt-4">
            {user ? (
              <>
                {/* Mobile button */}
                <Link to="/platform" className="block md:hidden">
                  <Button
                    size="sm"
                    className="gap-2 rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-base shadow-lg transition-all"
                  >
                    Access Platform
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                {/* Desktop button */}
                <Link to="/platform" className="hidden md:inline-block">
                  <Button
                    size="lg"
                    className="gap-2 rounded-xl px-7 hover:bg-primary/90 text-primary-foreground text-lg shadow-lg transition-all"
                  >
                    Access Platform
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Mobile button */}
                <Link to="/auth/login" className="block md:hidden">
                  <Button
                    size="sm"
                    className="gap-2 rounded-xl px-6 hover:bg-primary/90 text-primary-foreground text-base shadow-lg transition-all"
                  >
                    Login
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                {/* Desktop button */}
                <Link to="/auth/login" className="hidden md:inline-block">
                  <Button
                    size="lg"
                    className="gap-2 rounded-xl px-7 hover:bg-primary/90 text-primary-foreground text-lg shadow-lg transition-all"
                  >
                    Login
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Right: Mock iPhone */}
        <div className="flex-1 flex justify-center md:justify-end items-center mt-12 md:mt-0">
          <div className="relative w-[220px] h-[440px] md:w-[320px] md:h-[640px] rounded-[3rem] border-[8px] border-black/90 bg-zinc-100 shadow-2xl overflow-hidden flex flex-col items-center justify-end">
            {/* Speaker and camera (Dynamic Island) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
              <div className="relative w-28 h-7 bg-black rounded-full mb-2 flex items-center justify-center">
                {/* Camera inside dynamic island */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-900 rounded-full border-[2px] border-black/20 shadow-inner" />
              </div>
            </div>
            {/* Mock screen with random image */}
            <div className="w-full h-full flex flex-col items-center justify-center px-0 py-0">
              <img
                src={mockupImg}
                alt="App preview"
                className="w-full h-full object-cover rounded-[2rem] select-none pointer-events-none"
                draggable={false}
              />
            </div>
            {/* Home indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-black/20 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};
