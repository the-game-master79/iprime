import { Hero } from "@/components/shared/Hero";
import { Lightning, CardsThree, Robot, Brain, Kanban, ShieldCheck } from "@phosphor-icons/react";
import WallOfLove from "@/pages/testimonials/WallOfLove";
import CtaPage from "@/pages/cta/CtaPage";
import { Footer } from "@/components/shared/Footer";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/shared/Navbar";

const alphaQuantFeatures = [
	{
		icon: Lightning,
		title: "Real-Time AI Trades",
		description:
			"Receive ultra-fast, AI-powered trades for forex and crypto—analyzing markets as they change.",
		color: "from-orange-500 to-yellow-400",
		iconBg: "bg-gradient-to-br from-orange-500 to-yellow-400",
		iconColor: "text-white",
	},
	{
		icon: CardsThree,
		title: "Advanced Analytics",
		description:
			"Gain access to smart, backtesting, and predictive insights—built to sharpen your strategy and edge.",
		color: "from-blue-600 to-blue-400",
		iconBg: "bg-gradient-to-br from-blue-600 to-blue-400",
		iconColor: "text-white",
	},
	{
		icon: Robot,
		title: "Automated Execution",
		description:
			"Check your targets and let AlphaQuant handle the execution—24/7, with no downtime.",
		color: "from-purple-600 to-purple-400",
		iconBg: "bg-gradient-to-br from-purple-600 to-purple-400",
		iconColor: "text-white",
	},
	{
		icon: Brain,
		title: "Adaptive Machine Learning",
		description:
			"Trade smarter with self-improving algorithms that adapt to volatility, trends, and market behavior.",
		color: "from-pink-500 to-pink-400",
		iconBg: "bg-gradient-to-br from-pink-500 to-pink-400",
		iconColor: "text-white",
	},
	{
		icon: Kanban,
		title: "Performance Tracking",
		description:
			"Track every trade, PnL, ROI, and risk metric through real-time performance metrics and activity.",
		color: "from-green-600 to-green-400",
		iconBg: "bg-gradient-to-br from-green-600 to-green-400",
		iconColor: "text-white",
	},
	{
		icon: ShieldCheck,
		title: "Smart Risk Controls",
		description:
			"AI-driven risk management—automatically setting stop-loss, trailing, max drawdown, and exposures.",
		color: "from-gray-700 to-gray-400",
		iconBg: "bg-gradient-to-br from-gray-700 to-gray-400",
		iconColor: "text-white",
	},
];

