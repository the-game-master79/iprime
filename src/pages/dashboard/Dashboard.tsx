import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";
import { getReferralLink } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PageTransition, PageHeader, StatCard } from "@/components/ui-components";
import ShellLayout from "@/components/layout/Shell";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import Marquee from 'react-fast-marquee';
import { Badge } from "@/components/ui/badge";

// Icons
import {
  DollarSign, Users, Mail, Star, Trophy, Copy, QrCode,
  Briefcase, ArrowDownToLine, ArrowUpToLine
} from "lucide-react";

// Utilities
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

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

const DashboardContent: React.FC<{ loading: boolean }> = ({ loading }) => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [referralLink, setReferralLink] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [activePlans, setActivePlans] = useState({ count: 0, amount: 0 });
  const [withdrawalBalance, setWithdrawalBalance] = useState(0);
  
  // Business data
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState({ active: 0, total: 0 });
  const [totalCommissions, setTotalCommissions] = useState(0);
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
    nextRank: null,
    progress: 0,
    targetVolume: 0
  });

  // Display data
  const [marqueeUsers, setMarqueeUsers] = useState<MarqueeUser[]>([]);
  const [leaderboard, setLeaderboard] = useState({
    businessVolume: [] as LeaderboardEntry[],
    referrals: [] as LeaderboardEntry[]
  });

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
            investment,
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

      // Calculate subscribed plans stats from approved subscriptions
      const approvedSubscriptions = plansData.data || [];
      setActivePlans({
        count: approvedSubscriptions.length,
        amount: approvedSubscriptions.reduce((sum, sub) => sum + (sub.investment || 0), 0)
      });
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

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .eq('status', 'Completed')
        .or('type.eq.commission,type.eq.rank_bonus');

      if (error) throw error;

      const total = (data || []).reduce((sum, tx) => sum + (tx.amount / 2), 0);
      setTotalCommissions(total);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  const fetchLeaderboards = async () => {
    try {
      const { data: businessVolumeData, error: businessVolumeError } = await supabase
        .from('business_volume_display')
        .select('*')
        .order('serial_number', { ascending: true });

      if (businessVolumeError) throw businessVolumeError;

      const { data: recruitersData, error: recruitersError } = await supabase
        .from('top_recruiters_display')
        .select('*')
        .order('serial_number', { ascending: true });

      if (recruitersError) throw recruitersError;

      setLeaderboard({
        businessVolume: businessVolumeData || [],
        referrals: recruitersData || []
      });
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    }
  };

  const fetchMarqueeData = async () => {
    try {
      const { data, error } = await supabase
        .from('new_users_marquee')
        .select('*')
        .order('joined_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedUsers = data.map(user => ({
        ...user,
        joined_time: formatJoinedTime(new Date(user.joined_time))
      }));

      const randomIndex = Math.floor(Math.random() * formattedUsers.length);
      const rotatedUsers = [
        ...formattedUsers.slice(randomIndex),
        ...formattedUsers.slice(0, randomIndex)
      ];

      setMarqueeUsers(rotatedUsers);
    } catch (error) {
      console.error('Error fetching marquee users:', error);
    }
  };

  const fetchBusinessStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get direct referral count first
      const { data: referralCount, error: referralError } = await supabase
        .from('referral_relationships')
        .select('count')
        .eq('referrer_id', user.id)
        .eq('level', 1)
        .single();

      if (referralError) throw referralError;

      // Only proceed if user has at least 2 direct referrals
      const directCount = referralCount?.count || 0;
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

      // Get total business volume
      const { data: businessData, error: businessError } = await supabase
        .from('business_volumes')
        .select('amount')
        .eq('user_id', user.id);

      if (businessError) throw businessError;

      const totalVolume = businessData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      // Get rank bonuses
      const { data: rankBonuses, error: bonusError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'rank_bonus')
        .eq('status', 'Completed');

      if (bonusError) throw bonusError;

      const totalRankBonus = rankBonuses?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Get all ranks for progression tracking
      const { data: ranks, error: ranksError } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });

      if (ranksError) throw ranksError;

      // Find current and next rank based on business volume
      let currentRank = ranks[0];
      let nextRank = null;

      for (let i = 0; i < ranks.length; i++) {
        if (totalVolume >= ranks[i].business_amount) {
          currentRank = ranks[i];
          nextRank = ranks[i + 1] || null;
        } else {
          break;
        }
      }

      // Calculate progress to next rank
      let progress = 0;
      if (nextRank) {
        const remaining = nextRank.business_amount - currentRank.business_amount;
        const achieved = totalVolume - currentRank.business_amount;
        progress = Math.min(100, Math.max(0, (achieved / remaining) * 100));
      }

      setBusinessStats({
        currentRank: currentRank.title,
        totalVolume: totalVolume,
        rankBonus: totalRankBonus,
        nextRank: nextRank?.title || null,
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
    const initializeDashboard = async () => {
      await Promise.all([
        fetchUserProfile(),
        fetchReferralData(),
        fetchCommissions(),
        fetchLeaderboards(),
        fetchBusinessStats()
      ]);
      setIsLoading(false);
    };

    initializeDashboard();
  }, []);

  // Auto-refresh marquee data
  useEffect(() => {
    fetchMarqueeData();
    const interval = setInterval(fetchMarqueeData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userProfile?.id}`,
        },
        () => fetchBusinessStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id]);

  // Render helper functions
  const renderStats = () => {
    if (!(totalInvested > MIN_DISPLAY_AMOUNT || totalCommissions > MIN_DISPLAY_AMOUNT || totalReferrals.active > 0)) {
      return null;
    }

    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {totalInvested > MIN_DISPLAY_AMOUNT && (
            <StatCard
              title="Total Invested"
              value={`$${totalInvested.toLocaleString()}`}
              description="Active investments"
              icon={<DollarSign className="h-4 w-4" />}
              loading={isLoading}
              className="w-full"
            />
          )}
          {totalCommissions > MIN_DISPLAY_AMOUNT && (
            <StatCard
              title="Total Commissions"
              value={`$${totalCommissions.toLocaleString()}`}
              description="Commission earned"
              icon={<Users className="h-4 w-4" />}
              loading={loading}
              className="w-full"
            />
          )}
          {totalReferrals.active > 0 && (
            <StatCard
              title="Team Members"
              value={totalReferrals.active.toString()}
              description={`Downline Members`}
              icon={<Users className="h-4 w-4" />}
              loading={loading}
              className="w-full"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <ShellLayout>
      <PageTransition>
        <div className="space-y-4 sm:space-y-6">
          <PageHeader 
            title="Dashboard" 
            description="Overview of your investments and affiliate performance"
          />

          <div className="w-full bg-card border rounded-lg overflow-hidden">
            <div className="bg-muted/30">
              <Marquee
                gradient={false}
                speed={50}
                pauseOnHover={true}
                className="py-3"
              >
                {marqueeUsers.map((user) => (
                  <span key={user.id} className="mx-4 inline-flex items-center">
                    <img
                      src={`https://flagcdn.com/24x18/${user.country.toLowerCase()}.png`}
                      alt={`${user.country} flag`}
                      className="h-4 w-5 mr-2"
                    />
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {user.plans}
                    </span>
                  </span>
                ))}
              </Marquee>
            </div>
          </div>

          <Card className="border-dashed w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Your Referral Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col w-full gap-4">
                <div className="w-full">
                  <div className="relative">
                    <Input
                      readOnly
                      value={referralLink}
                      className="pr-32 font-mono text-xs sm:text-sm bg-muted overflow-x-auto"
                    />
                    <div className="absolute right-0 top-0 h-full flex items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 sm:px-3 hover:bg-muted"
                        onClick={handleShowQrCode}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 sm:px-3 hover:bg-muted"
                        onClick={handleCopyLink}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold mb-4">Start earning in your account</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="ghost"
                className="h-32 relative overflow-hidden group w-full"
                onClick={() => navigate('/plans')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-400/20 to-violet-500/20 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex flex-col items-start w-full pl-6 space-y-3">
                  <Briefcase className="h-8 w-8 text-blue-500" />
                  <span className="font-bold">Buy a Plan</span>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="h-32 relative overflow-hidden group w-full"
                onClick={() => setShowDepositDialog(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-400/20 to-teal-500/20 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex flex-col items-start w-full pl-6 space-y-3">
                  <ArrowDownToLine className="h-8 w-8 text-green-500" />
                  <span className="font-bold">Deposit</span>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="h-32 relative overflow-hidden group w-full"  
                onClick={() => navigate('/withdrawals')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-400/20 to-yellow-500/20 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex flex-col items-start w-full pl-6 space-y-3">
                  <ArrowUpToLine className="h-8 w-8 text-orange-500" />
                  <span className="font-bold">Withdraw</span>
                  {withdrawalBalance > 0 && (
                    <span className="absolute top-2 right-2 bg-white text-xs px-3 py-1.5 rounded-full shadow-sm border border-border/50 font-medium">
                      Balance: ${withdrawalBalance.toLocaleString()}
                    </span>
                  )}
                </div>
              </Button>

              <Button
                variant="ghost" 
                className="h-32 relative overflow-hidden group w-full"
                onClick={() => navigate('/affiliate')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-fuchsia-400/20 to-pink-500/20 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex flex-col items-start w-full pl-6 space-y-3">
                  <Users className="h-8 w-8 text-purple-500" />
                  <span className="font-bold">View Referrals</span>
                  {totalReferrals && totalReferrals.total > 0 && (
                    <span className="absolute top-2 right-2 bg-white text-xs px-3 py-1.5 rounded-full shadow-sm border border-border/50 font-medium">
                      Downlines: {totalReferrals.total}
                    </span>
                  )}
                </div>
              </Button>
            </div>
          </div>

          <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader className="text-center">
                <DialogTitle>Your Referral QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 p-2 sm:p-6">
                {qrCodeUrl && (
                  <div className="p-2 sm:p-4 border-4 sm:border-8 border-primary rounded-xl sm:rounded-3xl">
                    <img
                      src={qrCodeUrl}
                      alt="Referral QR Code"
                      className="border-2 sm:border-4 border-black w-48 h-48 sm:w-64 sm:h-64 rounded-lg"
                    />
                  </div>
                )}
                <div className="w-full max-w-sm">
                  <div className="relative">
                    <Input
                      readOnly
                      value={referralLink}
                      className="pr-16 text-xs sm:text-sm bg-muted/50 text-center overflow-x-auto"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-0 top-0 h-full px-2 sm:px-3 hover:bg-muted"
                      onClick={handleCopyLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                  Scan this and Register your Downlines!
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {renderStats()}

          <div>
            <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Business Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm font-medium text-muted-foreground">Current Rank</div>
                      <div className="text-2xl font-semibold text-primary">{businessStats.currentRank}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm font-medium text-muted-foreground">Total Volume</div>
                      <div className="text-2xl font-semibold">${businessStats.totalVolume.toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm font-medium text-muted-foreground">Rank Bonus</div>
                      <div className="text-2xl font-semibold text-green-600">${businessStats.rankBonus.toLocaleString()}</div>
                    </div>
                  </div>

                  {businessStats.nextRank && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress to {businessStats.nextRank}</span>
                        <span>{Math.round(businessStats.progress)}%</span>
                      </div>
                      <Progress value={businessStats.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Target: ${businessStats.targetVolume.toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Top Performers</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Top Business Volume
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="text-xs uppercase bg-muted/50">
                        <tr>
                          <th scope="col" className="px-2 py-2 sm:px-4">S/N</th>
                          <th scope="col" className="px-2 py-2 sm:px-4 text-left">Name</th>
                          <th scope="col" className="px-2 py-2 sm:px-4 text-right sm:text-left">Volume</th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-2">Income</th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-2">Rank</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {leaderboard.businessVolume.map((leader) => (
                          <tr key={leader.id} className="hover:bg-muted/50">
                            <td className="px-1 py-2 sm:px-4 text-center sm:text-left whitespace-nowrap">{leader.serial_number}</td>
                            <td className="px-1 py-2 sm:px-4 font-medium truncate max-w-[80px] sm:max-w-none whitespace-nowrap">
                              {leader.name}
                            </td>
                            <td className="px-1 py-2 sm:px-4 text-right sm:text-left whitespace-nowrap">
                              ${leader.volume?.toLocaleString()}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">
                              ${leader.income.toLocaleString()}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">{leader.rank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Top Recruiters
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="text-xs uppercase bg-muted/50">
                        <tr>
                          <th scope="col" className="px-2 py-2 sm:px-4">S/N</th>
                          <th scope="col" className="px-2 py-2 sm:px-4 text-left">Name</th>
                          <th scope="col" className="px-2 py-2 sm:px-4 text-right sm:text-left">Referrals</th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-2">Income</th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-2">Rank</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {leaderboard.referrals.map((leader) => (
                          <tr key={leader.id} className="hover:bg-muted/50">
                            <td className="px-1 py-2 sm:px-4 text-center sm:text-left whitespace-nowrap">{leader.serial_number}</td>
                            <td className="px-1 py-2 sm:px-4 font-medium truncate max-w-[80px] sm:max-w-none whitespace-nowrap">
                              {leader.name}
                            </td>
                            <td className="px-1 py-2 sm:px-4 text-right sm:text-left whitespace-nowrap">
                              {leader.referrals}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">
                              ${leader.income.toLocaleString()}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">{leader.rank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </PageTransition>
      <DepositDialog
        open={showDepositDialog}
        onOpenChange={setShowDepositDialog}
      />
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
