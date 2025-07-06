import React from "react";
import type { UserProfile } from "@/types/dashboard";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface BalanceCardProps {
  withdrawalBalance: number;
  userProfile?: {
    multiplier_bonus?: number;
  };
  onDepositClick?: () => void;
  onPayoutClick?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ 
  withdrawalBalance, 
  userProfile, 
  onDepositClick,
  onPayoutClick 
}) => {

  return (
    <Card className="relative border-primary/50 hover:border-primary/70 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-100 pointer-events-none" />
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-100" />
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Your Balance</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-1">
          <h3 className="text-4xl font-bold tracking-tight">
            ${withdrawalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          {userProfile?.multiplier_bonus > 0 && (
            <p className="text-sm text-muted-foreground">
              Including bonus: {(userProfile.multiplier_bonus || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-3 pt-0 bg-gradient-to-t from-primary/[0.02] to-transparent">
        <InteractiveHoverButton
          className="w-full bg-primary text-white hover:bg-primary/90"
          dotColor="bg-white"
          hoverTextColor="text-black"
          onClick={onDepositClick}
        >
          {onDepositClick ? 'Deposit' : 'Add funds'}
        </InteractiveHoverButton>
        <InteractiveHoverButton
          className="w-full hover:bg-primary/90"
          onClick={onPayoutClick}
        >
          Payout
        </InteractiveHoverButton>
      </CardFooter>
    </Card>
  );
};
