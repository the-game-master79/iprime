import React from "react";
import { cn } from "@/lib/utils";

export const BusinessVolumeDirectsRow: React.FC<{
  businessStats: any;
  directCount: number;
  handleDirectsClick: () => void;
}> = ({ businessStats, directCount, handleDirectsClick }) => (
  <>
    <div className="flex flex-col items-center h-full w-full">
      <div className="h-14 w-full flex flex-col items-center justify-center rounded-xl bg-secondary-foreground/30 border border-border">
        <span className="text-xs text-muted-foreground">Business Volume</span>
        <span className="text-lg font-semibold text-foreground">
          {businessStats.totalVolume?.toLocaleString()} USD
        </span>
      </div>
    </div>
    <div className="flex flex-col items-center h-full w-full">
      <div
        className="h-14 w-full flex flex-col items-center justify-center rounded-xl bg-secondary-foreground/30 border border-border cursor-pointer"
        onClick={handleDirectsClick}
        title="View Direct Referral Status"
      >
        <span className="text-xs text-muted-foreground">Directs</span>
        <span className={cn(
          "text-lg font-semibold",
          directCount >= 2 ? "text-[#20BF55]" : 
          directCount === 1 ? "text-[#FFA500]" : 
          "text-[#FF005C]"
        )}>
          {directCount}/2
        </span>
      </div>
    </div>
  </>
);
