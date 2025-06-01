import { Timer, CaretDown, Users, CurrencyDollar, Shield, Buildings } from "@phosphor-icons/react";
import { Fire } from "@phosphor-icons/react";

export const QuickFeatures = () => {
  const features = [
    {
      icon: Timer,
      title: "Lightning-Fast Withdrawals",
      description: "Get your funds in seconds",
      color: "from-blue-500/20 to-blue-400/5",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-500"
    },
    {
      icon: CaretDown,
      title: "Ultra-Low Spreads",
      description: "Trade from just 0.1 pips",
      color: "from-green-500/20 to-green-400/5",
      iconBg: "bg-green-500/20",
      iconColor: "text-green-500"
    },
    {
      icon: Users,
      title: "24/7 Human Support",
      description: "Real experts, anytime",
      color: "from-purple-500/20 to-purple-400/5",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-500"
    },
    {
      icon: CurrencyDollar,
      title: "Zero Commission Trading",
      description: "Keep 100% of your profits",
      color: "from-amber-500/20 to-amber-400/5",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-500"
    },
    {
      icon: Shield,
      title: "Advanced Security",
      description: "TSL & 2FA multi-layer protection",
      color: "from-rose-500/20 to-rose-400/5",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-500"
    },
    {
      icon: Buildings,
      title: "Fully Regulated",
      description: "FINRA, FCA & CySEC compliant",
      color: "from-cyan-500/20 to-cyan-400/5",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-500"
    }
  ];

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Dots and grid background overlay for section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '100%' }}
        >
          <defs>
            <pattern id="dot-pattern-features" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#d4d4d8" opacity="0.10" />
            </pattern>
            <pattern id="grid-pattern-features" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="32" height="32" fill="none" stroke="#d4d4d8" strokeWidth="0.5" opacity="0.06" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-pattern-features)" />
          <rect width="100%" height="100%" fill="url(#grid-pattern-features)" />
        </svg>
      </div>
      <div className="container max-w-[1200px] mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto mb-8">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full bg-card/80 border border-border px-3 py-1 text-sm font-medium text-primary">
              <Fire className="w-4 h-4 mr-1" weight="regular" />
              Trusted Brokerage since 2022
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Trade Smarter, Withdraw Faster</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

function FeatureCard({ feature, index }: { feature: any; index: number }) {
  return (
    <div
      className="relative animate-on-scroll opacity-0 translate-y-4 transition-all duration-700"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-full w-full bg-card p-1 rounded-xl border border-border group hover:border-primary/20 transition-colors">
        <div className="relative h-full w-full border border-border rounded-lg p-3 overflow-hidden flex flex-col gap-2">
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
          <div className="relative flex items-center gap-3 mb-1">
            <div className={`rounded-lg w-10 h-10 flex items-center justify-center ${feature.iconBg}`}>
              <feature.icon className={`h-5 w-5 ${feature.iconColor}`} weight="regular" />
            </div>
            <h3 className="font-semibold text-base text-foreground">{feature.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground relative z-10">{feature.description}</p>
        </div>
      </div>
    </div>
  );
}
