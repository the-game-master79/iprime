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

// Custom Progress component with its own context
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

export function StatusDialog({ open, onOpenChange }: StatusDialogProps) {
  const [currentProfit, setCurrentProfit] = useState(200); // Start from $200
  const [profitHistory, setProfitHistory] = useState<number[]>([]);
  const [currentPayout, setCurrentPayout] = useState(130); // Start from 65% of $200
  const [profitPerSecond, setProfitPerSecond] = useState<number[]>([]);
  const [currentPPS, setCurrentPPS] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(76);
  const [gpuUsage, setGpuUsage] = useState(76);
  const [performanceScore, setPerformanceScore] = useState(76);

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

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="text-sm font-medium">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Trading Bot Status
          </DialogTitle>
          <DialogDescription>
            Real-time performance metrics of our automated trading system
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Add new metrics container before existing summary cards */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">System Metrics</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Cpu className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CPU Usage</p>
                  <div className="flex items-center gap-2">
                    <Progress value={cpuUsage} className="h-1 w-20" />
                    <span className="text-sm font-medium">{cpuUsage}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Monitor className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">GPU Usage</p>
                  <div className="flex items-center gap-2">
                    <Progress value={gpuUsage} className="h-1 w-20" />
                    <span className="text-sm font-medium">{gpuUsage}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Gauge className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <div className="flex items-center gap-2">
                    <Progress value={performanceScore} className="h-1 w-20" />
                    <span className="text-sm font-medium">{performanceScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Bot's Profit</p>
                  <p className="text-2xl font-bold">{formatProfit(currentProfit)}</p>
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <Progress value={85} className="h-1" />
            </Card>
            
            <Card className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Bot's Payout</p>
                  <p className="text-2xl font-bold">{formatProfit(currentPayout)}</p>
                </div>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <Progress value={65} className="h-1" />
            </Card>
            
            <Card className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Profit/Second</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    currentPPS >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    ${currentPPS.toFixed(4)}
                  </p>
                </div>
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <Progress value={75} className="h-1" />
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            {/* Profit Chart */}
            <Card className="p-4 space-y-2">
              <h3 className="font-medium text-sm">Profit Trend</h3>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitChartData}>
                    <Line 
                      type="natural" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                      tension={0.4}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* PPS Chart */}
            <Card className="p-4 space-y-2">
              <h3 className="font-medium text-sm">Profit/Second</h3>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ppsChartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <XAxis
                      dataKey="time"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveEnd"
                    />
                    <YAxis
                      width={35}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                      domain={[0, 'dataMax + 0.5']}
                    />
                    <Line
                      type="natural"
                      dataKey="value"
                      stroke="rgb(34 197 94)"
                      strokeWidth={2}
                      dot={false}
                      tension={0.4}
                      animationDuration={300}
                      animationEasing="ease-in-out"
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
