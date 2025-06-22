import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "@phosphor-icons/react";

interface ReferralLinkCardProps {
  referralLink: string;
  onCopyLink: () => void;
}

const getTrimmedReferralLink = (link: string) => {
  if (!link) return "";
  if (link.length > 38) {
    const refMatch = link.match(/ref=([a-zA-Z0-9]+)/);
    if (refMatch) {
      const refCode = refMatch[1];
      const base = link.split("?")[0];
      return `${base}/ref=${refCode}`;
    }
    return link.slice(0, 18) + link.slice(-10);
  }
  return link;
};

export const ReferralLinkCard: React.FC<ReferralLinkCardProps> = ({
  referralLink,
  onCopyLink,
}) => {
  return (
    <div className="bg-secondary rounded-2xl p-4 border border-border">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1 flex flex-row gap-2">
            <Input
              id="referral-link-input"
              value={getTrimmedReferralLink(referralLink)}
              label="Referral Link"
              readOnly
              className="w-full font-medium text-foreground text-sm bg-secondary-foreground h-12 border border-border pr-2 truncate"
              style={{ minWidth: 0 }}
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={onCopyLink}
              className="h-12 w-12 rounded-lg flex-shrink-0 bg-secondary-foreground text-foreground font-bold hover:bg-secondary-foreground active:bg-secondary-foreground focus:bg-secondary-foreground"
              title="Copy Link"
            >
              <Copy className="h-8 w-8 font-bold" weight="bold" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
