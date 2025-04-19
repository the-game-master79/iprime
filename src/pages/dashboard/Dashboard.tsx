import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { getReferralLink } from "@/lib/utils";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Icons
import {
Copy, QrCode,
} from "lucide-react";
import { PlusCircle, ArrowCircleUpRight, ShoppingCart, ShareNetwork } from "@phosphor-icons/react";

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

  const navigate = useNavigate();
  const { toast } = useToast();

  // Add these state variables with the other states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Data fetching functions
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile and subscribed plans data
      const [profileData, plansData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
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
      setWithdrawalBalance(profileData.data?.withdrawal_wallet || 0);
      if (profileData.data?.referral_code) {
        setReferralLink(getReferralLink(profileData.data.referral_code));
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

      // Get user profile with direct count and business data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          direct_count,
          total_business_volumes (
            total_amount,
            business_rank
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Only proceed if user has at least 2 direct referrals
      const directCount = profileData?.direct_count || 0;
      if (directCount < 2) {
        setBusinessStats({
          currentRank: 'New Member',
          totalVolume: 0,
          rankBonus: 0,
          nextRank: null,
          progress: 0,
          targetVolume: 0
        });
        return;
      }

      const totalVolume = profileData?.total_business_volumes?.[0]?.total_amount || 0;
      const currentRankTitle = profileData?.total_business_volumes?.[0]?.business_rank || 'New Member';

      // Get all ranks for progression tracking
      const { data: ranks, error: ranksError } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (ranksError) throw ranksError;

      // Find current and next rank based on business volume
      const currentRank = ranks.find(r => r.title === currentRankTitle) || ranks[0];
      const currentRankIndex = ranks.findIndex(r => r.title === currentRankTitle);
      const nextRank = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;

      // Calculate progress to next rank
      let progress = 0;
      if (nextRank) {
        // Calculate progress as percentage of total volume towards next rank's requirement
        progress = Math.min(100, Math.max(0, (totalVolume / nextRank.business_amount) * 100));
      } else {
        // If at max rank, show 100% progress
        progress = 100;
      }

      setBusinessStats({
        currentRank: currentRank.title,
        totalVolume: totalVolume,
        rankBonus: currentRank.bonus,
        nextRank: nextRank ? {
          title: nextRank.title,
          bonus: nextRank.bonus,
          business_amount: nextRank.business_amount
        } : null,
        progress,
        targetVolume: nextRank ? nextRank.business_amount : currentRank.business_amount
      });

    } catch (error) {
      console.error('Error fetching business stats:', error);
      toast({
        title: "Error",
        description: "Failed to load business stats",
        variant: "destructive"
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
      const qrDataUrl = await QRCode.toDataURL(referralLink);
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
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      if (pageNumber === 1) {
        setTransactions(data || []);
      } else {
        setTransactions(prev => [...prev, ...(data || [])]);
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
        fetchClaimedRanks()
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

  return (
    <div className="min-h-[100dvh] bg-muted/30"> {/* Changed to use dynamic viewport height */}
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm py-4">
        <div className="container mx-auto px-4 sm:px-4 pr-0 sm:pr-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg"
                alt="CloudForex" 
                className="h-12 w-auto" 
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-6">
              <button
                onClick={handleTradeClick}
                className="order-2 sm:order-1 flex items-center gap-3 px-4 py-2 sm:rounded-lg rounded-l-lg bg-[#FFA500] text-white hover:bg-[#FFA500]/90 transition-colors scale-on-hover"
              >
                <div className="sm:flex items-center gap-2 hidden">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudtrade.svg"
                    alt="CloudTrade"
                    className="h-6 w-auto" 
                  />
                  <ArrowCircleUpRight weight="bold" className="h-5 w-5 slide-from-left" />
                </div>
                <div className="sm:hidden">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudtrade.svg"
                    alt="CloudTrade"
                    className="h-6 w-auto" 
                  />
                </div>
              </button>
              
              <Avatar 
                className="order-1 sm:order-2 cursor-pointer bg-primary"
                onClick={() => navigate('/profile')}
              >
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback>{userProfile?.first_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 pb-20"> {/* Added horizontal padding */}
          {loading || isLoading ? (
            <div className="flex items-center justify-center min-h-[50dvh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Actions Container */}
              <div className="p-4 sm:p-8 rounded-[1rem] bg-primary shadow-lg">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Deposit */}
                  <div onClick={() => navigate('/deposit')} className="cursor-pointer group">
                    <div className="flex items-center justify-center rounded-full bg-white transition-all group-hover:scale-[1.02] p-3">
                      <PlusCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" weight="bold" />
                    </div>
                    <div className="w-full flex items-center justify-center">
                      <span className="text-white text-[10px] sm:text-xs font-medium uppercase tracking-wide mt-2">Deposit</span>
                    </div>
                  </div>

                  {/* Withdraw */} 
                  <div onClick={() => navigate('/withdrawals')} className="cursor-pointer group">
                    <div className="flex items-center justify-center rounded-full bg-white transition-all group-hover:scale-[1.02] p-3">
                      <ArrowCircleUpRight className="h-6 w-6 sm:h-8 sm:w-8 text-primary" weight="bold" />
                    </div>
                    <div className="w-full flex items-center justify-center">
                      <span className="text-white text-[10px] sm:text-xs font-medium uppercase tracking-wide mt-2">Withdraw</span>
                    </div>
                  </div>

                  {/* Buy Plans */}
                  <div onClick={() => navigate('/plans')} className="cursor-pointer group">
                    <div className="flex items-center justify-center rounded-full bg-white transition-all group-hover:scale-[1.02] p-3">
                      <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" weight="bold" />
                    </div>
                    <div className="w-full flex items-center justify-center">
                      <span className="text-white text-[10px] sm:text-xs font-medium uppercase tracking-wide mt-2">Buy Plans</span>
                    </div>
                  </div>

                  {/* Refer */}
                  <div onClick={() => navigate('/affiliate')} className="cursor-pointer group">
                    <div className="flex items-center justify-center rounded-full bg-white transition-all group-hover:scale-[1.02] p-3">
                      <ShareNetwork className="h-6 w-6 sm:h-8 sm:w-8 text-primary" weight="bold" />
                    </div>
                    <div className="w-full flex items-center justify-center">
                      <span className="text-white text-[10px] sm:text-xs font-medium uppercase tracking-wide mt-2">Refer</span>
                    </div>
                  </div>
                </div>

                {/* Referral Section */}
                <div className="mt-8 border-t border-white/10 pt-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full">
                      <div className="text-white/80 text-sm mb-2">Your Referral Link</div>
                      <div className="relative">
                        <Input
                          readOnly
                          value={referralLink}
                          className="pr-20 font-mono text-sm bg-white/10 border-white/20 text-white"
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-white/10 text-white"
                            onClick={handleShowQrCode}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost" 
                            className="hover:bg-white/10 text-white"
                            onClick={handleCopyLink}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {qrCodeUrl && (
                      <div className="h-24 w-24 bg-white p-2 rounded-lg">
                        <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Balance Containers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-white border shadow-sm flex flex-col items-center justify-center">
                  <div className="text-6xl font-bold tracking-tight">
                    ${withdrawalBalance.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm mt-2">Available Balance</div>
                </div>

                <div className="p-6 rounded-xl bg-white border shadow-sm flex flex-col items-center justify-center">
                  <div className="text-6xl font-bold tracking-tight">
                    ${totalInvested.toLocaleString()}
                  </div>
                  <div 
                    onClick={() => navigate('/plans')} 
                    className="text-sm text-muted-foreground mt-2 cursor-pointer hover:text-primary transition-colors"
                  >
                    {activePlans.count} Plan{activePlans.count !== 1 ? 's' : ''} Active
                  </div>
                </div>
              </div>

              <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-xl mb-4">
                  <TabsTrigger value="transactions" className="rounded-l-xl">Transactions</TabsTrigger>
                  <TabsTrigger value="ranks" className="rounded-r-xl">Your Rank</TabsTrigger>
                </TabsList>

                <TabsContent 
                  value="transactions" 
                  className="space-y-3 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0"
                >
                  <div className="overflow-y-auto">
                    {transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </div>
                    ) : (
                      <div className="space-y-4"> {/* Added vertical spacing */}
                        <Accordion type="multiple" className="space-y-3">
                          {Object.entries(
                            transactions.reduce((groups, tx) => {
                              const date = new Date(tx.created_at).toLocaleDateString();
                              if (!groups[date]) groups[date] = [];
                              groups[date].push(tx);
                              return groups;
                            }, {} as Record<string, any[]>)
                          ).map(([date, txs]) => (
                            <AccordionItem key={date} value={date} className="border rounded-lg overflow-hidden">
                              <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                <div className="flex justify-between items-center w-full">
                                  <span className="font-medium">{format(new Date(date), 'do MMMM yyyy')}</span>
                                  <Badge variant="secondary" className="ml-auto mr-4 text-xs">
                                    {txs.length} Transactions
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3">
                                  {txs.map((tx) => (
                                    <div key={tx.id} className="relative bg-white border rounded-lg p-4">
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-muted-foreground">{tx.id}</span>
                                          <div className={`h-2.5 w-2.5 rounded-full ${
                                            tx.status === 'Completed' ? 'bg-green-500' : 
                                            tx.status === 'Pending' ? 'bg-yellow-500' : 
                                            tx.status === 'Processing' ? 'bg-blue-500' : 
                                            'bg-red-500'
                                          }`} />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-background"
                                            onClick={() => handleCopyId(tx.id)}
                                          >
                                            <Copy className="h-3 w-3" />
                                            <span className="sr-only">Copy ID</span>
                                          </Button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className={`text-2xl font-semibold ${
                                            tx.type === 'deposit' || tx.type === 'commission' || tx.type === 'investment_return' 
                                              ? 'text-green-600' 
                                              : tx.type === 'withdrawal' || tx.type === 'investment' 
                                              ? 'text-red-600' 
                                              : 'text-blue-600'
                                          }`}>
                                            ${tx.amount.toLocaleString()}
                                          </span>
                                          <Badge variant="outline" className="font-normal">
                                            {tx.type.replace(/_/g, ' ')}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                        
                        {hasMore && (
                          <div className="py-4 text-center sticky bottom-0 bg-background/95 backdrop-blur-sm">
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

                        {/* Replace the download app button */}
                        {canInstall && (
                          <div className="mt-6 flex justify-center">
                            <button
                              onClick={install}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-lg"
                            >
                              <img
                                src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg"
                                alt="CloudForex"
                                className="h-5 w-auto"
                              />
                              <span className="font-medium">Download our app</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent 
                  value="ranks" 
                  className="space-y-4 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0"
                >
                  <div className="max-h-[600px] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ranks.map((rank) => (
                        <Card key={rank.title} className={cn(
                          "relative overflow-hidden",
                          businessStats.totalVolume >= rank.business_amount && "bg-primary/5 border-primary"
                        )}>
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-lg">{rank.title}</h3>
                                  <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">
                                      Volume Required
                                    </div>
                                    <div className="text-xl font-medium">
                                      ${rank.business_amount.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right space-y-2">
                                  {businessStats.totalVolume >= rank.business_amount ? (
                                    <Badge variant="success">Achieved</Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      ${(rank.business_amount - businessStats.totalVolume).toLocaleString()} more
                                    </Badge>
                                  )}
                                  <div className="text-xl font-semibold text-green-600">
                                    +${rank.bonus.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Rank Bonus
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
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
