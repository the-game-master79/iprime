import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, PageHeader, StatCard } from "@/components/ui-components";
import { CreditCard, DollarSign, Users, Mail, Star, Trophy, Copy, QrCode, ExternalLink, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Progress } from "@/components/ui/progress";
import Marquee from 'react-fast-marquee';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface MarqueeUser {
  id: string;
  name: string;
  country: string;
  joined_time: string;
  plans: string; // Add this property if it exists
}

interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
}

interface Promotion {
  id: string;
  title: string;
  image_url: string;
  link: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface LeaderboardEntry {
  id: string;
  serial_number: number;
  name: string;
  volume?: number;
  referrals?: number;
  income: number;
  rank: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  investment: number;
  returns_percentage: number;
  duration_days: number;
  status: 'active';
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState({ active: 0, total: 0 });
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRank, setUserRank] = useState({ rank: 0, totalUsers: 0 });
  const [referralLink, setReferralLink] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);
  const { toast } = useToast();
  const [businessRank, setBusinessRank] = useState<{
    currentRank: { title: string; bonus: number; business_amount: number } | null;
    nextRank: { title: string; bonus: number; business_amount: number } | null;
    progress: number;
    totalBusiness: number;
  }>({ currentRank: null, nextRank: null, progress: 0, totalBusiness: 0 });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [leaderboard, setLeaderboard] = useState<{
    businessVolume: LeaderboardEntry[];
    referrals: LeaderboardEntry[];
  }>({ businessVolume: [], referrals: [] });
  const [marqueeUsers, setMarqueeUsers] = useState<MarqueeUser[]>([]);
  const [marqueeStartIndex, setMarqueeStartIndex] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showInvestDialog, setShowInvestDialog] = useState(false);
  const [processingInvestment, setProcessingInvestment] = useState(false);
  const [subscribedPlansCount, setSubscribedPlansCount] = useState(0);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setPerformanceData([
        {
          name: "Investment Balance",
          value: data.balance || 0
        }
        // ...other performance data
      ]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchInvestmentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile data including investments
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('total_invested, balance')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setTotalInvested(profile?.total_invested || 0);
      // Also update user profile with latest data
      setUserProfile(prev => ({ ...prev, ...profile }));
    } catch (error) {
      console.error('Error fetching investment data:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchInvestmentData();
  }, []);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get complete referral network data using the same query as Affiliate page
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

        // Process the relationships data
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

    fetchReferralData();
  }, []);

  useEffect(() => {
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

    fetchCommissions();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all types of transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (transactionsError) throw transactionsError;

        // Format the transactions data
        const formattedTransactions = (transactionsData || []).map(tx => ({
          id: tx.id,
          date: new Date(tx.created_at).toLocaleDateString(),
          amount: `$${tx.amount.toLocaleString()}`,
          status: tx.status.toLowerCase(),
          type: tx.type,
          plan: tx.description || '-'
        }));

        setTransactions(formattedTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    const fetchProfileAndRank = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile with business volume and business rank
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            business_volume,
            business_rank,
            total_invested
          `)
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Fetch all ranks ordered by business amount
        const { data: ranks, error: ranksError } = await supabase
          .from('ranks')
          .select('*')
          .order('business_amount', { ascending: true });

        if (ranksError) throw ranksError;

        // Calculate total business volume (personal)
        const personalBusiness = (profile.business_volume || 0)
        const totalBusinessVolume = personalBusiness;

        // Find current rank based on total business volume and profile's business_rank
        let currentRank = ranks.find(rank => rank.title === profile.business_rank);
        if (!currentRank && ranks.length > 0) {
          currentRank = ranks[0]; // Set to first rank if no rank assigned
        }

        // Find next rank
        const currentRankIndex = ranks.findIndex(rank => rank.title === profile?.business_rank);
        const nextRank = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;

        // Calculate progress
        let progress = 0;
        if (nextRank) {
          if (!currentRank) {
            // Progress towards first rank
            progress = (totalBusinessVolume / nextRank.business_amount) * 100;
          } else {
            // Progress between current and next rank
            const businessDifference = nextRank.business_amount - currentRank.business_amount;
            const achievedDifference = totalBusinessVolume - currentRank.business_amount;
            progress = (achievedDifference / businessDifference) * 100;
          }
        } else if (currentRank) {
          progress = 100; // Max rank achieved
        }

        // Ensure progress stays between 0 and 100
        progress = Math.max(0, Math.min(100, progress));

        setBusinessRank({
          currentRank,
          nextRank,
          progress,
          totalBusiness: totalBusinessVolume
        });

      } catch (error) {
        console.error('Error fetching profile and rank:', error);
      }
    };

    fetchProfileAndRank();
  }, []);

  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/register?ref=${profile?.referral_code}`);
      } catch (error) {
        console.error('Error fetching referral code:', error);
      }
    };

    fetchReferralCode();
  }, []);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (profile?.referral_code) {
          // Update referral link to use correct path
          setReferralLink(`${window.location.origin}/auth/register?ref=${profile.referral_code}`);
        }
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfileData();
  }, []);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
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

    fetchPromotions();
  }, []);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        // Fetch business volume leaderboard
        const { data: businessVolumeData, error: businessVolumeError } = await supabase
          .from('business_volume_display')
          .select('*')
          .order('serial_number', { ascending: true });

        if (businessVolumeError) throw businessVolumeError;

        // Fetch top recruiters leaderboard
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

    fetchLeaderboards();
  }, []);
  
  useEffect(() => {
    const fetchMarqueeUsers = async () => {
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

        // Randomly rotate the array
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

    fetchMarqueeUsers();
    const interval = setInterval(fetchMarqueeUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('status', 'active')
          .order('investment', { ascending: true }); // Removed .limit(4)

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchSubscribedPlansCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count, error } = await supabase
          .from('user_plans')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (error) throw error;
        setSubscribedPlansCount(count || 0);
      } catch (error) {
        console.error('Error fetching subscribed plans count:', error);
      }
    };

    fetchSubscribedPlansCount();
  }, []);

  const formatJoinedTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours === 0) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const formatCurrency = (value: number | string) => {
    if (typeof value === 'number') {
      return `$${value.toLocaleString()}`;
    }
    return value;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Referral Link is Copied!",
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

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('promotions-container');
    if (container) {
      const scrollAmount = window.innerWidth >= 768 
        ? container.offsetWidth / 2  // Desktop: scroll half width (one banner)
        : container.offsetWidth;     // Mobile: scroll full width

      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleInvestClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowInvestDialog(true);
  };

  const handleInvestment = async () => {
    if (!selectedPlan || !userProfile) return;
    setProcessingInvestment(true);

    try {
      // Check balance
      const currentBalance = Number(userProfile.balance) || 0;
      const investmentAmount = Number(selectedPlan.investment) || 0;

      if (currentBalance < investmentAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You need $${investmentAmount.toLocaleString()} to invest in this plan.`,
          variant: "destructive"
        });
        return;
      }

      // Create investment
      const { error: investmentError } = await supabase
        .from('investments')
        .insert({
          user_id: userProfile.id,
          plan_id: selectedPlan.id,
          amount: selectedPlan.investment,
          status: 'active'
        });

      if (investmentError) throw investmentError;

      // Create user_plan subscription
      const { error: subscriptionError } = await supabase
        .from('user_plans')
        .upsert({
          user_id: userProfile.id,
          plan_id: selectedPlan.id,
          status: 'active'
        }, {
          onConflict: 'user_id,plan_id'
        });

      if (subscriptionError) throw subscriptionError;

      // Refresh user data - now fetchInvestmentData is defined
      await Promise.all([
        fetchUserData(),
        fetchInvestmentData()
      ]);

      toast({
        title: "Investment Successful",
        description: `Successfully invested $${selectedPlan.investment.toLocaleString()} in ${selectedPlan.name}`,
      });

      setShowInvestDialog(false);
    } catch (error) {
      console.error('Error creating investment:', error);
      toast({
        title: "Investment Failed",
        description: "Failed to process investment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingInvestment(false);
    }
  };

  return (
    <ShellLayout>
      <PageTransition>
        <div className="space-y-4 sm:space-y-6">
          <PageHeader 
            title="Dashboard" 
            description="Overview of your investments and affiliate performance"
          />

          {/* Updated Marquee Section */}
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

          {/* Referral Link Section */}
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
                      className="pr-20 font-mono text-xs sm:text-sm bg-muted overflow-x-auto"
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={handleShowQrCode}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Referral QR Code
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Dialog */}
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

          {/* Live Plans Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">All Plans</h2>
              {subscribedPlansCount > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {subscribedPlansCount} Active
                </span>
              )}
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">{plan.name}</CardTitle>
                    <CardDescription className="text-2xl font-bold text-primary">
                      ${plan.investment.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Daily ROI:</span>{' '}
                      <span className="font-medium">{plan.returns_percentage}%</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Duration:</span>{' '}
                      <span className="font-medium">{plan.duration_days} days</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => handleInvestClick(plan)}
                      disabled={!userProfile || (userProfile.balance || 0) < plan.investment}
                    >
                      {!userProfile ? 'Loading...' : 
                       (userProfile.balance || 0) < plan.investment 
                         ? `Need $${plan.investment.toLocaleString()}` 
                         : 'Select this Plan ->'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Investment Confirmation Dialog */}
          <AlertDialog open={showInvestDialog} onOpenChange={setShowInvestDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Investment</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    Are you sure you want to invest in this plan?
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              {selectedPlan && (
                <div className="space-y-4 py-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">${selectedPlan.investment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Returns:</span>
                    <span className="font-medium">{selectedPlan.returns_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{selectedPlan.duration_days} days</span>
                  </div>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={processingInvestment}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleInvestment}
                  disabled={processingInvestment}
                >
                  {processingInvestment ? "Processing..." : "Confirm Investment"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="grid gap-4 md:gap-8">
            {/* Stats Overview */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Stats</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Invested"
                  value={`$${totalInvested.toLocaleString()}`}
                  description="Active investments"
                  icon={<DollarSign className="h-4 w-4" />}
                  loading={loading}
                  className="w-full"
                />
                <StatCard
                  title="Available Balance"
                  value={`$${(performanceData[0]?.value || 0).toLocaleString()}`}
                  description="Available for withdrawal"
                  icon={<CreditCard className="h-4 w-4" />}
                  loading={loading}
                  className="w-full"
                />
                <StatCard
                  title="Total Commissions"
                  value={`$${totalCommissions.toLocaleString()}`}
                  description="Commission earned"
                  icon={<Users className="h-4 w-4" />}
                  loading={loading}
                  className="w-full"
                />
                <StatCard
                  title="Team Members"
                  value={totalReferrals.active.toString()}
                  description={`Downline Members`}
                  icon={<Users className="h-4 w-4" />}
                  loading={loading}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Rank and Profile Cards */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      My Rank
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Your current business rank</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-20 flex items-center justify-center">
                        <div className="animate-pulse bg-muted h-8 w-24 rounded" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col items-start gap-2">
                          <div className="text-2xl sm:text-4xl font-bold text-primary">
                            {businessRank.currentRank ? businessRank.currentRank.title : 'New Member'}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Total Business Volume: <span className="font-semibold text-primary">
                              ${businessRank.totalBusiness?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Current Rank Bonus: <span className="font-semibold text-primary">
                              ${businessRank.currentRank?.bonus?.toLocaleString() || '0'}
                            </span>
                          </div>
                        </div>
                        {businessRank.nextRank && (
                          <div className="space-y-2">
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Next Rank: {businessRank.nextRank.title} (${businessRank.nextRank.business_amount?.toLocaleString()} business required)
                            </div>
                            <Progress value={businessRank.progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {Math.round(businessRank.progress)}% progress to {businessRank.nextRank.title}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Profile Overview
                    </CardTitle>
                    <CardDescription>Your account information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-2">
                        <div className="animate-pulse bg-muted h-4 w-3/4 rounded" />
                        <div className="animate-pulse bg-muted h-4 w-1/2 rounded" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {userProfile?.first_name} {userProfile?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {userProfile?.email}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Member since {new Date(userProfile?.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Leaderboards */}
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
    </ShellLayout>
  );
};

export default Dashboard;
