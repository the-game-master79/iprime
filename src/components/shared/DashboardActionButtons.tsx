import React, { useState } from "react";
import { ArrowCircleDown, Lightning, ShareNetwork } from "@phosphor-icons/react";
import { BusinessVolumeDirectsRow } from "./BusinessVolumeDirectsRow";
import { Button } from "@/components/ui/button";
// Use Dialog instead of AlertDialog for the direct referral dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { XCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const DashboardActionButtons: React.FC<{
  theme: string;
  navigate: (path: string) => void;
  directCount: number;
  businessStats: any;
  handleDirectsClick?: () => void;
}> = ({ theme, navigate, directCount, businessStats }) => {
  const [showDirectsDialog, setShowDirectsDialog] = useState(false);

  const handleDirectsClick = () => setShowDirectsDialog(true);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4" key={theme}>
        <div className="flex flex-col items-center h-full w-full">
          <button
            className="h-14 w-full flex items-center justify-center rounded-xl gap-2 font-regular bg-primary text-white border-border border hover:bg-primary/90"
            onClick={() => navigate('/cashier')}
          >
            <ArrowCircleDown className="h-5 w-5 text-white" weight="bold" />
            <span className="text-base font-semibold text-white">Cashier</span>
          </button>
        </div>
        <div className="flex flex-col items-center h-full w-full">
          <button
            className="h-14 w-full flex items-center justify-center rounded-xl gap-2 text-white bg-secondary font-regular border-border border bg-[hsl(var(--button))] hover:bg-black/10"
            onClick={() => navigate('/tradingstation')}
          >
            <Lightning className="h-5 w-5 text-foreground" weight="bold" />
            <span className="text-base font-semibold text-foreground">Trade</span>
          </button>
        </div>
        <div className="flex flex-col items-center h-full w-full">
          <button
            className="h-14 w-full flex items-center justify-center rounded-xl gap-2 text-white bg-secondary font-regular border-border border bg-[hsl(var(--button))] hover:bg-black/10"
            onClick={() => navigate('/affiliate')}
          >
            <ShareNetwork className="h-5 w-5 text-foreground" weight="bold" />
            <span className="text-base font-semibold text-foreground">Affiliates</span>
          </button>
        </div>
        <div className="flex flex-col items-center h-full w-full">
          <button
            className="h-14 w-full flex items-center justify-center rounded-xl gap-2 text-white bg-secondary font-regular bg-[hsl(var(--button))] border border-border hover:bg-black/10"
            onClick={() => navigate('/plans')}
          >
            <span className="text-base font-semibold">
              <span className="text-foreground">My Alpha</span>
              <span className="text-card">Quant</span>
            </span>
          </button>
        </div>
        {/* Business Volume and Directs */}
        <BusinessVolumeDirectsRow
          businessStats={businessStats}
          directCount={directCount}
          handleDirectsClick={handleDirectsClick}
        />
      </div>
      {/* Direct Referral Status Dialog - improved design */}
      <Dialog open={showDirectsDialog} onOpenChange={setShowDirectsDialog}>
        <DialogContent
          className={cn(
            "max-w-sm bg-background border-0 shadow-xl",
            "!p-0"
          )}
        >
          <DialogHeader className="relative">
            <button
              className="absolute right-3 top-3 z-10"
              onClick={() => setShowDirectsDialog(false)}
              aria-label="Close"
              tabIndex={0}
              style={{ background: "transparent", border: "none" }}
            >
              <XCircle className="h-6 w-6 text-white" weight="bold" />
            </button>
            <DialogTitle className="pt-8 pb-2 text-center text-foreground">Direct Referral Status</DialogTitle>
            <DialogDescription>
              <div className="flex flex-col items-center gap-2 py-2">
                <div
                  className={cn(
                    "rounded-full w-20 h-20 flex items-center justify-center mb-2",
                    directCount >= 2
                      ? "bg-green-500/20"
                      : "bg-yellow-400/20"
                  )}
                >
                  <span
                    className={cn(
                      "text-3xl font-bold",
                      directCount >= 2 ? "text-green-600" : "text-yellow-500"
                    )}
                  >
                    {directCount}/2
                  </span>
                </div>
                {directCount >= 2 ? (
                  <>
                    <div className="text-center text-sm pb-4">
                      You have achieved the required direct referrals.<br />
                      You can now earn <span className="font-bold text-green-700">commissions and bonuses</span>.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-yellow-600 font-semibold">
                      {2 - directCount} more direct referral{2 - directCount > 1 ? "s" : ""}
                    </div>
                    <div className="text-center text-sm">
                      needed to start earning <span className="font-bold text-yellow-600">commissions and bonuses</span>.<br />
                      <span className="text-muted-foreground text-xs block mt-2">
                        Invite friends to join and activate their plans.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
