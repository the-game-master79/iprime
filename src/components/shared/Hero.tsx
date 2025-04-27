import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Users } from "lucide-react";

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
  return (
    <section className="pt-24 pb-12">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl border">
          <div className="border rounded-xl p-8 md:p-10 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-[500px] h-[500px] -top-[200px] -right-[200px] bg-gradient-to-br from-primary/5 to-primary/0 blur-3xl rounded-full animate-pulse-slow" />
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="relative w-full md:w-1/2 space-y-6">
                {/* Feature Badges */}
                <div className="flex flex-wrap gap-2">
                  {/* AI Trading Badge */}
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {badge.icon}
                    <span className="ml-2">Advanced AI Trading</span>
                  </div>
                  {/* CPU Power Badge */}
                  <div className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600">
                    <Cpu className="h-4 w-4" />
                    <span className="ml-2">2X CPU Power</span>
                  </div>
                  {/* Active Users Badge */}
                  <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">
                    <Users className="h-4 w-4" />
                    <span className="ml-2">50,000+ Active Users</span>
                  </div>
                  {/* Dynamic Badges */}
                  {badges?.map((extraBadge, i) => (
                    <div 
                      key={i}
                      className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600"
                    >
                      {extraBadge.icon}
                      <span className="ml-2">{extraBadge.text}</span>
                    </div>
                  ))}
                </div>

                <h1 className="text-4xl pb-2 md:text-6xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/80 to-foreground/90">{title}</h1>
                <p className="text-xl text-muted-foreground">{description}</p>
                {action && (
                  <Link to={action.href} className="block pt-4">
                    <Button 
                      size="lg"
                      className="gap-2 rounded-xl px-8 bg-primary text-white text-md hover:bg-primary/90 transition-colors"
                    >
                      {action.text}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
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
