import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Lock, ArrowRight } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PlanCardProps {
  variant?: 'available' | 'active';
  name: string;
  amount: number;
  percentage: number;
  duration: number;
  progress?: number;
  earnings?: number;
  daysRemaining?: number;
  subscriptionDate?: string;
  onInvest?: () => void;
  benefits?: string[];
}

export function PlanCard({
  variant = 'available',
  name,
  amount,
  percentage,
  duration,
  progress,
  earnings,
  daysRemaining,
  subscriptionDate,
  onInvest,
  benefits = []
}: PlanCardProps) {
  const getBadgeColor = () => {
    switch (name.toLowerCase()) {
      case 'basic plan': return 'bg-blue-900/20';
      case 'pro plan': return 'bg-green-900/20';
      case 'premium plan': return 'bg-purple-900/20';
      default: return 'bg-gray-900/20';
    }
  };

  return (
    <Card className="p-6 bg-card/30 border-border/40">
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Badge variant="outline" className={getBadgeColor()}>{name}</Badge>
              <h2 className="text-2xl font-bold">
                {amount.toLocaleString()} USD <span className="text-lg text-muted-foreground">({percentage}%)</span>
              </h2>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              {variant === 'available' ? (
                <>
                  <Lock className="h-3 w-3" /> {duration} days
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" /> Subscribed: {subscriptionDate}
                </>
              )}
            </Badge>
          </div>

          {variant === 'available' && (
            <div className="flex flex-row gap-2 w-full md:w-[300px] md:ml-auto">
              <Button 
                size="sm"
                onClick={onInvest}
                className="flex-1"
              >
                Select <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    More info
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{name} Details</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>Investment details and benefits overview.</p>
                      <ul className="list-disc pl-4 space-y-2">
                        {benefits.map((benefit, index) => (
                          <li key={index}>{benefit}</li>
                        ))}
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {variant === 'active' && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2 rounded-full [&>div]:rounded-full" />
            <div className="flex justify-between text-xs mt-2">
              <span className="text-green-500 font-medium">+{earnings?.toFixed(2)} USD earned</span>
              <span className="text-muted-foreground">{daysRemaining} days remain</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
