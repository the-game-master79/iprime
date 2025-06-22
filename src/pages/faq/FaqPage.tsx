import { PageTransition } from "@/components/ui-components";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, ChartLineUp, CurrencyCircleDollar, GlobeSimple, LockKey, Users, Question } from "@phosphor-icons/react";

const faqCategories = [
	{
		icon: Brain,
		title: "Deposits",
		questions: [
			{
				q: "How do I deposit funds?",
				a: "To deposit funds, log in to your Arthaa dashboard and click on \"Cashier\" in the dashboard. Choose your preferred payment method—UPI, or cryptocurrency (USDT, BTC, ETH, etc.)—and follow the instructions. ✅ All deposits are processed securely with real-time tracking.",
			},
			{
				q: "Are there any deposit fees or hidden charges?",
				a: "No. Arthaa does not charge any deposit fees. You keep 100% of your funds. However, third-party providers (like crypto networks or banks) may apply a small transaction fee.",
			},
			{
				q: "What are the minimum and maximum deposit limits?",
				a: "The minimum deposit on Arthaa is just $10, depending on your currency. There is no maximum deposit limit for verified accounts.💡 We support high-volume deposits for advanced traders and institutions.",
			},
			{
				q: "How long do deposits take to reflect in my account?",
				a: "Most deposits are instant, especially with crypto, UPI, and card payments. Non-crypto deposits may take up to 2 hours. ⏱ Arthaa processes deposits 24/7 with smart auto-verification.",
			},
		],
	},
	{
		icon: LockKey,
		title: "Payouts",
		questions: [
			{
				q: "How fast are payouts processed on Arthaa?",
				a: "Arthaa offers on-demand payouts, processed within minutes—24/7, including weekends and holidays. Whether you're withdrawing in crypto or fiat, our system ensures lightning-fast execution. ⏱ No more waiting days to access your earnings.",
			},
			{
				q: "Are there any fees for receiving payouts?",
				a: "No. Arthaa does not charge any payout or withdrawal fees. You receive the full amount, with zero commissions or hidden charges. ✅ Your money, fully yours.",
			},
			{
				q: "What payout methods are available on Arthaa?",
				a: "You can request payouts via USDT (TRC20/ERC20/BEP20) and USDC (TRC20/ERC20/BEP20/Solana), you can choose the method that suits you best—globally or locally. 🌍 Fast, flexible, and borderless withdrawals.",
			},
			{
				q: "Are there any minimum payout thresholds or limits?",
				a: "Yes, payouts must exceed the minimum withdrawal threshold (e.g., $10 depending on method). There is no upper limit for verified accounts.💡 Check your dashboard for specific payout thresholds per method.",
			},
		],
	},
	{
		icon: CurrencyCircleDollar,
		title: "Trading",
		questions: [
			{
				q: "What assets can I trade on Arthaa?",
				a: "Arthaa offers 20+ high liquidity instruments including all major pairs and cryptocurrencies (like BTC, ETH, BNB) and metals. 🌐 Trade global markets—all in one platform.",
			},
			{
				q: "Does Arthaa support automated trading?",
				a: "We have our own AI powered trading engine, AlphaQuant, which provides advanced analytics, predictive signals, and automated strategies. You can also use third-party trading bots. 🤖 Automate your trades for optimal results.",
			},
			{
				q: "Is there a demo account available?",
				a: "Yes, you can practice trading with a free demo account before investing real funds. 🎓 Start simple, scale to expert—on your terms.",
			},
			{
				q: "What is the minimum trade size?",
				a: "The minimum trade size is 0.01 lots for forex and varies for other instruments. 💰 Trade small, scale big—with flexible lot sizes.",
			},
		],
	},
	{
		icon: Users,
		title: "Support",
		questions: [
			{
				q: "Is Arthaa support available 24/7?",
				a: "Yes, Arthaa offers round-the-clock human support, available 24/7 including weekends and holidays. 💬 We’re always here—no matter your time zone.",
			},
			{
				q: "How can I contact Arthaa support?",
				a: "You can reach our team via live chat within the website or email. We prioritize instant connection with real human agents, not bots. 📞 Support that actually responds.",
			},
			{
				q: "Is support available in multiple languages?",
				a: "Yes, our support team can assist you in several major languages. Please specify your preferred language when contacting us. 🗣️ Trade globally, get help locally—in your language.",
			},
			{
				q: "Is Arthaa support handled by real people?",
				a: "Yes—no AI or scripted responses. Our support team is made up of real trading experts, ready to help with deposits, withdrawals, trades, and technical issues. 🧠 Real help. Real humans. Real fast.",
			},
		],
	},
	{
		icon: ChartLineUp,
		title: "AlphaQuant",
		questions: [
			{
				q: "What is AlphaQuant?",
				a: "AlphaQuant is our proprietary AI engine that delivers advanced analytics, predictive signals, and automated trading strategies for optimal results. ⚡ Just connect, select your preferences, and let it trade for you.",
			},
			{
				q: "Do I need to configure anything to start using AlphaQuant?",
				a: "No manual configuration is needed. AlphaQuant is a plug-and-play system—just connect your account, and it instantly begins executing smart trades based on live market conditions. 🧠 No strategies to upload. No VPS. No headaches.",
			},
			{
				q: "How do I access trading analytics?",
				a: "AlphaQuant activates within minutes after linking your account. Trades begin automatically as soon as a signal matches your risk level and strategy preferences. ⏱ From login to live trades in under 5 minutes.",
			},
			{
				q: "Can I track or stop AlphaQuant’s trades anytime?",
				a: "Yes. You have full visibility and control over every trade AlphaQuant executes. You can pause, stop, or override trades instantly through your dashboard. 🛑 Automated—but still 100% in your control.",
			},
		],
	},
	{
		icon: GlobeSimple,
		title: "Account & Verification",
		questions: [
			{
				q: "What documents do I need for verification?",
				a: "For account verification, you'll need a valid government-issued ID (passport/driver's license), proof of address (utility bill/bank statement), and in some cases, additional documents based on your jurisdiction. 📸 Fast verification with support for over 150+ countries.",
			},
			{
				q: "How long does verification take?",
				a: "Most KYC verifications are completed within 5–15 minutes using our AI-powered ID check system. If manual review is needed, it may take up to 24 hours. ✅ Instant onboarding for most users.",
			},
			{
				q: "Can I update my personal information after registration?",
				a: "Yes, you can update your personal details from your account settings. Some changes may require additional verification.",
			},
			{
				q: "What should I do if my verification is rejected?",
				a: "If your verification is rejected, please check the requirements and resubmit clear, valid documents or contact support for assistance.",
			},
		],
	},
];

