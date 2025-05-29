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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface UserSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  trades_count: number;
  total_pnl: number;
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
    full_name: string;
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

  // Pagination state for All Trades and User Trades
  const [allTradesPage, setAllTradesPage] = useState(1);
  const [userTablePage, setUserTablePage] = useState(1);

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
          profiles:user_id (full_name, email)
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
          profiles:user_id (full_name, email)
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
      name: `${trade.profiles.full_name}`,
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

  const filteredTrades = trades.filter(trade => {
    // Defensive: handle missing profiles, full_name, email, pair
    const fullName = trade.profiles && trade.profiles.full_name ? trade.profiles.full_name : "";
    const email = trade.profiles && trade.profiles.email ? trade.profiles.email : "";
    const pair = trade.pair || "";
    const search = searchTerm ? searchTerm.toLowerCase() : "";
    return (
      fullName.toLowerCase().includes(search) ||
      email.toLowerCase().includes(search) ||
      pair.toLowerCase().includes(search)
    );
  }).filter(trade => trade.status === activeTab);

  const stats = {
    openTrades: {
      // Only count 'open' positions
      count: trades.filter(t => t.status === 'open').length,
      volume: trades.filter(t => t.status === 'open')
        .reduce((sum, t) => sum + t.lots, 0)
    },
    closedTrades: {
      count: trades.filter(t => t.status === 'closed').length,
      pnl: trades.filter(t => t.status === 'closed')
        .reduce((sum, t) => sum + (t.pnl || 0), 0),
      volume: trades.filter(t => t.status === 'closed')
        .reduce((sum, t) => sum + t.lots, 0)
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
        return direction * (`${a.profiles.full_name}`)
          .localeCompare(`${b.profiles.full_name}`);
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

  // Sort user summaries by most recent trade date (descending)
  // Only include users with at least one trade and non-zero total_pnl
  const filteredUserSummaries = userSummaries
    .filter(user =>
      user.trades_count > 0 && user.total_pnl !== 0 &&
      ((user.email ?? "") + (user.first_name ?? "") + (user.last_name ?? "")).toLowerCase().includes(userSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Users with a last_trade_date come first, sorted descending
      if (a.last_trade_date && b.last_trade_date) {
        return new Date(b.last_trade_date).getTime() - new Date(a.last_trade_date).getTime();
      }
      if (a.last_trade_date) return -1;
      if (b.last_trade_date) return 1;
      return 0;
    });

  // Group trades by user for All Trades Accordion
  const groupedTrades = sortedTrades.reduce((acc, trade) => {
    const userKey = trade.user_id;
    if (!acc[userKey]) {
      acc[userKey] = {
        user: trade.profiles,
        user_id: trade.user_id,
        trades: [],
      };
    }
    acc[userKey].trades.push(trade);
    return acc;
  }, {} as Record<string, { user: { full_name: string; email: string }, user_id: string, trades: Trade[] }>);

  const groupedTradesArr = Object.values(groupedTrades);

  // Pagination for grouped trades (All Trades)
  const groupedTradesTotalPages = Math.ceil(groupedTradesArr.length / 10);
  const paginatedGroupedTrades = groupedTradesArr.slice((allTradesPage - 1) * 10, allTradesPage * 10);

  // Pagination for user summaries (User Trades)
  const userSummariesTotalPages = Math.ceil(filteredUserSummaries.length / 10);
  const paginatedUserSummaries = filteredUserSummaries.slice((userTablePage - 1) * 10, userTablePage * 10);

  const formatPnL = (pnl: number | undefined) => {
    if (pnl === undefined || pnl === null) return '0.00';
    const abs = Math.abs(pnl);
    if (abs >= 1_000_000) return (pnl / 1_000_000).toFixed(2) + 'M';
    if (abs >= 1_000) return (pnl / 1_000).toFixed(2) + 'K';
    return pnl.toFixed(2);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Trading Activity"
        description="Monitor and manage all trading positions"
      />

      <div className="bg-background border border-border rounded-lg shadow-sm">
        <div className="p-4 space-y-4 border-b border-border">
          <Tabs value={viewTab} onValueChange={(value: 'all' | 'users') => {
            setViewTab(value);
            setAllTradesPage(1);
            setUserTablePage(1);
          }}>
            <TabsList className="mb-4 flex flex-row gap-2 w-full sm:flex-row">
              <TabsTrigger value="users" className="flex-1">User Trades</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">All Trades</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* All Trades Table/Card Responsive Layout */}
          {viewTab === 'all' ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search trades..."
                    className="pl-8 w-full sm:w-[300px] placeholder:text-muted-foreground"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-[400px]">
                    <TabsList className="grid w-full grid-cols-2 flex flex-row gap-2">
                      <TabsTrigger value="open" className="flex-1">Open</TabsTrigger>
                      <TabsTrigger value="closed" className="flex-1">Closed</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
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

              {/* Accordion Grouped by User */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <Accordion type="multiple">
                  {paginatedGroupedTrades.length === 0 ? (
                    <div className="text-center py-8">No trades found</div>
                  ) : (
                    paginatedGroupedTrades.map((group) => (
                      <AccordionItem key={group.user_id} value={group.user_id}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{group.user.full_name}</span>
                            <span className="text-sm text-muted-foreground">{group.user.email}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({group.trades.length} trades)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="border-t border-border">
                          <Table>
                            <TableHeader className="border-b border-border">
                              <TableRow>
                                <TableHead className="w-[200px]">ID</TableHead>
                                <TableHead>Date</TableHead>
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
                              {group.trades.map((trade) => (
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
                                      ${formatPnL(trade.pnl)}
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))
                  )}
                </Accordion>
                {/* Pagination for All Trades */}
                {groupedTradesTotalPages > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={allTradesPage === 1}
                      onClick={() => setAllTradesPage(allTradesPage - 1)}
                    >
                      Prev
                    </Button>
                    <span className="px-2 py-1 text-sm">
                      Page {allTradesPage} of {groupedTradesTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={allTradesPage === groupedTradesTotalPages}
                      onClick={() => setAllTradesPage(allTradesPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>

              {/* Mobile Cards (no grouping, just paginated) */}
              <div className="block sm:hidden space-y-3">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : sortedTrades.length === 0 ? (
                  <div className="text-center py-8">No trades found</div>
                ) : (
                  sortedTrades
                    .slice((allTradesPage - 1) * 10, allTradesPage * 10)
                    .map((trade) => (
                      <Card key={trade.id} className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs">{trade.id}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(trade.id);
                              toast({ description: "ID copied to clipboard" });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(trade.created_at)}</div>
                        <div
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleUserClick(trade)}
                        >
                          <div className="font-medium">{trade.profiles.full_name}</div>
                          <div className="text-sm text-muted-foreground">{trade.profiles.email}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="font-semibold">{trade.pair}</span>
                          <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                            {trade.type.toUpperCase()}
                          </span>
                          <span>Vol: {trade.lots}</span>
                          <span>Lev: {trade.leverage}x</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span>Open: ${trade.open_price}</span>
                          {activeTab === 'closed' && <span>Close: ${trade.close_price}</span>}
                          {activeTab === 'closed' && (
                            <span className={trade.pnl && trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                              P&L: ${formatPnL(trade.pnl)}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))
                )}
                {/* Pagination for mobile */}
                {Math.ceil(sortedTrades.length / 10) > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={allTradesPage === 1}
                      onClick={() => setAllTradesPage(allTradesPage - 1)}
                    >
                      Prev
                    </Button>
                    <span className="px-2 py-1 text-sm">
                      Page {allTradesPage} of {Math.ceil(sortedTrades.length / 10)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={allTradesPage === Math.ceil(sortedTrades.length / 10)}
                      onClick={() => setAllTradesPage(allTradesPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  className="pl-8 placeholder:text-muted-foreground"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto w-full">
                <Table>
                  <TableHeader className="border-b border-border">
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Trader</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Trades Count</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Last Trade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUserSummaries.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleUserClick({ 
                        user_id: user.id, 
                        profiles: { 
                          full_name: user.full_name, 
                          email: user.email 
                        } 
                      } as Trade)}>
                        <TableCell><span className="font-mono text-xs">{user.id}</span></TableCell>
                        <TableCell>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell className="font-medium">${user.withdrawal_wallet.toFixed(2)}</TableCell>
                        <TableCell>{user.trades_count}</TableCell>
                        <TableCell className={user.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          ${formatPnL(user.total_pnl)}
                        </TableCell>
                        <TableCell>
                          {user.last_trade_date ? formatDate(user.last_trade_date) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Pagination for User Trades */}
                {userSummariesTotalPages > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userTablePage === 1}
                      onClick={() => setUserTablePage(userTablePage - 1)}
                    >
                      Prev
                    </Button>
                    <span className="px-2 py-1 text-sm">
                      Page {userTablePage} of {userSummariesTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userTablePage === userSummariesTotalPages}
                      onClick={() => setUserTablePage(userTablePage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
              {/* Mobile Cards */}
              <div className="block sm:hidden space-y-3">
                {paginatedUserSummaries.length === 0 ? (
                  <div className="text-center py-8">No users found</div>
                ) : (
                  paginatedUserSummaries.map((user) => (
                    <Card
                      key={user.id}
                      className="p-4 flex flex-col gap-2 cursor-pointer hover:bg-accent/50"
                      onClick={() => handleUserClick({
                        user_id: user.id,
                        profiles: {
                          full_name: user.full_name,
                          email: user.email
                        }
                      } as Trade)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs">{user.id}</span>
                        <span className="font-medium">{user.first_name} {user.last_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span>Balance: <span className="font-medium">${user.withdrawal_wallet.toFixed(2)}</span></span>
                        <span>Trades: {user.trades_count}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className={user.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          P&L: ${formatPnL(user.total_pnl)}
                        </span>
                        <span>Last: {user.last_trade_date ? formatDate(user.last_trade_date) : '-'}</span>
                      </div>
                    </Card>
                  ))
                )}
                {/* Pagination for mobile */}
                {userSummariesTotalPages > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userTablePage === 1}
                      onClick={() => setUserTablePage(userTablePage - 1)}
                    >
                      Prev
                    </Button>
                    <span className="px-2 py-1 text-sm">
                      Page {userTablePage} of {userSummariesTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userTablePage === userSummariesTotalPages}
                      onClick={() => setUserTablePage(userTablePage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
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
          
          {/* Always 2x2 grid for stats, even on mobile */}
          <div className="grid grid-cols-2 gap-4 my-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="text-2xl font-semibold">
                {calculateStats(filteredUserTrades).totalTrades}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Lots</div>
              <div className="text-2xl font-semibold">
                {calculateStats(filteredUserTrades).totalVolume.toFixed(2)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total P&L</div>
              <div className={`text-2xl font-semibold ${calculateStats(filteredUserTrades).totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${formatPnL(calculateStats(filteredUserTrades).totalPnL)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-semibold">
                {calculateStats(filteredUserTrades).winRate.toFixed(1)}%
              </div>
            </Card>
          </div>

          {/* Tabs: Only show "Open" if there are open trades */}
          <Tabs value={userTradeTab} onValueChange={(value: any) => setUserTradeTab(value)} className="w-full">
            <TabsList className={`grid w-full ${userTrades.some(t => t.status === 'open') ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
              <TabsTrigger value="all">All</TabsTrigger>
              {userTrades.some(t => t.status === 'open') && (
                <TabsTrigger value="open">Open</TabsTrigger>
              )}
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Responsive container for user trades: table on desktop, cards on mobile */}
          <ScrollArea className="max-h-[400px]">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-border">
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
                        ${formatPnL(trade.pnl)}
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
            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-3">
              {sortedUserTrades.length === 0 ? (
                <div className="text-center py-8">No trades found</div>
              ) : (
                sortedUserTrades.map((trade) => (
                  <Card key={trade.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs">{trade.id}</span>
                      {userTradeTab === 'closed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                          onClick={() => handleDeleteTrade(trade.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(trade.created_at)}</div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="font-semibold">{formatPair(trade.pair)}</span>
                      <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                        {trade.type.toUpperCase()}
                      </span>
                      <span>Vol: {trade.lots}</span>
                      <span>Lev: {trade.leverage}x</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span>Open: ${trade.open_price}</span>
                      <span>Close: ${trade.close_price || '-'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span>Status: {trade.status.toUpperCase()}</span>
                      <span className={trade.pnl && trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                        P&L: ${formatPnL(trade.pnl)}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TradesPage;