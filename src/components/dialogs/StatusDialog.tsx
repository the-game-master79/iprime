import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity, TrendingUp, DollarSign, Cpu, Monitor, Gauge } from "lucide-react";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";

// Add this formatter function at the top level before the component
const formatProfit = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(3)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
};

// Add these utility functions at the top level
const STORAGE_KEY = 'bot_trading_data';

const getTodayKey = () => {
  return new Date().toISOString().split('T')[0]; // Returns YYYY-MM-DD
};

const getStoredData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  
  const { date, profit } = JSON.parse(data);
  // Reset if stored date is not today
  if (date !== getTodayKey()) return null;
  
  return { profit: Number(profit) };
};

const storeData = (profit: number) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    date: getTodayKey(),
    profit
  }));
};

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Move Progress component outside
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

// Move MetricCard component outside
const MetricCard = React.memo(({ 
  icon: Icon, 
  label, 
  value, 
  progress 
}: { 
  icon: any;
  label: string;
  value: number;
  progress: number;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-accent/5 transition-colors"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="space-y-1 flex-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-sm font-medium min-w-[3rem] text-right">{value}%</span>
      </div>
    </div>
  </motion.div>
));
MetricCard.displayName = "MetricCard";

// Modify ProfitCard component
const ProfitCard = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  color = "text-primary",
  chartData 
}: { 
  title: string;
  value: string | number;
  icon: any;
  color?: string;
  chartData: number[];
}) => {
  // Calculate progress based on recent values
  const progress = React.useMemo(() => {
    if (!chartData.length) return 0;
    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    const latest = chartData[chartData.length - 1];
    const range = max - min;
    return range === 0 ? 50 : ((latest - min) / range) * 100;
  }, [chartData]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-card border shadow-sm"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
        </div>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <Progress value={progress} className="h-1" />
    </motion.div>
  );
});
ProfitCard.displayName = "ProfitCard";

// Move CustomTooltip component outside
const CustomTooltip = React.memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="text-sm font-medium">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = "CustomTooltip";

