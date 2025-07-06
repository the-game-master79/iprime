import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, QrCode } from "@phosphor-icons/react";

import { QRCodeSVG } from "qrcode.react";

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
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const displayLink = getTrimmedReferralLink(referralLink);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'referral-qr.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };
  return (
    <Card className="relative border-primary/50 hover:border-primary/70 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-100 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-100" />
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Your Referral Link</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                id="referral-link-input"
                value={displayLink}
                disabled
                className="h-10 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCopy}
                className={`h-10 w-20 text-sm transition-colors ${
                  copied 
                    ? 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20' 
                    : 'bg-secondary hover:bg-secondary/80 border-border'
                }`}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowQrCode(true)}
                className="h-10 w-10 p-0 bg-secondary hover:bg-secondary/80 border-border"
                title="Show QR Code"
              >
                <QrCode className="h-5 w-5" />
              </Button>
            </div>
          </div>


          <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-center">Scan QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-6 py-4 px-4">
                <div className="p-4 bg-white rounded-2xl border shadow-sm">
                  <div className="[&>svg>rect]:rounded-[5px] [&>svg>rect]:border-2 [&>svg>rect]:border-white">
                    <QRCodeSVG
                      value={referralLink}
                      size={200}
                      level="H"
                      includeMargin={true}
                      className="w-[200px] h-[200px] [&>rect:first-child]:fill-transparent"
                    />
                  </div>
                </div>
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={referralLink}
                      disabled
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(referralLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="h-10 w-10 p-0 flex-shrink-0 flex items-center justify-center"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};
