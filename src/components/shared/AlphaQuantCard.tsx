import React from "react";
import { Wallet } from "@phosphor-icons/react";
import type { Transaction } from "@/types/dashboard";

export const AlphaQuantCard: React.FC<{
  totalInvested: number;
  activePlans: { count: number; amount: number };
  onClick: () => void;
  todaysProfit?: number;
}> = ({ totalInvested, activePlans, onClick, todaysProfit }) => (
  <div
    className="bg-background border-2 border-warning rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-shadow"
    onClick={onClick}
    tabIndex={0}
    role="button"
    aria-label="Go to Plans"
  >
    <div className="flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-md text-foreground">AlphaQuant</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-warning text-foreground text-xs font-semibold border border-warning">
            {activePlans.count === 0
              ? "Quant Inactive"
              : `${activePlans.count} ${activePlans.count === 1 ? "Active Plan" : "Active Plans"}`}
          </span>
        </div>
        <div className="space-y-1 mt-2">
          <h3 className="text-5xl font-bold text-foreground">
            {totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-2xl font-normal text-muted-foreground ml-2">USD</span>
          </h3>
        </div>
      </div>
      {typeof todaysProfit === 'number' && (
        <div className="w-full flex justify-between items-center px-4 py-3 rounded-md bg-green-400/10 border border-green-300/50 text-xs font-semibold text-foreground shadow-sm mt-4">
          <div className="flex items-center">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span>Today's profit: {todaysProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

// Helper to get sum of all investment_return transactions
export function getTotalInvestmentReturns(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.type === 'investment_return' && tx.status === 'Completed')
    .reduce((sum, tx) => sum + tx.amount, 0);
}
