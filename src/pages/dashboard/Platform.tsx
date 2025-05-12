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
  Users
} from "@phosphor-icons/react";

// Utilities
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { usePwaInstall } from "@/hooks/use-pwa-install";

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

const DashboardContent: React.FC<DashboardContentProps> = ({ loading }) => {
  const { isMobile } = useBreakpoints();
  const { canInstall, install } = usePwaInstall(); // Add hook

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

  // Data fetching functions
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileData, plansData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, withdrawal_wallet, multiplier_bonus, direct_count')
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
            first_name,
            last_name,
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
  }, [userProfile?.id]);

  useEffect(() => {
    fetchTransactions();
    fetchRanks();
  }, [userProfile?.id]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  const handleTradeClick = () => {
    // If mobile, go to select page first, otherwise go to main trade view
    navigate(isMobile ? '/trade/select' : '/trade');
  };

  const handleDirectsClick = () => {
    setShowDirectsDialog(true);
  };

  return (
    <div className="min-h-[100dvh] bg-[#000000]">
      <DashboardTopbar />

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
                <div className="bg-gradient-to-br from-[#141414] to-[#1E1E1E] rounded-2xl p-4 border border-white/5">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShareNetwork className="h-5 w-5 text-primary" weight="fill" />
                        <span className="text-sm font-medium text-white/80">Your Referral Link</span>
                      </div>
                      <div 
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                          directCount >= 2 ? "bg-[#20BF55]/10 text-[#20BF55]" : 
                          directCount === 1 ? "bg-[#FFA500]/10 text-[#FFA500]" : 
                          "bg-[#FF005C]/10 text-[#FF005C]"
                        )}
                        onClick={handleDirectsClick}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          directCount >= 2 ? "bg-[#20BF55]" : 
                          directCount === 1 ? "bg-[#FFA500]" : 
                          "bg-[#FF005C]"
                        )} />
                        <span>{directCount}/2 Directs</span>
                      </div>
                    </div>

                    {/* Referral Link Input */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          readOnly
                          value={referralLink}
                          className="w-full pr-[120px] pl-4 font-mono text-sm bg-black/20 border-white/5 h-12 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                        />
                        <div className="absolute right-1 top-1 h-10 flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={handleCopyLink}
                            className="h-8 w-8 rounded-lg hover:bg-white/5"
                          >
                            <Copy className="h-4 w-4 text-white/70" weight="regular" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={handleShowQrCode}
                            className="h-8 w-8 rounded-lg hover:bg-white/5"
                          >
                            <QrCode className="h-4 w-4 text-white/70" weight="regular" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotions Card */}
                <div className="w-full p-4 bg-[#1E1E1E] rounded-2xl">
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/promotions')}
                    className="w-full h-auto py-2 px-4 hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base">View Active Promotions</span>
                      {promotions.length > 0 && (
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                          {promotions.length} Active
                        </span>
                      )}
                    </div>
                  </Button>
                </div>
              </div>

              {/* Balance Container */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Combined Balance Card */}
                <div className="md:col-span-2 bg-[#141414] rounded-2xl p-6">
                  <div className="flex flex-col gap-6">
                    {/* Balances Section */}
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Available Balance */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-white/50" />
                          <span className="text-sm text-white/50">Available Balance</span>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-3xl font-medium">
                            ${withdrawalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                          {userProfile?.multiplier_bonus > 0 && (
                            <p className="text-sm text-white/50">
                              Including bonus: ${(userProfile.multiplier_bonus || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* AI Trading Balance */}
                      <div className="flex-1">
                        <div className="rounded-lg bg-secondary p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <img 
                                src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//ai-trading.svg"
                                alt="AI Trading"
                                className="h-5 w-5"
                              />
                              <span className="text-sm text-white/50">Trading</span>
                            </div>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                              {activePlans.count} {activePlans.count === 1 ? 'Plan' : 'Plans'}
                            </span>
                          </div>
                          <h3 className="text-3xl font-medium">
                            ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row - 2x2 grid on mobile */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        className="h-12 gap-2 bg-[#FFA500] text-white hover:bg-[#FFA500]/80" 
                        onClick={() => navigate('/trade')}
                      >
                        <ChartLine className="h-5 w-5" />
                        Trade
                      </Button>
                      <Button 
                        className="h-12 gap-2" 
                        onClick={() => navigate('/deposit')}
                      >
                        <ArrowDown className="h-5 w-5" />
                        Add Funds
                      </Button>
                      <Button 
                        variant="secondary"
                        className="h-12 gap-2" 
                        onClick={() => navigate('/withdrawals')}
                      >
                        <ArrowUp className="h-5 w-5" />
                        Withdraw
                      </Button>
                      <Button 
                        variant="secondary"
                        className="h-12 gap-2" 
                        onClick={() => navigate('/plans')}
                      >
                        <img 
                          src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//ai-trading.svg"
                          alt="AI Trading"
                          className="h-5 w-5"
                        />
                        Trading
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Affiliate Rank Card */}
                <div className="bg-[#141414] rounded-2xl p-6">
                  <div className="h-full flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-white/50" />
                        <span className="text-sm text-white/50">Affiliate Status</span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-3xl font-medium">
                          {businessStats.currentRank || 'New Member'}
                        </h3>
                        <p className="text-sm">
                          {businessStats.totalVolume < 0 ? (
                            <span className="text-[#FFA500]">Pending</span>
                          ) : (
                            <span className="text-white/50">${businessStats.totalVolume.toLocaleString()} Business Volume</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress to Next Rank - Moved to bottom */}
                    {businessStats.nextRank && (
                      <div className="space-y-2 mt-auto pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/50">Next: {businessStats.nextRank.title}</span>
                          <span>
                            ${(businessStats.nextRank.business_amount - businessStats.totalVolume).toLocaleString()} more
                          </span>
                        </div>
                        <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
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
        <DialogContent className="bg-[#141414] border-0">
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
      </Dialog>          <AlertDialog open={showDirectsDialog} onOpenChange={setShowDirectsDialog}>
        <AlertDialogContent className="bg-[#141414] border-0">
          <div className="absolute right-4 top-4">
            <Button
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-white/10"
              onClick={() => setShowDirectsDialog(false)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl mb-6">Direct Referral Status</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <span className={cn(
                    "text-7xl font-bold",
                    directCount >= 2 ? "text-[#20BF55]" : 
                    directCount === 1 ? "text-[#FFA500]" : 
                    "text-[#FF005C]"
                  )}>
                    {directCount}/2
                  </span>
                </div>
                <div className="text-center">
                  {directCount >= 2 ? (
                    <>
                      Congratulations! You have achieved the required direct referrals. You can now earn <span className="font-bold text-[#20BF55]">commissions and bonuses</span>.
                    </>
                  ) : (
                    <>
                      You need {2 - directCount} more direct referral{2 - directCount > 1 ? 's' : ''} to start earning <span className={cn(
                        "font-bold",
                        directCount === 1 ? "text-[#FFA500]" : "text-[#FF005C]"
                      )}>commissions and bonuses</span>.
                    </>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
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

  if (!user) return null;

  return <DashboardContent loading={loading} />;
};

export default Dashboard;
