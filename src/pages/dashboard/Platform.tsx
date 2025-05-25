import React, { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { DashboardTopbar } from "@/components/shared/DashboardTopbar";
import { useUserProfile } from "@/contexts/UserProfileContext";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionTable } from "@/components/transactionTable/TransactionTable";
import { RankTable } from "@/components/rankTable/RankTable";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Icons
import { 
  Copy,
  QrCode,
  ShareNetwork,
  XCircle,
  Wallet,
  ArrowDown,
  ChartLine,
  Trophy,
  Target,
  Users,
} from "@phosphor-icons/react";

// Utilities
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useTheme } from "@/hooks/use-theme"; // Use your custom theme hook
import { isForexTradingTime } from "@/lib/utils"; // Add this import

// Types
import type { 
  Rank, 
  BusinessRankState,
  UserProfile, 
  Transaction
} from "@/types/dashboard"; // You'll need to create this types file

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
const REFRESH_INTERVAL = 30000;
const MIN_DISPLAY_AMOUNT = 0.01;

// Add this helper function before the component
const isRankEligible = (currentRank: string, targetRank: string, ranks: Rank[]) => {
  const sortedRanks = [...ranks].sort((a, b) => a.business_amount - b.business_amount);
  const currentRankIndex = sortedRanks.findIndex(r => r.title === currentRank);
  const targetRankIndex = sortedRanks.findIndex(r => r.title === targetRank);
  return targetRankIndex <= currentRankIndex;
};

// Add this utility function after the imports
const getBalanceTextSize = (amount: number): string => {
  if (amount >= 1000000000) return 'text-3xl sm:text-4xl'; // Billions
  if (amount >= 1000000) return 'text-4xl sm:text-5xl';    // Millions
  return 'text-5xl sm:text-6xl';                           // Default
};

interface Promotion {
  id: string;
  title: string;
  image_url: string;
  link: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface DashboardContentProps {
  loading: boolean;
}

const ShimmerEffect = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-muted/50 rounded-lg", className)} />
);

