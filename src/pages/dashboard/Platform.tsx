// Add Tawk_API to the Window interface for TypeScript
declare global {
  interface Window {
    Tawk_API?: any;
  }
}

import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { Topbar } from "@/components/shared/Topbar";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { BalanceCard } from "@/components/shared/BalanceCard";
import { AlphaQuantCard } from "@/components/shared/AlphaQuantCard";
import { AffiliateRankCard } from "@/components/shared/AffiliateRankCard";
import { PlatformMarkets } from "@/components/shared/PlatformMarkets";
import { ReferralLinkCard } from "@/components/shared/ReferralLinkCard";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { useTheme } from "@/hooks/use-theme";
import { isForexTradingTime } from "@/lib/utils";
import type { 
  Rank, 
  BusinessRankState,
  UserProfile, 
  Transaction
} from "@/types/dashboard";
import { TopDashboardLists } from "@/components/dashboard/TopDashboardLists";
import { DepositDialog } from "@/components/deposit/DepositDialog";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

// Define Trade interface locally since it's not exported from "@/types/dashboard"
interface Trade {
  id: string;
  pair: string;
  type: string;
  lots: number;
  pnl: number;
  open_price: number;
  close_price: number;
  leverage: number;
  closed_at?: string;
  updated_at?: string;
  created_at?: string;
  status?: string;
}

// Constants
const ITEMS_PER_PAGE = 10;

// Price animation utility
const getPriceChangeClass = (isUp?: boolean) => {
  if (isUp === undefined) return "";
  return isUp
    ? "text-green-500"
    : "text-red-500";
};

// Format price with last 2 digits in bold for better readability
const renderPriceWithBigDigits = (
  value: number | string | undefined,
  marketClosed?: boolean,
  isUp?: boolean
) => {
  if (marketClosed) {
    return <span className="text-xs text-destructive font-semibold">Market Closed</span>;
  }
  if (value === undefined) return <span className="text-xs text-muted-foreground">Awaiting tick</span>;
  const str = typeof value === 'string' ? value : value.toString();

  // Find the decimal point
  const dotIdx = str.indexOf(".");
  if (dotIdx !== -1 && str.length - dotIdx > 2) {
    // Make the last 2 digits bigger (after decimal)
    const normal = str.slice(0, -2);
    const big = str.slice(-2);
    return (
      <>
        {normal}
        <span className="text-lg font-bold">{big}</span>
      </>
    );
  }
  // fallback: just show as is
  return str;
};

// Helper to group trades by date and format date label
function groupTradesByDate(trades: Trade[]) {
  const groups: Record<string, Trade[]> = {};
  const now = new Date();
  trades.forEach(trade => {
    const closedAt = trade.closed_at || trade.updated_at || trade.created_at;
    if (!closedAt) return;
    const dateObj = new Date(closedAt);
    const dateKey = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(trade);
  });
  // Sort groups by date descending
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return sortedKeys.map(dateKey => ({
    dateKey,
    trades: groups[dateKey]
  }));
}

