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
  description: string;
  action?: {
    text: string;
    href: string;
  };
  lottie?: React.ReactNode;
}

export const Hero = ({ badge, badges, title, description, action, lottie }: HeroProps) => {
  const { user } = useAuth();
  return (
    <section className="pt-24 pb-12">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="bg-card/95 backdrop-blur-sm p-2 rounded-2xl border border-border">
          <div className="border border-border/50 rounded-xl p-8 md:p-10 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-[500px] h-[500px] -top-[200px] -right-[200px] bg-gradient-to-br from-primary/10 to-primary/5 blur-3xl rounded-full animate-pulse-slow" />
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="relative w-full md:w-1/2 space-y-6">
                {/* Feature Badges */}
                <div className="flex flex-wrap gap-2">
                  {/* AI Trading Badge */}
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {badge.icon}
                    <span className="ml-2">{badge.text}</span>
                  </div>
                  {/* CPU Power Badge */}
                  <div className="inline-flex items-center rounded-full bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-400">
                    <Cpu className="h-4 w-4" />
                    <span className="ml-2">18X CPU Power</span>
                  </div>
                  {/* Active Users Badge */}
                  <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                    <Users className="h-4 w-4" />
                    <span className="ml-2">50,000+ Active Users</span>
                  </div>
                  {/* Dynamic Badges */}
                  {badges?.map((extraBadge, i) => (
                    <div 
                      key={i}
                      className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400"
                    >
                      {extraBadge.icon}
                      <span className="ml-2">{extraBadge.text}</span>
                    </div>
                  ))}
                </div>

                <h1 className="text-4xl pb-2 md:text-6xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-foreground/80">{title}</h1>
                <p className="text-xl text-muted-foreground">{description}</p>
                {/* Show Login or Access Platform based on user authentication */}
                <div className="block pt-4">
                  {user ? (
                    <Link to="/platform">
                      <Button 
                        size="lg"
                        className="gap-2 rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-md transition-colors"
                      >
                        <span className="hidden md:inline">Access Platform</span>
                        <span className="inline md:hidden">Dashboard</span>
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/auth/login">
                      <Button 
                        size="lg"
                        className="gap-2 rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-md transition-colors"
                      >
                        Login
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Lottie Animation */}
              {lottie && (
                <div className="w-full md:w-1/2">
                  <div className="w-full aspect-square max-w-[500px] mx-auto">
                    {lottie}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
