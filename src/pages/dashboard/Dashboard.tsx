import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { getReferralLink } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition, PageHeader, StatCard } from "@/components/ui-components";
import ShellLayout from "@/components/layout/Shell";

// Icons
import {
  DollarSign, Users, Mail, Star, Trophy, Copy, QrCode,
  Briefcase, ArrowUpToLine, ArrowUpRight, ArrowRight, Check
} from "lucide-react";

// Utilities
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

// Types
import type { 
  MarqueeUser, 
  Rank, 
  LeaderboardEntry, 
  Plan,
  BusinessRankState,
  UserProfile 
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

const TradingViewWidget = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement('script');
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        {"proName": "FOREXCOM:SPXUSD","title": "S&P 500 Index"},
        {"proName": "FOREXCOM:NSXUSD","title": "US 100 Cash CFD"},
        {"proName": "BITSTAMP:BTCUSD","title": "Bitcoin"},
        {"proName": "BITSTAMP:ETHUSD","title": "Ethereum"},
        {"description": "Sensex","proName": "BSE:SENSEX"},
        {"description": "GBP/USD","proName": "FX:GBPUSD"},
        {"description": "EUR/USD","proName": "FX:EURUSD"},
        {"description": "Solana","proName": "COINBASE:SOLUSD"},
        {"description": "Gold","proName": "FXOPEN:XAUUSD"},
        {"description": "Silver","proName": "CAPITALCOM:SILVER"},
        {"description": "SPY ETF Trust","proName": "AMEX:SPY"},
        {"description": "Vanguard S&F 500","proName": "AMEX:VOO"},
        {"description": "TRUMP/USDT","proName": "BINANCE:TRUMPUSDT"},
        {"description": "XRP","proName": "CRYPTO:XRPUSD"},
        {"description": "TONCOIN","proName": "OKX:TONUSDT"},
        {"description": "EUR/GBP","proName": "OANDA:USDJPY"},
        {"description": "USD/CNH","proName": "FX:USDCNH"},
        {"description": "EUR/GBP","proName": "FX:EURGBP"},
        {"description": "USD/CHF","proName": "OANDA:USDCHF"},
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: "adaptive",
      colorTheme: "light",
      locale: "en"
    });

    container.appendChild(script);

    return () => {
      if (container.contains(script)) {
        container.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="tradingview-widget-container">
      <div ref={containerRef} className="tradingview-widget-container__widget" />
    </div>
  );
};

