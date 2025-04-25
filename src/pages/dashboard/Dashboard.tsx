import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { DashboardTopbar } from "@/components/shared/DashboardTopbar"; // Add this import

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TransactionTable } from "@/components/tables/TransactionTable"; // Add this import
import { RankTable } from "@/components/dashboard/RankTable"; // Add this import

// Icons
import {
Copy, QrCode, Receipt, Trophy
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
  const [claimingRank, setClaimingRank] = useState<string | null>(null);

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
        // Update referral link to include tab ID
        setReferralLink(`${window.location.origin}/auth/login?ref=${profileData.data.referral_code}&tab=register`);
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
      const { data: volumeData, error: volumeError } = await supabase
        .from('total_business_volumes')
        .select('total_amount, business_rank')
        .eq('user_id', user.id)
        .single();

      if (volumeError) throw volumeError;

      const businessVolume = volumeData?.total_amount || 0;
      const currentRankTitle = volumeData?.business_rank || 'New Member';

      // Get all ranks for progression tracking
      const { data: ranks, error: ranksError } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (ranksError) throw ranksError;

      // Find current and next rank based on stored rank title
      const currentRank = ranks.find(r => r.title === currentRankTitle) || ranks[0];
      const currentRankIndex = ranks.findIndex(r => r.title === currentRankTitle);
      const nextRank = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;

      // Calculate progress to next rank
      let progress = 0;
      if (nextRank) {
        const progressCalc = ((businessVolume - currentRank.business_amount) / 
          (nextRank.business_amount - currentRank.business_amount)) * 100;
        progress = Math.min(100, Math.max(0, progressCalc));
      } else {
        progress = 100;
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
    <div className="min-h-[100dvh] bg-gray-50">
      <DashboardTopbar />

      <main className="py-8">
        <div className="container mx-auto px-4 max-w-[1200px]">
          {loading || isLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Balance Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-white mb-1">Available Balance</span>
                        <span className="text-2xl font-semibold text-white">
                          ${withdrawalBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/deposit')}
                          className="whitespace-nowrap bg-white border-white text-primary hover:bg-white/90"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Deposit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/withdrawals')}
                          className="whitespace-nowrap bg-transparent border-white text-white hover:bg-white/20"
                        >
                          <ArrowCircleUpRight className="h-4 w-4 mr-2" />
                          Withdraw
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground mb-1">Active Plans</span>
                        <span className="text-2xl font-semibold">
                          ${totalInvested.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {activePlans.count} Plan{activePlans.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/plans')}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy Plans
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground mb-1">Current Rank</span>
                        <span className="text-2xl font-semibold">
                          {businessStats.currentRank || 'New Member'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/affiliate')}
                      >
                        <ShareNetwork className="h-4 w-4 mr-2" />
                        Refer & Earn
                      </Button>
                    </div>
                    {businessStats.nextRank && (
                      <div className="mt-2">
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500" 
                            style={{ width: `${businessStats.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {Math.round(businessStats.progress)}% to {businessStats.nextRank.title}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Referral Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full space-y-2">
                      <div className="text-sm font-medium">Your Referral Link</div>
                      <div className="relative">
                        <Input
                          readOnly
                          value={referralLink}
                          className="pr-20 font-mono text-sm"
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                          <Button size="sm" variant="ghost" onClick={handleShowQrCode}>
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCopyLink}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {qrCodeUrl && (
                      <div className="h-24 w-24 p-2 bg-white rounded-lg shadow-sm">
                        <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs Section */}
              <Card>
                <CardContent className="p-6">
                  <Tabs defaultValue="transactions" className="w-full">
                    <TabsList className="inline-flex mb-6">
                      <TabsTrigger value="transactions">
                        <Receipt className="h-4 w-4 mr-2" />
                        Transactions
                      </TabsTrigger>
                      <TabsTrigger value="ranks">
                        <Trophy className="h-4 w-4 mr-2" />
                        Ranks
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent 
                      value="transactions" 
                      className="space-y-3 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0"
                    >
                      <div className="overflow-x-auto">
                        {transactions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No transactions found
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
                              <div className="py-4 text-center text-sm text-muted-foreground">
                                End of your Transactions
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="ranks" className="space-y-4">
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
                  </CardContent>
                </Card>
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
