import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  badge: {
    icon: React.ReactNode;
    text: string;
  };
  title: string;
  description: string;
  action?: {
    text: string;
    href: string;
  };
}

export const Hero = ({ badge, title, description, action }: HeroProps) => {
  return (
    <section className="pt-24 pb-12">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl border">
          <div className="border rounded-xl p-8 md:p-10 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-[500px] h-[500px] -top-[200px] -right-[200px] bg-gradient-to-br from-primary/5 to-primary/0 blur-3xl rounded-full animate-pulse-slow" />
            </div>

            <div className="relative max-w-2xl space-y-6">
              <div className="flex items-center gap-2 text-primary">
                {badge.icon}
                <span className="text-sm font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                  {badge.text}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/80 to-foreground/90">{title}</h1>
              <p className="text-xl text-muted-foreground">{description}</p>
              {action && (
                <Link to={action.href} className="block pt-4">
                  <Button 
                    size="lg"
                    className="gap-2 rounded-full px-8 bg-primary text-white"
                  >
                    {action.text}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