const DashboardContent: React.FC<DashboardContentProps> = ({ loading }) => {
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

      const totalVolume = profileData?.total_business_volumes?.total_amount || 0;
      const currentRankTitle = profileData?.total_business_volumes?.business_rank || 'New Member';

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

  return (
    <ShellLayout>
      <PageTransition>
        <div className="space-y-4 sm:space-y-6">
          <div className="relative bg-muted/50 rounded-lg overflow-hidden -mt-4 mb-2">
            <div className="relative">
              <TradingViewWidget />
            </div>
          </div>

          <div className="p-8 rounded-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/20 border shadow-sm">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-start gap-8">
                <div className="shrink-0">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-4 ring-background flex items-center justify-center shadow-sm">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt="Profile" 
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-primary">
                        {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    Hello, {userProfile?.first_name} {userProfile?.last_name}
                  </h2>
                  <p className="text-muted-foreground/80 mt-1 text-lg">{userProfile?.email}</p>
                </div>
              </div>

              <div className="hidden sm:block border border-dashed border-primary/20 rounded-lg p-4 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm min-w-[600px]">
                <div className="text-sm font-medium text-muted-foreground mb-2">Your Referral Link</div>
                <div className="relative">
                  <Input
                    readOnly
                    value={referralLink}
                    className="pr-20 font-mono text-sm bg-transparent border-primary/20 overflow-x-auto"
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={handleShowQrCode}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost" 
                      className="hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={handleCopyLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activePlans.count > 0 ? (
              <div className="lg:row-span-2 p-6 bg-card border rounded-lg relative overflow-hidden order-1">
                <img 
                  src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cfwatermark.png"
                  alt="CloudForex Watermark"
                  className="absolute -top-8 -right-8 w-48 h-48 opacity-10 select-none pointer-events-none object-contain"
                />
                <div className="relative z-10 flex flex-col h-full">
                  <div>
                    <div className="text-muted-foreground text-base">Total Invested</div>
                    <div className="text-7xl font-bold text-primary tracking-tight mt-3">
                      ${totalInvested.toLocaleString()}
                    </div>
                    <div className="text-base text-muted-foreground mt-3">
                      Across {activePlans.count} Active Plan{activePlans.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex mt-auto hover-trigger">
                    <Button 
                      size="lg"
                      className="rounded-full px-6 relative after:absolute after:h-full after:w-px after:right-0 after:top-0 after:bg-primary-foreground/10" 
                      onClick={() => navigate('/plans')}
                    >
                      Buy Plans
                    </Button>
                    <Button 
                      size="lg"
                      className="rounded-full px-3.5 transition-all duration-300 bg-black hover:bg-black"
                      onClick={() => navigate('/plans')}
                    >
                      <div className="relative w-4 h-4">
                        <ArrowUpRight className="absolute inset-0 transition-opacity duration-300 opacity-100 hover-trigger:opacity-0 text-white" />
                        <ArrowRight className="absolute inset-0 transition-opacity duration-300 opacity-0 hover-trigger:opacity-100 text-white" />
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lg:row-span-2 p-6 bg-card border rounded-lg relative order-1">
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="space-y-3">
                    <div className="text-2xl font-semibold text-muted-foreground">No Plans Subscribed Yet</div>
                    <p className="text-muted-foreground">Start your investment journey by subscribing to a plan</p>
                    <div className="flex justify-center mt-6 hover-trigger">
                      <Button 
                        size="lg"
                        className="rounded-full px-6 relative after:absolute after:h-full after:w-px after:right-0 after:top-0 after:bg-primary-foreground/10" 
                        onClick={() => navigate('/plans')}
                      >
                        View Plans
                      </Button>
                      <Button 
                        size="lg"
                        className="rounded-full px-3.5 transition-all duration-300 bg-black hover:bg-black"
                        onClick={() => navigate('/plans')}
                      >
                        <div className="relative w-4 h-4">
                          <ArrowUpRight className="absolute inset-0 transition-opacity duration-300 opacity-100 hover-trigger:opacity-0 text-white" />
                          <ArrowRight className="absolute inset-0 transition-opacity duration-300 opacity-0 hover-trigger:opacity-100 text-white" />
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 bg-card border rounded-lg relative order-3 lg:order-2">
              <div className="text-muted-foreground text-sm">Total Commissions</div>
              <div className="text-3xl font-bold text-orange-600 tracking-tight mt-2">
                ${(totalCommissions + rankBonusTotal).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                ${totalCommissions.toLocaleString()} Commissions & ${rankBonusTotal.toLocaleString()} Rank Bonus
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 hover-trigger hidden sm:block">
                <Button 
                  size="lg"
                  className="rounded-full px-6 relative after:absolute after:h-full after:w-px after:right-0 after:top-0 after:bg-primary-foreground/10 bg-orange-600 hover:bg-orange-700 text-white" 
                  onClick={() => navigate('/affiliate')}
                >
                  {totalCommissions > 0 || rankBonusTotal > 0 ? 'Earn More' : 'Start Earning'}
                </Button>
                <Button 
                  size="lg"
                  className="rounded-full px-3.5 transition-all duration-300 bg-black hover:bg-black"
                  onClick={() => navigate('/affiliate')}
                >
                  <div className="relative w-4 h-4">
                    <ArrowUpRight className="absolute inset-0 transition-opacity duration-300 opacity-100 hover-trigger:opacity-0 text-white" />
                    <ArrowRight className="absolute inset-0 transition-opacity duration-300 opacity-0 hover-trigger:opacity-100 text-white" />
                  </div>
                </Button>
              </div>
              <div className="flex mt-4 sm:hidden hover-trigger">
                <Button 
                  className="rounded-full px-6 relative flex-1 after:absolute after:h-full after:w-px after:right-0 after:top-0 after:bg-primary-foreground/10 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => navigate('/affiliate')}
                >
                  {totalCommissions > 0 || rankBonusTotal > 0 ? 'Earn More' : 'Start Earning'}
                </Button>
                <Button 
                  className="rounded-full px-3.5 transition-all duration-300 bg-black hover:bg-black"
                  onClick={() => navigate('/affiliate')}
                >
                  <div className="relative w-4 h-4">
                    <ArrowUpRight className="absolute inset-0 transition-opacity duration-300 opacity-100 hover-trigger:opacity-0 text-white" />
                    <ArrowRight className="absolute inset-0 transition-opacity duration-300 opacity-0 hover-trigger:opacity-100 text-white" />
                  </div>
                </Button>
              </div>
            </div>

            <div className="p-6 bg-card border rounded-lg relative order-2 lg:order-3">
              <div className="text-muted-foreground text-sm">Withdrawal Balance</div>
              <div className="text-3xl font-bold text-green-600 tracking-tight mt-2">
                ${withdrawalBalance.toLocaleString()}
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>${investmentReturns.toLocaleString()} Earnings & ${withdrawalCommissions.toLocaleString()} Commissions</span>
                </div>
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 hover-trigger hidden sm:block">
                <Button 
                  size="lg"
                  className="rounded-full px-6 relative after:absolute after:h-full after:w-px after:right-0 after:top-0 after:bg-primary-foreground/10" 
                  onClick={() => navigate(userProfile?.kyc_status === 'completed' ? '/withdrawals' : '/profile?tab=kyc')}
                  style={{ backgroundColor: '#16a34a', color: 'white' }}
                >
                  {userProfile?.kyc_status === 'completed' ? 'Withdraw Now' : 'Submit KYC'}
                </Button>
                <Button 
                  size="lg"
                  className="rounded-full px-3.5 transition-all duration-300 bg-black hover:bg-black"
                  onClick={() => navigate(userProfile?.kyc_status === 'completed' ? '/withdrawals' : '/profile?tab=kyc')}
                >
                  <div className="relative w-4 h-4">
                    <ArrowUpRight className="absolute inset-0 transition-opacity duration-300 opacity-100 hover-trigger:opacity-0 text-white" />
                    <ArrowRight className="absolute inset-0 transition-opacity duration-300 opacity-0 hover-trigger:opacity-100 text-white" />
                  </div>
                </Button>
              </div>
              <div className="flex mt-4 sm:hidden hover-trigger">
                <Button 
                  className="rounded-full px-6 relative flex-1 after:absolute after:h-full after:w-px after:right-0 after:top-0 after:bg-primary-foreground/10"
                  onClick={() => navigate(userProfile?.kyc_status === 'completed' ? '/withdrawals' : '/profile?tab=kyc')}
                  style={{ backgroundColor: '#16a34a', color: 'white' }}
                >
                  {userProfile?.kyc_status === 'completed' ? 'Withdraw Now' : 'Submit KYC'}
                </Button>
                <Button 
                  className="rounded-full px-3.5 transition-all duration-300 bg-black hover:bg-black"
                  onClick={() => navigate(userProfile?.kyc_status === 'completed' ? '/withdrawals' : '/profile?tab=kyc')}
                >
                  <div className="relative w-4 h-4">
                    <ArrowUpRight className="absolute inset-0 transition-opacity duration-300 opacity-100 hover-trigger:opacity-0 text-white" />
                    <ArrowRight className="absolute inset-0 transition-opacity duration-300 opacity-0 hover-trigger:opacity-100 text-white" />
                  </div>
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Card>
              <CardContent className="p-6 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-900/20">
                {userProfile?.direct_count && userProfile.direct_count >= 2 ? (
                  <>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold text-primary">
                          ${businessStats.totalVolume.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl sm:text-3xl font-bold text-primary">
                          {businessStats.currentRank}
                        </div>
                        {businessStats.currentRank !== 'New Member' && (
                          claimedRanks.includes(businessStats.currentRank) ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm font-medium px-3 py-1.5 rounded-md bg-green-50">
                              <Check className="h-4 w-4" />
                              <span>Claimed</span>
                            </div>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleClaimBonus(businessStats.currentRank)}
                              disabled={isClaimingBonus}
                            >
                              {isClaimingBonus ? "Claiming..." : `Claim $${businessStats.rankBonus.toLocaleString()}`}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                    {businessStats.nextRank && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${businessStats.progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-sm text-muted-foreground">
                                Next Rank: {businessStats.nextRank.title} (${businessStats.nextRank.bonus.toLocaleString()} Bonus)
                              </span>
                              <span className="text-xs font-medium text-primary">
                                {Math.round(businessStats.progress)}% (${businessStats.totalVolume.toLocaleString()} / ${businessStats.nextRank.business_amount.toLocaleString()})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Trophy className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">Unlock Rank Bonuses & Commissions</h3>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-amber-800">
                        Complete these requirements to start earning rank bonuses and team commissions:
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-sm
                            ${userProfile?.direct_count >= 2 
                              ? 'bg-green-500 text-white' 
                              : 'bg-amber-200 text-amber-700'
                            }`}
                          >
                            {userProfile?.direct_count || 0}
                          </div>
                          <span className="text-sm text-amber-800">
                            Minimum 2 direct referrals required 
                            {userProfile?.direct_count 
                              ? ` (${userProfile.direct_count}/2)` 
                              : ' (0/2)'}
                          </span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => navigate('/affiliate')}
                      >
                        Go to Affiliate Program
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    </ShellLayout>
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return <DashboardContent loading={loading} />;
};

export default Dashboard;
