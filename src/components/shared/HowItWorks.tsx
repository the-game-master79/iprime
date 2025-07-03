import { Fire } from "@phosphor-icons/react";

// Solid color palette for each step (no gradients)
const stepColors = [
	{
		border: "border-amber-200",
		numberBg: "bg-amber-500",
		numberText: "text-white",
		title: "text-amber-700",
	},
	{
		border: "border-purple-200",
		numberBg: "bg-purple-600",
		numberText: "text-white",
		title: "text-purple-700",
	},
	{
		border: "border-blue-200",
		numberBg: "bg-blue-600",
		numberText: "text-white",
		title: "text-blue-800",
	},
];

export const HowItWorks = () => {
	const steps = [
		{
			title: (
				<>
					Fund Your <br /> Account
				</>
			),
			description:
				"Add money to your account using variety of crypto payments and top up your account.",
			img: "/mask1.svg",
			imgAlt: "Fund your account",
			imgClass:
				"absolute right-2 left-auto top-2 w-32 h-32 md:-top-8 md:-right-16 md:left-auto md:w-[300px] md:h-[300px] z-10 pointer-events-none select-none transition-all",
		},
		{
			title: (
				<>
					Execute <br /> Trades
				</>
			),
			description:
				"Use your insights and place a trade, get your profits without any commissions and go for payout.",
			img: "/chartline.svg",
			imgAlt: "Chart line",
			imgClass:
				"absolute right-2 left-auto top-2 w-32 h-32 md:-top-16 md:-right-16 md:left-auto md:w-[300px] md:h-[300px] z-10 pointer-events-none select-none transition-all",
		},
		{
			title: (
				<>
					<span className="text-primary">Invest with <br /></span>
					<span>
						<span className="text-foreground">Alpha</span>
						<span className="text-card">Quant</span>
					</span>
				</>
			),
			description:
				"Diversify your idle funds by investing in automated trading handled by CL engine with losses margins.",
			img: "/alphaquant.svg",
			imgAlt: "AlphaQuant",
			imgClass:
				"absolute right-2 left-auto top-4 w-24 h-24 md:top-1/2 md:-translate-y-1/2 md:w-[100px] md:h-[300px] md:right-8 md:left-auto z-10 pointer-events-none select-none transition-all",
		},
	];

	return (
		<section className="my-24">
			<div className="container max-w-[1200px] mx-auto px-4">
				<div className="flex flex-col items-end text-right gap-4 max-w-2xl ml-auto mb-12">
					<h2 className="text-5xl md:text-6xl font-bold text-foreground text-right w-full tracking-tight">
						What should I do after sign up?
					</h2>
				</div>
				<div className="flex flex-col gap-8">
					{steps.map((step, i) => {
						const color = stepColors[i % stepColors.length];
						return (
							<div
								key={i}
								className={`relative bg-white p-6 rounded-2xl border ${color.border} flex flex-row items-center gap-8 overflow-hidden transition-all group hover:scale-[1.03] hover:shadow-xl group-hover:rounded-2xl`}
							>
								{/* Step number */}
								<div
									className={`hidden md:flex md:static md:mr-6 items-center justify-center w-12 h-12 rounded-xl ${color.numberBg} border border-white/40 font-bold ${color.numberText} text-2xl shadow-lg z-20 transition-all`}
								>
									{i + 1}
								</div>
								{/* Big overflowing image in the corner */}
								<img
									src={step.img}
									alt={step.imgAlt}
									className={step.imgClass}
									style={{ objectFit: "contain" }}
								/>
								{/* Content */}
								<div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center gap-4 md:gap-8 max-w-3xl">
									<h3
										className={`text-4xl font-extrabold mb-0 leading-tight tracking-tight ${color.title}`}
									>
										{step.title}
									</h3>
									<p className="text-xl font-medium text-gray-600 mb-0 text-left max-w-[340px]">
										{step.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};
