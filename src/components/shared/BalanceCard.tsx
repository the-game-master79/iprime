import React from "react";
import type { UserProfile } from "@/types/dashboard";

export const BalanceCard: React.FC<{
  withdrawalBalance: number;
  userProfile: UserProfile | null;
}> = ({ withdrawalBalance, userProfile }) => (
  <div className="bg-primary border border-border rounded-2xl p-6 flex flex-col justify-between">
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-md text-white uppercase tracking-[0.20em]">Your Balance</span>
      </div>
      <div className="space-y-1">
        <h3 className="text-3xl font-medium text-white">
          {withdrawalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </h3>
        {userProfile?.multiplier_bonus > 0 && (
          <p className="text-sm text-white">
            Including bonus: {(userProfile.multiplier_bonus || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
          </p>
        )}
      </div>
    </div>
  </div>
);
