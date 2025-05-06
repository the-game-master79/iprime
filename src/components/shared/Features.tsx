import { Brain, Cpu, Globe, ShieldStar, Users, Gift, Fire } from "@phosphor-icons/react";

const features = [
  {
    icon: Brain,
    title: "Powered by GenSpark 2.0",
    color: "from-blue-500 to-blue-600",
    hoverGradient: "from-blue-400/10 via-blue-400/5 to-transparent",
    iconColor: "text-blue-500"
  },
  {
    icon: Cpu,
    title: "Upto 18X CPU Power",
    color: "from-green-500 to-green-600",
    hoverGradient: "from-green-400/10 via-green-400/5 to-transparent",
    iconColor: "text-green-500"
  },
  {
    icon: Globe,
    title: "Access to Global Markets",
    color: "from-purple-500 to-purple-600",
    hoverGradient: "from-purple-400/10 via-purple-400/5 to-transparent",
    iconColor: "text-purple-500"
  },
  {
    icon: Gift,
    title: "Exclusive Rewards & Bonuses",
    color: "from-amber-500 to-amber-600",
    hoverGradient: "from-amber-400/10 via-amber-400/5 to-transparent",
    iconColor: "text-amber-500"
  },
  {
    icon: ShieldStar,
    title: "TLS & WAF Security",
    color: "from-rose-500 to-rose-600",
    hoverGradient: "from-rose-400/10 via-rose-400/5 to-transparent",
    iconColor: "text-rose-500"
  },
  {
    icon: Users,
    title: "24/7 Support",
    color: "from-cyan-500 to-cyan-600",
    hoverGradient: "from-cyan-400/10 via-cyan-400/5 to-transparent",
    iconColor: "text-cyan-500"
  }
];

export const Features = () => {
  return (
    <section id="advanced-trading" className="py-16 md:py-24 bg-background/50">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12 md:mb-16">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full bg-card/80 border border-border/30 px-3 py-1 text-sm font-medium text-primary">
              <Fire className="w-4 h-4 mr-1" weight="fill" />
              Features
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">Advanced Trading Features</h2>
          <p className="text-lg text-muted-foreground">
            Experience the future of forex trading with our cutting-edge platform powered by AI and cloud technology.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="relative bg-card/80 p-2 rounded-2xl border border-border/30 group transition-all duration-300">
              <div className="h-full w-full border border-border/20 rounded-xl p-6">
                <div className="flex flex-col gap-4">
                  <div className="w-full h-24 rounded-xl bg-gradient-to-br from-background to-background/50 flex items-center justify-center relative overflow-hidden group-hover:shadow-lg transition-all duration-300">
                    {/* Gradient background that shows on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className={`relative w-16 h-16 rounded-xl bg-card border border-border/20 flex items-center justify-center shadow-lg ${feature.iconColor}`}>
                      <feature.icon className="h-8 w-8" weight="fill" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-xl text-center text-foreground">{feature.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
