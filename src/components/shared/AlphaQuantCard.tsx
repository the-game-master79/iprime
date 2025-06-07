import React from "react";

export const AlphaQuantCard: React.FC<{
  totalInvested: number;
  activePlans: { count: number; amount: number };
  onClick: () => void;
}> = ({ totalInvested, activePlans, onClick }) => (
  <div
    className="bg-card rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-shadow"
    onClick={onClick}
    tabIndex={0}
    role="button"
    aria-label="Go to Plans"
  >
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-md text-white font-medium">AlphaQuant</span>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-white text-foreground text-xs font-semibold border border-border">
          {activePlans.count === 0
            ? "Activate Quant"
            : `${activePlans.count} ${activePlans.count === 1 ? "Active Plan" : "Active Plans"}`}
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-3xl font-medium text-white">
          {totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </h3>
      </div>
    </div>
  </div>
);
