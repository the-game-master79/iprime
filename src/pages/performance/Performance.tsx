import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavigationFooter } from "@/components/shared/NavigationFooter";
import { LineChart as LineChartIcon, ArrowUpRight, ArrowDownRight, Target, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Topbar } from "@/components/shared/Topbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PairPerformance {
  pair: string;
  totalPnL: number;
  tradesCount: number;
  winRate: number;
}

interface Stats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  highestProfit: number;
  highestLoss: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  pairStats: PairPerformance[];
}

interface ChartData {
  date: string;
  pnl: number;
}

const COLORS = ['#10b981', '#ef4444']; // green-500 and red-500

const formatValue = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
};

export default function Performance() {
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    highestProfit: 0,
    highestLoss: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    pairStats: []
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartView, setChartView] = useState<'trades' | 'pnl'>('trades');

  const pieChartData = {
    trades: [
      { name: 'Winning Trades', value: stats.winningTrades },
      { name: 'Losing Trades', value: stats.losingTrades }
    ],
    pnl: [
      { name: 'Total Profit', value: stats.totalProfit },
      { name: 'Total Loss', value: stats.totalLoss }
    ]
  };

  useEffect(() => {
    const fetchPerformanceData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trades } = await supabase
        .from('trades')
        .select('pnl, created_at, status, pair')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .order('created_at', { ascending: true });

      if (!trades) return;

      // Calculate pair performance
      const pairPerformance = trades.reduce((acc, trade) => {
        const pair = trade.pair;
        if (!acc[pair]) {
          acc[pair] = {
            pair,
            totalPnL: 0,
            tradesCount: 0,
            winningTrades: 0
          };
        }
        
        acc[pair].totalPnL += trade.pnl || 0;
        acc[pair].tradesCount++;
        if (trade.pnl > 0) acc[pair].winningTrades++;
        
        return acc;
      }, {} as Record<string, any>);

      // Convert to array and calculate win rates
      const pairStats = Object.values(pairPerformance)
        .map(p => ({
          ...p,
          winRate: (p.winningTrades / p.tradesCount) * 100
        }))
        .sort((a, b) => b.totalPnL - a.totalPnL);

      // Calculate statistics
      const stats = trades.reduce((acc, trade) => {
        const pnl = trade.pnl || 0;
        
        if (pnl > 0) {
          acc.winningTrades++;
          acc.totalProfit += pnl;
          acc.highestProfit = Math.max(acc.highestProfit, pnl);
        } else if (pnl < 0) {
          acc.losingTrades++;
          acc.totalLoss += Math.abs(pnl);
          acc.highestLoss = Math.min(acc.highestLoss, pnl);
        }
        
        return acc;
      }, {
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        highestProfit: 0,
        highestLoss: 0
      });

      const totalTrades = trades.length;
      const winRate = (stats.winningTrades / totalTrades) * 100;
      const avgWin = stats.winningTrades > 0 ? stats.totalProfit / stats.winningTrades : 0;
      const avgLoss = stats.losingTrades > 0 ? stats.totalLoss / stats.losingTrades : 0;
      const profitFactor = stats.totalLoss > 0 ? stats.totalProfit / stats.totalLoss : stats.totalProfit;

      setStats({
        ...stats,
        totalTrades,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        pairStats
      });

      // Prepare chart data
      const chartData = trades.map(trade => ({
        date: new Date(trade.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        pnl: trade.pnl || 0
      }));

      setChartData(chartData);
    };

    fetchPerformanceData();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Topbar title="Performance" variant="minimal" />
      
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="container max-w-lg mx-auto p-4 space-y-4">

          <Card>
            <CardHeader className="p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Distribution Analysis</CardTitle>
              <Select value={chartView} onValueChange={(value: 'trades' | 'pnl') => setChartView(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trades">Trade Distribution</SelectItem>
                  <SelectItem value="pnl">Profit/Loss</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData[chartView]}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        name
                      }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={12}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData[chartView].map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [
                        chartView === 'trades' 
                          ? `${value} trades` 
                          : formatValue(value),
                        undefined
                      ]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Win Rate
                  <Target className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">
                  {stats.winRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.winningTrades} / {stats.totalTrades} trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Profit Factor
                  <Percent className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">
                  {stats.profitFactor.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Profit/Loss ratio
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">P&L Chart</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      fontSize={12}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => formatValue(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatValue(value), 'P&L']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pnl" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Highest Profit
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-green-500">
                  {formatValue(stats.highestProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatValue(stats.avgWin)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Highest Loss
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-red-500">
                  {formatValue(Math.abs(stats.highestLoss))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatValue(stats.avgLoss)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Add new section for pair performance */}
          <div className="grid grid-cols-2 gap-4 pb-20">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">
                  Top Performing Pairs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {stats.pairStats.slice(0, 3).map((pair, index) => (
                    <div key={pair.pair} className="flex justify-between items-center">
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">{index + 1}.</span>
                        <span className="text-sm">{pair.pair.replace('BINANCE:', '').replace('FX:', '')}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-green-500">
                          {formatValue(pair.totalPnL)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          WR: {pair.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">
                  Worst Performing Pairs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {stats.pairStats.slice(-3).reverse().map((pair, index) => (
                    <div key={pair.pair} className="flex justify-between items-center">
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">{index + 1}.</span>
                        <span className="text-sm">{pair.pair.replace('BINANCE:', '').replace('FX:', '')}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-red-500">
                          {formatValue(pair.totalPnL)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          WR: {pair.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
      <NavigationFooter />
    </div>
  );
}
