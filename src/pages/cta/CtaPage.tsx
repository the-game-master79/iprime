import { useAuth } from "@/contexts/AuthContext";
import { SealCheck } from "@phosphor-icons/react";
import { AuthActionButton } from "@/components/shared/AuthActionButton";

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
    <section className="relative w-full py-24 md:py-32 overflow-hidden bg-background">
      {/* Hero background image with corner radius and margins */}
      <div className="absolute inset-2 md:inset-3 lg:inset-4 z-0 rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/cta-bg.png)'
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>
      
      {/* Cinematic background gradients and light rays */}
      <div className="pointer-events-none absolute inset-2 md:inset-3 lg:inset-4 z-10 rounded-2xl overflow-hidden">
        <div className="absolute w-[900px] h-[900px] -top-[350px] -left-[300px] bg-gradient-to-br from-primary/30 via-primary/0 to-transparent blur-[120px] opacity-70 animate-pulse-slow" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120vw] h-40 bg-gradient-to-b from-white/60 via-white/0 to-transparent blur-2xl opacity-40" />
      </div>

      <div className="relative z-20 w-full max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          {/* Logo with glow effect */}
          <div className="mb-6 md:mb-8 relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl -z-10" />
            <img src="/arthaa-dark.svg" alt="Arthaa" className="h-12 md:h-16 w-auto relative z-10 mx-auto" />
          </div>

          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-8">
            Ready to Trade Smarter?
          </h2>
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
              <div className="flex animate-[marquee_12s_linear_infinite] whitespace-nowrap gap-4 md:gap-8">
                {[...sealChecks, ...sealChecks].map((text, idx) => (
                  <div key={`item-${idx}`} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2">
                    <SealCheck size={20} className="text-white flex-shrink-0" weight="fill" />
                    <span className="text-white text-sm md:text-lg font-medium whitespace-nowrap">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Auth Action Button */}
          <div className="mt-12">
            <AuthActionButton className="px-8 py-4 text-lg font-semibold shadow-lg" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaPage;
