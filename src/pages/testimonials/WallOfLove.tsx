import React from "react";
import { PageTransition } from "@/components/ui-components";
import { Quotes } from "@phosphor-icons/react";
import { faker } from "@faker-js/faker";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

const POSITIONS = [
	"Retail Investor",
	"Forex Specialist",
	"Portfolio Manager",
	"Crypto Enthusiast",
	"Financial Analyst",
	"Equity Analyst",
	"Day Trader",
	"Crypto Trader",
];

const COMMON_PHRASES = [
	"AI trading analytics",
	"secure trading environment",
	"intuitive platform",
	"support team is always there",
	"trading bonus",
	"fast and reliable",
	"best exness alternative",
	"learning resources",
	"confidence to start",
	"trade both crypto and forex",
	"order execution is lightning-fast",
	"platform is super secure",
	"real human support",
	"charting tools",
	"AI-powered indicators",
	"risk management features",
	"diversify between crypto and forex",
	"AI trading engine is a game changer",
	"AI predictions are impressively accurate",
	"professional analyst by your side",
	"my go-to for cryptocurrency trading",
];

// Add AI testimonial openers (more natural, less exaggerated)
const AI_OPENERS = [
	"I find",
	"I've noticed",
	"I like",
	"I use",
	"I value",
	"I've benefited from",
	"I rely on",
	"I enjoy",
	"I've experienced",
];

// Utility to count words
function wordCount(str: string) {
	return str.trim().split(/\s+/).length;
}

// AI testimonial generator with word count control
function generateAITestimonial() {
	const name = faker.person.fullName();
	const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
	const country = faker.location.country();
	const role = `${position}, ${country}`;
	const phraseCount = 2 + Math.floor(Math.random() * 2); // 2-3 phrases
	const phrases = [];
	const used = new Set();
	while (phrases.length < phraseCount) {
		const idx = Math.floor(Math.random() * COMMON_PHRASES.length);
		if (!used.has(idx)) {
			phrases.push(COMMON_PHRASES[idx]);
			used.add(idx);
		}
	}
	const opener = AI_OPENERS[Math.floor(Math.random() * AI_OPENERS.length)];
	let content = `As a ${position.toLowerCase()}, ${opener} the ${phrases.join(" and ")}.`;
	// Ensure word count between 8 and 20
	let tries = 0;
	while ((wordCount(content) < 18 || wordCount(content) > 30) && tries < 5) {
		// Regenerate phrases and opener if not in range
		const phraseCount2 = 2 + Math.floor(Math.random() * 2);
		phrases.length = 0;
		used.clear();
		while (phrases.length < phraseCount2) {
			const idx = Math.floor(Math.random() * COMMON_PHRASES.length);
			if (!used.has(idx)) {
				phrases.push(COMMON_PHRASES[idx]);
				used.add(idx);
			}
		}
		const opener2 = AI_OPENERS[Math.floor(Math.random() * AI_OPENERS.length)];
		content = `As a ${position.toLowerCase()}, ${opener2} the ${phrases.join(" and ")}.`;
		tries++;
	}
	return {
		name,
		role,
		image: null,
		content,
	};
}

