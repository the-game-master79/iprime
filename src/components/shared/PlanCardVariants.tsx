import { useState } from "react";
import { PlanCard } from "@/components/shared/PlanCard";
import { Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AvailablePlanVariantProps {
  plans: any[];
  loading?: boolean;
  onInvest: (id: string) => void;
}

interface ActivePlanVariantProps {
  plans: any[];
  onCancel: (plan: any) => void;
}

export function AvailablePlanVariant({ plans, loading, onInvest }: AvailablePlanVariantProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          variant="available"
          name={plan.name}
          amount={plan.investment}
          percentage={Number(plan.returns_percentage)}
          duration={plan.duration_days}
          benefits={plan.benefits.split('•').filter(Boolean)}
          onInvest={() => onInvest(plan.id)}  
        />
      ))}
    </div>
  );
}

export function ActivePlanVariant({ plans, onCancel }: ActivePlanVariantProps) {
  const [planToCancel, setPlanToCancel] = useState<any | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCancelClick = (plan: any) => {
    setPlanToCancel(plan);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    if (planToCancel) {
      onCancel(planToCancel);
      setPlanToCancel(null);
      setShowCancelDialog(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const progress = Math.min(
            ((plan.days_credited || 0) / plan.duration_days) * 100,
            100
          );

          return (
            <PlanCard
              key={plan.subscription_id}
              variant="active" 
              name={plan.name}
              amount={plan.investment}
              percentage={Number(plan.returns_percentage)}
              duration={plan.duration_days}
              progress={progress}
              earnings={Number(plan.actual_earnings || 0)}
              daysRemaining={plan.duration_days - (plan.days_credited || 0)}
              subscriptionDate={plan.subscription_date}
              onCancel={() => handleCancelClick(plan)}
            />
          );
        })}
      </div>      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-lg border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-start gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Clock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="text-lg font-semibold">Cancel Investment Plan</div>
                <div className="text-sm font-normal text-muted-foreground mt-1">This action cannot be undone</div>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 mt-4">
                <div className="rounded-lg border bg-card/50 p-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Plan Name</span>
                    <span className="font-medium">{planToCancel?.name}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Investment Amount</span>
                    <span className="text-lg font-medium">${planToCancel?.investment?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Total Earned</span>
                    <span className="text-lg font-medium text-green-500">
                      +${Number(planToCancel?.actual_earnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Cancelling your plan will:
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-destructive" />
                      Stop all future earnings from this plan
                    </li>
                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-destructive" />
                      Keep all currently earned amounts in your balance
                    </li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-background text-muted-foreground hover:text-foreground">
              Keep Plan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancel Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
