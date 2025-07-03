import { Timer, CaretDown, Users, CurrencyDollar, Shield, Buildings } from "@phosphor-icons/react";

// Solid color palette for each feature (no gradients)
const featureColors = [
	{
		bg: "bg-amber-500",
		iconBg: "bg-amber-500",
		iconColor: "text-white",
		text: "text-amber-700",
		border: "border-amber-200",
	},
	{
		bg: "bg-purple-600",
		iconBg: "bg-purple-600",
		iconColor: "text-white",
		text: "text-purple-700",
		border: "border-purple-200",
	},
	{
		bg: "bg-pink-500",
		iconBg: "bg-pink-500",
		iconColor: "text-white",
		text: "text-pink-700",
		border: "border-pink-200",
	},
	{
		bg: "bg-lime-800",
		iconBg: "bg-lime-800",
		iconColor: "text-white",
		text: "text-lime-900",
		border: "border-lime-200",
	},
	{
		bg: "bg-blue-600",
		iconBg: "bg-blue-600",
		iconColor: "text-white",
		text: "text-blue-800",
		border: "border-blue-200",
	},
	{
		bg: "bg-green-600",
		iconBg: "bg-green-600",
		iconColor: "text-white",
		text: "text-green-800",
		border: "border-green-200",
	},
];

export const QuickFeatures = () => {
	const features = [
		{
			icon: Timer,
			title: "On-Demand Payouts",
			description:
				"Instant 24/7 withdrawals in crypto or currency—no delays, no hassle, funds delivered within minutes.*",
		},
		{
			icon: CaretDown,
			title: "Ultra-Tight Spreads",
			description:
				"Trade forex and crypto with AI precision, tight spreads, and lightning-fast execution.",
		},
		{
			icon: Users,
			title: "24/7 Human Support",
			description:
				"Real human support, not bots—available 24/7 to assist you instantly, anytime you need help.",
		},
		{
			icon: CurrencyDollar,
			title: "No Charges or Fees",
			description:
				"Zero commissions, no hidden fees—keep 100% of your profits, whether you trade or invest.",
		},
		{
			icon: Shield,
			title: "Bank-Grade Security",
			description:
				"Your funds are secured with multi-layer protection, encryption, cold wallets, audits, and 24/7 monitoring.",
		},
		{
			icon: Buildings,
			title: "Regulated & Licensed",
			description:
				"A licensed, CySEC and FCA-compliant platform—trade forex and crypto with full legal trust and protection.",
		},
	];

	return (
		<section className="py-12 relative overflow-hidden">
			<div className="container max-w-[1200px] mx-auto px-4 relative z-10">
				<div className="flex flex-col items-start text-left gap-3 max-w-2xl mb-8 mt-12">
					<h2 className="text-5xl md:text-6xl font-bold text-foreground text-left w-full tracking-tight">
						The{" "}
						<span className="whitespace-nowrap">all-in-one</span>
						<br />
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
	const color = featureColors[index % featureColors.length];
	return (
		<div
			className={`relative transition-all duration-300 group hover:scale-[1.03]`}
			style={{ animationDelay: `${index * 100}ms` }}
		>
			<div
				className={`h-full w-full border ${color.border} bg-white rounded-2xl transition-colors group-hover:shadow-lg group-hover:rounded-2xl`}
			>
				<div className="relative h-full w-full rounded-2xl p-8 overflow-hidden flex flex-col gap-4 items-start">
					<div
						className={`rounded-xl w-16 h-16 flex items-center justify-center ${color.iconBg} shadow-lg border border-white/40 mb-2`}
					>
						<feature.icon
							className={`h-8 w-8 ${color.iconColor}`}
							weight="fill"
						/>
					</div>
					<h3
						className={`font-bold text-2xl md:text-3xl mt-2 text-left ${color.text} tracking-tight`}
					>
						{feature.title}
					</h3>
					<p
						className={`text-base md:text-lg relative z-10 text-left text-gray-600`}
					>
						{feature.description}
					</p>
				</div>
			</div>
		</div>
	);
}