const WallOfLove = () => {
	const { user } = useAuth();
	const { toast } = useToast();
	const [open, setOpen] = React.useState(false);
	const [testimonialText, setTestimonialText] = React.useState("");
	const [userTestimonials, setUserTestimonials] = React.useState<any[]>([]);
	const [selectedPosition, setSelectedPosition] = React.useState(POSITIONS[0]);
	const [badWordDetected, setBadWordDetected] = React.useState(false); // NEW

	// Mask email utility
	const maskEmail = (email: string) => {
		if (!email) return "";
		const [name, domain] = email.split("@");
		if (!name || !domain) return email;
		if (name.length <= 2) return "*".repeat(name.length) + "@" + domain;
		return name[0] + "*".repeat(name.length - 2) + name[name.length - 1] + "@" + domain;
	};

	const maskedEmail = user?.email ? maskEmail(user.email) : "";

	// Infinite AI testimonials state
	const [aiTestimonials, setAiTestimonials] = React.useState<any[]>([]);

	// Generate 8 AI testimonials at a time, refresh every 15s
	React.useEffect(() => {
		const generateBatch = () => {
			const batch = Array.from({ length: 8 }, () => generateAITestimonial());
			setAiTestimonials(batch);
		};
		generateBatch();
		const interval = setInterval(generateBatch, 15000);
		return () => clearInterval(interval);
	}, []);

	const testimonials = React.useMemo(
		() => [
			...aiTestimonials,
			...userTestimonials,
		],
		[aiTestimonials, userTestimonials]
	);

	// Helper for the locked prefix
	const getPrefix = () => `As a ${selectedPosition}, `;

	const handleAddTestimonial = () => {
		const prefix = getPrefix();
		const userText = testimonialText.slice(prefix.length).trim();
		// Minimum 8 words (excluding prefix)
		if (wordCount(userText) < 8) return;
		setUserTestimonials([
			{
				name: "You",
				role: maskedEmail,
				image: null,
				content: prefix + userText,
			},
			...userTestimonials,
		]);
		setTestimonialText(prefix);
		setOpen(false);
	};

	const handleOpenDialog = () => {
		if (!user || !user.email) {
			toast({
				title: "Require Sign In First",
				description: "Please sign in to add your testimonial.",
				variant: "destructive",
			});
			return;
		}
		setTestimonialText(getPrefix());
		setOpen(true);
	};

	// When position changes, update prefix in textarea
	React.useEffect(() => {
		if (open) {
			setTestimonialText(getPrefix());
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPosition]);

	// Prevent deleting the prefix in textarea
	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const prefix = getPrefix();
		let value = e.target.value;
		if (!value.startsWith(prefix)) {
			value = prefix + value.slice(prefix.length);
		}
		// Remove gibberish and bad words (very basic filter)
		const BAD_WORDS = ["ass", "fuck", "shit", "bitch", "asshole", "bastard", "dick", "crap", "piss", "damn", "cunt", "scam", "fraud", "scammer", "fake", "bullshit", "slut", "fucking", "fucker", "shithead", "motherfucker", "whore"];
		const words = value.split(/\s+/);
		let foundBadWord = false;
		const filtered = words.map(w => {
			const lw = w.toLowerCase();
			if (BAD_WORDS.includes(lw)) {
				foundBadWord = true;
				return "***";
			}
			return w;
		});
		value = filtered.join(" ");
		setTestimonialText(value);
		setBadWordDetected(foundBadWord); // NEW
	};

	return (
		<PageTransition>
			<div>
				<main className="py-4">
					<div className="container max-w-[1200px] mx-auto px-4">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between items-start text-left gap-3 max-w-7xl mb-8 mt-12 w-full">
							<div className="w-full flex flex-col md:flex-row md:items-center md:justify-between">
								<h2 className="text-5xl md:text-6xl font-bold text-foreground text-left w-full md:w-auto tracking-tight">
									Wall of{" "}
									<span className="bg-clip-text text-transparent bg-gradient-to-br from-pink-500 to-red-500">
										Love
									</span>{" "}
									<span role="img" aria-label="love">
										❤️
									</span>
								</h2>
								<div className="w-full md:w-auto flex flex-col md:flex-row gap-2 justify-start md:justify-end">
									<button
										className="mt-4 md:mt-0 px-5 py-2 rounded-lg bg-pink-500 text-white font-semibold hover:bg-pink-600 transition"
										onClick={handleOpenDialog}
									>
										Add to Wall of Love
									</button>
								</div>
							</div>
						</div>
						{/* Dialog */}
						<Dialog open={open} onOpenChange={setOpen}>
							<DialogContent className="bg-background [&_[data-dialog-close]]:bg-background">
								<DialogHeader>
									<DialogTitle className="text-foreground">Add your testimonial</DialogTitle>
									<DialogDescription>
										Your email: <span className="font-mono">{maskedEmail}</span>
									</DialogDescription>
								</DialogHeader>
								<div className="mb-2">
									<label className="block text-sm font-medium mb-1 text-foreground" htmlFor="position-select">
										Select your position
									</label>
									<select
										id="position-select"
										className="w-full border rounded-lg p-2 bg-muted text-foreground"
										value={selectedPosition}
										onChange={e => setSelectedPosition(e.target.value)}
									>
										{POSITIONS.map(pos => (
											<option key={pos} value={pos}>{pos}</option>
										))}
									</select>
								</div>
								{badWordDetected && (
									<div className="mb-2 text-red-600 text-sm font-semibold">
										Vulgarity is not allowed. Doing so will permanently ban your account.
									</div>
								)}
								<textarea
									className="w-full border rounded-lg p-2 mb-4 resize-none bg-muted text-foreground placeholder:text-muted-foreground"
									rows={4}
									placeholder="Share your experience... (minimum 8 words)"
									value={testimonialText}
									onChange={handleTextChange}
									onSelect={e => {
										// Always keep cursor after prefix
										const prefix = getPrefix();
										const target = e.target as HTMLTextAreaElement;
										if (target.selectionStart < prefix.length) {
											target.setSelectionRange(prefix.length, prefix.length);
										}
									}}
								/>
								<button
									className="w-full bg-pink-500 text-white py-2 rounded-lg font-semibold hover:bg-pink-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
									onClick={handleAddTestimonial}
									disabled={badWordDetected}
								>
									Submit
								</button>
							</DialogContent>
						</Dialog>
						{/* End Dialog */}

						{/* Marquee container */}
						<div className="overflow-x-hidden py-2">
							<div
								className="flex gap-6 animate-marquee"
								style={{
									width: "max-content",
									animation: "marquee 40s linear infinite",
								}}
							>
								{[...testimonials, ...testimonials].slice(0, 16).map((testimonial, i) => (
									<div
										key={i}
										className="relative bg-background border border-border/50 shadow-md p-5 rounded-2xl min-w-[340px] max-w-xs flex-shrink-0 mx-2 flex flex-col justify-between"
										style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.06)" }}
									>
										{/* Header: Avatar, Name, Role */}
										<div className="flex items-center gap-3 mb-2">
											<img
												src={
													testimonial.image
														? testimonial.image
														: "/profile-placeholder.svg"
												}
												alt={testimonial.name}
												className="w-10 h-10 rounded-full object-cover border border-border"
											/>
											<div>
												<div className="flex items-center gap-1">
													<span className="font-semibold text-foreground text-base tracking-tight">
														{testimonial.name}
													</span>
													{/* Fake Twitter checkmark */}
													<svg
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="#1DA1F2"
														className="ml-1"
													>
														<circle
															cx="12"
															cy="12"
															r="12"
															fill="#1DA1F2"
														/>
														<path
															d="M17 8l-6.5 7L7 11.5"
															stroke="#fff"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
												</div>
												<span className="text-xs text-foreground font-medium">
													{testimonial.role}
												</span>
											</div>
										</div>
										{/* Content */}
										<p className="text-[15px] text-foreground leading-relaxed font-normal mb-4 tracking-tight">
											{testimonial.content}
										</p>
										{/* Footer: Twitter icon */}
										<div className="flex items-center justify-between mt-auto pt-2">
											<Quotes
												className="w-5 h-5 text-[#1DA1F2] opacity-80"
												weight="fill"
											/>
											{/* Removed Twitter icon and text */}
										</div>
									</div>
								))}
							</div>
						</div>
						<style>{`
							@keyframes marquee {
								0% { transform: translateX(0); }
								100% { transform: translateX(-50%); }
							}
							/* Remove mobile override for marquee, keep marquee horizontal on all screens */
						`}</style>
					</div>
				</main>
			</div>
		</PageTransition>
	);
};

export default WallOfLove;
