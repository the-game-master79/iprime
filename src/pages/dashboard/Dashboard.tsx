import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, PageHeader, StatCard } from "@/components/ui-components";
import { CreditCard, DollarSign, Users, Mail, Star, Trophy, Copy, QrCode, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Progress } from "@/components/ui/progress";
import { User } from "lucide-react";
import Marquee from 'react-fast-marquee';

interface MarqueeUser {
  id: string;
  name: string;
  country: string;
  joined_time: string;
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
  first_name: string;
  last_name: string;
  business_volume: number;
  referral_count: number;
  business_rank: string;
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

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchInvestmentData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('total_invested')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setTotalInvested(profile?.total_invested || 0);
      } catch (error) {
        console.error('Error fetching investment data:', error);
      }
    };

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
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'commission')
          .eq('status', 'Completed');

        if (error) throw error;

        const total = (data || []).reduce((sum, tx) => sum + tx.amount, 0);
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
    // Mock data for leaderboards
    const mockBusinessVolume = [
      { id: '1', first_name: 'John', last_name: 'Smith', business_volume: 250000, referral_count: 0, business_rank: 'Diamond' },
      { id: '2', first_name: 'Sarah', last_name: 'Johnson', business_volume: 180000, referral_count: 0, business_rank: 'Platinum' },
      { id: '3', first_name: 'Michael', last_name: 'Brown', business_volume: 150000, referral_count: 0, business_rank: 'Gold' },
      { id: '4', first_name: 'Emily', last_name: 'Davis', business_volume: 120000, referral_count: 0, business_rank: 'Silver' },
      { id: '5', first_name: 'David', last_name: 'Wilson', business_volume: 90000, referral_count: 0, business_rank: 'Bronze' },
    ];

    const mockReferrals = [
      { id: '1', first_name: 'Emma', last_name: 'Taylor', business_volume: 0, referral_count: 85, business_rank: 'Diamond' },
      { id: '2', first_name: 'James', last_name: 'Anderson', business_volume: 0, referral_count: 67, business_rank: 'Platinum' },
      { id: '3', first_name: 'Sophia', last_name: 'Martinez', business_volume: 0, referral_count: 52, business_rank: 'Gold' },
      { id: '4', first_name: 'William', last_name: 'Thomas', business_volume: 0, referral_count: 41, business_rank: 'Silver' },
      { id: '5', first_name: 'Oliver', last_name: 'Garcia', business_volume: 0, referral_count: 34, business_rank: 'Bronze' },
    ];

    setLeaderboard({
      businessVolume: mockBusinessVolume,
      referrals: mockReferrals
    });
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

        setMarqueeUsers(formattedUsers);
      } catch (error) {
        console.error('Error fetching marquee users:', error);
      }
    };

    fetchMarqueeUsers();
    // Fetch new data every 30 seconds
    const interval = setInterval(fetchMarqueeUsers, 30000);
    return () => clearInterval(interval);
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
                    <span className="text-xs text-muted-foreground ml-2">joined {user.joined_time}</span>
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

          <div className="grid gap-4 md:gap-8">
            {/* Stats Overview */}
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
            
            {/* Rank and Profile Cards */}
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

          {/* Leaderboards */}
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
                        <th scope="col" className="px-2 py-2 sm:px-4">#</th>
                        <th scope="col" className="px-2 py-2 sm:px-4 text-left">Name</th>
                        <th scope="col" className="px-2 py-2 sm:px-4 text-right sm:text-left">Volume</th>
                        <th scope="col" className="hidden sm:table-cell px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {leaderboard.businessVolume.map((leader, index) => (
                        <tr key={leader.id} className="hover:bg-muted/50">
                          <td className="px-1 py-2 sm:px-4 text-center sm:text-left whitespace-nowrap">{index + 1}</td>
                          <td className="px-1 py-2 sm:px-4 font-medium truncate max-w-[80px] sm:max-w-none whitespace-nowrap">
                            {leader.first_name} {leader.last_name}
                          </td>
                          <td className="px-1 py-2 sm:px-4 text-right sm:text-left whitespace-nowrap">
                            ${leader.business_volume.toLocaleString()}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">{leader.business_rank}</td>
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
                        <th scope="col" className="px-2 py-2 sm:px-4">#</th>
                        <th scope="col" className="px-2 py-2 sm:px-4 text-left">Name</th>
                        <th scope="col" className="px-2 py-2 sm:px-4 text-right sm:text-left">Referrals</th>
                        <th scope="col" className="hidden sm:table-cell px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {leaderboard.referrals.map((leader, index) => (
                        <tr key={leader.id} className="hover:bg-muted/50">
                          <td className="px-1 py-2 sm:px-4 text-center sm:text-left whitespace-nowrap">{index + 1}</td>
                          <td className="px-1 py-2 sm:px-4 font-medium truncate max-w-[80px] sm:max-w-none whitespace-nowrap">
                            {leader.first_name} {leader.last_name}
                          </td>
                          <td className="px-1 py-2 sm:px-4 text-right sm:text-left whitespace-nowrap">
                            {leader.referral_count}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">{leader.business_rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </PageTransition>
    </ShellLayout>
  );
};

export default Dashboard;
