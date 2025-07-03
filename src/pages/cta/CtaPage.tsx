import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { InteractiveGridPattern } from "@/components/magicui/interactive-grid-pattern";
import { SealCheck } from "@phosphor-icons/react";
import { AccessPlatformButton } from "@/components/shared/AccessPlatformButton";

const sealChecks = [
	"Smarter Trading. Faster Profits.",
	"AI Analytics. Instant Execution.",
	"24/7 Expert Support. Always.",
	"Regulated. Secure. Trusted.",
	"Tight Spreads. No Fees.",
	"All Assets. One Platform.",
	"Trade Forex. Crypto. Instantly.",
	"Real Platform. Real Profits.",
	"Next-Gen Cloud Trading.",
	"Exness? Binomo? Try Better.",
];

export const CtaPage = () => {
	const { user } = useAuth();
	return (
		<section className="relative min-h-[400px] overflow-hidden ">
			<div className="container max-w-7xl relative min-h-[400px]">
				{/* Magic UI Interactive Grid Pattern Background */}
				<InteractiveGridPattern
					squares={[40, 40]}
					className={cn(
						"absolute inset-0 -z-10 pointer-events-none",
						"[mask-image:radial-gradient(900px_circle_at_center,white,transparent)]",
						"inset-x-0 inset-y-[-40%] h-[300%] skew-y-12"
					)}
				/>
				<div className="mx-auto max-w-2xl py-24 sm:py-12 lg:py-16">
					<div className="text-center">
						<div className="flex justify-center my-12">
							<img
								src="/arthaa3d.png"
								alt="Arthaa 3D"
								className="w-72 h-72 object-contain"
							/>
						</div>
						<h2 className="text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
							Your last stop for most trusted broker
						</h2>
						{/* Hero-style button */}
						<div className="flex flex-col items-center gap-6 mt-10 w-full">
							<AccessPlatformButton />
						</div>
						{/* Marquee SealCheck row with side blur */}
						<div className="relative w-full mt-8">
							<div className="absolute left-0 top-0 h-full w-16 z-10 pointer-events-none"
								style={{
									background: "linear-gradient(to right, var(--background, #fff), transparent)",
									filter: "blur(12px)",
								}}
							/>
							<div className="absolute right-0 top-0 h-full w-16 z-10 pointer-events-none"
								style={{
									background: "linear-gradient(to left, var(--background, #fff), transparent)",
									filter: "blur(12px)",
								}}
							/>
							<div className="overflow-hidden w-full">
								<div className="flex animate-[marquee_10s_linear_infinite] whitespace-nowrap gap-4">
									{sealChecks.map((text, idx) => (
										<div key={idx} className="flex items-center gap-2 px-4 py-2">
											<SealCheck size={24} className="text-foreground" weight="fill" />
											<span className="text-foreground text-base font-medium">{text}</span>
										</div>
									))}
									{/* Duplicate for seamless loop */}
									{sealChecks.map((text, idx) => (
										<div key={`dup-${idx}`} className="flex items-center gap-2 px-4 py-2">
											<SealCheck size={24} className="text-foreground" weight="fill" />
											<span className="text-foreground text-base font-medium">{text}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
					{/* Benefits Grid removed */}
				</div>
			</div>
		</section>
	);
};

export default CtaPage;