const FaqPage = () => {
	return (
		<PageTransition>
			<div className="min-h-screen relative overflow-hidden">
				{/* Removed Decorative background pattern */}
				<main className="py-8 px-4 relative z-10">
					<div className="container mx-auto max-w-[1200px]">
						<div className="flex flex-col items-start text-left gap-3 max-w-2xl mb-12 mt-12">
							<h2 className="text-5xl md:text-6xl font-bold text-foreground text-left w-full">
								FAQs: All your <br />questions answered
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-10">
							{faqCategories.map((category, idx) => (
								<div
									key={idx}
									className="space-y-4 rounded-2xl border border-border/30 p-7 transition-transform hover:-translate-y-1 bg-background/90 dark:bg-background/80"
								>
									{/* Removed category icon */}
									<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
										{category.title === "AlphaQuant" ? (
											<>
												<span className="text-black">Alpha</span>
												<span className="text-card">Quant</span>
											</>
										) : (
											category.title
										)}
									</h2>
									<Accordion type="single" collapsible className="space-y-3">
										{category.questions.map((qa, qIdx) => (
											<AccordionItem
												key={qIdx}
												value={`${idx}-${qIdx}`}
												className="border border-border/30 rounded-xl bg-background/80 dark:bg-background/60 px-5 transition-all"
											>
												<AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180 transition-colors font-medium text-lg">
													{/* Removed question badge */}
													<span>{qa.q}</span>
												</AccordionTrigger>
												<AccordionContent className="pb-4 pt-2 transition-all duration-300">
													<div className="text-muted-foreground text-base leading-relaxed">{qa.a}</div>
												</AccordionContent>
											</AccordionItem>
										))}
									</Accordion>
								</div>
							))}
						</div>
					</div>
				</main>
				{/* Optionally add footer here */}
				{/* <Footer /> */}
			</div>
		</PageTransition>
	);
};

export default FaqPage;
