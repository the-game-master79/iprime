import { supabase } from "@/lib/supabase";
// Add chart imports
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from "recharts";
import React, { useState, useEffect, useRef } from "react";
import { PageHeader, StatCard } from "@/components/ui-components";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight, Search, Copy } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Check, X } from "phosphor-react";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalApprovedDeposits: number;
  totalReferrers: number;
  totalPlansValue: number;
  totalReturns: number;
  activeTrades: number;
  closedTrades: number;
  totalLotsOpen: number;
  totalLotsClosed: number;
  totalPnl: number;
  todayPnl: number;
  todaysDeposits: number;
  todaysWithdrawals: number;
  totalWithdrawals: number;
  totalWithdrawalsSuccess: number;
  totalWithdrawalsPending: number;
  totalWithdrawalsRejected: number;
  todaysWithdrawalsSuccess: number;
  todaysWithdrawalsPending: number;
  todaysWithdrawalsRejected: number;
  // Add new fields for pending users count
  pendingDepositsUserCount: number;
  pendingWithdrawalsUserCount: number;
  // Add closedTradesUserCount
  closedTradesUserCount: number;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalApprovedDeposits: 0,
    totalReferrers: 0,
    totalPlansValue: 0,
    totalReturns: 0,
    activeTrades: 0,
    closedTrades: 0,
    totalLotsOpen: 0,
    totalLotsClosed: 0,
    totalPnl: 0,
    todayPnl: 0,
    todaysDeposits: 0,
    todaysWithdrawals: 0,
    totalWithdrawals: 0,
    totalWithdrawalsSuccess: 0,
    totalWithdrawalsPending: 0,
    totalWithdrawalsRejected: 0,
    todaysWithdrawalsSuccess: 0,
    todaysWithdrawalsPending: 0,
    todaysWithdrawalsRejected: 0,
    pendingDepositsUserCount: 0,
    pendingWithdrawalsUserCount: 0,
    closedTradesUserCount: 0,
  });

  // Add state for plans count and today's returns
  const [plansSubscribedCount, setPlansSubscribedCount] = useState(0);
  const [todaysReturns, setTodaysReturns] = useState(0);

  // State for pending deposits amount
  const [pendingDepositsAmount, setPendingDepositsAmount] = useState(0);

  // Chart data state
  const [userGrowth, setUserGrowth] = useState<{ date: string; users: number }[]>([]);
  const [depositData, setDepositData] = useState<{ date: string; amount: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);

  // Live price state
  const [livePrice, setLivePrice] = useState<number | null>(null);

  // Add trading pairs state
  const [tradingPairs, setTradingPairs] = useState<{ image_url: string; symbol: string; type?: string }[]>([]);
  // Add bid/ask state for trading pairs
  const [pairPrices, setPairPrices] = useState<Record<string, { bid: number; ask: number }>>({});

  // Add marketPrices and priceChangeDirection state for live prices
  const [marketPrices, setMarketPrices] = useState<Record<string, { bid?: number; ask?: number; isPriceUp?: boolean }>>({});
  const [priceChangeDirection, setPriceChangeDirection] = useState<Record<string, boolean | undefined>>({});

  // WebSocket connection status
  const [wsConnected, setWsConnected] = useState(false);

  // Track if we have received prices for specific pairs
  const [receivedPairs, setReceivedPairs] = useState<Record<string, boolean>>({});

  // Helper to normalize symbol keys
  const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Get total users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (deposited, traded, or purchased a plan in last 48 hours)
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

      // Get user ids who deposited in last 48h
      const { data: recentDeposits } = await supabase
        .from('deposits')
        .select('user_id,created_at')
        .gt('created_at', twoDaysAgo.toISOString());

      // Get user ids who traded in last 48h
      const { data: recentTrades } = await supabase
        .from('transactions')
        .select('user_id,created_at')
        .eq('type', 'investment')
        .gt('created_at', twoDaysAgo.toISOString());

      // Get user ids who purchased a plan in last 48h
      const { data: recentPlans } = await supabase
        .from('plans_subscriptions')
        .select('user_id,created_at')
        .gt('created_at', twoDaysAgo.toISOString());

      // Collect all user_ids
      const userIds = new Set<string>();
      recentDeposits?.forEach((d: any) => d.user_id && userIds.add(d.user_id));
      recentTrades?.forEach((t: any) => t.user_id && userIds.add(t.user_id));
      recentPlans?.forEach((p: any) => p.user_id && userIds.add(p.user_id));
      const activeUsers = userIds.size;

      // Get total APPROVED deposits
      const { data: approvedDeposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'approved');

      const totalApprovedDeposits = approvedDeposits?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Get total revenue (sum of completed deposits only)
      const { data: revenueData } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'Completed');

      const totalRevenue = revenueData?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Get count of users who have been referred (have a referrer)
      const { count: totalReferrers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('referred_by', 'is', null);

      // Get total value of approved plan subscriptions
      const { data: approvedPlans } = await supabase
        .from('plans_subscriptions')
        .select('amount,created_at')
        .eq('status', 'approved');

      const totalPlansValue = approvedPlans?.reduce((sum, plan) => sum + (plan.amount || 0), 0) || 0;
      const plansCount = approvedPlans?.length || 0;

      // Today's plans subscribed
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Use UTC to match Supabase/Postgres timestamps
      const todayIso = today.toISOString();

      // Get total returns from transactions table (type = 'investment_return' and status = 'Completed')
      const { data: investmentReturns } = await supabase
        .from('transactions')
        .select('amount,created_at,status')
        .eq('type', 'investment_return')
        .eq('status', 'Completed');

      // Total returns till date (all completed)
      const totalReturns = investmentReturns?.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0) || 0;
      // Only today's completed returns
      const todaysReturnsValue = investmentReturns
        ? investmentReturns.filter((t: any) => t.created_at && t.created_at >= todayIso)
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
        : 0;

      // --- Trades stats ---
      // Active trades
      const { count: activeTrades } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open'); // Only 'open', not 'pending'

      // Closed trades
      const { data: closedTradesData, count: closedTrades } = await supabase
        .from('trades')
        .select('lots,pnl,closed_at,user_id', { count: 'exact' }) // add user_id
        .eq('status', 'closed');

      // Total lots open
      const { data: openTradesData } = await supabase
        .from('trades')
        .select('lots')
        .eq('status', 'open');

      const totalLotsOpen = openTradesData?.reduce((sum, t) => sum + (t.lots || 0), 0) || 0;

      // Total lots closed
      const totalLotsClosed = closedTradesData?.reduce((sum, t) => sum + (t.lots || 0), 0) || 0;

      // Total PnL (closed trades)
      const totalPnl = closedTradesData?.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0;

      // Closed trades unique users
      const closedTradesUserCount = closedTradesData
        ? new Set(closedTradesData.map((t: any) => t.user_id)).size
        : 0;

      // Today's PnL (closed trades)
      const todayIsoDate = new Date();
      todayIsoDate.setHours(0, 0, 0, 0);
      const todayIsoString = todayIsoDate.toISOString();
      const todayPnl = closedTradesData
        ? closedTradesData
            .filter(t => t.closed_at && t.closed_at >= todayIsoString)
            .reduce((sum, t) => sum + (t.pnl || 0), 0)
        : 0;

      // Today's date range
      // (already set above)

      // Today's deposits (approved)
      const { data: todaysDepositsData } = await supabase
        .from('deposits')
        .select('amount,created_at')
        .eq('status', 'approved')
        .gte('created_at', todayIsoString);

      const todaysDeposits = todaysDepositsData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Today's withdrawals (approved)
      const { data: todaysWithdrawalsData } = await supabase
        .from('withdrawals')
        .select('amount,created_at')
        .eq('status', 'approved')
        .gte('created_at', todayIsoString);

      const todaysWithdrawalsApproved = todaysWithdrawalsData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Withdrawals (all)
      const { data: allWithdrawalsData } = await supabase
        .from('withdrawals')
        .select('amount,status,created_at');

      // Total withdrawals (all)
      const totalWithdrawals = allWithdrawalsData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Withdrawals by status (total)
      const totalWithdrawalsSuccess = allWithdrawalsData?.filter(d => d.status === 'Completed').reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalWithdrawalsPending = allWithdrawalsData?.filter(d => d.status === 'Pending').reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalWithdrawalsRejected = allWithdrawalsData?.filter(d => d.status === 'Failed').reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Today's withdrawals (all)
      const todaysWithdrawals = allWithdrawalsData?.filter(d => d.created_at && d.created_at >= todayIsoString).reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Today's withdrawals by status
      const todaysWithdrawalsSuccess = allWithdrawalsData?.filter(d => d.status === 'Completed' && d.created_at && d.created_at >= todayIsoString).reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const todaysWithdrawalsPending = allWithdrawalsData?.filter(d => d.status === 'Pending' && d.created_at && d.created_at >= todayIsoString).reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const todaysWithdrawalsRejected = allWithdrawalsData?.filter(d => d.status === 'Failed' && d.created_at && d.created_at >= todayIsoString).reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Pending Deposits: count of users with status 'Pending'
      const { data: pendingDepositsUsers } = await supabase
        .from('deposits')
        .select('user_id')
        .eq('status', 'pending');
      const pendingDepositsUserCount = new Set(
        (pendingDepositsUsers || []).map((d: any) => d.user_id)
      ).size;

      // Pending Deposits: sum of amount with status 'pending'
      const { data: pendingDepositsAmountData } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'pending');
      const pendingDepositsAmountValue = (pendingDepositsAmountData || []).reduce(
        (sum, d) => sum + (d.amount || 0),
        0
      );
      setPendingDepositsAmount(pendingDepositsAmountValue);

      // Pending Withdrawals: count of users with status 'Pending'
      const { data: pendingWithdrawalsUsers } = await supabase
        .from('withdrawals')
        .select('user_id')
        .eq('status', 'Pending');
      const pendingWithdrawalsUserCount = new Set(
        (pendingWithdrawalsUsers || []).map((d: any) => d.user_id)
      ).size;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers,
        totalRevenue,
        totalApprovedDeposits,
        totalReferrers: totalReferrers || 0,
        totalPlansValue,
        totalReturns,
        activeTrades: activeTrades || 0,
        closedTrades: closedTrades || 0,
        totalLotsOpen,
        totalLotsClosed,
        totalPnl,
        todayPnl,
        todaysDeposits,
        todaysWithdrawals: todaysWithdrawals, // This is the sum of all withdrawals today (all statuses)
        totalWithdrawals,
        totalWithdrawalsSuccess,
        totalWithdrawalsPending,
        totalWithdrawalsRejected,
        todaysWithdrawalsSuccess,
        todaysWithdrawalsPending,
        todaysWithdrawalsRejected,
        pendingDepositsUserCount,
        pendingWithdrawalsUserCount,
        closedTradesUserCount,
      });
      setPlansSubscribedCount(plansCount);
      setTodaysReturns(todaysReturnsValue);
      // Fetch chart data
      await fetchChartData();
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart range state for each chart
  const [userGrowthDays, setUserGrowthDays] = useState<3 | 7>(7);
  const [depositDays, setDepositDays] = useState<3 | 7>(7);

  // Fetch chart data for users, deposits, revenue (last 7 or 3 days)
  const fetchChartData = async () => {
    // User growth
    const { data: users } = await supabase
      .from('profiles')
      .select('created_at')
      .order('created_at', { ascending: true });
    const userGrowthMap: Record<string, number> = {};
    users?.forEach((u: any) => {
      const d = u.created_at?.slice(0, 10);
      if (d) userGrowthMap[d] = (userGrowthMap[d] || 0) + 1;
    });
    const userGrowthArr = Object.entries(userGrowthMap)
      .map(([date, users]) => ({ date, users }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // Cumulative sum
    let total = 0;
    const userGrowthCumulative = userGrowthArr.map((d) => {
      total += d.users;
      return { date: d.date, users: total };
    });
    setUserGrowth(userGrowthCumulative);

    // Deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('created_at,amount')
      .eq('status', 'approved');
    const depositMap: Record<string, number> = {};
    deposits?.forEach((d: any) => {
      const date = d.created_at?.slice(0, 10);
      if (date) depositMap[date] = (depositMap[date] || 0) + (d.amount || 0);
    });
    const depositArr = Object.entries(depositMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setDepositData(depositArr);

    // Revenue
    const { data: revenues } = await supabase
      .from('deposits')
      .select('created_at,amount')
      .eq('status', 'Completed');
    const revenueMap: Record<string, number> = {};
    revenues?.forEach((d: any) => {
      const date = d.created_at?.slice(0, 10);
      if (date) revenueMap[date] = (revenueMap[date] || 0) + (d.amount || 0);
    });
    const revenueArr = Object.entries(revenueMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setRevenueData(revenueArr);
  };

  // Refetch chart data when component mounts
  useEffect(() => {
    fetchChartData();
    // eslint-disable-next-line
  }, []);

  // Fetch trading pairs from supabase
  const fetchTradingPairs = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('image_url,symbol,type');
      if (!error && data) {
        setTradingPairs(data);
      }
    } catch (err) {
      // handle error if needed
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTradingPairs();
  }, []);

  useEffect(() => {
    if (!tradingPairs.length) return;
    let ws: WebSocket | null = null;
    let isUnmounted = false;

    ws = new WebSocket("wss://transfers.cloudforex.club/ws");

    ws.onopen = () => {
      setWsConnected(true);
    };
    ws.onclose = () => {
      setWsConnected(false);
    };
    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      if (isUnmounted) return;
      try {
        const data = JSON.parse(event.data);
        // Accepts { symbol, data: { bid, ask, ... } }
        if (
          data &&
          typeof data.symbol === "string" &&
          typeof data.data === "object" &&
          (typeof data.data.bid === "number" || typeof data.data.ask === "number")
        ) {
          const normalized = normalizeSymbol(data.symbol);
          setPairPrices(prev => ({
            ...prev,
            [normalized]: {
              bid: typeof data.data.bid === "number" ? data.data.bid : prev[normalized]?.bid,
              ask: typeof data.data.ask === "number" ? data.data.ask : prev[normalized]?.ask,
            }
          }));
          // Mark pair as received
          setReceivedPairs(prev => ({
            ...prev,
            [normalized]: true
          }));
        }
      } catch {}
    };

    return () => {
      isUnmounted = true;
      if (ws) ws.close();
      setWsConnected(false);
    };
  }, [tradingPairs]);

  // WebSocket for live bid/ask prices (same as Platform.tsx)
  useEffect(() => {
    if (tradingPairs.length === 0) return;

    const ws = new WebSocket('wss://transfers.cloudforex.club/ws');

    ws.onopen = () => {
      // No need to subscribe to symbols; data is received automatically.
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Accepts { symbol, data: { bid, ask, ... } }
        if (
          data.symbol &&
          typeof data.data === "object" &&
          (typeof data.data.bid === "number" || typeof data.data.ask === "number")
        ) {
          const symbol = data.symbol.toUpperCase();
          setMarketPrices(prev => {
            const prevBid = prev[symbol]?.bid ?? 0;
            const newBid = typeof data.data.bid === "number" ? data.data.bid : prevBid;
            return {
              ...prev,
              [symbol]: {
                bid: typeof data.data.bid === "number" ? data.data.bid : prev[symbol]?.bid,
                ask: typeof data.data.ask === "number" ? data.data.ask : prev[symbol]?.ask,
                isPriceUp: typeof data.data.bid === "number" ? (data.data.bid > prevBid) : prev[symbol]?.isPriceUp
              }
            };
          });
          setPriceChangeDirection(prev => ({
            ...prev,
            [symbol]: typeof data.data.bid === "number"
              ? (data.data.bid > (marketPrices[symbol]?.bid ?? 0)
                ? true
                : data.data.bid < (marketPrices[symbol]?.bid ?? 0)
                ? false
                : prev[symbol])
              : prev[symbol]
          }));
          // Remove color after 1s
          setTimeout(() => {
            setPriceChangeDirection(prev => {
              if (prev[symbol] === undefined) return prev;
              const next = { ...prev };
              delete next[symbol];
              return next;
            });
          }, 1000);
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [tradingPairs]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg bg-white/90 dark:bg-background/90 px-3 py-2 shadow-lg border border-primary/10">
          <div className="font-semibold text-primary">{label}</div>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Helper for badge
  const LiveBadge = ({ live, label }: { live: boolean; label: string }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${live ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      <span className={`h-2 w-2 rounded-full mr-1 ${live ? "bg-green-500" : "bg-red-500"}`}></span>
      {label}: {live ? "Connected" : "Not Live"}
    </span>
  );

  // Determine if tradermade and crypto pairs are live
  const isTradermadeLive = wsConnected && (receivedPairs["EURUSD"] || receivedPairs["USDJPY"]);
  const isCryptoLive = wsConnected && (receivedPairs["BTCUSDT"] || receivedPairs["ETHUSDT"]);

  // Format date as "24 Apr"
  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
  };

  // --- User List Dialog State ---
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userList, setUserList] = useState<{ email: string; created_at: string }[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const isMobile = useIsMobile();
  const USERS_PER_PAGE = isMobile ? 5 : 10;

  // --- Affiliates Dialog State ---
  const [affiliatesDialogOpen, setAffiliatesDialogOpen] = useState(false);
  const [affiliatesList, setAffiliatesList] = useState<
    { referrerEmail: string; referrerCode: string; referredEmail: string; referredCode: string; date: string }[]
  >([]);
  const [affiliatesSearch, setAffiliatesSearch] = useState("");
  const [affiliatesPage, setAffiliatesPage] = useState(1);
  const AFFILIATES_PER_PAGE = isMobile ? 5 : 10;

  // --- Pending Deposits Dialog State ---
  const [pendingDepositsDialogOpen, setPendingDepositsDialogOpen] = useState(false);
  const [pendingDepositsList, setPendingDepositsList] = useState<any[]>([]);
  const [pendingDepositsLoading, setPendingDepositsLoading] = useState(false);

  // --- Pending Withdrawals Dialog State ---
  const [pendingWithdrawalsDialogOpen, setPendingWithdrawalsDialogOpen] = useState(false);
  const [pendingWithdrawalsList, setPendingWithdrawalsList] = useState<any[]>([]);
  const [pendingWithdrawalsLoading, setPendingWithdrawalsLoading] = useState(false);

  // Fetch all users for dialog
  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("email,created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setUserList(data);
  };

  // Pagination and search for users
  const filteredUsers = userList.filter(user =>
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * USERS_PER_PAGE,
    userPage * USERS_PER_PAGE
  );

  // Utility to mask email (e.g. j***e@d***n.com)
  const maskEmail = (email: string) => {
    if (!email) return "-";
    const [user, domain] = email.split("@");
    if (!user || !domain) return email;
    return (
      user[0] +
      "***" +
      user[user.length - 1] +
      "@" +
      domain[0] +
      "***" +
      domain[domain.length - 1] +
      ".com"
    );
  };

  // Utility to mask code (show first 2, then *** then last 2)
  const maskCode = (code: string) => {
    if (!code) return "-";
    if (code.length <= 4) return code[0] + "***" + code[code.length - 1];
    return code.slice(0, 2) + "***" + code.slice(-2);
  };

  // Copy to clipboard button
  const CopyButton = ({ value }: { value: string }) => (
    <button
      type="button"
      className="ml-1 text-xs text-blue-500 hover:text-blue-700"
      onClick={() => navigator.clipboard.writeText(value)}
      title="Copy"
      style={{ verticalAlign: "middle" }}
    >
      <Copy className="inline h-3 w-3" />
    </button>
  );

  // Fetch affiliates for dialog
  const fetchAffiliates = async () => {
    // Get all users who have a referrer
    const { data: referredProfiles } = await supabase
      .from("profiles")
      .select("email,referral_code,referred_by,created_at")
      .not("referred_by", "is", null);

    if (!referredProfiles || referredProfiles.length === 0) {
      setAffiliatesList([]);
      return;
    }

    // Get all unique referred_by codes
    const referredByCodes = Array.from(
      new Set(referredProfiles.map((p: any) => p.referred_by).filter(Boolean))
    );

    // Fetch referrer profiles by referral_code
    const { data: referrerProfiles } = await supabase
      .from("profiles")
      .select("email,referral_code")
      .in("referral_code", referredByCodes);

    const referrerMap: Record<string, { email: string; code: string }> = {};
    (referrerProfiles || []).forEach((p: any) => {
      referrerMap[p.referral_code] = { email: p.email, code: p.referral_code };
    });

    // Build affiliate list
    const affiliates = referredProfiles.map((p: any) => ({
      referrerEmail: referrerMap[p.referred_by]?.email || "-",
      referrerCode: referrerMap[p.referred_by]?.code || p.referred_by || "-",
      referredEmail: p.email,
      referredCode: p.referral_code,
      date: p.created_at,
    }));
    // Sort by date descending (recent first)
    affiliates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAffiliatesList(affiliates);
  };

  // Group affiliates by referrer for accordion display
  const groupedAffiliates = React.useMemo(() => {
    const groups: Record<string, { referrerEmail: string; referrerCode: string; referred: any[] }> = {};
    affiliatesList.forEach(item => {
      const key = item.referrerEmail + "|" + item.referrerCode;
      if (!groups[key]) {
        groups[key] = {
          referrerEmail: item.referrerEmail,
          referrerCode: item.referrerCode,
          referred: [],
        };
      }
      groups[key].referred.push(item);
    });
    // Convert to array and sort by number of referred descending, then by referrerEmail
    return Object.values(groups).sort((a, b) => b.referred.length - a.referred.length || a.referrerEmail.localeCompare(b.referrerEmail));
  }, [affiliatesList]);

  // Filter and paginate affiliates groups
  const filteredAffiliatesGroups = React.useMemo(() => {
    if (!affiliatesSearch) return groupedAffiliates;
    const search = affiliatesSearch.toLowerCase();
    return groupedAffiliates.filter(group =>
      group.referrerEmail.toLowerCase().includes(search) ||
      group.referrerCode.toLowerCase().includes(search) ||
      group.referred.some(item =>
        item.referredEmail.toLowerCase().includes(search) ||
        item.referredCode.toLowerCase().includes(search)
      )
    );
  }, [groupedAffiliates, affiliatesSearch]);

  const affiliatesTotalPages = Math.max(1, Math.ceil(filteredAffiliatesGroups.length / AFFILIATES_PER_PAGE));
  const paginatedAffiliatesGroups = filteredAffiliatesGroups.slice(
    (affiliatesPage - 1) * AFFILIATES_PER_PAGE,
    affiliatesPage * AFFILIATES_PER_PAGE
  );

  // Open dialog and fetch users
  const handleOpenUserDialog = () => {
    setUserDialogOpen(true);
    fetchAllUsers();
    setUserSearch("");
    setUserPage(1);
  };

  // Open dialog and fetch affiliates
  const handleOpenAffiliatesDialog = () => {
    setAffiliatesDialogOpen(true);
    fetchAffiliates();
    setAffiliatesSearch("");
    setAffiliatesPage(1);
  };

  // Fetch pending deposits
  const fetchPendingDeposits = async () => {
    setPendingDepositsLoading(true);
    // Fetch user email as well
    const { data, error } = await supabase
      .from("deposits")
      .select("id,user_id,amount,created_at,status,profiles:profiles(email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setPendingDepositsList(data || []);
    setPendingDepositsLoading(false);
  };

  // Fetch pending withdrawals
  const fetchPendingWithdrawals = async () => {
    setPendingWithdrawalsLoading(true);
    // Fetch user email as well
    const { data, error } = await supabase
      .from("withdrawals")
      .select("id,user_id,amount,created_at,status,profiles:profiles(email)")
      .eq("status", "Pending")
      .order("created_at", { ascending: false });
    setPendingWithdrawalsList(data || []);
    setPendingWithdrawalsLoading(false);
  };

  // Approve/Reject handlers for deposits
  const handleApproveDeposit = async (id: number) => {
    await supabase.from("deposits").update({ status: "approved" }).eq("id", id);
    fetchPendingDeposits();
    fetchStats();
  };
  const handleRejectDeposit = async (id: number) => {
    await supabase.from("deposits").update({ status: "rejected" }).eq("id", id);
    fetchPendingDeposits();
    fetchStats();
  };

  // Approve/Reject handlers for withdrawals
  const handleApproveWithdrawal = async (id: number) => {
    await supabase.from("withdrawals").update({ status: "approved" }).eq("id", id);
    fetchPendingWithdrawals();
    fetchStats();
  };
  const handleRejectWithdrawal = async (id: number) => {
    await supabase.from("withdrawals").update({ status: "rejected" }).eq("id", id);
    fetchPendingWithdrawals();
    fetchStats();
  };

  // Open pending deposits dialog
  const handleOpenPendingDepositsDialog = () => {
    setPendingDepositsDialogOpen(true);
    fetchPendingDeposits();
  };

  // Open pending withdrawals dialog
  const handleOpenPendingWithdrawalsDialog = () => {
    setPendingWithdrawalsDialogOpen(true);
    fetchPendingWithdrawals();
  };

  // Chart data for users, deposits, revenue (last 7 or 3 days)
  // ...existing code...

  return (
    <AdminLayout>
      <PageHeader 
        title="Admin Dashboard" 
        description="Overview of platform performance and metrics"
        action={
          <div className="flex gap-2">
            <LiveBadge live={isTradermadeLive} label="Tradermade" />
            <LiveBadge live={isCryptoLive} label="Binance" />
          </div>
        }
      />

      {/* USERS DATA */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2 text-primary">Users Data</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            className="border bg-card cursor-pointer"
            title="Registered Users"
            value={<span className="font-mono">{stats.totalUsers.toLocaleString()}</span>}
            loading={loading}
            icon={<svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>}
            onClick={handleOpenUserDialog}
          />
          {/* Remove Active Users StatCard */}
          <StatCard
            className="border bg-card cursor-pointer"
            title="Affiliates Count" 
            value={<span className="font-mono">{stats.totalReferrers.toLocaleString()}</span>}
            loading={loading}
            icon={<svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>}
            onClick={handleOpenAffiliatesDialog}
          />
          {/* Pending Deposits */}
          <StatCard
            className="border bg-card cursor-pointer"
            title="Pending Deposits"
            value={
              <span className="relative block font-mono">
                ${pendingDepositsAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {stats.pendingDepositsUserCount} user{stats.pendingDepositsUserCount === 1 ? "" : "s"}
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2"/></svg>}
            onClick={handleOpenPendingDepositsDialog}
          />
          {/* Pending Withdrawals */}
          <StatCard
            className="border bg-card cursor-pointer"
            title="Pending Withdrawals"
            value={
              <span className="relative block font-mono">
                ${stats.totalWithdrawalsPending.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {stats.pendingWithdrawalsUserCount} user{stats.pendingWithdrawalsUserCount === 1 ? "" : "s"}
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>}
            onClick={handleOpenPendingWithdrawalsDialog}
          />
        </div>
      </div>

      {/* Stat Cards REMOVED */}

      {/* Withdrawals Category */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2 text-primary">Withdrawals</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Total Success */}
          <StatCard
            className="border bg-card"
            title="Total Success"
            value={
              <span className="relative block font-mono">
                ${stats.totalWithdrawalsSuccess.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  +${stats.todaysWithdrawalsSuccess.toLocaleString(undefined, { maximumFractionDigits: 2 })} today
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>}
          />
          {/* Total Rejected */}
          <StatCard
            className="border bg-card"
            title="Total Rejected"
            value={
              <span className="relative block font-mono">
                ${stats.totalWithdrawalsRejected.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  +${stats.todaysWithdrawalsRejected.toLocaleString(undefined, { maximumFractionDigits: 2 })} today
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>}
          />
        </div>
      </div>

      {/* Deposits Category */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2 text-primary">Deposits</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Total Approved */}
          <StatCard
            className="border bg-card"
            title="Total Approved"
            value={
              <span className="relative block font-mono">
                ${stats.totalApprovedDeposits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  +${stats.todaysDeposits.toLocaleString(undefined, { maximumFractionDigits: 2 })} today
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2"/></svg>}
          />
          {/* Total Pending */}
          <StatCard
            className="border bg-card"
            title="Total Pending"
            value={
              <span className="relative block font-mono">
                ${pendingDepositsAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {stats.pendingDepositsUserCount} user{stats.pendingDepositsUserCount === 1 ? "" : "s"}
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2"/></svg>}
          />
        </div>
      </div>

      {/* Plans Category */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2 text-primary">Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            className="border bg-card"
            title="Total Plans Amount"
            value={
              <span className="relative block font-mono">
                ${stats.totalPlansValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {plansSubscribedCount} subscribed
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2"/></svg>}
          />
          <StatCard
            className="border bg-card"
            title="Total Returns"
            value={
              <span className="relative block font-mono">
                ${stats.totalReturns.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  +${todaysReturns.toLocaleString(undefined, { maximumFractionDigits: 2 })} today
                </span>
              </span>
            }
            loading={loading}
            icon={<svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2"/></svg>}
          />
        </div>
      </div>

      {/* Trades Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2 text-primary">Trades</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Open Trades */}
          <StatCard
            className="border bg-card"
            title="Open Trades"
            value={
              <span className="relative block font-mono">
                {stats.activeTrades.toLocaleString()}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {stats.totalLotsOpen.toLocaleString(undefined, { maximumFractionDigits: 2 })} lots
                </span>
              </span>
            }
            loading={loading}
            icon={
              <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            }
          />
          {/* Closed PnL & Lots */}
          <StatCard
            className="border bg-card"
            title="Closed PnL & Lots"
            value={
              <span className="relative block font-mono">
                ${stats.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="absolute top-0 right-0 mt-1 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-800">
                  {stats.totalLotsClosed.toLocaleString(undefined, { maximumFractionDigits: 2 })} lots
                </span>
                <span className="absolute top-0 right-0 mt-8 mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  {stats.closedTradesUserCount} user{stats.closedTradesUserCount === 1 ? "" : "s"}
                </span>
              </span>
            }
            loading={loading}
            icon={
              <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            }
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* User Growth Chart */}
        <Card className="shadow-lg border border-primary/10 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="text-lg font-semibold text-primary">User Growth ({userGrowthDays}d)</div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={userGrowthDays === 3 ? "default" : "outline"}
                onClick={() => setUserGrowthDays(3)}
              >
                3d
              </Button>
              <Button
                size="sm"
                variant={userGrowthDays === 7 ? "default" : "outline"}
                onClick={() => setUserGrowthDays(7)}
              >
                7d
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={userGrowth.slice(-userGrowthDays)}>
                <defs>
                  <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={formatShortDate}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} labelFormatter={formatShortDate} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#userGrowthGradient)"
                  strokeWidth={3}
                  dot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name="Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Deposits Chart */}
        <Card className="shadow-lg border border-primary/10 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="text-lg font-semibold text-blue-500">Deposits ({depositDays}d)</div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={depositDays === 3 ? "default" : "outline"}
                onClick={() => setDepositDays(3)}
              >
                3d
              </Button>
              <Button
                size="sm"
                variant={depositDays === 7 ? "default" : "outline"}
                onClick={() => setDepositDays(7)}
              >
                7d
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={depositData.slice(-depositDays)} barCategoryGap={24}>
                <defs>
                  <linearGradient id="depositBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={formatShortDate}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} labelFormatter={formatShortDate} />
                <Bar
                  dataKey="amount"
                  fill="url(#depositBarGradient)"
                  radius={[8, 8, 0, 0]}
                  name="Deposits"
                  maxBarSize={32}
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 2px 8px #2563eb22)" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Revenue Chart REMOVED */}
        {/* <Card className="shadow-lg border border-primary/10 bg-card/80 md:col-span-2">
          <CardHeader>
            <div className="text-lg font-semibold text-amber-500">Revenue (7d)</div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#f59e42" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card> */}
      </div>

      {/* Trading Pairs Tables Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Crypto Trading Pairs Table */}
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold text-primary">Crypto Trading Pairs</div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bid</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ask</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingPairs.filter(p => p.type === "crypto").length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-400">No crypto trading pairs found.</td>
                    </tr>
                  ) : (
                    tradingPairs.filter(p => p.type === "crypto").map((pair, idx) => {
                      const symbol = pair.symbol.toUpperCase();
                      const priceObj: { bid?: number; ask?: number } = pairPrices[symbol] || {};
                      return (
                        <tr key={pair.symbol + idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {pair.image_url ? (
                              <img src={pair.image_url} alt={pair.symbol} className="h-8 w-8 object-contain" />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono">{pair.symbol}</td>
                          <td className={`px-4 py-2 font-mono transition-colors ${
                            priceChangeDirection[symbol] === true ? "text-green-500" :
                            priceChangeDirection[symbol] === false ? "text-red-500" : ""
                          }`}>
                            {typeof priceObj.bid === "number"
                              ? priceObj.bid.toLocaleString(undefined, { maximumFractionDigits: 8 })
                              : "0"}
                          </td>
                          <td className={`px-4 py-2 font-mono transition-colors ${
                            priceChangeDirection[symbol] === true ? "text-green-500" :
                            priceChangeDirection[symbol] === false ? "text-red-500" : ""
                          }`}>
                            {typeof priceObj.ask === "number"
                              ? priceObj.ask.toLocaleString(undefined, { maximumFractionDigits: 8 })
                              : "0"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Forex Trading Pairs Table */}
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold text-primary">Forex Trading Pairs</div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bid</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ask</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingPairs.filter(p => p.type === "forex").length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-400">No forex trading pairs found.</td>
                    </tr>
                  ) : (
                    tradingPairs.filter(p => p.type === "forex").map((pair, idx) => {
                      const symbol = pair.symbol.toUpperCase();
                      const priceObj: { bid?: number; ask?: number } = pairPrices[symbol] || {};
                      return (
                        <tr key={pair.symbol + idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {pair.image_url ? (
                              <img src={pair.image_url} alt={pair.symbol} className="h-8 w-8 object-contain" />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono">{pair.symbol}</td>
                          <td className={`px-4 py-2 font-mono transition-colors ${
                            priceChangeDirection[symbol] === true ? "text-green-500" :
                            priceChangeDirection[symbol] === false ? "text-red-500" : ""
                          }`}>
                            {typeof priceObj.bid === "number"
                              ? priceObj.bid.toLocaleString(undefined, { maximumFractionDigits: 5 })
                              : "0"}
                          </td>
                          <td className={`px-4 py-2 font-mono transition-colors ${
                            priceChangeDirection[symbol] === true ? "text-green-500" :
                            priceChangeDirection[symbol] === false ? "text-red-500" : ""
                          }`}>
                            {typeof priceObj.ask === "number"
                              ? priceObj.ask.toLocaleString(undefined, { maximumFractionDigits: 5 })
                              : "0"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent
          className="w-full max-w-[98vw] sm:max-w-lg bg-secondary p-2 sm:p-6"
          style={{
        minWidth: "0",
        padding: isMobile ? "0.5rem" : undefined,
        borderRadius: isMobile ? "0.5rem" : undefined,
          }}
        >
          <DialogHeader>
        <DialogTitle className="text-foreground text-base sm:text-lg">Registered Users</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email"
          value={userSearch}
          onChange={e => {
            setUserSearch(e.target.value);
            setUserPage(1);
          }}
          className="flex-1 placeholder:text-muted-foreground bg-background border border-border"
          style={isMobile ? { fontSize: "0.95rem", padding: "0.5rem" } : undefined}
        />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full text-xs sm:text-sm border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted">
          <th className="text-left py-2 px-2 sm:px-4 border-b border-border text-foreground">Email</th>
          <th className="text-left py-2 px-2 sm:px-4 border-b border-border text-foreground">Joined</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
          <tr>
            <td colSpan={2} className="text-center py-8 text-muted-foreground">
              No users found.
            </td>
          </tr>
            ) : (
          paginatedUsers.map((user, idx) => (
            <tr
              key={user.email + user.created_at + idx}
              className={idx % 2 === 0 ? "bg-secondary" : "bg-background"}
            >
              <td className="py-2 px-2 sm:px-4 border-b border-border text-muted-foreground break-all">{user.email}</td>
              <td className="py-2 px-2 sm:px-4 border-b border-border text-muted-foreground whitespace-nowrap">
            {user.created_at
              ? (() => {
              const d = new Date(user.created_at);
              return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}, ${d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}`;
                })()
              : "-"}
              </td>
            </tr>
          ))
            )}
          </tbody>
        </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={() => setUserPage(p => Math.max(1, p - 1))}
            disabled={userPage === 1}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
            <span className="text-foreground">Prev</span>
          </Button>
          <span className="text-xs text-center w-full sm:w-auto">
            Page {userPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
            disabled={userPage === totalPages}
            className="w-full sm:w-auto"
          >
            <span className="text-foreground">Next</span>
            <ChevronRight className="h-4 w-4 text-foreground" />
          </Button>
        </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Affiliates Dialog */}
      <Dialog open={affiliatesDialogOpen} onOpenChange={setAffiliatesDialogOpen}>
        <DialogContent
          className="w-full max-w-[98vw] sm:max-w-lg bg-secondary p-2 sm:p-6"
          style={{
            minWidth: "0",
            padding: isMobile ? "0.5rem" : undefined,
            borderRadius: isMobile ? "0.5rem" : undefined,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground text-base sm:text-lg">Affiliates</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or code"
              value={affiliatesSearch}
              onChange={e => {
                setAffiliatesSearch(e.target.value);
                setAffiliatesPage(1);
              }}
              className="flex-1 placeholder:text-muted-foreground bg-background border border-border"
              style={isMobile ? { fontSize: "0.95rem", padding: "0.5rem" } : undefined}
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {paginatedAffiliatesGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No affiliates found.
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
                {paginatedAffiliatesGroups.map((group, gidx) => (
                  <AccordionItem
                    key={group.referrerEmail + group.referrerCode + gidx}
                    value={group.referrerEmail + group.referrerCode + gidx}
                    className="rounded-lg border border-border bg-background shadow-sm transition-all"
                  >
                    <AccordionTrigger className="flex items-center gap-4 py-4 px-4 bg-muted rounded-t-lg hover:bg-muted/80 transition-colors">
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary text-base">
                            {maskEmail(group.referrerEmail)}
                            <CopyButton value={group.referrerEmail} />
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                            {group.referred.length} referred
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          {maskCode(group.referrerCode)}
                          <CopyButton value={group.referrerCode} />
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white dark:bg-background rounded-b-lg px-0 pb-4 pt-2">
                      <div className="overflow-x-auto px-2">
                        <table className="w-full text-xs sm:text-sm border border-border rounded-lg overflow-hidden shadow">
                          <thead>
                            <tr className="bg-muted">
                              <th className="text-left py-3 px-3 sm:px-4 border-b border-border text-foreground font-semibold">Referred Email</th>
                              <th className="text-left py-3 px-3 sm:px-4 border-b border-border text-foreground font-semibold">Referred Code</th>
                              <th className="text-left py-3 px-3 sm:px-4 border-b border-border text-foreground font-semibold">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.referred.map((item, idx) => (
                              <tr
                                key={item.referrerEmail + item.referrerCode + item.referredEmail + item.referredCode + idx}
                                className={
                                  "transition-colors" +
                                  (idx % 2 === 0
                                    ? " bg-secondary/60"
                                    : " bg-background")
                                }
                              >
                                <td className="py-3 px-3 sm:px-4 border-b border-border text-muted-foreground font-medium">
                                  <span className="flex items-center gap-1">
                                    {maskEmail(item.referredEmail)}
                                    <CopyButton value={item.referredEmail} />
                                  </span>
                                </td>
                                <td className="py-3 px-3 sm:px-4 border-b border-border text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    {maskCode(item.referredCode)}
                                    <CopyButton value={item.referredCode} />
                                  </span>
                                </td>
                                <td className="py-3 px-3 sm:px-4 border-b border-border text-muted-foreground whitespace-nowrap">
                                  {item.date
                                    ? (() => {
                                        const d = new Date(item.date);
                                        return (
                                          <span className="font-mono">
                                            {`${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}, ${d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}`}
                                          </span>
                                        );
                                      })()
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
          {/* Pagination */}
          {affiliatesTotalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-2">
              <Button
                variant="outline"
                size={isMobile ? "sm" : "sm"}
                onClick={() => setAffiliatesPage(p => Math.max(1, p - 1))}
                disabled={affiliatesPage === 1}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
                <span className="text-foreground">Prev</span>
              </Button>
              <span className="text-xs text-center w-full sm:w-auto">
                Page {affiliatesPage} of {affiliatesTotalPages}
              </span>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "sm"}
                onClick={() => setAffiliatesPage(p => Math.min(affiliatesTotalPages, p + 1))}
                disabled={affiliatesPage === affiliatesTotalPages}
                className="w-full sm:w-auto"
              >
                <span className="text-foreground">Next</span>
                <ChevronRight className="h-4 w-4 text-foreground" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pending Deposits Dialog */}
      <Dialog open={pendingDepositsDialogOpen} onOpenChange={setPendingDepositsDialogOpen}>
        <DialogContent
          className="w-full max-w-[98vw] sm:max-w-lg bg-secondary p-2 sm:p-6"
          style={{
            minWidth: "0",
            padding: isMobile ? "0.5rem" : undefined,
            borderRadius: isMobile ? "0.5rem" : undefined,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground text-base sm:text-lg">Pending Deposits</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-x-auto">
            <table className="w-full min-w-[420px] max-w-full text-xs sm:text-sm border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left py-2 px-2 sm:px-3 border-b border-border text-foreground">Email</th>
                  <th className="text-center py-2 px-2 sm:px-3 border-b border-border text-foreground">Amount</th>
                  <th className="text-center py-2 px-2 sm:px-3 border-b border-border text-foreground">Date</th>
                  <th className="text-center py-2 px-2 sm:px-3 border-b border-border text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingDepositsLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td>
                  </tr>
                ) : pendingDepositsList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">No pending deposits.</td>
                  </tr>
                ) : (
                  pendingDepositsList.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? "bg-secondary" : "bg-background"}>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-foreground max-w-[120px] truncate">
                        {item.profiles?.email ? maskEmail(item.profiles.email) : "-"}
                      </td>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-center text-foreground">${item.amount}</td>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-center text-foreground whitespace-nowrap">
                        {item.created_at
                          ? (() => {
                              const d = new Date(item.created_at);
                              return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}, ${d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
                        })()
                          : "-"}
                      </td>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-center">
                        <div className="flex flex-nowrap justify-center gap-1">
                          <Button size="icon" variant="ghost" className="w-7 h-7 min-w-0" onClick={() => handleApproveDeposit(item.id)}>
                            <Check className="text-green-600 w-4 h-4" weight="bold" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7 min-w-0" onClick={() => handleRejectDeposit(item.id)}>
                            <X className="text-red-600 w-4 h-4" weight="bold" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Withdrawals Dialog */}
      <Dialog open={pendingWithdrawalsDialogOpen} onOpenChange={setPendingWithdrawalsDialogOpen}>
        <DialogContent
          className="w-full max-w-[98vw] sm:max-w-lg bg-secondary p-2 sm:p-6"
          style={{
            minWidth: "0",
            padding: isMobile ? "0.5rem" : undefined,
            borderRadius: isMobile ? "0.5rem" : undefined,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground text-base sm:text-lg">Pending Withdrawals</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-x-auto">
            <table className="w-full min-w-[420px] max-w-full text-xs sm:text-sm border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left py-2 px-2 sm:px-3 border-b border-border text-foreground">Email</th>
                  <th className="text-center py-2 px-2 sm:px-3 border-b border-border text-foreground">Amount</th>
                  <th className="text-center py-2 px-2 sm:px-3 border-b border-border text-foreground">Date</th>
                  <th className="text-center py-2 px-2 sm:px-3 border-b border-border text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingWithdrawalsLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td>
                  </tr>
                ) : pendingWithdrawalsList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">No pending withdrawals.</td>
                  </tr>
                ) : (
                  pendingWithdrawalsList.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? "bg-secondary" : "bg-background"}>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-foreground max-w-[120px] truncate">
                        {item.profiles?.email ? maskEmail(item.profiles.email) : "-"}
                      </td>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-center text-foreground">${item.amount}</td>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-center text-foreground whitespace-nowrap">
                        {item.created_at
                          ? (() => {
                              const d = new Date(item.created_at);
                              return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}, ${d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
                        })()
                          : "-"}
                      </td>
                      <td className="py-2 px-2 sm:px-3 border-b border-border text-center">
                        <div className="flex flex-nowrap justify-center gap-1">
                          <Button size="icon" variant="ghost" className="w-7 h-7 min-w-0" onClick={() => handleApproveWithdrawal(item.id)}>
                            <Check className="text-green-600 w-4 h-4" weight="bold" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7 min-w-0" onClick={() => handleRejectWithdrawal(item.id)}>
                            <X className="text-red-600 w-4 h-4" weight="bold" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDashboard;
