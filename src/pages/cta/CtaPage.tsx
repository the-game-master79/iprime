import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

const benefits = [
	"Advanced AI-powered trading analytics",
	"Lightning-fast trade execution",
	"24/7 expert support team",
	"Secure and regulated platform",
	"Competitive trading conditions",
	"Multi-asset trading platform",
];

export const CtaPage = () => {
	return (
		<section className="relative overflow-hidden">
			{/* Gradient Backgrounds */}
			<div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />

			<div className="container max-w-7xl relative">
				<div className="mx-auto max-w-2xl py-24 sm:py-32 lg:py-40">
					<div className="hidden sm:mb-8 sm:flex sm:justify-center">
						<div className="relative rounded-full px-3 py-1 text-sm leading-6 text-muted-foreground ring-1 ring-border/10 hover:ring-border/20">
							New features available.{" "}
							<Link to="/features" className="font-semibold text-primary">
								<span className="absolute inset-0" aria-hidden="true" />
								Explore New Trading Features{" "}
								<span aria-hidden="true">&rarr;</span>
							</Link>
						</div>
					</div>
					<div className="text-center">
						<h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
							Experience Next-Gen Trading
						</h1>
						<div className="mt-10 flex items-center justify-center gap-x-6">
							<Link to="/auth/login">
								<Button
									size="lg"
									className="px-8 gap-2 bg-primary hover:bg-primary/90 text-white relative overflow-hidden group"
								>
									<span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
									Create Trading Account
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Button>
							</Link>
							<a
								href="#"
								className="text-sm font-semibold leading-6 text-primary"
								onClick={(e) => {
									e.preventDefault();
									window.dispatchEvent(new CustomEvent("open-contact-dialog"));
								}}
							>
								Contact Institutional Trading Team{" "}
								<span aria-hidden="true">→</span>
							</a>
						</div>
					</div>

					{/* Benefits Grid */}
					<div className="mx-auto mt-8 max-w-2xl grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
						{benefits.map((benefit, index) => (
							<div key={index} className="flex items-center gap-x-3">
								<div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10">
									<Check className="h-4 w-4 text-primary" />
								</div>
								<span className="text-sm text-muted-foreground">
									{benefit}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
};

export default CtaPage;
