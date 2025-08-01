import React from "react";
import type { Transaction } from "@/types/dashboard";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const AlphaQuantCard: React.FC<{
  totalInvested: number;
  activePlans: { count: number; amount: number };
  onClick: () => void;
  onSubscribe: () => void;
}> = ({ totalInvested, activePlans, onClick, onSubscribe }) => (
  <Card className="relative border-warning/50 overflow-hidden">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">AlphaQuant</CardTitle>
        <Badge variant={activePlans.count === 0 ? "warning" : "secondary"}>
          {activePlans.count === 0
            ? "Quant Inactive"
            : `${activePlans.count} ${activePlans.count === 1 ? "Active Plan" : "Active Plans"}`}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="pb-4">
      <div className="space-y-1">
        <h3 className="text-4xl font-bold tracking-tight">
          ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
      </div>
    </CardContent>
    <CardFooter className="flex gap-3 pt-0">
      <InteractiveHoverButton
        className="w-full bg-warning text-foreground transition-colors duration-200 hover:bg-warning/90"
        dotColor="bg-foreground"
        hoverTextColor="text-white"
        onClick={() => window.location.href = '/plans'}
      >
        Subscribe Now
      </InteractiveHoverButton>
    </CardFooter>
  </Card>
);

// Helper to get sum of all investment_return transactions
export function getTotalInvestmentReturns(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.type === 'investment_return' && tx.status === 'Completed')
    .reduce((sum, tx) => sum + tx.amount, 0);
}