export function StatusDialog({ open, onOpenChange }: StatusDialogProps) {
  const [currentProfit, setCurrentProfit] = useState(200); // Start from $200
  const [profitHistory, setProfitHistory] = useState<number[]>([]);
  const [currentPayout, setCurrentPayout] = useState(130); // Start from 65% of $200
  const [profitPerSecond, setProfitPerSecond] = useState<number[]>([]);
  const [currentPPS, setCurrentPPS] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(76);
  const [gpuUsage, setGpuUsage] = useState(76);
  const [performanceScore, setPerformanceScore] = useState(76);

  // Add state for profit progress tracking
  const [profitProgress, setProfitProgress] = useState<number[]>([]);
  const [payoutProgress, setPayoutProgress] = useState<number[]>([]);
  const [ppsProgress, setPpsProgress] = useState<number[]>([]);

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentProfit(200);
      setCurrentPayout(130);
      setProfitHistory([200]);
      setProfitPerSecond([]);
      setCurrentPPS(0);

      // Initialize metrics with random values
      setCpuUsage(Math.floor(Math.random() * (99 - 47) + 47));
      setGpuUsage(Math.floor(Math.random() * (99 - 47) + 47));
      setPerformanceScore(Math.floor(Math.random() * (99 - 47) + 47));
    }
  }, [open]);

  // Add new useEffect to handle daily reset
  useEffect(() => {
    if (!open) return;

    // Try to restore today's data or start fresh
    const storedData = getStoredData();
    if (storedData) {
      setCurrentProfit(storedData.profit);
      setProfitHistory([storedData.profit]);
    } else {
      // Reset to initial state if it's a new day
      setCurrentProfit(200);
      setProfitHistory([200]);
      storeData(200);
    }

    // Check for day change every minute
    const checkInterval = setInterval(() => {
      const currentData = getStoredData();
      if (!currentData) {
        // It's a new day, reset everything
        setCurrentProfit(200);
        setProfitHistory([200]);
        setCurrentPayout(130);
        setProfitPerSecond([]);
        setCurrentPPS(0);
        storeData(200);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [open]);

  // Simulate live data
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      // Update PPS based on current profit to maintain target range
      setCurrentPPS((prev) => {
        const newValue = (Math.random() * 10 - 5); // Initial range from -$5 to +$5
        
        // Adjust PPS based on current profit to stay within limits
        if (currentProfit >= 380 && newValue > 0) {
          return -Math.abs(newValue); // Force negative when near upper limit
        } else if (currentProfit <= 170 && newValue < 0) {
          return Math.abs(newValue); // Force positive when near lower limit
        }
        
        setProfitPerSecond((pts) => {
          const updatedPts = [...(pts.length >= 20 ? pts.slice(1) : pts)];
          if (updatedPts.length > 0) {
            const lastValue = updatedPts[updatedPts.length - 1];
            const steps = 5;
            for (let i = 1; i <= steps; i++) {
              const interpolatedValue = lastValue + ((newValue - lastValue) * i) / steps;
              updatedPts.push(interpolatedValue);
            }
          } else {
            updatedPts.push(newValue);
          }
          return updatedPts;
        });
        return newValue;
      });

      // Update profit based on current PPS with limits
      setCurrentProfit((prev) => {
        const profitChange = currentPPS;
        const newProfit = Math.max(150, Math.min(400, prev + profitChange)); // Clamp between 150-400
        storeData(newProfit);
        setProfitHistory((history) => [...history.slice(-30), newProfit]);
        return newProfit;
      });

      // Calculate payout (65% ±5% of profit)
      setCurrentPayout((prev) => {
        const payoutPercentage = 0.65 + Math.random() * 0.05; // 65% ±5%
        const payout = currentProfit * payoutPercentage;
        return Math.max(100, Math.min(300, payout)); // Keep payout proportional but limited
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, currentProfit, currentPPS]);

  // Update metrics every second
  useEffect(() => {
    if (!open) return;

    const metricsInterval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * (99 - 47) + 47));
      setGpuUsage(Math.floor(Math.random() * (99 - 47) + 47));
      setPerformanceScore(Math.floor(Math.random() * (99 - 47) + 47));
    }, 1000);

    return () => clearInterval(metricsInterval);
  }, [open]);

  // Format data for charts
  const profitChartData = profitHistory.map((value, index) => ({
    value,
    timestamp: index
  }));

  const ppsChartData = profitPerSecond.map((value, index) => ({
    value,
    time: `${index}s` // Add time labels
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(90vw,680px)] h-[85vh] max-h-[800px] p-0 overflow-hidden rounded-xl">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Trading Bot Status
            </DialogTitle>
            <DialogDescription className="text-left">
              Real-time performance metrics of our automated trading system
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard icon={Cpu} label="CPU Usage" value={cpuUsage} progress={cpuUsage} />
              <MetricCard icon={Monitor} label="GPU Usage" value={gpuUsage} progress={gpuUsage} />
              <MetricCard icon={Gauge} label="Performance" value={performanceScore} progress={performanceScore} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ProfitCard 
                title="Bot's Profit" 
                value={formatProfit(currentProfit)}
                icon={TrendingUp}
                color="text-green-500"
                chartData={profitHistory}
              />
              <ProfitCard 
                title="Bot's Payout"
                value={formatProfit(currentPayout)}
                icon={DollarSign}
                chartData={profitHistory.map(p => p * 0.65)}
              />
              <ProfitCard 
                title="Profit/Second"
                value={`$${currentPPS.toFixed(4)}`}
                icon={Activity}
                color={currentPPS >= 0 ? "text-green-500" : "text-red-500"}
                chartData={profitPerSecond}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="p-4 space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Profit Trend
                </h3>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitChartData}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                        animationDuration={300}
                      />
                      <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ stroke: 'hsl(var(--muted))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Profit/Second
                </h3>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ppsChartData}>
                      <XAxis
                        dataKey="time"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        width={35}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="rgb(34 197 94)"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={300}
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
