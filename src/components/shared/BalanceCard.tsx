import React from "react";
import type { UserProfile } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const BalanceCard: React.FC<{
  withdrawalBalance: number;
  userProfile: UserProfile | null;
}> = ({ withdrawalBalance, userProfile }) => {
  const navigate = useNavigate();

  const handlePayoutClick = () => {
    navigate("/cashier?tab=payout");
  };

  return (
    <div className="bg-background border-2 border-primary rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-md text-foreground">Your Balance</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-5xl font-bold text-foreground">
            {withdrawalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-2xl font-normal text-foreground ml-2">USD</span>
          </h3>
          {userProfile?.multiplier_bonus > 0 && (
            <p className="text-sm text-muted-foreground">
              Including bonus: {(userProfile.multiplier_bonus || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 flex gap-4 flex-row">
        <Button
          className="w-full px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
          onClick={() => navigate("/cashier")}
        >
          Add funds
        </Button>
        <Button
          className="w-full px-6 py-2 rounded-lg border border-primary text-foreground font-semibold hover:bg-primary/10 hover:text-foreground transition-colors"
          variant="outline"
          onClick={handlePayoutClick}
        >
          Payout
        </Button>
      </div>
    </div>
  );
};