// Add this utility function before the DashboardContent component
const getPriceDecimals = (symbol: string) => {
  if (symbol === "XAUUSD") return 2;
  if (symbol.endsWith("JPY")) return 3;
  if (symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT" || symbol === "LINKUSDT" || symbol === "BNBUSDT") return 2;
  if (symbol === "DOGEUSDT") return 5;
  if (symbol === "ADAUSDT" || symbol === "TRXUSDT") return 4;
  if (symbol === "DOTUSDT") return 3;
  // Default: forex pairs (non-JPY, non-XSUPER, non-crypto)
  if (!symbol.endsWith("USDT")) return 5;
  // Fallback
  return 2;
};

// Add this utility for price animation (before DashboardContent)
const getPriceChangeClass = (isUp?: boolean) => {
  if (isUp === undefined) return "";
  return isUp
    ? "text-green-500"
    : "text-red-500";
};

// Update renderPriceWithBigDigits to accept a "marketClosed" flag and show "Market Closed" in error color
const renderPriceWithBigDigits = (
  value: number | undefined,
  decimals: number,
  marketClosed?: boolean
) => {
  if (marketClosed) {
    return <span className="text-xs text-destructive font-semibold">Market Closed</span>;
  }
  if (value === undefined) return <span className="text-xs text-muted-foreground">Awaiting tick</span>;
  const str = Number(value).toFixed(decimals);

  if (decimals === 2) {
    // Make the last 2 digits bigger (including the decimal point)
    if (str.length < 4) return str;
    const normal = str.slice(0, -3); // up to before ".dd"
    const big = str.slice(-3); // ".dd"
    return (
      <>
        {normal}
        <span className="text-lg font-bold">{big}</span>
      </>
    );
  } else if (decimals > 2) {
    // Make the last 2 digits bigger
    const normal = str.slice(0, -2);
    const big = str.slice(-2);
    return (
      <>
        {normal}
        <span className="text-lg font-bold">{big}</span>
      </>
    );
  }
  // fallback
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

const DashboardContent: React.FC<DashboardContentProps> = ({ loading }) => {
  const { profile, loading: profileLoading } = useUserProfile();
  const { isMobile } = useBreakpoints();
  const { canInstall, install } = usePwaInstall();
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
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);
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
  const [businessRank, setBusinessRank] = useState<BusinessRankState>({
    currentRank: null,
    nextRank: null,
    progress: 0,
    totalBusiness: 0
  });

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
  const ITEMS_PER_PAGE = 10;

  // Add this state near other state declarations
  const [directCount, setDirectCount] = useState(0);

  // Add this state with other states
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showDirectsDialog, setShowDirectsDialog] = useState(false);

  // Add ranksLoading state for loading indicator in ranks tab
  const [ranksLoading, setRanksLoading] = useState(false);

  // Only symbol and image_url from Supabase, but display static bid/ask values
  const [cryptoData, setCryptoData] = useState<{ symbol: string, image_url: string }[]>([]);
  const [forexData, setForexData] = useState<{ symbol: string, image_url: string }[]>([]);

  // Add state for live prices (now storing price and isPriceUp)
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: string; bid?: number; ask?: number; isPriceUp?: boolean }>>({});

  // Debounced market price update ref
  const marketPricesRef = React.useRef(marketPrices);
  const pendingUpdatesRef = React.useRef<Record<string, { price: string; bid?: number; ask?: number; isPriceUp?: boolean }>>({});
  const rafRef = React.useRef<number | null>(null);

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

  const formatJoinedTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours === 0) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
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

  const handleShowQrCode = async () => {
    try {
      // NOTE: window.location.origin is safe here because this is a trusted dashboard context.
      // For transactional QR codes, use a server-signed URL.
      const referralUrl = `${window.location.origin}/auth/login?ref=${userProfile?.referral_code}&tab=register`;
      const qrDataUrl = await QRCode.toDataURL(referralUrl);
      setQrCodeUrl(qrDataUrl);
      setShowQrCode(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
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

      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .in('type', ['deposit', 'withdrawal', 'commission', 'investment', 'investment_return', 'rank_bonus'])
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      if (pageNumber === 1) {
        setTransactions(data || []);
      } else {
        setTransactions(prev => {
          const existingIds = new Set(prev.map(tx => tx.id));
          const newTransactions = (data || []).filter(tx => !existingIds.has(tx.id));
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

  // Fetch promotions from Supabase
  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      setPromotions([]);
      console.error('Error fetching promotions:', error);
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
        fetchClaimedRanks(currentUser),
        fetchPromotions()
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

  const handleDirectsClick = () => {
    setShowDirectsDialog(true);
  };

  // Add a theme toggle handler
  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Fetch trading pairs for crypto and forex
  useEffect(() => {
    const fetchTradingPairs = async () => {
      try {
        // Fetch all crypto pairs
        const { data: cryptoPairs, error: cryptoError } = await supabase
          .from('trading_pairs')
          .select('symbol, image_url, type')
          .eq('type', 'crypto');

        // Fetch all forex pairs
        const { data: forexPairs, error: forexError } = await supabase
          .from('trading_pairs')
          .select('symbol, image_url, type')
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

    const ws = new WebSocket('wss://transfers.cloudforex.club/ws');
    let isOpen = false;

    ws.onopen = () => {
      isOpen = true;
      // No need to subscribe to symbols; data is received automatically.
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const price =
          data.data?.price ??
          data.data?.bid ??
          data.data?.ask;
        if (data.symbol && price) {
          const symbol = data.symbol.toUpperCase();
          const prevPrice = parseFloat(marketPricesRef.current[symbol]?.price || "0");
          const newPrice = parseFloat(price);

          // Batch updates in pendingUpdatesRef
          pendingUpdatesRef.current[symbol] = {
            price: price.toString(),
            bid: typeof data.data?.bid === "number" ? data.data.bid : undefined,
            ask: typeof data.data?.ask === "number" ? data.data.ask : undefined,
            isPriceUp: newPrice > prevPrice
          };

          // Debounce with requestAnimationFrame
          if (rafRef.current === null) {
            rafRef.current = window.requestAnimationFrame(() => {
              setMarketPrices(prev => ({
                ...prev,
                ...pendingUpdatesRef.current
              }));
              pendingUpdatesRef.current = {};
              rafRef.current = null;
            });
          }
        }
      } catch (e) {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      if (isOpen) ws.close();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingUpdatesRef.current = {};
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

  // Utility to trim referral link for display
  const getTrimmedReferralLink = (link: string) => {
    if (!link) return "";
    // Show ...ref=abc123 (last 10 chars after 'ref='), keep protocol and domain
    const refMatch = link.match(/ref=([a-zA-Z0-9]+)/);
    if (link.length <= 38) return link;
    if (refMatch) {
      const refCode = refMatch[1];
      const base = link.split('?')[0];
      return `${base}/...ref=${refCode}`;
    }
    // fallback: trim middle
    return link.slice(0, 18) + "..." + link.slice(-10);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground transition-colors">
      {/* DashboardTopbar with Theme Toggle */}
      <div className="relative">
        <DashboardTopbar />
      </div>

      <main className="py-8">
        <div className="container mx-auto px-4 max-w-[1000px]">
          {loading || isLoading ? (
            // Replace spinner with skeletons
            <DashboardSkeleton />
          ) : (
            <div className="space-y-4">
              {/* Referral Card with Promotions Button */}
              <div className="space-y-4">
                {/* Referral Link Container */}
                <div className="bg-secondary rounded-2xl p-4 border border-border">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShareNetwork className="h-5 w-5 text-primary" weight="fill" />
                        <span className="text-sm font-medium text-muted-foreground">Your Referral Link</span>
                      </div>
                      {/* Removed badge type from here */}
                    </div>
                    {/* Referral Link Input */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          readOnly
                          // Show trimmed visually, but keep full value for copy/QR
                          value={getTrimmedReferralLink(referralLink)}
                          title={referralLink}
                          className="w-full pr-[120px] pl-4 font-mono text-foreground text-sm bg-secondary-foreground h-12 border border-border"
                        />
                        <div className="absolute right-1 top-1 h-10 flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={handleCopyLink}
                            className="h-8 w-8 rounded-lg hover:bg-white/5"
                          >
                            <Copy className="h-4 w-4 text-foreground" weight="regular" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={handleShowQrCode}
                            className="h-8 w-8 rounded-lg hover:bg-white/5"
                          >
                            <QrCode className="h-4 w-4 text-foreground" weight="regular" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Container */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Combined Balance Card */}
                <div className="md:col-span-2 bg-secondary border border-border rounded-2xl p-6">
                  <div className="flex flex-col gap-6">
                    {/* Balances Section */}
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Available Balance */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Available Balance</span>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-3xl font-medium">
                            {withdrawalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </h3>
                          {userProfile?.multiplier_bonus > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Including bonus: {(userProfile.multiplier_bonus || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                            </p>
                          )}
                        </div>
                      </div>

                      {/* AI Trading Balance */}
                      <div className="flex-1">
                        {/* Add hover effect: scale and shadow */}
                        <div
                          className="rounded-lg bg-secondary-foreground p-4 transition-transform duration-200 hover:scale-[1.03] hover:shadow-lg group cursor-pointer"
                          tabIndex={0}
                          title="View AI Trading Plans"
                          onClick={() => navigate('/plans')}
                          onKeyDown={e => { if (e.key === 'Enter') navigate('/plans'); }}
                          style={{ outline: "none" }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {/* AI Trading Box with "AI" text, no fill, only stroke */}
                              <div
                                className="flex items-center justify-center h-8 w-8 border-2 border-foreground rounded-lg group-hover:bg-primary/10 transition-colors"
                              >
                                  <span
                                    className="text-base font-bold uppercase text-foreground"
                                    style={{
                                      color: "currentColor", // fill color (inside)
                                      letterSpacing: "0.05em"
                                    }}
                                  >
                                    AI
                                  </span>
                              </div>
                              <span className="text-sm text-foreground">Trading</span>
                            </div>
                            <span className="text-xs bg-background/20 text-foreground px-2 py-1 rounded-full">
                              {activePlans.count} {activePlans.count === 1 ? 'Plan' : 'Plans'}
                            </span>
                          </div>
                          <h3 className="text-3xl font-medium">
                            {totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row - horizontal row for mobile, grid for desktop */}
                    <div className="flex flex-row gap-3 md:grid md:grid-cols-4 md:gap-3 mt-2" key={theme}>
                      {/* Common container buttons with icon/logo only, label below */}
                      <div className="flex flex-col items-center h-full w-full">
                        <Button 
                          className="h-14 w-full flex items-center justify-center rounded-xl gap-0 text-white font-regular border-0 bg-secondary-foreground"
                          onClick={() => navigate('/tradingstation')}
                        >
                          <ChartLine className="h-10 w-10 text-foreground" weight="duotone" />
                        </Button>
                        <span className="mt-2 text-sm font-medium text-foreground">Trade</span>
                      </div>
                      <div className="flex flex-col items-center h-full w-full">
                        <Button 
                          className="h-14 w-full flex items-center justify-center rounded-xl gap-0 text-white font-regular border-0 bg-secondary-foreground"
                          onClick={() => navigate('/cashier')}
                        >
                          <ArrowDown className="h-10 w-10 text-foreground" weight="duotone" />
                        </Button>
                        <span className="mt-2 text-sm font-medium text-foreground">Add Funds</span>
                      </div>
                      <div className="flex flex-col items-center h-full w-full">
                        <Button
                          className="h-14 w-full flex items-center justify-center rounded-xl gap-0 text-white font-regular border-0 bg-secondary-foreground"
                          onClick={() => navigate('/affiliate')}
                        >
                          <Users className="h-10 w-10 text-foreground" weight="duotone" />
                        </Button>
                        <span className="mt-2 text-sm font-medium text-foreground">Affiliates</span>
                      </div>
                      <div className="flex flex-col items-center h-full w-full">
                        <Button 
                          className="h-14 w-full flex items-center justify-center rounded-xl gap-0 text-white font-regular border-0 bg-secondary-foreground"
                          onClick={() => navigate('/plans')}
                        >
                          {/* AI Trading Button Icon */}
                          <div
                            className="flex items-center justify-center h-6 w-6 border-2 border-foreground rounded-lg"
                          >
                              <span
                                className="text-xs font-bold uppercase !text-foreground"
                                style={{
                                  color: "currentColor",
                                  letterSpacing: "0.05em"
                                }}
                              >
                                AI
                              </span>
                          </div>
                        </Button>
                        <span className="mt-2 text-sm font-medium text-foreground">Trading</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Affiliate Rank Card */}
                <div className="bg-secondary rounded-2xl p-6">
                  <div className="h-full flex flex-col justify-between">
                    {/* Top: Affiliate Status */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Affiliate Status</span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-3xl font-medium">
                          {businessStats.currentRank || 'New Member'}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Business Volume & Directs Row */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      {/* Business Volume Container */}
                      <div className="flex-1 bg-secondary-foreground/30 rounded-xl p-4 flex flex-col items-center justify-center border border-border">
                        <span className="text-xs text-muted-foreground mb-1">Business Volume</span>
                        <span className="text-lg font-semibold text-foreground">
                          {businessStats.totalVolume.toLocaleString()} USD
                        </span>
                      </div>
                      {/* Directs Container with dialog trigger */}
                      <div
                        className="flex-1 bg-secondary-foreground/30 rounded-xl p-4 flex flex-col items-center justify-center border border-border cursor-pointer"
                        onClick={handleDirectsClick}
                        title="View Direct Referral Status"
                      >
                        <span className="text-xs text-muted-foreground mb-1">Directs</span>
                        <span className={cn(
                          "text-lg font-semibold",
                          directCount >= 2 ? "text-[#20BF55]" : 
                          directCount === 1 ? "text-[#FFA500]" : 
                          "text-[#FF005C]"
                        )}>
                          {directCount}/2
                        </span>
                      </div>
                    </div>

                    {/* Progress to Next Rank - Moved to bottom */}
                    {businessStats.nextRank && (
                      <div className="space-y-2 mt-auto pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Next: {businessStats.nextRank.title}</span>
                          <span>
                            {(businessStats.nextRank.business_amount - businessStats.totalVolume).toLocaleString()} USD more
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500"
                            style={{ 
                              width: `${(businessStats.totalVolume / businessStats.nextRank.business_amount) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Redesigned Markets Section as Table */}
              <div className="w-full mt-2">
                <div className="rounded-2xl border border-border p-0 shadow-lg overflow-x-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Crypto Markets Table */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 px-6 pt-6 pb-2">
                        <span className="font-semibold text-lg tracking-tight">Crypto Markets</span>
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          Live
                        </span>
                      </div>
                      <table className="min-w-full text-left">
                        <thead className="bg-secondary">
                          <tr className="border-b border-border text-xs text-muted-foreground">
                            <th className="py-2 px-6 font-semibold">Symbol</th>
                            <th className="py-2 px-2 font-semibold">Bid</th>
                            <th className="py-2 px-2 font-semibold">Ask</th>
                          </tr>
                        </thead>
                        <tbody className="bg-background">
                          {cryptoData.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-4 px-6 text-muted-foreground text-sm">
                                No crypto pairs found.
                              </td>
                            </tr>
                          ) : (
                            cryptoData.map((pair) => {
                              const symbol = pair.symbol.toUpperCase();
                              const priceObj = marketPrices[symbol];
                              const decimals = getPriceDecimals(symbol);
                              return (
                                <tr
                                  key={pair.symbol}
                                  className="border-b border-border hover:bg-muted/10 transition cursor-pointer"
                                  onClick={() => navigate('/tradingstation')}
                                >
                                  <td className="py-2 px-6 flex items-center gap-2 font-mono font-bold text-base">
                                    {pair.image_url && (
                                      <img
                                        src={pair.image_url}
                                        alt={pair.symbol}
                                        className="w-7 h-7 object-contain"
                                      />
                                    )}
                                    {pair.symbol}
                                  </td>
                                  <td className="py-2 px-2">
                                    <span
                                      className={getPriceChangeClass(priceObj?.isPriceUp)}
                                      key={priceObj?.bid}
                                    >
                                      {renderPriceWithBigDigits(priceObj?.bid, decimals)}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2">
                                    <span
                                      className={getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)}
                                      key={priceObj?.ask}
                                    >
                                      {renderPriceWithBigDigits(priceObj?.ask, decimals)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Forex Markets Table */}
                    <div className="flex-1 border-l border-border">
                      <div className="flex items-center gap-2 px-6 pt-6 pb-2">
                        <span className="font-semibold text-lg tracking-tight">Forex Markets</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                          ${forexMarketOpen ? "bg-primary/10 text-primary" : "bg-error/20 text-error"}`}>
                          {forexMarketOpen ? "Live" : "Closed"}
                        </span>
                      </div>
                      <table className="min-w-full text-left">
                        <thead className="bg-secondary">
                          <tr className="border-b border-border text-xs text-muted-foreground">
                            <th className="py-2 px-6 font-semibold">Symbol</th>
                            <th className="py-2 px-2 font-semibold">Bid</th>
                            <th className="py-2 px-2 font-semibold">Ask</th>
                          </tr>
                        </thead>
                        <tbody className="bg-background">
                          {forexData.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-4 px-6 text-muted-foreground text-sm">
                                No forex pairs found.
                              </td>
                            </tr>
                          ) : (
                            forexData.map((pair) => {
                              const symbol = pair.symbol.toUpperCase();
                              const priceObj = marketPrices[symbol];
                              const decimals = getPriceDecimals(symbol);
                              return (
                                <tr
                                  key={pair.symbol}
                                  className="border-b border-border hover:bg-muted/10 transition cursor-pointer"
                                  onClick={() => navigate('/tradingstation')}
                                >
                                  <td className="py-2 px-6 flex items-center gap-2 font-mono font-bold text-base">
                                    {pair.image_url && (
                                      <img
                                        src={pair.image_url}
                                        alt={pair.symbol}
                                        className="w-7 h-7 object-contain"
                                      />
                                    )}
                                    {pair.symbol}
                                  </td>
                                  <td className="py-2 px-2">
                                    <span
                                      className={
                                        !forexMarketOpen
                                          ? "text-destructive font-semibold"
                                          : getPriceChangeClass(priceObj?.isPriceUp)
                                      }
                                      key={priceObj?.bid}
                                    >
                                      {renderPriceWithBigDigits(
                                        priceObj?.bid,
                                        decimals,
                                        !forexMarketOpen
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2">
                                    <span
                                      className={
                                        !forexMarketOpen
                                          ? "text-destructive font-semibold"
                                          : getPriceChangeClass(priceObj?.isPriceUp === false ? false : priceObj?.isPriceUp)
                                      }
                                      key={priceObj?.ask}
                                    >
                                      {renderPriceWithBigDigits(
                                        priceObj?.ask,
                                        decimals,
                                        !forexMarketOpen
                                      )}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Section */}
              <div>
                <Tabs defaultValue="transactions" className="w-full">
                  <TabsList>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="ranks">Ranks</TabsTrigger>
                    <TabsTrigger value="closed_trades">Closed Trades</TabsTrigger>
                  </TabsList>
                  <TabsContent 
                    value="transactions" 
                    className="space-y-3 w-full"
                  >
                    {transactionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Target 
                          className="h-16 w-16 mb-4 text-white/20"
                          weight="thin"
                        />
                        <p className="text-base">No transactions found</p>
                        <p className="text-sm text-white/50 mt-1">Your transaction history will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <TransactionTable 
                          transactions={transactions} 
                          onCopyId={handleCopyId}
                        />
                        
                        {hasMore && (
                          <div className="py-4 text-center">
                            <Button
                              variant="outline"
                              onClick={handleLoadMore}
                              disabled={isLoadingMore}
                              className="w-full sm:w-auto"
                            >
                              {isLoadingMore ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                                  Loading...
                                </>
                              ) : (
                                'Load More'
                              )}
                            </Button>
                          </div>
                        )}

                        {!hasMore && transactions.length > 0 && (
                          <div className="py-4 text-center text-sm text-white">
                            End of your Transactions
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="ranks" className="space-y-4 w-full">
                    {ranksLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <RankTable
                        ranks={ranks}
                        businessVolume={businessStats.totalVolume}
                        currentRank={businessStats.currentRank}
                        claimedRanks={claimedRanks}
                        claimingRank={claimingRank}
                        onClaimBonus={handleClaimRankBonus}
                      />
                    )}
                  </TabsContent>

                  {/* Closed Trades Tab */}
                  <TabsContent value="closed_trades" className="space-y-4 w-full">
                    {closedTradesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : closedTrades.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Target 
                          className="h-16 w-16 mb-4 text-white/20"
                          weight="thin"
                        />
                        <p className="text-base">No closed trades found</p>
                        <p className="text-sm text-white/50 mt-1">Your closed trades will appear here</p>
                      </div>
                    ) : (
                      <div>
                        {/* Total PNL for all closed trades */}
                        <div className="mb-4 flex items-center gap-2">
                          <span className="font-semibold text-lg">Total PNL:</span>
                          <span className={`font-bold text-lg ${closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0 ? "+" : ""}
                            ${closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
                          </span>
                        </div>
                        {/* Grouped by date */}
                        <div className="space-y-6">
                          {groupTradesByDate(closedTrades).map(({ dateKey, trades }) => {
                            const dayPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                            return (
                              <div key={dateKey}>
                                <div className="flex items-center gap-4 mb-2">
                                  <span className="font-semibold text-base">{formatDateLabel(dateKey)}</span>
                                  <span className={`font-bold text-base ${dayPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {dayPnl >= 0 ? "+" : ""}${dayPnl.toFixed(2)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {trades.map((trade) => {
                                    const decimals =
                                      trade.pair === "XAUUSD" ? 2 :
                                      trade.pair.endsWith("JPY") ? 3 :
                                      trade.pair.endsWith("USDT") && ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT", "BNBUSDT"].includes(trade.pair) ? 2 :
                                      trade.pair === "DOGEUSDT" ? 5 :
                                      trade.pair === "ADAUSDT" || trade.pair === "TRXUSDT" ? 4 :
                                      trade.pair === "DOTUSDT" ? 3 :
                                      !trade.pair.endsWith("USDT") ? 5 : 2;

                                    const isProfitable = trade.pnl >= 0;
                                    const closedAt = trade.closed_at || trade.updated_at || trade.created_at;
                                    return (
                                      <div
                                        key={trade.id}
                                        className="p-4 rounded-xl border border-border bg-muted/10 shadow-sm flex flex-col gap-2"
                                      >
                                        <div className="flex items-center gap-3 mb-2">
                                          <span className="font-semibold text-base">{trade.pair}</span>
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                              trade.type?.toLowerCase() === "buy"
                                                ? "bg-primary/80 text-white"
                                                : "bg-destructive/80 text-white"
                                            }`}
                                          >
                                            {trade.type?.toUpperCase()}
                                          </span>
                                          <span className="px-2 py-1 rounded-full bg-muted text-foreground text-xs font-medium">
                                            {Number(trade.lots).toFixed(2)} lot{Number(trade.lots) !== 1 ? 's' : ''}
                                          </span>
                                          <span className={`ml-auto font-bold ${isProfitable ? "text-green-500" : "text-red-500"}`}>
                                            {isProfitable ? "+" : ""}${trade.pnl?.toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center text-xs">
                                          <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                                            O: {Number(trade.open_price).toFixed(decimals)}
                                          </span>
                                          <span className="bg-secondary text-foreground px-2 py-1 rounded">
                                            C: {Number(trade.close_price).toFixed(decimals)}
                                          </span>
                                          <span className="bg-muted text-foreground px-2 py-1 rounded">
                                            LX: {trade.leverage}x
                                          </span>
                                          <span className="text-muted-foreground ml-auto">
                                            {closedAt ? new Date(closedAt).toLocaleString("en-US", {
                                              day: "2-digit",
                                              month: "short",
                                              hour: "numeric",
                                              minute: "numeric",
                                              hour12: true,
                                            }) : "-"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Dialog */}
      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent className="bg-secondary border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Share Referral Code</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Scan this QR code to share your referral link
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-4 space-y-4">
            {qrCodeUrl && (
              <div className="bg-foreground p-4 rounded-lg">
                <img src={qrCodeUrl} alt="Referral QR Code" className="w-64 h-64" />
              </div>
            )}
            <div className="w-full">
              <div className="relative">
                <Input
                  readOnly
                  value={referralLink}
                  className="pr-24 bg-secondary-foreground text-foreground border-0"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="absolute right-1 top-2 h-7 bg-primary"
                >
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full" 
              variant="secondary"
              onClick={() => setShowQrCode(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showDirectsDialog} onOpenChange={setShowDirectsDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-secondary via-background to-secondary-foreground border-0 shadow-2xl rounded-2xl p-0 overflow-hidden max-w-[380px]">
          <div className="flex flex-col items-center justify-center px-6 py-8 relative">
            <Button
              variant="ghost"
              className="absolute right-4 top-4 h-8 w-8 p-0 rounded-full hover:bg-white/10"
              onClick={() => setShowDirectsDialog(false)}
            >
              <XCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div className="w-full flex flex-col items-center">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-bold text-center mb-2 tracking-tight">
                  Direct Referral Status
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative flex items-center justify-center mb-2">
                      <div className={cn(
                        "rounded-full flex items-center justify-center transition-all duration-300",
                        directCount >= 2
                          ? "bg-gradient-to-br from-[#20BF55] to-[#01BAEF] shadow-[0_0_32px_0_rgba(32,191,85,0.3)]"
                          : directCount === 1
                          ? "bg-gradient-to-br from-[#FFA500] to-[#FF005C] shadow-[0_0_32px_0_rgba(255,165,0,0.2)]"
                          : "bg-gradient-to-br from-[#FF005C] to-[#FFA500] shadow-[0_0_32px_0_rgba(255,0,92,0.2)]"
                      )} style={{ width: 110, height: 110 }}>
                        <span className={cn(
                          "text-5xl font-extrabold tracking-tight",
                          directCount >= 2 ? "text-white" :
                          directCount === 1 ? "text-white" :
                          "text-white"
                        )}>
                          {directCount}/2
                        </span>
                      </div>
                      {/* Animated check or warning icon */}
                      <div className="absolute -bottom-3 right-0">
                        {directCount >= 2 ? (
                          <svg className="h-8 w-8 text-[#20BF55] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="12" r="11" stroke="#20BF55" strokeWidth="2" fill="#fff" />
                            <path stroke="#20BF55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 12l2.5 2.5L16 9" />
                          </svg>
                        ) : (
                          <svg className="h-8 w-8 text-[#FFA500] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="12" r="11" stroke="#FFA500" strokeWidth="2" fill="#fff" />
                            <path stroke="#FFA500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-base font-medium">
                      {directCount >= 2 ? (
                        <span>
                          <span className="text-[#20BF55] font-bold">Congratulations!</span> <br />
                          You have achieved the required direct referrals.<br />
                          You can now earn <span className="font-bold text-[#20BF55]">commissions and bonuses</span>.
                        </span>
                      ) : (
                        <span>
                          <span className={cn(
                            "font-bold",
                            directCount === 1 ? "text-[#FFA500]" : "text-[#FF005C]"
                          )}>
                            {2 - directCount} more direct referral{2 - directCount > 1 ? 's' : ''}
                          </span> needed to start earning <span className={cn(
                            "font-bold",
                            directCount === 1 ? "text-[#FFA500]" : "text-[#FF005C]"
                          )}>commissions and bonuses</span>.<br />
                          <span className="text-muted-foreground text-xs block mt-2">
                            Invite friends to join and activate their plans.
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
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

    {/* Markets Table Skeleton */}
    <Skeleton className="h-40 w-full rounded-2xl" />

    {/* Tabs Skeleton */}
    <div>
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-8 w-1/2 mt-4" />
    </div>
  </div>
);

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login', { 
        state: { from: '/dashboard' },
        replace: true 
      });
    }
    
    if (!loading) {
      setIsLoading(false);
    }
  }, [user, loading, navigate]);

  if (loading || isLoading) {
    return (
      <LoadingSpinner />
    );
  }

  if (!user) return null;;

  return <DashboardContent loading={loading} />;
};

export default Dashboard;
