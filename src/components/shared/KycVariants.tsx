import { AlertTriangle, Check, Clock, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

interface KycVariantProps {
  status?: 'completed' | 'processing' | 'rejected' | 'required';
  date?: Date;
}

export function KycVariant({ status = 'required', date }: KycVariantProps) {
  switch (status) {
    case 'completed':
      return (
        <Card className="p-4 rounded-lg border bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-800">Verification Complete</h3>
              <p className="text-sm text-green-700">
                Your identity has been verified successfully. You now have full access to all platform features.
              </p>
              {date && (
                <div className="mt-3 text-xs text-green-700 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Verified on {date.toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </Card>
      );

    case 'processing':
      return (
        <Card className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Verification In Progress</h3>
              <p className="text-sm text-yellow-700">
                Your documents are being reviewed. This usually takes 1-2 business days.
              </p>
              {date && (
                <div className="mt-3 text-xs text-yellow-700 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Submitted on {date.toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </Card>
      );

    case 'rejected':
      return (
        <Card className="p-4 rounded-lg border bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-medium text-red-800">Verification Rejected</h3>
              <p className="text-sm text-red-700">
                Your verification was not successful. Please submit new documents following the guidelines below.
              </p>
              {date && (
                <div className="mt-3 text-xs text-red-700 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Rejected on {date.toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </Card>
      );

    default:
      return (
        <Card className="p-4 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800">Verification Required</h3>
              <p className="text-sm text-blue-700">
                Please complete your KYC verification to unlock all platform features.
              </p>
            </div>
          </div>
        </Card>
      );
  }
}
