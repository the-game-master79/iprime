import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Lock, ArrowRight } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEffect, useState, useMemo } from "react";
import { useTradingPairs } from "@/hooks/useTradingPairs";
// If the TradingPair type exists elsewhere, update the import path accordingly, for example:

// Or, if you don't have a TradingPair type, define it temporarily here:
export interface TradingPair {
  id: string | number;
  symbol: string;
  name: string;
  type: string;
  is_active: boolean;
  image_url: string;
  short_name: string;
  // Add other properties as needed
}
import { supabase } from "@/lib/supabase";

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
  onCancel?: () => void;
  benefits?: string[];
  tradingPairs?: TradingPair[]; // Accept as prop for reusability
}

// Remove getBadgeStyle and use a random gradient for hover
const gradients = [
  "bg-gradient-to-r from-primary/10 to-secondary/30",
  "bg-gradient-to-r from-primary/20 to-primary/5",
  "bg-gradient-to-r from-secondary/20 to-primary/10",
  "bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5",
  "bg-gradient-to-r from-primary/10 to-foreground/10"
];
function getRandomGradient() {
  return gradients[Math.floor(Math.random() * gradients.length)];
}

const CACHE_KEY = 'trading-pairs-cache';
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

const getRandomPairs = (pairs: TradingPair[], count: number) => {
  const shuffled = [...pairs].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

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
  onCancel,
  benefits = [],
  tradingPairs: propTradingPairs,
}: PlanCardProps) {
  // Use prop if provided, else use hook
  const { data: hookPairs } = useTradingPairs();
  const tradingPairs = propTradingPairs || hookPairs || [];
  // Memoize random pairs
  const randomPairs = useMemo(() => getRandomPairs(tradingPairs, 3), [tradingPairs]);
  const [hoverGradient, setHoverGradient] = useState(gradients[0]);

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg bg-secondary"
      onMouseEnter={() => setHoverGradient(getRandomGradient())}
    >
      {/* Static secondary background */}
      <div className="absolute inset-0 bg-secondary" />
      {/* Random gradient on hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${hoverGradient}`}
      />
      
      <div className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge 
              variant="outline"
              className="px-4 py-1 text-sm font-medium backdrop-blur-sm border-primary"
            >
              {name}
            </Badge>
            <div className="space-y-1">              
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold tracking-tight">
                  {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD
                </h2>
                <span className="text-lg text-primary font-medium">
                  {Number(percentage * duration).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  <span>{duration} days lock-in</span>
                </div>
                <span>•</span>
                <span>
                  ROI: ${((amount * percentage / 100 * duration)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
            {variant === 'available' ? (
              <Lock className="h-5 w-5 text-primary" />
            ) : (
              <Clock className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>

        {/* Benefits Preview */}
        {variant === 'available' && benefits.length > 0 && (
          <div className="space-y-2 py-2">
            <ul className="space-y-2">
              {benefits.slice(0, 3).map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-muted-foreground/80">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  {benefit}
                </li>
              ))}
              {benefits.length > 3 && (
                <li className="text-sm text-muted-foreground/70 pl-3">
                  +{benefits.length - 3} more benefits...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Progress for Active Plans */}
        {variant === 'active' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress?.toFixed(2)}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-2 [&>div]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-primary">               
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="font-medium">+${Number(earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} earned</span>
              </div>
              <span className="text-muted-foreground">{daysRemaining} days remaining</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {variant === 'available' ? (
          <div className="flex items-center gap-3">
            <Button 
              onClick={onInvest}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Invest Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  Details
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-lg border-primary/20">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-primary/10`}>
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    {name}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-6 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Investment Amount</span>
                          <span className="text-lg font-medium">${amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Total ROI</span>
                          <span className="text-lg font-medium text-primary">{Number(percentage * duration).toFixed(2)}%</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">ROI in USD</span>
                          <span className="text-lg font-medium text-primary">
                            ${((amount * percentage * duration) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Duration</span>
                          <span className="text-lg font-medium">{duration} days</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Benefits & Features</h4>
                        <ul className="space-y-2">
                          {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-primary/20 hover:border-primary/40">
                    Close
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="flex items-center gap-3">              
            <Button
              variant="destructive"
              className="flex-1 opacity-50 group-hover:opacity-100 transition-opacity duration-300 text-white"
              onClick={onCancel}
            >
              Cancel Plan
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  Details
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-lg border-primary/20">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-primary/10`}>
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    {name}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-6 pt-2">
                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Subscription Date</span>
                          <span className="text-base font-medium">{subscriptionDate}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Investment Amount</span>
                          <span className="text-lg font-medium">${amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Total ROI</span>
                          <span className="text-lg font-medium text-primary">{Number(percentage * duration).toFixed(2)}%</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">ROI in USD</span>
                          <span className="text-lg font-medium text-primary">
                            ${((amount * percentage * duration) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Total Earned</span>
                          <span className="text-lg font-medium text-green-500">+${earnings?.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-2 bg-card/50 rounded-lg p-4 border border-primary/10">              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress?.toFixed(2)}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-2 [&>div]:bg-primary"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>Day {duration - daysRemaining}</span>
                          <span>Day {duration}</span>
                        </div>
                      </div>

                      {variant === 'active' && (
                        <div className="space-y-4">
                          <h4 className="font-medium">Trading Pairs</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {randomPairs.map((pair) => (
                              <div 
                                key={pair.id} 
                                className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-primary/10"
                              >
                                <img
                                  src={pair.image_url}
                                  alt={pair.name}
                                  className="h-8 w-8 rounded-full"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/generic.png';
                                  }}
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-left">{pair.short_name}</span>
                                  <span className="text-xs text-muted-foreground text-left">
                                    {pair.type}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-primary/20 hover:border-primary/40">
                    Close
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </Card>
  );
}