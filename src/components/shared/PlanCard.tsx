import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Lock, ArrowRight } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  description?: string; // <-- Added description prop
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
  description, // <-- Added description
}: PlanCardProps) {
  // Use prop if provided, else use hook
  const { data: hookPairs } = useTradingPairs();
  // Ensure tradingPairs is always an array of TradingPair
  const tradingPairs: TradingPair[] = Array.isArray(propTradingPairs)
    ? propTradingPairs
    : Array.isArray(hookPairs)
      ? hookPairs
      : [];
  // Memoize random pairs
  const randomPairs = useMemo(() => getRandomPairs(tradingPairs, 3), [tradingPairs]);
  const [hoverGradient, setHoverGradient] = useState(gradients[0]);

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg bg-secondary"
      onMouseEnter={() => setHoverGradient(getRandomGradient())}
    >
      {/* Static secondary background */}
      <div className="absolute inset-0 bg-background" />
      {/* Random gradient on hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${hoverGradient}`}
      />
      
      <div className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline"
              className="px-4 py-1 text-sm font-medium backdrop-blur-sm border-primary"
            >
              {name}
            </Badge>
            <div className="p-2 rounded-xl bg-primary/10 flex items-center">
              {variant === 'available' ? (
                <Lock className="h-5 w-5 text-primary" />
              ) : (
                <Clock className="h-5 w-5 text-primary" />
              )}
            </div>
          </div>
        </div>
        <div className="space-y-1">              
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD
            </h2>
            {/* Removed percentage badge next to amount */}
          </div>
          {/* Projected Gain and Lock-in badges below amount */}
          <div className="flex flex-row gap-2 mt-2 items-center">
            <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40 font-medium px-3 py-0.5 text-xs">
              Projected Gain: ${((amount * percentage / 100 * duration)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/40 font-medium px-3 py-0.5 text-xs">
              Runs for: {duration} days
            </Badge>
          </div>
        </div>
        {/* Description - show directly below badges, bold before colon, normal after, and add calculated lines */}
        {description && (
          <div className="text-sm text-foreground pt-1 space-y-1">
            {description.split(/\n/).map((line, idx) => {
              const colonIdx = line.indexOf(":");
              if (colonIdx > 0) {
                return (
                  <div key={idx}>
                    <span className="font-bold">{line.slice(0, colonIdx + 1)}</span>
                    <span className="font-normal">{line.slice(colonIdx + 1)}</span>
                  </div>
                );
              } else {
                return <div key={idx}>{line}</div>;
              }
            })}
            {/* Calculated description lines */}
            <div>
              <span className="font-bold">📊 Projected Performance:</span>
              <span className="font-normal"> Up to {Number(percentage * duration) % 1 === 0 ? Number(percentage * duration) : Number(percentage * duration).toFixed(2)}%</span>
            </div>
            <div>
              <span className="font-bold">💰 Projected Gain:</span>
              <span className="font-normal"> ${((amount * percentage * duration) / 100) % 1 === 0 ? ((amount * percentage * duration) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ((amount * percentage * duration) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="font-bold">🔒 Capital Lock-in:</span>
              <span className="font-normal"> {duration} days</span>
            </div>
          </div>
        )}
        {/* Progress for Active Plans */}
        {variant === 'active' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{progress?.toFixed(2)}%</span>
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
              className="flex-1 bg-primary hover:bg-primary/90 rounded-md"
            >
              🚀 Activate Strategy
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-md text-foreground"
                >
                  Details
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background text-foreground border border-secondary/20">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2 text-foreground">
                    <div className={`p-2 rounded-lg bg-primary/10`}>
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    {name}
                  </DialogTitle>
                  <DialogDescription>
                    <div className="space-y-6 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Strategy Amount:</span>
                          <span className="text-lg font-medium text-foreground">${amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Projected Performance:</span>
                          <span className="text-lg font-medium text-primary">Up to {Number(percentage * duration).toFixed(2)}%</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Projected Gain (Based on data):</span>
                          <span className="text-lg font-medium text-primary">
                            ${((amount * percentage * duration) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">AI Strategy Duration:</span>
                          <span className="text-lg font-medium text-foreground">{duration} days</span>
                        </div>
                      </div>

                      <div className="space-y-3 bg-secondary rounded-lg p-4 border border-secondary-foreground/10">
                        <h4 className="font-medium text-foreground">Benefits & Features</h4>
                        <ul className="space-y-2">
                          {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                {/* Removed DialogFooter with Close button */}
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="flex items-center gap-3">              
            <Button
              variant="destructive"
              className="flex-1 opacity-50 group-hover:opacity-100 transition-opacity duration-300 text-white rounded-md"
              onClick={onCancel}
            >
              Cancel Plan
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-md text-foreground"
                >
                  Details
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background text-foreground border border-secondary/20">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2 text-foreground">
                    <div className={`p-2 rounded-lg bg-primary/10`}>
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    {name}
                  </DialogTitle>
                  <DialogDescription>
                    <div className="space-y-6 pt-2">
                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Subscription Date</span>
                          <span className="text-base font-medium text-foreground">{subscriptionDate}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Strategy Allocation</span>
                          <span className="text-lg font-medium text-foreground">${amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Projection in %</span>
                          <span className="text-lg font-medium text-primary">{Number(percentage * duration).toFixed(2)}%</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Projected Performance</span>
                          <span className="text-lg font-medium text-primary">
                            ${((amount * percentage * duration) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">Simulated PnL So Far</span>
                          <span className="text-lg font-medium text-green-500">+${earnings?.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-2 bg-secondary rounded-lg p-4 border border-secondary-foreground/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">Cycle Progress</span>
                          <span className="font-medium text-foreground">{progress?.toFixed(2)}%</span>
                        </div>
                        <Progress 
                          value={progress} 
                          className="h-2 [&>div]:bg-primary"
                        />
                        <div className="flex items-center justify-between text-xs text-foreground pt-1">
                          <span>Day {duration - daysRemaining}</span>
                          <span>Day {duration}</span>
                        </div>
                      </div>

                      {variant === 'active' && (
                        <div className="space-y-4 bg-secondary rounded-lg p-4 border border-secondary-foreground/10">
                          <h4 className="font-medium text-foreground">Trading Pairs</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {randomPairs.map((pair) => (
                              <div 
                                key={pair.id} 
                                className="flex items-center gap-2 p-2 rounded-lg bg-background border border-secondary-foreground/10"
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
                                  <span className="text-sm font-medium text-left text-foreground">{pair.short_name}</span>
                                  <span className="text-xs text-foreground text-left">
                                    {pair.type}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogDescription>
                </DialogHeader>
                {/* Removed DialogFooter with Close button */}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </Card>
  );
}