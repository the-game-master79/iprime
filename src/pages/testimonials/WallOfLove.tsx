import { PageTransition } from "@/components/ui-components";
import { Navbar } from "@/components/shared/Navbar";
import { Fire } from "@phosphor-icons/react";

const testimonials = [
	{
		name: "Priya Sharma",
		role: "Equity Analyst, Mumbai",
		image: null,
		content:
			"CloudForex's AI trading analytics have made my forex and cryptocurrency trading so much easier. The platform is intuitive and the support team is always there for me. I love the trading bonus and the secure trading environment.",
	},
	{
		name: "Arjun Patel",
		role: "Crypto Trader, Delhi",
		image: null,
		content:
			"I switched from Binomo and Quotex to CloudForex and haven't looked back. The AI-powered forex trading platform is fast, reliable, and the best exness alternative I've found.",
	},
	{
		name: "Emily Chen",
		role: "Retail Investor, Singapore",
		image: null,
		content:
			"As a beginner, I was nervous about investing. CloudForex's learning resources and AI trading features gave me the confidence to start. Now, I trade both crypto and forex with ease.",
	},
	{
		name: "Ravi Kumar",
		role: "Day Trader, Bangalore",
		image: null,
		content:
			"Order execution is lightning-fast and the platform is super secure. I appreciate the transparency and the real human support, which is rare in other investment platforms.",
	},
	{
		name: "Sofia Rodriguez",
		role: "Forex Specialist, Madrid",
		image: null,
		content:
			"The charting tools and AI-powered indicators are top-notch. I feel more confident in my trades and love the trading bonuses.",
	},
	{
		name: "David Park",
		role: "Portfolio Manager, Seoul",
		image: null,
		content:
			"CloudForex is a true cloud trading platform. The risk management features help me stay disciplined, and the platform is a solid alternative to Binomo and Quotex.",
	},
	{
		name: "Ananya Singh",
		role: "Crypto Enthusiast, Pune",
		image: null,
		content:
			"I love how easy it is to diversify between crypto and forex. The AI trading engine is a game changer and the platform feels very secure.",
	},
	{
		name: "Thomas Weber",
		role: "Financial Analyst, Berlin",
		image: null,
		content:
			"The AI predictions are impressively accurate. It's like having a professional analyst by your side. CloudForex is my go-to for cryptocurrency trading and investment.",
	},
];

const WallOfLove = () => {
	return (
		<PageTransition>
			<div className="min-h-screen">
				<Navbar />
				<main className="py-24">
					<div className="container max-w-[1200px] mx-auto px-4">
						<div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12">
							<div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
								<Fire className="w-4 h-4 mr-1" weight="fill" />
								Client Testimonials
							</div>
							<h2 className="text-4xl font-bold">Wall of Love</h2>
							<p className="text-muted-foreground">
								See what our users have to say about their experience with CloudForex
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{testimonials.map((testimonial, i) => (
								<div
									key={i}
									className="bg-card border border-border/50 p-6 rounded-xl animate-on-scroll opacity-0 translate-y-4 transition-all duration-700 hover:border-primary/20"
									style={{ animationDelay: `${i * 100}ms` }}
								>
									<div className="flex items-center gap-4 mb-4">
										<img
											src={
												testimonial.image
													? testimonial.image
													: "/profile-placeholder.svg"
											}
											alt={testimonial.name}
											className="w-12 h-12 rounded-full object-cover"
										/>
										<div>
											<h4 className="font-medium text-foreground">
												{testimonial.name}
											</h4>
											<p className="text-sm text-muted-foreground">
												{testimonial.role}
											</p>
										</div>
									</div>
									<p className="text-muted-foreground">
										{testimonial.content}
									</p>
								</div>
							))}
						</div>
					</div>
				</main>
			</div>
		</PageTransition>
	);
};

export default WallOfLove;
