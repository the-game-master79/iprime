import { Timer, CaretDown, Users, CurrencyDollar, Shield, Buildings } from "@phosphor-icons/react";

export const QuickFeatures = () => {
  const features = [
    {
      icon: Timer,
      title: "On-Demand Payouts",
      description: "Get your funds instantly. No delays, no hassle—currency and crypto withdrawals processed 24/7 within minutes.*",
      color: "from-amber-500 to-amber-400",
      iconBg: "bg-gradient-to-br from-amber-500 to-amber-400",
      iconColor: "text-white"
    },
    {
      icon: CaretDown,
      title: "Ultra-Tight Spreads",
      description: "Trade forex and crypto with tight spreads and commission-free executions on a fast, secure, AI-driven platform.",
      color: "from-purple-500 to-purple-600",
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      iconColor: "text-white"
    },
    {
      icon: Users,
      title: "24/7 Human Support",
      description: "Our real human support instantly gets connected with you - No AI b*llsh*t, ready to help you anytime and always.",
      color: "from-pink-500 to-pink-400",
      iconBg: "bg-gradient-to-br from-pink-500 to-pink-400",
      iconColor: "text-white"
    },
    {
      icon: CurrencyDollar,
      title: "No Charges or Fees",
      description: "Scalper, day trader, or long-term investor — your gains are yours alone. No hidden fees, no charges, no commissions.",
      color: "from-lime-800 to-lime-700",
      iconBg: "bg-gradient-to-br from-lime-800 to-lime-700",
      iconColor: "text-white"
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Your assets are safe with multi-layer protection such as: SSL, TSL, WAF, 2XO, Cold Wallets, Audits, 256-Bit encryption and more.",
      color: "from-blue-500 to-blue-600",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      iconColor: "text-white"
    },
    {
      icon: Buildings,
      title: "Regulated & Licensed",
      description: "Trade with full confidence on a licensed and regulated forex and crypto platform—compliant with CySEC and FCA.",
      color: "from-green-500 to-green-600",
      iconBg: "bg-gradient-to-br from-green-500 to-green-600",
      iconColor: "text-white"
    }
  ];

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Dots and grid background overlay for section */}
      {/* Removed SVG grid and dot patterns */}
      <div className="container max-w-[1200px] mx-auto px-4 relative z-10">
        <div className="flex flex-col items-start text-left gap-3 max-w-2xl mb-8 mt-12">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground text-left w-full">
            The <span className="whitespace-nowrap">all-in-one</span><br />
            trading ecosystem
          </h2>
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
      <div className="h-full w-full rounded-2xl transition-colors bg-transparent">
      <div className="relative h-full w-full rounded-2xl p-8 overflow-hidden flex flex-col gap-4 items-start">
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10 transition-opacity pointer-events-none`} />
        <div className="relative flex flex-col items-start gap-4 mb-2">
        <div className={`rounded-xl w-20 h-20 flex items-center justify-center ${feature.iconBg} shadow-2xl border border-border/20`}>
          <feature.icon className={`h-10 w-10 ${feature.iconColor}`} weight="fill" />
        </div>
        <h3
          className={`font-bold text-3xl md:text-4xl mt-2 text-left bg-clip-text text-transparent bg-gradient-to-br ${feature.color}`}
        >
          {feature.title}
        </h3>
        </div>
        <p
        className={`text-xl md:text-2xl relative z-10 text-left bg-clip-text text-transparent bg-gradient-to-br ${feature.color}`}
        >
        {feature.description}
        </p>
      </div>
      </div>
    </div>
  );
}
