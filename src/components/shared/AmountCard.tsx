import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
interface AmountCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compute' | 'rank';
  activePlans?: number;
  progress?: number;
  currentRank?: string;
  nextRank?: string;
}

export function AmountCard({ 
  title, 
  amount, 
  subtitle, 
  icon, 
  className,
  variant = 'default',
  activePlans,
  progress,
  currentRank,
  nextRank
}: AmountCardProps) {
  const navigate = useNavigate();

  const renderContent = () => {
    switch (variant) {
      case 'compute':
        return (
          <div className="space-y-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {icon && <span className="text-muted-foreground">{icon}</span>}
                <span className="text-sm text-muted-foreground">{title}</span>
              </div>
              <span className="text-2xl font-semibold mt-1">
                {convertAmount(amount)}
              </span>
              {activePlans !== undefined && (
                <span className="text-xs text-muted-foreground mt-1">
                  {activePlans} Active Plans
                </span>
              )}
            </div>
            <Button 
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/plans')}
            >
              Subscribe
            </Button>
          </div>
        );

      case 'rank':
        return (
          <div className="space-y-4">
            <div className="flex flex-col relative">
              <Badge variant="default" className="absolute right-0 top-0">
                {progress?.toFixed(2)}% • {nextRank}
              </Badge>
              <div className="flex items-center gap-2">
                {icon && <span className="text-muted-foreground">{icon}</span>}
                <span className="text-sm text-muted-foreground">{title}</span>
              </div>
              <span className="text-2xl font-semibold mt-1">{currentRank}</span>
              {nextRank && (
                <div className="mt-4">
                  <Progress value={progress} className="h-1" />
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/affiliate')}
            >
              View Affiliates
            </Button>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {icon && <span className="text-muted-foreground">{icon}</span>}
                <span className="text-sm text-muted-foreground">{title}</span>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-semibold block">
                  {convertAmount(amount)}
                </span>
                {subtitle && (
                  <span className="text-xs text-muted-foreground">
                    Bonus: {convertAmount(parseFloat(subtitle))}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={() => navigate('/deposit')}
              >
                Add Funds
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => navigate('/withdrawals')}
              >
                Withdraw
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className={`bg-[#141414] border-0 ${className}`}>
      <div className="p-4">
        {renderContent()}
      </div>
    </Card>
  );
}
