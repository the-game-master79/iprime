import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Copy, Trash2 } from "lucide-react";
import { StatCard } from "@/components/ui-components";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface UserSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  trades_count: number;
  total_pnl: number;
  default_leverage: number;
  last_trade_date: string | null;
  withdrawal_wallet: number;
}

interface Trade {
  id: string;
  user_id: string;
  pair: string;
  type: 'buy' | 'sell';
  status: 'open' | 'pending' | 'closed';
  open_price: number;
  close_price?: number;
  lots: number;
  leverage: number;
  pnl?: number;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface UserTradeStats {
  totalTrades: number;
  totalVolume: number;
  totalPnL: number;
  winRate: number;
}

const TradesPage = () => {
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("open");
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [userTrades, setUserTrades] = useState<Trade[]>([]);
  const [userStats, setUserStats] = useState<UserTradeStats>({
    totalTrades: 0,
    totalVolume: 0,
    totalPnL: 0,
    winRate: 0,
  });
  const [userTradeTab, setUserTradeTab] = useState<'all' | 'open' | 'closed' | 'pending'>('all');
  const [viewTab, setViewTab] = useState<'all' | 'users'>('all');
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [dialogSortField, setDialogSortField] = useState<string>("");
  const [dialogSortDirection, setDialogSortDirection] = useState<"asc" | "desc">("asc");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    if (viewTab === 'users') {
      fetchUserSummaries();
    }
  }, [viewTab]);

  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          profiles:user_id (first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades(data);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast({
        title: "Error",
        description: "Failed to load trades",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTrades = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          profiles:user_id (first_name, last_name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const totalTrades = data.length;
      const totalVolume = data.reduce((sum, t) => sum + t.lots, 0);
      const totalPnL = data.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winningTrades = data.filter(t => (t.pnl || 0) > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      setUserTrades(data);
      setUserStats({
        totalTrades,
        totalVolume,
        totalPnL,
        winRate,
      });
    } catch (error) {
      console.error('Error fetching user trades:', error);
      toast({
        title: "Error",
        description: "Failed to load user trades",
        variant: "destructive"
      });
    }
  };

  const fetchUserSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          default_leverage,
          withdrawal_wallet,
          trades:trades(
            id,
            pnl,
            created_at
          )
        `);

      if (error) throw error;

      const summaries: UserSummary[] = data.map(user => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        trades_count: user.trades?.length || 0,
        total_pnl: user.trades?.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0,
        default_leverage: user.default_leverage || 100,
        withdrawal_wallet: user.withdrawal_wallet || 0,
        last_trade_date: user.trades?.length ? 
          new Date(Math.max(...user.trades.map(t => new Date(t.created_at).getTime()))).toISOString() 
          : null
      }));

      setUserSummaries(summaries);
    } catch (error) {
      console.error('Error fetching user summaries:', error);
      toast({
        title: "Error",
        description: "Failed to load user summaries",
        variant: "destructive"
      });
    }
  };

  const handleUserClick = (trade: Trade) => {
    if (!trade.user_id) return;
    
    setSelectedUser({
      id: trade.user_id,
      name: `${trade.profiles.first_name} ${trade.profiles.last_name}`,
      email: trade.profiles.email,
    });
    fetchUserTrades(trade.user_id);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)
        .single();

      if (error) throw error;

      // Update both local states
      setUserTrades(prevTrades => prevTrades.filter(t => t.id !== tradeId));
      setTrades(prevTrades => prevTrades.filter(t => t.id !== tradeId));
      
      // Recalculate user summaries if in users view
      if (viewTab === 'users') {
        fetchUserSummaries();
      }

      toast({
        description: "Trade deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting trade:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete trade",
        variant: "destructive"
      });
    }
  };

  const filteredTrades = trades.filter(trade => 
    (trade.profiles.first_name + ' ' + trade.profiles.last_name)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    trade.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.pair.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(trade => trade.status === activeTab);

  const stats = {
    openTrades: {
      count: trades.filter(t => t.status === 'open').length,
      volume: trades.filter(t => t.status === 'open')
        .reduce((sum, t) => sum + t.lots, 0)
    },
    pendingTrades: {
      count: trades.filter(t => t.status === 'pending').length
    },
    closedTrades: {
      count: trades.filter(t => t.status === 'closed').length,
      pnl: trades.filter(t => t.status === 'closed')
        .reduce((sum, t) => sum + (t.pnl || 0), 0)
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTrades = filteredTrades.sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    
    switch (sortField) {
      case "trader":
        return direction * (`${a.profiles.first_name} ${a.profiles.last_name}`)
          .localeCompare(`${b.profiles.first_name} ${b.profiles.last_name}`);
      case "pair":
        return direction * a.pair.localeCompare(b.pair);
      case "lots":
        return direction * (a.lots - b.lots);
      case "leverage":
        return direction * (a.leverage - b.leverage);
      case "pnl":
        return direction * ((a.pnl || 0) - (b.pnl || 0));
      case "created_at":
      default:
        return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  });

  const filteredUserTrades = userTrades.filter(trade => {
    if (userTradeTab === 'all') return true;
    return trade.status === userTradeTab;
  });

  const sortedUserTrades = filteredUserTrades.sort((a, b) => {
    const direction = dialogSortDirection === "asc" ? 1 : -1;
    
    switch (dialogSortField) {
      case "lots":
        return direction * (a.lots - b.lots);
      case "type":
        return direction * a.type.localeCompare(b.type);
      case "pnl":
        return direction * ((a.pnl || 0) - (b.pnl || 0));
      default:
        return direction * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  });

  const calculateStats = (trades: Trade[]) => {
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, t) => sum + t.lots, 0);
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      totalVolume,
      totalPnL,
      winRate,
    };
  };

  const formatPair = (pair: string) => {
    return pair
      .replace('BINANCE:', '')
      .replace('FX:', '')
      .replace('/', '');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleDialogSort = (field: string) => {
    if (dialogSortField === field) {
      setDialogSortDirection(dialogSortDirection === "asc" ? "desc" : "asc");
    } else {
      setDialogSortField(field);
      setDialogSortDirection("asc");
    }
  };

  const filteredUserSummaries = userSummaries.filter(user =>
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Trading Activity"
        description="Monitor and manage all trading positions"
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Open Positions"
          value={`${stats.openTrades.count}`}
          description={`Volume: ${stats.openTrades.volume.toFixed(2)} lots`}
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingTrades.count.toString()}
        />
        <StatCard
          title="Closed Trades"
          value={stats.closedTrades.count.toString()}
        />
        <StatCard
          title="Total P&L"
          value={`$${stats.closedTrades.pnl.toLocaleString()}`}
          valueClassName={stats.closedTrades.pnl >= 0 ? "text-green-500" : "text-red-500"}
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 space-y-4 border-b">
          <Tabs value={viewTab} onValueChange={(value: 'all' | 'users') => setViewTab(value)}>
            <TabsList className="mb-4">
            <TabsTrigger value="users">User Trades</TabsTrigger>
            <TabsTrigger value="all">All Trades</TabsTrigger>
            </TabsList>
          </Tabs>

          {viewTab === 'all' ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search trades..."
                    className="pl-8 w-full sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-[400px]">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="open">Open</TabsTrigger>
                      <TabsTrigger value="pending">Pending</TabsTrigger>
                      <TabsTrigger value="closed">Closed</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Sort By <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleSort("created_at")}>
                        Date {sortField === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort("trader")}>
                        Trader {sortField === "trader" && (sortDirection === "asc" ? "↑" : "↓")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort("pair")}>
                        Pair {sortField === "pair" && (sortDirection === "asc" ? "↑" : "↓")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort("lots")}>
                        Volume {sortField === "lots" && (sortDirection === "asc" ? "↑" : "↓")}
                      </DropdownMenuItem>
                      {activeTab === 'closed' && (
                        <DropdownMenuItem onClick={() => handleSort("pnl")}>
                          P&L {sortField === "pnl" && (sortDirection === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Trader</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Open Price</TableHead>
                      {activeTab === 'closed' && <TableHead>Close Price</TableHead>}
                      <TableHead>Leverage</TableHead>
                      {activeTab === 'closed' && <TableHead>P&L</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : sortedTrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          No trades found
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedTrades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{trade.id}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  navigator.clipboard.writeText(trade.id);
                                  toast({
                                    description: "ID copied to clipboard",
                                  });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(trade.created_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <div
                              className="cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleUserClick(trade)}
                            >
                              <div className="font-medium">
                                {trade.profiles.first_name} {trade.profiles.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {trade.profiles.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{trade.pair}</TableCell>
                          <TableCell>
                            <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                              {trade.type.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell>{trade.lots}</TableCell>
                          <TableCell>${trade.open_price}</TableCell>
                          {activeTab === 'closed' && (
                            <TableCell>${trade.close_price}</TableCell>
                          )}
                          <TableCell>{trade.leverage}x</TableCell>
                          {activeTab === 'closed' && (
                            <TableCell className={trade.pnl && trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                              ${trade.pnl?.toFixed(2) || '0.00'}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  className="pl-8"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Trader</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Trades Count</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Default Leverage</TableHead>
                      <TableHead>Last Trade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserSummaries.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleUserClick({ 
                        user_id: user.id, 
                        profiles: { 
                          first_name: user.first_name, 
                          last_name: user.last_name, 
                          email: user.email 
                        } 
                      } as Trade)}>
                        <TableCell><span className="font-mono text-xs">{user.id}</span></TableCell>
                        <TableCell>
                          <div className="font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell className="font-medium">${user.withdrawal_wallet.toFixed(2)}</TableCell>
                        <TableCell>{user.trades_count}</TableCell>
                        <TableCell className={user.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          ${user.total_pnl.toFixed(2)}
                        </TableCell>
                        <TableCell>{user.default_leverage}x</TableCell>
                        <TableCell>
                          {user.last_trade_date ? formatDate(user.last_trade_date) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Trading History - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-4 gap-4 my-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="text-2xl font-semibold">
                {calculateStats(filteredUserTrades).totalTrades}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Volume</div>
              <div className="text-2xl font-semibold">
                {calculateStats(filteredUserTrades).totalVolume.toFixed(2)} lots
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total P&L</div>
              <div className={`text-2xl font-semibold ${calculateStats(filteredUserTrades).totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${calculateStats(filteredUserTrades).totalPnL.toFixed(2)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-semibold">
                {calculateStats(filteredUserTrades).winRate.toFixed(1)}%
              </div>
            </Card>
          </div>

          <Tabs value={userTradeTab} onValueChange={(value: any) => setUserTradeTab(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>

          <ScrollArea className="max-h-[400px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Date</TableHead>
                    <TableHead className="min-w-[100px]">Pair</TableHead>
                    <TableHead 
                      className="min-w-[80px] cursor-pointer hover:text-primary"
                      onClick={() => handleDialogSort("type")}
                    >
                      Type {dialogSortField === "type" && (dialogSortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="min-w-[80px] cursor-pointer hover:text-primary"
                      onClick={() => handleDialogSort("lots")}
                    >
                      Volume {dialogSortField === "lots" && (dialogSortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="min-w-[100px]">Open Price</TableHead>
                    <TableHead className="min-w-[100px]">Close Price</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-primary"
                      onClick={() => handleDialogSort("pnl")}
                    >
                      P&L {dialogSortField === "pnl" && (dialogSortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    {userTradeTab === 'closed' && (
                      <TableHead className="w-[50px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUserTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{formatDate(trade.created_at)}</TableCell>
                      <TableCell>{formatPair(trade.pair)}</TableCell>
                      <TableCell>
                        <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                          {trade.type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{trade.lots}</TableCell>
                      <TableCell>${trade.open_price}</TableCell>
                      <TableCell>${trade.close_price || '-'}</TableCell>
                      <TableCell>{trade.status.toUpperCase()}</TableCell>
                      <TableCell className={trade.pnl && trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                        ${trade.pnl?.toFixed(2) || '0.00'}
                      </TableCell>
                      {userTradeTab === 'closed' && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeleteTrade(trade.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TradesPage;