function formatDateLabel(dateKey: string) {
  const now = new Date();
  const date = new Date(dateKey + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Helper to get today's investment return profit
function getTodaysInvestmentProfit(transactions: Transaction[]): number {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  return transactions
    .filter(tx => tx.type === 'investment_return' && tx.status === 'Completed' && tx.created_at && tx.created_at.slice(0, 10) === todayStr)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

interface DashboardContentProps {
  loading: boolean;
  isDepositDialogOpen: boolean;
  setIsDepositDialogOpen: (isOpen: boolean) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ 
  loading, 
  isDepositDialogOpen, 
  setIsDepositDialogOpen 
}) => {
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const { profile, loading: profileLoading } = useUserProfile();
  const { isMobile } = useBreakpoints();
  const { theme, setTheme } = useTheme();
  const { user: authUser } = useAuth(); // <-- get user from context

  // Replace useState/useEffect for currentUser with this:
  const [currentUser, setCurrentUser] = useState<any>(authUser);

  useEffect(() => {
    // If authUser is available, always use it
    if (authUser) {
      setCurrentUser(authUser);
      return;
    }
    // Fallback: fetch from supabase if not present
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [authUser]);

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [activePlans, setActivePlans] = useState({ count: 0, amount: 0 });
  const [withdrawalBalance, setWithdrawalBalance] = useState(0);
  const [investmentReturns, setInvestmentReturns] = useState(0);
  const [withdrawalCommissions, setWithdrawalCommissions] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  
  // Business data
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState({ active: 0, total: 0 });
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [rankBonusTotal, setRankBonusTotal] = useState(0);

  const [businessStats, setBusinessStats] = useState({
    currentRank: '',
    totalVolume: 0,
    rankBonus: 0,
    nextRank: null as { title: string, bonus: number, business_amount: number } | null,
    progress: 0,
    targetVolume: 0
  });

  // Display data
  const [claimedRanks, setClaimedRanks] = useState<string[]>([]);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);
  const [claimingRank, setClaimingRank] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Add these state variables with the other states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Add this state near other state declarations
  const [directCount, setDirectCount] = useState(0);

  // Add ranksLoading state for loading indicator in ranks tab
  const [ranksLoading, setRanksLoading] = useState(false);

  // Only symbol and image_url from Supabase, but display static bid/ask values
  const [cryptoData, setCryptoData] = useState<{ symbol: string, image_url: string }[]>([]);
  const [forexData, setForexData] = useState<{ symbol: string, image_url: string }[]>([]);

  // Add state for live prices (now storing price and isPriceUp)
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: string; bid?: number; ask?: number; isPriceUp?: boolean }>>({});
  const [priceChangeDirection, setPriceChangeDirection] = useState<Record<string, boolean | undefined>>({});

  // Debounced market price update ref
  const marketPricesRef = React.useRef(marketPrices);

  // Keep ref in sync with state
  useEffect(() => {
    marketPricesRef.current = marketPrices;
  }, [marketPrices]);

  // Add state for closed trades
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [closedTradesLoading, setClosedTradesLoading] = useState(false);

  // Data fetching functions
  const fetchUserProfile = async (user: any) => {
    if (!user) return;
    try {
      // Join plans_subscriptions to get user's active plans
      const profileData = await supabase
        .from('profiles')
        .select(`
          *,
          withdrawal_wallet,
          multiplier_bonus,
          direct_count,
          full_name,
          plans_subscriptions:plans_subscriptions (
            id,
            amount,
            status
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileData.error) throw profileData.error;
      
      setUserProfile(profileData.data);
      // setDirectCount(profileData.data?.direct_count || 0); // REMOVE this line, directCount will be set in fetchReferralData

      // Calculate total available balance including multiplier bonus
      const totalBalance = (profileData.data?.withdrawal_wallet || 0) + (profileData.data?.multiplier_bonus || 0);
      setWithdrawalBalance(totalBalance);

      if (profileData.data?.referral_code) {
        const fullUrl = `${window.location.origin}/auth/login?ref=${profileData.data.referral_code}`;
        setReferralCode(profileData.data.referral_code);
        setReferralLink(fullUrl);
      }

      // Calculate total invested amount from approved subscriptions
      const allSubscriptions = profileData.data?.plans_subscriptions || [];
      const approvedSubscriptions = allSubscriptions.filter((sub: any) => sub.status === "approved");
      const totalAmount = approvedSubscriptions.reduce((sum: number, sub: any) => sum + (sub.amount || 0), 0);
      
      setActivePlans({
        count: approvedSubscriptions.length,
        amount: totalAmount
      });
      
      // Set total invested amount
      setTotalInvested(totalAmount);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchReferralData = async (user: any) => {
    if (!user) return;
    try {
      const { data: relationships, error } = await supabase
        .from('referral_relationships')
        .select(`
          id,
          level,
          referred:profiles!referral_relationships_referred_id_fkey (
            id,
            full_name,
            created_at,
            status,
            referred_by
          )
        `)
        .eq('referrer_id', user.id);

      if (error) throw error;

      const processedData = relationships?.filter(rel => rel.referred);
      // Count only level 1 referrals (directs), just like in Affiliate.tsx
      const directReferrals = processedData?.filter(ref => ref.level === 1) || [];
      const activeReferrals = directReferrals.length;
      const totalReferrals = processedData?.length || 0;

      setTotalReferrals({
        active: activeReferrals,
        total: totalReferrals
      });

      setDirectCount(activeReferrals); // Set directCount here, just like Affiliate.tsx

    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  const fetchCommissions = async (user: any) => {
    if (!user) return;
    try {
      const [commissionData, rankBonusData] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'Completed')
          .eq('type', 'commission'),
        supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'Completed')
          .eq('type', 'rank_bonus')
      ]);

      const commissions = commissionData.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      const rankBonuses = rankBonusData.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      setTotalCommissions(commissions);
      setRankBonusTotal(rankBonuses);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  const fetchWithdrawalStats = async (user: any) => {
    if (!user) return;
    try {
      const [returnsData, commissionsData, refundsData] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'investment_return')
          .eq('status', 'Completed'),
        supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'Completed')
          .or('type.eq.commission,type.eq.rank_bonus'),
        supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'refund')
          .eq('status', 'Completed')
      ]);

      const totalReturns = returnsData.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      const totalCommissions = commissionsData.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      const totalRefunds = refundsData.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      setInvestmentReturns(totalReturns + totalRefunds); // Include refunds in earnings
      setWithdrawalCommissions(totalCommissions);
    } catch (error) {
      console.error('Error fetching withdrawal stats:', error);
    }
  };

  const fetchBusinessStats = async (user: any) => {
    if (!user) return;
    try {
      // Get total business volume and rank directly from total_business_volumes
      const { data: volumeData } = await supabase
        .from('total_business_volumes')
        .select('total_amount, business_rank')
        .eq('user_id', user.id)
        .single();

      const businessVolume = volumeData?.total_amount || 0;
      const businessRank = volumeData?.business_rank || 'New Member';

      // Get all ranks for progression tracking
      const { data: ranks, error: ranksError } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (ranksError) throw ranksError;

      // Find the current rank object from the ranks table
      const currentRankObj = ranks.find(r => r.title === businessRank) || { title: 'New Member', business_amount: 0, bonus: 0 };

      // Find the next rank (first rank with business_amount > current business volume)
      const nextRank = ranks.find(r => r.business_amount > businessVolume) || null;

      // Calculate progress to next rank
      let progress = 0;
      if (nextRank && currentRankObj) {
        const progressCalc = ((businessVolume - currentRankObj.business_amount) /
          (nextRank.business_amount - currentRankObj.business_amount)) * 100;
        progress = Math.min(100, Math.max(0, progressCalc));
      }

      setBusinessStats({
        currentRank: businessRank,
        totalVolume: businessVolume,
        rankBonus: currentRankObj?.bonus || 0,
        nextRank: nextRank ? {
          title: nextRank.title,
          bonus: nextRank.bonus,
          business_amount: nextRank.business_amount
        } : null,
        progress,
        targetVolume: nextRank ? nextRank.business_amount : currentRankObj?.business_amount || 0
      });

    } catch (error) {
      console.error('Error fetching business stats:', error);
      // Set default values on error
      setBusinessStats({
        currentRank: 'New Member',
        totalVolume: 0,
        rankBonus: 0,
        nextRank: null,
        progress: 0,
        targetVolume: 0
      });
    }
  };

  const fetchClaimedRanks = async (user: any) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('description')
        .eq('user_id', user.id)
        .eq('type', 'rank_bonus')
        .eq('status', 'Completed');

      if (error) throw error;

      const claimed = data
        .map(tx => {
          const match = tx.description.match(/bonus for (.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      setClaimedRanks(claimed);
    } catch (error) {
      console.error('Error fetching claimed ranks:', error);
    }
  };

  const handleClaimBonus = async (rank: string) => {
    try {
      setIsClaimingBonus(true);
      if (!currentUser) return;

      const { error } = await supabase.rpc('claim_rank_bonus', {
        rank_title: rank
      });

      if (error) throw error;

      toast({
        title: "Bonus Claimed!",
        description: `You've successfully claimed the bonus for ${rank}`,
      });

      // Refresh states
      await Promise.all([
        fetchBusinessStats(currentUser),
        fetchWithdrawalStats(currentUser)
      ]);

      setClaimedRanks(prev => [...prev, rank]);

      // Instantly update available balance after claiming bonus
      // Fetch latest profile to get updated withdrawal_wallet and multiplier_bonus
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('withdrawal_wallet, multiplier_bonus')
        .eq('id', currentUser.id)
        .single();
      if (!profileError && profileData) {
        const totalBalance = (profileData.withdrawal_wallet || 0) + (profileData.multiplier_bonus || 0);
        setWithdrawalBalance(totalBalance);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim bonus",
        variant: "destructive"
      });
    } finally {
      setIsClaimingBonus(false);
    }
  };

  const handleClaimRankBonus = async (rank: Rank) => {
    try {
      setClaimingRank(rank.title);
      if (!currentUser) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('claim_rank_bonus', {
        rank_title: rank.title
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success", 
        description: `${rank.title} rank bonus of $${rank.bonus.toLocaleString()} has been added to your withdrawal wallet!`,
        variant: "default",
      });

      setClaimedRanks(prev => [...prev, rank.title]);
      
      // Refresh states
      await Promise.all([
        fetchBusinessStats(currentUser),
        fetchWithdrawalStats(currentUser),
        fetchClaimedRanks(currentUser)
      ]);

    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim bonus",
        variant: "destructive"
      });
    } finally {
      setClaimingRank(null);
    }
  };

  // Event handlers
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Referral Link Copied!",
        description: "Share this Link in your network",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please copy manually.",
        variant: "destructive"
      });
    }
  };

  // Update fetchTransactions function
  const fetchTransactions = async (user: any, pageNumber = 1) => {
    try {
      setIsLoadingMore(true);
      setTransactionsLoading(true);
      if (!user) return;

      const from = (pageNumber - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Fetch regular transactions
      const { data: transactionsData, error: transactionsError, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .in('type', ['deposit', 'commission', 'investment', 'investment_return', 'rank_bonus'])
        .order('created_at', { ascending: false })
        .range(from, to);

      if (transactionsError) throw transactionsError;

      // Fetch withdrawals separately
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (withdrawalsError) throw withdrawalsError;

      // Map withdrawals to match transaction format
      const formattedWithdrawals = (withdrawalsData || []).map(withdrawal => ({
        id: `withdrawal_${withdrawal.id}`,
        user_id: withdrawal.user_id,
        amount: -Math.abs(withdrawal.amount), // Make amount negative for withdrawals
        type: 'withdrawal',
        status: withdrawal.status || 'pending',
        description: `Withdrawal to ${withdrawal.wallet_address || 'wallet'}`,
        created_at: withdrawal.created_at,
        updated_at: withdrawal.updated_at,
        withdrawal_data: withdrawal // Keep original withdrawal data
      }));

      // Combine and sort all transactions
      const allTransactions = [
        ...(transactionsData || []),
        ...formattedWithdrawals
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (pageNumber === 1) {
        setTransactions(allTransactions);
      } else {
        setTransactions(prev => {
          const existingIds = new Set(prev.map(tx => tx.id));
          const newTransactions = allTransactions.filter(tx => !existingIds.has(tx.id));
          return [...prev, ...newTransactions];
        });
      }
      
      setHasMore((count || 0) > to + 1);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoadingMore(false);
      setTransactionsLoading(false);
    }
  };

  const fetchRanks = async () => {
    try {
      setRanksLoading(true);
      const { data, error } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (error) throw error;
      setRanks(data || []);
    } catch (error) {
      console.error('Error fetching ranks:', error);
    } finally {
      setRanksLoading(false);
    }
  };

  // Update fetchClosedTrades to set loading state
  const fetchClosedTrades = async (user: any) => {
    if (!user) return;
    setClosedTradesLoading(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false });

      if (error) throw error;
      setClosedTrades(data || []);
    } catch (error) {
      setClosedTrades([]);
    } finally {
      setClosedTradesLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initializeDashboard = async () => {
      if (!mounted || !currentUser) return;
      // Batch all fetches and don't throw if one fails
      await Promise.allSettled([
        fetchUserProfile(currentUser),
        fetchReferralData(currentUser),
        fetchCommissions(currentUser),
        fetchBusinessStats(currentUser),
        fetchWithdrawalStats(currentUser),
        fetchClaimedRanks(currentUser)
      ]);
      setIsLoading(false);
    };

    initializeDashboard();

    if (userProfile?.id) {
      channel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userProfile.id}`,
          },
          () => {
            if (mounted && currentUser) {
              fetchBusinessStats(currentUser);
            }
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userProfile?.id, theme, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchTransactions(currentUser);
      fetchRanks();
      fetchClosedTrades(currentUser); // fetch closed trades
    }
  }, [userProfile?.id, currentUser]);

  // Remove the WebSocket connection and related logic
  useEffect(() => {
    return () => {};
  }, []);

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast({
        title: "Copied",
        description: "Transaction ID copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please copy manually.",
        variant: "destructive"
      });
    }
  };

  const handleTradeClick = () => {
    // Always navigate directly to the tradingstation route
    navigate('/tradingstation');
  };

  // Fetch trading pairs for crypto and forex
  useEffect(() => {
    const fetchTradingPairs = async () => {
      try {
        // Fetch all crypto pairs
        const { data: cryptoPairs, error: cryptoError } = await supabase
          .from('trading_pairs')
          .select('symbol, image_url, type, name')
          .eq('type', 'crypto');

        // Fetch all forex pairs
        const { data: forexPairs, error: forexError } = await supabase
          .from('trading_pairs')
          .select('symbol, image_url, type, name')
          .eq('type', 'forex');

        if (cryptoError) throw cryptoError;
        if (forexError) throw forexError;

        // Helper to pick N random elements from an array
        function pickRandom<T>(arr: T[], n: number): T[] {
          if (!arr) return [];
          const shuffled = [...arr].sort(() => 0.5 - Math.random());
          return shuffled.slice(0, n);
        }

        setCryptoData(pickRandom(cryptoPairs || [], 3));
        setForexData(pickRandom(forexPairs || [], 3));
      } catch (err) {
        setCryptoData([]);
        setForexData([]);
      }
    };

    fetchTradingPairs();
  }, []);

  // WebSocket for live bid/ask prices
  useEffect(() => {
    if (cryptoData.length === 0 && forexData.length === 0) return;

    // Use the WebSocket URL from environment variable
    const ws = new WebSocket(import.meta.env.VITE_WS_URL as string);

    ws.onopen = () => {
      // No need to subscribe to symbols; data is received automatically.
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const symbol = data.symbol;
        const bid = data.bid;
        const ask = data.ask;
        const changePct = data.change_pct;
        if (symbol && (bid !== undefined || ask !== undefined)) {
          // Only update if symbol is in the displayed crypto or forex pairs
          const displayedSymbols = [
            ...cryptoData.map(pair => pair.symbol),
            ...forexData.map(pair => pair.symbol)
          ];
          if (!displayedSymbols.includes(symbol)) return;

          // Use change_pct to determine price direction if available
          const isPriceUp = changePct !== undefined ? changePct > 0 : undefined;

          setMarketPrices(prev => ({
            ...prev,
            [symbol]: {
              price: bid !== undefined ? bid.toString() : ask.toString(),
              bid,
              ask,
              isPriceUp
            }
          }));

          setPriceChangeDirection(prev => ({
            ...prev,
            [symbol]: isPriceUp
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
      } catch (e) {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [cryptoData, forexData]);

  // Determine if the forex market is open
  const forexMarketOpen = isForexTradingTime();

  function handleLoadMore(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    if (isLoadingMore || !currentUser) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(currentUser, nextPage);
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <Topbar 
        platform 
        title="Platform" 
        onWalletClick={() => setIsDepositDialogOpen(true)}
      />
      <DepositDialog 
        open={isDepositDialogOpen} 
        onOpenChange={setIsDepositDialogOpen}
        onDepositSuccess={() => {
          // Refresh any necessary data after successful deposit
          console.log('Deposit successful');
        }}
        currentUser={currentUser}
      />
      <DepositDialog 
        open={isPayoutDialogOpen} 
        onOpenChange={setIsPayoutDialogOpen}
        onDepositSuccess={() => {
          // Refresh any necessary data after successful payout
          console.log('Payout successful');
        }}
        currentUser={currentUser}
        isPayout
      />
      <main className="py-8">
        <div className="container mx-auto px-4 max-w-[1200px]">
          {loading || isLoading ? (
            <DashboardSkeleton />
          ) : (
            <div className="space-y-4">
              {/* Referral Card */}
              <ReferralLinkCard
                referralLink={referralLink}
                onCopyLink={handleCopyLink}
              />

              {/* Balance Container */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BalanceCard
                  withdrawalBalance={withdrawalBalance}
                  userProfile={userProfile}
                  onDepositClick={() => setIsDepositDialogOpen(true)}
                  onPayoutClick={() => setIsPayoutDialogOpen(true)}
                />
                <AlphaQuantCard
                  totalInvested={totalInvested}
                  activePlans={activePlans}
                  todaysProfit={getTodaysInvestmentProfit(transactions)}
                  onClick={() => navigate('/plans')}
                />
                <AffiliateRankCard
                  businessStats={businessStats}
                  directs={directCount}
                  businessVolume={businessStats.totalVolume}
                />
              </div>

              {/* Markets Section */}
              <PlatformMarkets
                cryptoData={cryptoData}
                forexData={forexData}
                marketPrices={marketPrices}
                getPriceChangeClass={getPriceChangeClass}
                renderPriceWithBigDigits={renderPriceWithBigDigits}
                forexMarketOpen={forexMarketOpen}
                navigate={navigate}
              />
              
              {/* Transactions and Trades */}
              <TopDashboardLists transactions={transactions} trades={closedTrades} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Add skeleton components before DashboardContent
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-muted/50 rounded-lg ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="space-y-4">
    {/* Referral Card Skeleton */}
    <Skeleton className="h-24 w-full rounded-2xl" />

    {/* Balance & Affiliate Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-48 md:col-span-2 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  </div>
);

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login', { 
        state: { from: '/dashboard' },
        replace: true 
      });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  if (!user) return null;

  return (
    <div>
      <DashboardContent 
        loading={loading} 
        isDepositDialogOpen={isDepositDialogOpen}
        setIsDepositDialogOpen={setIsDepositDialogOpen}
      />
      <MobileBottomNav onWalletClick={() => setIsDepositDialogOpen(true)} />
    </div>
  );
};

export default Dashboard;
