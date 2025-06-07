import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Copy } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QRCode from "qrcode";

interface ReferralLinkCardProps {
  referralLink: string;
  onCopyLink: () => void;
}

const getTrimmedReferralLink = (link: string) => {
  if (!link) return "";
  // Only trim if text is too long for the input (over 38 chars)
  if (link.length > 38) {
    const refMatch = link.match(/ref=([a-zA-Z0-9]+)/);
    if (refMatch) {
      const refCode = refMatch[1];
      const base = link.split("?")[0];
      return `${base}/ref=${refCode}`;
    }
    // Remove the ... and just concatenate the start and end
    return link.slice(0, 18) + link.slice(-10);
  }
  return link;
};

export const ReferralLinkCard: React.FC<ReferralLinkCardProps> = ({
  referralLink,
  onCopyLink,
}) => {
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const handleShowQrCode = async () => {
    if (!referralLink) return;
    const qrDataUrl = await QRCode.toDataURL(referralLink);
    setQrCodeUrl(qrDataUrl);
    setShowQrCode(true);
  };

  return (
    <div className="bg-secondary rounded-2xl p-4 border border-border">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-md font-medium text-foreground">
            Your Referral Link
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1 flex flex-row gap-2">
            <Input
              readOnly
              value={getTrimmedReferralLink(referralLink)}
              title={referralLink}
              className="w-full font-medium text-foreground text-sm bg-secondary-foreground h-12 border border-border pr-2 truncate"
              style={{ minWidth: 0 }}
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={onCopyLink}
              className="h-12 w-12 rounded-lg flex-shrink-0 bg-secondary-foreground text-foreground font-bold hover:bg-secondary-foreground active:bg-secondary-foreground focus:bg-secondary-foreground"
            >
              <Copy className="h-8 w-8 font-bold" weight="bold" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={handleShowQrCode}
              className="h-12 w-12 rounded-lg flex-shrink-0 bg-secondary-foreground text-foreground font-bold hover:bg-secondary-foreground active:bg-secondary-foreground focus:bg-secondary-foreground"
            >
              <QrCode className="h-8 w-8 font-bold" weight="bold" />
            </Button>
          </div>
        </div>
      </div>
      {/* QR Code Dialog */}
      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent className="bg-secondary border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Share Referral Code
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Scan this QR code to share your referral link
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-4 space-y-4">
            {qrCodeUrl && (
              <div className="bg-foreground p-4 rounded-lg">
                <img
                  src={qrCodeUrl}
                  alt="Referral QR Code"
                  className="w-64 h-64"
                />
              </div>
            )}
            <div className="w-full">
              <div className="relative">
                <Input
                  readOnly
                  value={referralLink}
                  className="pr-24 bg-secondary-foreground text-foreground border-0"
                />
                <Button
                  size="sm"
                  onClick={onCopyLink}
                  className="absolute right-2 top-2 h-7 bg-primary rounded-lg"
                >
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full rounded-lg"
              variant="secondary"
              onClick={() => setShowQrCode(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
