import { ShieldCheck, WarningCircle, ClockCountdown, Shield } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

interface KycVariantProps {
  status?: 'completed' | 'processing' | 'rejected' | 'required';
  date?: Date;
}

export function KycVariant({ status = 'required', date }: KycVariantProps) {
  switch (status) {
    case 'completed':
      return (
        <Card className="p-4 rounded-lg border bg-success/10 border-success/30">
          <div className="flex flex-col gap-2 items-start">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/20 text-success text-xs font-semibold mb-2">
              <ShieldCheck size={18} weight="regular" className="mr-1" />
            </span>
            <h3 className="font-semibold text-success mb-1">KYC Verified</h3>
            <p className="text-sm text-foreground mb-1">
              Your identity has been <span className="font-semibold">successfully verified</span>. You now have unrestricted access to all platform features, including deposits, withdrawals, and investments.
            </p>
            <ul className="text-xs text-success/80 list-disc ml-4 mb-2">
              <li>Withdrawals are now enabled for your account.</li>
              <li>Enjoy higher transaction limits and faster processing.</li>
              <li>Account security is enhanced.</li>
            </ul>
            {date && (
              <div className="mt-2 text-xs text-success flex items-center gap-1">
                <ShieldCheck size={14} weight="regular" />
                Verified on {date.toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                }).replace(',', '')}
              </div>
            )}
          </div>
        </Card>
      );

    case 'processing':
      return (
        <Card className="p-4 rounded-lg border bg-warning/10 border-warning/30">
          <div className="flex flex-col gap-2 items-start">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/20 text-warning text-xs font-semibold mb-2">
              <ClockCountdown size={18} weight="regular" className="mr-1" />
            </span>
            <h3 className="font-semibold text-warning mb-1">KYC Under Review</h3>
            <p className="text-sm text-foreground mb-1">
              Your KYC documents have been <span className="font-semibold">submitted</span> and are currently being reviewed by our compliance team.
            </p>
            <ul className="text-xs text-warning/80 list-disc ml-4 mb-2">
              <li>Review typically takes <span className="font-semibold">1-2 business days</span>.</li>
              <li>You will be notified by email once the review is complete.</li>
              <li>Withdrawals and some features remain restricted until approval.</li>
            </ul>
            {date && (
              <div className="mt-2 text-xs text-warning flex items-center gap-1">
                <ClockCountdown size={14} weight="regular" />
                Submitted on {date.toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                }).replace(',', '')}
              </div>
            )}
          </div>
        </Card>
      );

    case 'rejected':
      return (
        <Card className="p-4 rounded-lg border bg-destructive/10 border-destructive/30">
          <div className="flex flex-col gap-2 items-start">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-semibold mb-2">
              <WarningCircle size={18} weight="regular" className="mr-1" />
            </span>
            <h3 className="font-semibold text-destructive mb-1">KYC Rejected</h3>
            <p className="text-sm text-foreground mb-1">
              Unfortunately, your KYC verification was <span className="font-semibold">not successful</span>. This may be due to unclear documents, mismatched information, or unsupported document types.
            </p>
            <ul className="text-xs text-destructive/80 list-disc ml-4 mb-2">
              <li>You can contact our support to get the rejection reason.</li>
              <li>Ensure your documents are clear and match your profile details.</li>
              <li>Accepted documents: Passport, National ID, or Driver’s License.</li>
              <li>Please note that we don't accept clients from Azerbaijan, North Korea, Turkmenistan, Syria, Iran, Iraq, Afghanistan, Somalia, Yemen.</li>
            </ul>
            <span className="text-xs text-destructive">
              Please resubmit your documents to proceed.
            </span>
            {date && (
              <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                <WarningCircle size={14} weight="regular" />
                Rejected on {date.toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                }).replace(',', '')}
              </div>
            )}
          </div>
        </Card>
      );

    default:
      return (
        <Card className="p-4 rounded-lg border bg-secondary/20 border-secondary">
          <div className="flex flex-col gap-2 items-start">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-primary text-xs font-semibold mb-2">
              <Shield size={18} weight="regular" className="mr-1" />
            </span>
            <h3 className="font-semibold text-foreground mb-1">KYC Verification Required</h3>
            <p className="text-sm text-foreground mb-1">
              To ensure the security of your account and comply with regulations, <span className="font-semibold">KYC verification is required</span> before you can withdraw funds or access all features.
            </p>
            <ul className="text-xs text-foreground/80 list-disc ml-4 mb-2">
              <li>Submit a government-issued photo ID and a selfie.</li>
              <li>Verification is typically completed within 1-2 business days.</li>
              <li>Your information is encrypted and securely stored.</li>
            </ul>
            {typeof window !== "undefined" && window.location.pathname !== "/profile" && (
              <button
                className="mt-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition"
                onClick={() => window.location.href = '/profile?tab=kyc'}
                type="button"
              >
                Submit Verification
              </button>
            )}
          </div>
        </Card>
      );
  }
}
