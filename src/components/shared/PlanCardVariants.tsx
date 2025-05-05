import { PlanCard } from "@/components/shared/PlanCard";

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          variant="available"
          name={plan.name}
          amount={plan.investment}
          percentage={plan.returns_percentage * plan.duration_days} // Multiply by duration for total ROI
          duration={plan.duration_days}
          benefits={plan.benefits.split('•').filter(Boolean)}
          onInvest={() => onInvest(plan.id)}  
        />
      ))}
    </div>
  );
}

export function ActivePlanVariant({ plans, onCancel }: ActivePlanVariantProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
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
            percentage={plan.returns_percentage}
            duration={plan.duration_days}
            progress={progress}
            earnings={plan.actual_earnings}
            daysRemaining={plan.duration_days - (plan.days_credited || 0)}
            subscriptionDate={plan.subscription_date}
            onCancel={() => onCancel(plan)}
          />
        )
      })}
    </div>
  );
}
