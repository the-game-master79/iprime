import React, { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { DashboardTopbar } from "@/components/shared/DashboardTopbar";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { RankTable } from "@/components/dashboard/RankTable";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Icons
import { 
  Copy,
  QrCode,
  ShareNetwork,
  XCircle,
  Wallet,
  ArrowDown,
  ArrowUp,
  ChartLine,
  Trophy,
  Target,
  Users,
  Sun,
  Moon
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

// Add this helper to format price with big digits
const renderPriceWithBigDigits = (value: number | undefined, decimals: number) => {
  if (value === undefined) return "-";
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

const DashboardContent: React.FC<DashboardContentProps> = ({ loading }) => {
  const { isMobile } = useBreakpoints();
  const { canInstall, install } = usePwaInstall(); // Add hook
  const { theme, setTheme } = useTheme();

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
  const ITEMS_PER_PAGE = 10;

  // Add this state near other state declarations
  const [directCount, setDirectCount] = useState(0);

  // Add this state with other states
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showDirectsDialog, setShowDirectsDialog] = useState(false);

  // Only symbol and image_url from Supabase, but display static bid/ask values
  const [cryptoData, setCryptoData] = useState<{ symbol: string, image_url: string }[]>([]);
  const [forexData, setForexData] = useState<{ symbol: string, image_url: string }[]>([]);

  // Add state for live prices (now storing price and isPriceUp)
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: string; bid?: number; ask?: number; isPriceUp?: boolean }>>({});

  // Data fetching functions
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileData, plansData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, withdrawal_wallet, multiplier_bonus, direct_count, full_name')
          .eq('id', user.id)
          .single(),
        supabase
          .from('plans_subscriptions')
          .select(`
            id,
            amount,
            status
          `)
          .eq('user_id', user.id)
          .eq('status', 'approved')
      ]);

      if (profileData.error) throw profileData.error;
      
      setUserProfile(profileData.data);
      setDirectCount(profileData.data?.direct_count || 0);
      // Calculate total available balance including multiplier bonus
      const totalBalance = (profileData.data?.withdrawal_wallet || 0) + (profileData.data?.multiplier_bonus || 0);
      setWithdrawalBalance(totalBalance);

      if (profileData.data?.referral_code) {
        const fullUrl = `${window.location.origin}/auth/login?ref=${profileData.data.referral_code}`;
        setReferralCode(profileData.data.referral_code);
        setReferralLink(fullUrl);
      }

      // Calculate total invested amount from approved subscriptions
      const approvedSubscriptions = plansData.data || [];
      const totalAmount = approvedSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      
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

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      const activeReferrals = processedData?.filter(ref => ref.level === 1).length || 0;
      const totalReferrals = processedData?.length || 0;

      setTotalReferrals({
        active: activeReferrals,
        total: totalReferrals
      });

    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const fetchWithdrawalStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const fetchBusinessStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total business volume and rank directly from total_business_volumes
      const { data: volumeData } = await supabase
        .from('total_business_volumes')
        .select('total_amount, business_rank')
        .eq('user_id', user.id)
        .single();

      // Set default values if no data exists
      const businessVolume = volumeData?.total_amount || 0;
      const currentRankTitle = volumeData?.business_rank || 'New Member';

      // Get all ranks for progression tracking
      const { data: ranks, error: ranksError } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (ranksError) throw ranksError;

      // Default to first rank if no rank is found
      const currentRank = ranks.find(r => r.title === currentRankTitle) || ranks[0] || { 
        title: 'New Member',
        business_amount: 0,
        bonus: 0
      };
      
      const currentRankIndex = ranks.findIndex(r => r.title === currentRankTitle);
      const nextRank = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;

      // Calculate progress to next rank
      let progress = 0;
      if (nextRank && currentRank) {
        const progressCalc = ((businessVolume - currentRank.business_amount) / 
          (nextRank.business_amount - currentRank.business_amount)) * 100;
        progress = Math.min(100, Math.max(0, progressCalc));
      }

      setBusinessStats({
        currentRank: currentRankTitle,
        totalVolume: businessVolume,
        rankBonus: currentRank?.bonus || 0,
        nextRank: nextRank ? {
          title: nextRank.title,
          bonus: nextRank.bonus,
          business_amount: nextRank.business_amount
        } : null,
        progress,
        targetVolume: nextRank ? nextRank.business_amount : currentRank?.business_amount || 0
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

  const fetchClaimedRanks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        fetchBusinessStats(),
        fetchWithdrawalStats()
      ]);

      setClaimedRanks(prev => [...prev, rank]);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
        fetchBusinessStats(),
        fetchWithdrawalStats(),
        fetchClaimedRanks()
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
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Referral Link Copied!",
      description: "Share this Link in your network",
    });
  };

  const handleShowQrCode = async () => {
    try {
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
  const fetchTransactions = async (pageNumber = 1) => {
    try {
      setIsLoadingMore(true);
      const { data: { user } } = await supabase.auth.getUser();
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
        // Filter out any duplicate transactions by ID
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
    }
  };

  // Add load more handler
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setPage(prev => prev + 1);
      fetchTransactions(page + 1);
    }
  };

  const fetchRanks = async () => {
    try {
      const { data, error } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (error) throw error;
      setRanks(data || []);
    } catch (error) {
      console.error('Error fetching ranks:', error);
    }
  };

  // Add this function with other fetch functions
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
      console.error('Error fetching promotions:', error);
    }
  };

  // Effects
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initializeDashboard = async () => {
      if (!mounted) return;
      
      await Promise.all([
        fetchUserProfile(),
        fetchReferralData(),
        fetchCommissions(),
        fetchBusinessStats(),
        fetchWithdrawalStats(),
        fetchClaimedRanks(),
        fetchPromotions() // Add this line
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
            if (mounted) {
              fetchBusinessStats();
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
  }, [userProfile?.id, theme]);

  useEffect(() => {
    fetchTransactions();
    fetchRanks();
  }, [userProfile?.id]);

  useEffect(() => {
    // Remove the WebSocket connection and related logic
    return () => {};
  }, []);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
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
        // Accept price, or fallback to bid, or ask (like TradingStation)
        const price =
          data.data?.price ??
          data.data?.bid ??
          data.data?.ask;
        if (data.symbol && price) {
          setMarketPrices(prev => {
            const symbol = data.symbol.toUpperCase();
            const prevPrice = parseFloat(prev[symbol]?.price || "0");
            const newPrice = parseFloat(price);
            return {
              ...prev,
              [symbol]: {
                price: price.toString(),
                bid: typeof data.data?.bid === "number" ? data.data.bid : undefined,
                ask: typeof data.data?.ask === "number" ? data.data.ask : undefined,
                isPriceUp: newPrice > prevPrice
              }
            };
          });
        }
      } catch (e) {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      if (isOpen) ws.close();
    };
  }, [cryptoData, forexData]);

  // Determine if the forex market is open
  const forexMarketOpen = isForexTradingTime();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground transition-colors">
      {/* DashboardTopbar with Theme Toggle */}
      <div className="relative">
        <DashboardTopbar />
      </div>

      <main className="py-8">
        <div className="container mx-auto px-4 max-w-[1000px]">
          {loading || isLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
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
                          value={referralLink}
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
                        <div className="rounded-lg bg-secondary-foreground p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {/* AI Trading Box with "AI" text, no fill, only stroke */}
                              <div
                                className="flex items-center justify-center h-8 w-8 border-2 border-foreground rounded-lg"
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
                        <span className="mt-2 text-sm font-medium text-foreground">Agent</span>
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
                          ${forexMarketOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {forexMarketOpen ? "Live" : "Closed"}
                        </span>
                      </div>
                      {!forexMarketOpen && (
                        <div className="mb-2 px-6 text-xs text-destructive font-medium">
                          Forex market is currently closed. You can still view prices, but trading is unavailable.
                        </div>
                      )}
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
                  </div>
                </div>
              </div>

              {/* Tabs Section */}
              <div>
                <Tabs defaultValue="transactions" className="w-full">
                  <TabsList>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="ranks">Ranks</TabsTrigger>
                  </TabsList>
                  <TabsContent 
                    value="transactions" 
                    className="space-y-3 w-full"
                  >
                    {transactions.length === 0 ? (
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
                    <RankTable
                      ranks={ranks}
                      businessVolume={businessStats.totalVolume}
                      currentRank={businessStats.currentRank}
                      claimedRanks={claimedRanks}
                      claimingRank={claimingRank}
                      onClaimBonus={handleClaimRankBonus}
                    />
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
            <DialogTitle>Share Referral Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to share your referral link
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-4 space-y-4">
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCodeUrl} alt="Referral QR Code" className="w-64 h-64" />
              </div>
            )}
            <div className="w-full">
              <div className="relative">
                <Input
                  readOnly
                  value={referralLink}
                  className="pr-24 bg-[#1E1E1E] border-0"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="absolute right-1 top-1 h-7"
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;;

  return <DashboardContent loading={loading} />;
};

export default Dashboard;
