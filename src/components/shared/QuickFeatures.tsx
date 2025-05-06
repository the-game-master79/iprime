import { Timer, CaretDown, Users, CurrencyDollar, Shield, Buildings } from "@phosphor-icons/react";
import { Fire } from "@phosphor-icons/react";

export const QuickFeatures = () => {
  const features = [
    {
      icon: Timer,
      title: "Instant Withdrawals",
      description: "Fastest Payouts in Seconds",
      color: "from-blue-500/20 to-blue-400/5",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-500"
    },
    {
      icon: CaretDown,
      title: "Lowest Spreads",
      description: "Starting from 0.1 pips",
      color: "from-green-500/20 to-green-400/5",
      iconBg: "bg-green-500/20",
      iconColor: "text-green-500"
    },
    {
      icon: Users,
      title: "24/7 Support",
      description: "Always here to help you",
      color: "from-purple-500/20 to-purple-400/5",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-500"
    },
    {
      icon: CurrencyDollar,
      title: "Zero Commission",
      description: "Trade with no extra fees",
      color: "from-amber-500/20 to-amber-400/5",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-500"
    },
    {
      icon: Shield,
      title: "TSL + W2FA Security",
      description: "Multi-layer Protection",
      color: "from-rose-500/20 to-rose-400/5",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-500"
    },
    {
      icon: Buildings,
      title: "Regulated Exchange",
      description: "FINRA, FCA & CySEC",
      color: "from-cyan-500/20 to-cyan-400/5",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-500"
    }
  ];

  return (
    <section className="py-12">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto mb-8">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full bg-card/80 border border-border px-3 py-1 text-sm font-medium text-primary">
              <Fire className="w-4 h-4 mr-1" weight="regular" />
              Trusted Brokerage since 2022
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Time to Make a Profit</h2>
          <p className="text-muted-foreground">
            Our motto is Speed or nothing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="relative animate-on-scroll opacity-0 translate-y-4 transition-all duration-700" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="h-full w-full bg-card p-1.5 rounded-2xl border border-[#282828] group hover:border-primary/20 transition-colors">
                <div className="relative h-full w-full border border-border rounded-xl p-4 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative flex items-center gap-4">
                    <div className={`rounded-xl w-12 h-12 flex items-center justify-center ${feature.iconBg}`}>
                      <feature.icon className={`h-6 w-6 ${feature.iconColor}`} weight="regular" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