const AlphaQuantPage = () => {
	return (
		<>
			<Helmet>
				<title>AlphaQuant | AI-Powered Trading Analytics | Arthaa</title>
				<meta name="description" content="Unlock AI-powered trading analytics and strategies with AlphaQuant on Arthaa. Maximize your trading potential with advanced tools and insights." />
				<link rel="canonical" href="https://www.arthaa.pro/alphaquant" />
			</Helmet>
			<Navbar />
			<Hero
				title={
					<>
						<span className="text-foreground">Alpha</span>
						<span className="text-card">Quant</span>
					</>
				}
				subtitle="AI-powered trading engine for advanced analytics, predictive signals, and automated strategies."
				action={{
					text: "Get Started",
					href: "/auth/login",
				}}
			/>
			{/* AlphaQuant-specific features */}
			<section className="py-12 relative overflow-hidden">
				<div className="container max-w-[1200px] mx-auto px-4 relative z-10">
					<div className="flex flex-col items-start text-left gap-3 max-w-2xl mb-8 mt-12">
						<h2 className="text-5xl md:text-6xl font-bold text-left w-full">
							<span className="text-black">Why </span>
							<span className="text-black">Alpha</span>
							<span className="text-card">Quant</span>
							<span className="text-black">?</span>
						</h2>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{alphaQuantFeatures.map((feature, index) => (
							<div
								key={index}
								className="relative opacity-100 translate-y-0 transition-all duration-700"
								// Removed animate-on-scroll and opacity-0 for immediate rendering
							>
								<div className="h-full w-full rounded-2xl transition-colors bg-transparent">
									<div className="relative h-full w-full rounded-2xl p-8 overflow-hidden flex flex-col gap-4 items-start">
										<div
											className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10 transition-opacity pointer-events-none`}
										/>
										<div className="relative flex flex-col items-start gap-4 mb-2">
											<div
												className={`rounded-xl w-20 h-20 flex items-center justify-center ${feature.iconBg} shadow-2xl border border-border/20`}
											>
												<feature.icon
													className={`h-10 w-10 ${feature.iconColor}`}
													weight="fill"
												/>
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
						))}
					</div>
				</div>
			</section>
			{/* How It Works section */}
			<section className="my-24">
				<div className="container max-w-[1200px] mx-auto px-4">
					<div className="flex flex-col items-end text-right gap-4 max-w-2xl ml-auto mb-12">
						<div className="flex items-center gap-2">
							{/* Optional: Add an icon or badge here if needed */}
						</div>
						<h2 className="text-5xl md:text-6xl font-bold text-right w-full">
							<span className="text-black">How should I use </span>
							<span className="text-black">Alpha</span>
							<span className="text-card">Quant</span>
							<span className="text-black">?</span>
						</h2>
					</div>
					<div className="flex flex-col gap-8">
						{/* Step 1 */}
						<div className="relative bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-row items-center gap-8 overflow-hidden">
							<div className="hidden md:flex md:static md:mr-6 items-center justify-center w-10 h-10 rounded-lg bg-white border border-primary/30 font-bold text-primary text-xl shadow-md z-20">
								1
							</div>
							<img
								src="/mask1.svg"
								alt="Fund your account"
								className="absolute right-2 left-auto top-2 w-32 h-32 md:-top-8 md:-right-16 md:left-auto md:w-[300px] md:h-[300px] z-10 pointer-events-none select-none transition-all"
								style={{ objectFit: "contain" }}
							/>
							<div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center gap-4 md:gap-8 max-w-3xl">
								<h3 className="text-4xl font-extrabold text-primary mb-0 leading-tight">
									Fund Your <br /> Account
								</h3>
								<p className="text-xl font-medium text-primary/80 mb-0 text-left max-w-[340px]">
									Add money to your account using variety of crypto payments and top up your account.
								</p>
							</div>
						</div>
						{/* Step 2 */}
						<div className="relative bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-row items-center gap-8 overflow-hidden">
							<div className="hidden md:flex md:static md:mr-6 items-center justify-center w-10 h-10 rounded-lg bg-white border border-primary/30 font-bold text-primary text-xl shadow-md z-20">
								2
							</div>
							<img
								src="/chartline.svg"
								alt="Chart line"
								className="absolute right-2 left-auto top-2 w-32 h-32 md:-top-16 md:-right-16 md:left-auto md:w-[300px] md:h-[300px] z-10 pointer-events-none select-none transition-all"
								style={{ objectFit: "contain" }}
							/>
							<div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center gap-4 md:gap-8 max-w-3xl">
								<h3 className="text-4xl font-extrabold text-primary mb-0 leading-tight">
									Subscribe <br /> a Plan
								</h3>
								<p className="text-xl font-medium text-primary/80 mb-0 text-left max-w-[340px]">
									Select a plan that suits your needs like returns, frequency and amount, and subscribe to it.
								</p>
							</div>
						</div>
						{/* Step 3 */}
						<div className="relative bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-row items-center gap-8 overflow-hidden">
							<div className="hidden md:flex md:static md:mr-6 items-center justify-center w-10 h-10 rounded-lg bg-white border border-primary/30 font-bold text-primary text-xl shadow-md z-20">
								3
							</div>
							<img
								src="/alphaquant.svg"
								alt="AlphaQuant"
								className="absolute right-2 left-auto top-4 w-24 h-24 md:top-1/2 md:-translate-y-1/2 md:w-[100px] md:h-[300px] md:right-8 md:left-auto z-10 pointer-events-none select-none transition-all"
								style={{ objectFit: "contain" }}
							/>
							<div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center gap-4 md:gap-8 max-w-3xl">
								<h3 className="text-4xl font-extrabold mb-0 leading-tight">
									<span>
										<span className="text-foreground">Alpha</span>
										<span className="text-card">Quant</span> <br />
									</span>
									<span className="text-primary">will Trade <br /></span>
								</h3>
								<p className="text-xl font-medium text-primary/80 mb-0 text-left max-w-[340px]">
									AlphaQuant will execute trades using trainer AI strategies, and you will receive profits exactly at 12:00 UTC every day.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>
			{/* Add WallOfLove, CtaPage, and Footer below */}
			<WallOfLove />
			<CtaPage />
			<Footer />
		</>
	);
};

export default AlphaQuantPage;
