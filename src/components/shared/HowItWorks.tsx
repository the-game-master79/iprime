import { Fire } from "@phosphor-icons/react";

export const HowItWorks = () => {
  return (
    <section className="my-24">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col items-end text-right gap-4 max-w-2xl ml-auto mb-12">
          <div className="flex items-center gap-2">
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-foreground text-right w-full">
            What should I do after sign up?
          </h2>
        </div>

        <div className="flex flex-col gap-8">
          {/* Step 1 */}
          <div className="relative bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-row items-center gap-8 overflow-hidden">
            {/* Step number */}
            <div className="hidden md:flex md:static md:mr-6 items-center justify-center w-10 h-10 rounded-lg bg-white border border-primary/30 font-bold text-primary text-xl shadow-md z-20">
              1
            </div>
            {/* Big overflowing image in the corner */}
            <img
              src="/mask1.svg"
              alt="Fund your account"
              className="absolute right-2 left-auto top-2 w-32 h-32 md:-top-8 md:-right-16 md:left-auto md:w-[300px] md:h-[300px] z-10 pointer-events-none select-none transition-all"
              style={{ objectFit: "contain" }}
            />
            {/* Content */}
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
            {/* Step number */}
            <div className="hidden md:flex md:static md:mr-6 items-center justify-center w-10 h-10 rounded-lg bg-white border border-primary/30 font-bold text-primary text-xl shadow-md z-20">
              2
            </div>
            {/* Big overflowing chart line image in the corner */}
            <img
              src="/chartline.svg"
              alt="Chart line"
              className="absolute right-2 left-auto top-2 w-32 h-32 md:-top-16 md:-right-16 md:left-auto md:w-[300px] md:h-[300px] z-10 pointer-events-none select-none transition-all"
              style={{ objectFit: "contain" }}
            />
            {/* Content */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center gap-4 md:gap-8 max-w-3xl">
              <h3 className="text-4xl font-extrabold text-primary mb-0 leading-tight">
                Execute <br /> Trades
              </h3>
              <p className="text-xl font-medium text-primary/80 mb-0 text-left max-w-[340px]">
                Use your insights and place a trade, get your profits without any commissions and go for payout.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-row items-center gap-8 overflow-hidden">
            {/* Step number */}
            <div className="hidden md:flex md:static md:mr-6 items-center justify-center w-10 h-10 rounded-lg bg-white border border-primary/30 font-bold text-primary text-xl shadow-md z-20">
              3
            </div>
            {/* Big overflowing alphaquant image in the corner */}
            <img
              src="/alphaquant.svg"
              alt="AlphaQuant"
              className="absolute right-2 left-auto top-4 w-24 h-24 md:top-1/2 md:-translate-y-1/2 md:w-[100px] md:h-[300px] md:right-8 md:left-auto z-10 pointer-events-none select-none transition-all"
              style={{ objectFit: "contain" }}
            />
            {/* Content */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center gap-4 md:gap-8 max-w-3xl">
                <h3 className="text-4xl font-extrabold mb-0 leading-tight">
                <span className="text-primary">Invest with <br></br></span>
                <span>
                  <span className="text-foreground">Alpha</span>
                  <span className="text-card">Quant</span>
                </span>
                </h3>
              <p className="text-xl font-medium text-primary/80 mb-0 text-left max-w-[340px]">
                Diversify your idle funds by investing in automated trading handled by CL engine with losses margins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
