import { Globe } from "@/components/magicui/globe";
import { Triangle } from "phosphor-react";
import { sub } from "date-fns";

const features = [
	{
		title: "GenSpark 2.1",
		subtitle: "Powered by",
	},
	{
		title: "18.2X",
		subtitle: "Faster than all brokers",
	},
	{
		title: "Global markets",
		subtitle: "Your one-touch access to",
	},
	{
		title: "Exclusive Trading Bonus & Rewards",
	},
	{
		title: "Profit & Loss",
	},
	{
		title: "CLE",
		subtitle: "The world's fastest*",
	},
	{
		title: "NextGen Insights",
		subtitle: "AI-powered analytics",
	},
];

export const Features = () => {
	return (
		<section id="advanced-trading" className="py-16 md:py-24">
			<div className="container max-w-[1200px] mx-auto px-4">
				<div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12">
					<h2 className="text-5xl md:text-6xl font-bold text-foreground text-center w-full">
						Automated & Intelligent Trading Suite
					</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 grid-rows-7 md:grid-rows-3 gap-4">
					{features.map((feature, index) => {
						// Define bento grid styles for each card
						let gridClass = "col-span-1 row-span-1";
						let extraClass = "";
						if (index === 0) gridClass = "md:col-span-2 md:row-span-2"; // GenSpark 2.1: large
						else if (index === 1) {
							gridClass = "md:col-span-2 md:row-span-1"; // 18.2X: wide
							extraClass = " bg-gradient-to-r from-pink-400 via-pink-500 to-fuchsia-500 backdrop-blur-xl bg-opacity-80 drop-shadow-[0_4px_32px_rgba(255,255,255,0.45)]";
						}
						else if (index === 2) gridClass = "md:col-span-1 md:row-span-2"; // Global markets: tall
						else if (feature.title === "NextGen Insights") gridClass = "md:col-start-4 md:row-start-3 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center"; // Use grid card for NextGen Insights
						// others remain default

						return (
							<div
								key={index}
								className={
									`relative group overflow-hidden shadow-lg transition-all duration-300 flex items-start justify-start ${gridClass} rounded-lg` +
									(index === 0
										? " bg-foreground"
										: feature.title === "Global markets"
											? " bg-[#D9D9D9]"
											: index === 1
												? extraClass
												: feature.title === "CLE"
													? " bg-[#1A66FF] flex items-center justify-center"
													: feature.title === "Profit & Loss"
														? " flex flex-col justify-stretch items-stretch divide-y-2 divide-white h-full min-h-0"
														: feature.title === "NextGen Insights"
															? ""
															: " backdrop-blur-md")
								}
								style={{
									boxShadow: '0 4px 32px 0 rgba(0,0,0,0.08)',
								}}
							>
								{/* Globe for Global markets */}
								{feature.title === "Global markets" && (
									<div className="relative flex size-full max-w-lg items-center justify-center overflow-hidden rounded-lg bg-background px-40 pb-40 pt-8 md:pb-60">
										{/* Subtitle styled like "Powered by", above title, in gray */}
										<div className="absolute left-8 top-8 z-20 text-left">
											{feature.subtitle && (
												<p className="text-sm md:text-base font-medium text-muted-foreground mb-1">
													{feature.subtitle}
												</p>
											)}
											<h3 className="font-extrabold text-4xl md:text-6xl drop-shadow-sm tracking-tight text-foreground">
												{feature.title}
											</h3>
										</div>
										<Globe className="top-28 w-72 h-72 md:w-[28rem] md:h-[28rem]" />
										<div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
									</div>
								)}
								{/* GenSpark card: SVG in center, title/subtitle at bottom */}
								{feature.title === "GenSpark 2.1" && feature.subtitle && (
									<>
										<div className="absolute inset-0 flex items-center justify-center z-0">
											<img
												src="/genspark.svg"
												alt="GenSpark"
												className="w-[52rem] h-[52rem] md:w-[72rem] md:h-[72rem] object-contain overflow-hidden pointer-events-none select-none transition-all"
											/>
										</div>
										<div className="flex flex-col items-start gap-2 pl-8 pb-8 z-10 w-full mt-auto absolute bottom-0 left-0">
											<p className="text-sm md:text-base font-medium text-background">
												{feature.subtitle}
											</p>
											<h3 className="font-extrabold tracking-tight !text-left w-full text-background !text-4xl md:!text-6xl">
												{feature.title}
											</h3>
										</div>
									</>
								)}
								{/* 18.2X card: subtitle left, 18.2X right in bordered container */}
								{feature.title === "18.2X" && feature.subtitle && (
									<div className="flex flex-col md:flex-row items-center justify-center md:justify-between w-full px-8 z-10 my-auto h-24 md:h-full text-center gap-2 md:gap-0">
										<p className="text-base md:text-4xl font-medium text-white md:text-left">
											{feature.subtitle}
										</p>
										<div className="border-2 border-white rounded-lg px-6 py-2 flex items-center justify-center mt-2 md:mt-0">
											<h3 className="font-extrabold text-5xl md:text-6xl tracking-tight text-white">
												{feature.title}
											</h3>
										</div>
									</div>
								)}
								{/* Default card */}
								{feature.title !== "GenSpark 2.1" && feature.title !== "18.2X" && feature.title !== "Global markets" && (
									<div className={
										(feature.title === "Profit & Loss"
											? "flex flex-col justify-stretch items-stretch w-full h-full min-h-0 flex-1"
											: feature.title === "CLE"
												? "flex flex-col justify-center items-center w-full h-full "
												: feature.title === "Exclusive Trading Bonus & Rewards"
													? "flex flex-col justify-center items-center "
													: feature.title === "NextGen Insights"
														? "flex flex-col items-center justify-center w-full h-full py-12"
														: "") +
										"rounded-lg w-full"
									}>
										{feature.title === "Profit & Loss" ? (
											<div className="flex flex-row md:flex-col w-full h-full">
												{/* Profit */}
												<div
													className="
														flex-1
														flex flex-col items-center justify-center py-6 pl-2 pr-2 min-h-0
														md:flex-row md:items-center md:justify-between md:px-6
													"
													style={{ background: "#2ECC71" }}
												>
													{/* Mobile: label above triangle, Desktop: label left, triangle right */}
													<span className="font-bold text-3xl md:text-5xl mb-1 text-[#C9FFDF] md:mb-0">
														Profit
													</span>
													<Triangle
														weight="fill"
														size={40}
														className="text-[#C9FFDF] rotate-0 mt-2 md:mt-0 md:ml-4"
													/>
												</div>
												{/* Loss */}
												<div
													className="
														flex-1
														flex flex-col items-center justify-center py-6 pl-2 pr-2 min-h-0
														md:flex-row md:items-center md:justify-between md:px-6
													"
													style={{ background: "#FF005C" }}
												>
													<span className="font-bold text-3xl md:text-5xl mb-1 text-[#FFC7DB] md:mb-0">
														Loss
													</span>
													<Triangle
														weight="fill"
														size={40}
														className="text-[#FFC7DB] rotate-180 mt-2 md:mt-0 md:ml-4"
													/>
												</div>
											</div>
										) : feature.title === "CLE" ? (
											<div className="flex flex-col items-center justify-center w-full h-full py-12">
												{feature.subtitle && (
													<p className="text-base md:text-lg font-medium text-white mb-2 text-center">
														{feature.subtitle}
													</p>
												)}
												<h3 className="font-extrabold drop-shadow-sm tracking-tight text-center text-white md:text-7xl text-5xl">
													{feature.title}
												</h3>
											</div>
										) : feature.title === "Exclusive Trading Bonus & Rewards" ? (
											<div className="flex flex-col items-center justify-center w-full h-full py-12 gap-2 bg-foreground">
												<span className="inline-block bg-[#FDE68A] text-[#B45309] font-semibold px-6 py-2 rounded-full text-lg shadow mb-1 transition-transform duration-200 hover:scale-105 hover:shadow-lg">Rewards</span>
												<span className="inline-block bg-[#C7D2FE] text-[#3730A3] font-semibold px-6 py-2 rounded-full text-lg shadow mb-1 transition-transform duration-200 hover:scale-105 hover:shadow-lg">Bonuses</span>
												<span className="inline-block bg-[#FCA5A5] text-[#991B1B] font-semibold px-6 py-2 rounded-full text-lg shadow transition-transform duration-200 hover:scale-105 hover:shadow-lg">Awards</span>
											</div>
										) : feature.title === "NextGen Insights" ? (
											<>
												{feature.subtitle && (
													<p className="text-base md:text-lg font-medium text-white mb-2 text-center">
														{feature.subtitle}
													</p>
												)}
												<h3 className="font-extrabold drop-shadow-sm tracking-tight text-center text-white md:text-5xl text-4xl">
													{feature.title}
												</h3>
											</>
										) : (
											<div className="py-12 pl-8">
												{feature.subtitle && (
													<p className={
														feature.title === "CL Engine"
															? "text-base md:text-lg font-medium text-muted-foreground mb-2"
															: "hidden"
													}>
														{feature.subtitle}
													</p>
												)}
												<h3 className={
													"font-extrabold text-2xl md:text-3xl drop-shadow-sm tracking-tight text-left " +
													(feature.title === "Profit & Loss"
														? "text-yellow-900 !text-4xl md:!text-5xl"
														: "text-foreground")
												}>
													{feature.title}
												</h3>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};
